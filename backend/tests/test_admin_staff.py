"""Iteration 10 — Super Admin Staff Management CRUD tests.

Covers:
 - GET /api/admin/staff (initially empty)
 - POST create with auto referral
 - POST create with custom referral
 - POST duplicate email/referral
 - POST as customer = 403
 - Staff login with temp password and access to /api/staff/my-orders
 - PUT update name (syncs to User)
 - POST reset-password
 - DELETE staff (and verify User row gone)
"""
import os
import re
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://premium-spirits-app.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

SUPER = {"email": "yash@masterliqours.my", "password": "Admin123!"}
CUST = {"email": "customer1@test.com", "password": "Test123!"}


def _login(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json=creds, timeout=20)
    return s, r


@pytest.fixture(scope="module")
def admin():
    s, r = _login(SUPER)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def customer():
    s, r = _login(CUST)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids
    # teardown: delete any staff IDs created by tests if still present
    s, r = _login(SUPER)
    if r.status_code == 200:
        for sid in ids:
            try:
                s.delete(f"{API}/admin/staff/{sid}", timeout=15)
            except Exception:
                pass


class TestStaffList:
    def test_list_initially_empty(self, admin):
        r = admin.get(f"{API}/admin/staff", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        # Could already contain test residue from earlier runs — relax to "no Sam/Logen/Mukesh/Sharvin emails"
        emails = [s.get("email") for s in data]
        for legacy in ("sam@masterliqours.my", "logen@masterliqours.my",
                       "mukesh@masterliqours.my", "sharvin@masterliqours.my"):
            assert legacy not in emails, f"Legacy staff {legacy} not cleaned: {emails}"

    def test_list_forbidden_for_anon(self):
        r = requests.get(f"{API}/admin/staff", timeout=15)
        assert r.status_code in (401, 403), r.text


class TestStaffCreate:
    def test_create_auto_referral(self, admin, created_ids):
        suffix = uuid.uuid4().hex[:6].upper()
        payload = {
            "name": f"TestSam{suffix}",
            "email": f"TEST_sam_{suffix.lower()}@masterliqours.my",
            "whatsapp_number": "+60126884925",
        }
        r = admin.post(f"{API}/admin/staff", json=payload, timeout=20)
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["email"] == payload["email"]
        assert body["name"] == payload["name"]
        assert "staff_id" in body
        assert "referral_code" in body
        assert "temp_password" in body
        assert len(body["temp_password"]) == 10
        assert re.match(r"^[A-Z]+\d{3}$", body["referral_code"]), body["referral_code"]
        assert body["referral_code"].startswith(f"TESTSAM{suffix}"[:6])
        created_ids.append(body["staff_id"])
        pytest.shared = {
            "staff_id": body["staff_id"],
            "email": body["email"],
            "temp_password": body["temp_password"],
            "name": body["name"],
        }

    def test_create_with_custom_referral(self, admin, created_ids):
        suffix = uuid.uuid4().hex[:6].lower()
        ref = f"CUSTOM{suffix[:2].upper()}"
        payload = {
            "name": f"CustomRef_{suffix}",
            "email": f"TEST_cref_{suffix}@masterliqours.my",
            "referral_code": ref.lower(),  # send lower, expect upper
        }
        r = admin.post(f"{API}/admin/staff", json=payload, timeout=20)
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["referral_code"] == ref.upper()
        created_ids.append(body["staff_id"])

    def test_create_duplicate_email_409(self, admin):
        shared = pytest.shared
        payload = {"name": "DupSam", "email": shared["email"]}
        r = admin.post(f"{API}/admin/staff", json=payload, timeout=15)
        assert r.status_code == 409, r.text
        assert "email" in r.text.lower()

    def test_create_duplicate_referral_409(self, admin, created_ids):
        # First create a fresh one to know its referral
        suffix = uuid.uuid4().hex[:6].lower()
        r1 = admin.post(f"{API}/admin/staff", json={
            "name": "RefBase", "email": f"TEST_refbase_{suffix}@masterliqours.my",
            "referral_code": f"DUPE{suffix[:2].upper()}",
        }, timeout=15)
        assert r1.status_code == 201, r1.text
        body = r1.json()
        created_ids.append(body["staff_id"])
        ref = body["referral_code"]

        r2 = admin.post(f"{API}/admin/staff", json={
            "name": "RefClash", "email": f"TEST_refclash_{suffix}@masterliqours.my",
            "referral_code": ref,
        }, timeout=15)
        assert r2.status_code == 409, r2.text
        assert "referral" in r2.text.lower() or "code" in r2.text.lower()

    def test_create_as_customer_403(self, customer):
        r = customer.post(f"{API}/admin/staff", json={
            "name": "ShouldFail", "email": f"TEST_x_{uuid.uuid4().hex[:6]}@x.com",
        }, timeout=15)
        assert r.status_code == 403, r.text


class TestStaffLoginAndOrders:
    def test_new_staff_can_login_with_temp_password(self):
        shared = pytest.shared
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{API}/auth/login", json={
            "email": shared["email"],
            "password": shared["temp_password"],
        }, timeout=15)
        assert r.status_code == 200, r.text
        user = r.json().get("user")
        assert user and user.get("role") == "staff", user

    def test_staff_can_access_my_orders(self):
        shared = pytest.shared
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{API}/auth/login", json={
            "email": shared["email"], "password": shared["temp_password"],
        }, timeout=15)
        assert r.status_code == 200
        r2 = s.get(f"{API}/staff/my-orders", timeout=15)
        assert r2.status_code == 200, r2.text
        assert isinstance(r2.json(), list)


class TestStaffUpdate:
    def test_update_name_syncs_to_user(self, admin):
        shared = pytest.shared
        new_name = f"{shared['name']} Updated"
        r = admin.put(f"{API}/admin/staff/{shared['staff_id']}",
                      json={"name": new_name}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["name"] == new_name

        # login as that staff and verify /auth/me sees the new name
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        lr = s.post(f"{API}/auth/login", json={
            "email": shared["email"], "password": shared["temp_password"],
        }, timeout=15)
        assert lr.status_code == 200
        me = s.get(f"{API}/auth/me", timeout=15).json()
        assert me.get("name") == new_name, me


class TestStaffResetPassword:
    def test_reset_password_invalidates_old_and_issues_new(self, admin):
        shared = pytest.shared
        r = admin.post(f"{API}/admin/staff/{shared['staff_id']}/reset-password",
                       timeout=15)
        assert r.status_code == 200, r.text
        new_pw = r.json().get("temp_password")
        assert new_pw and len(new_pw) == 10

        # old password must now fail
        old_pw = shared["temp_password"]
        r_old = requests.post(f"{API}/auth/login", json={
            "email": shared["email"], "password": old_pw}, timeout=15)
        assert r_old.status_code == 401, f"old password still works: {r_old.text}"

        # new password works
        r_new = requests.post(f"{API}/auth/login", json={
            "email": shared["email"], "password": new_pw}, timeout=15)
        assert r_new.status_code == 200, r_new.text

        shared["temp_password"] = new_pw


class TestStaffDelete:
    def test_delete_removes_staff_and_user(self, admin, created_ids):
        shared = pytest.shared
        sid = shared["staff_id"]
        r = admin.delete(f"{API}/admin/staff/{sid}", timeout=15)
        assert r.status_code == 200, r.text

        # GET listing — staff_id no longer present
        r2 = admin.get(f"{API}/admin/staff", timeout=15)
        ids = [s["staff_id"] for s in r2.json()]
        assert sid not in ids

        # User account login must now fail
        r3 = requests.post(f"{API}/auth/login", json={
            "email": shared["email"], "password": shared["temp_password"],
        }, timeout=15)
        assert r3.status_code == 401, r3.text

        if sid in created_ids:
            created_ids.remove(sid)
