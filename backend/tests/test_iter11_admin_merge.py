"""Iteration 11 — Admin role merge + Direct Google OAuth + 409 referral fix.

Coverage:
- Yash (super_admin) + Jojo (master_admin) login
- Both can access /api/admin/analytics, /all-orders, /staff-performance, /staff
- Customer is 403 on all admin endpoints
- 409 on explicit duplicate referral_code (iteration_10 bug fix)
- Auto-regen still works when no explicit code given
- /staff-performance shape
- /auth/google/exchange returns 401 with invalid code
- Regression: /products, /brands, /hero-banners, /drink-reveal/today
"""
import os
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "https://premium-spirits-app.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

YASH = {"email": "yash@masterliqours.my", "password": "Admin123!"}
JOJO = {"email": "jojo@masterliqours.my", "password": "Admin123!"}
CUST = {"email": "customer1@test.com", "password": "Test123!"}


def _login(creds):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json=creds, timeout=20)
    return s, r


# ─── Fixtures ─────────────────────────────────────────────
@pytest.fixture(scope="module")
def yash():
    s, r = _login(YASH)
    assert r.status_code == 200, f"Yash login: {r.status_code} {r.text}"
    body = r.json()
    assert body["user"]["role"] == "super_admin", body
    return s


@pytest.fixture(scope="module")
def jojo():
    s, r = _login(JOJO)
    assert r.status_code == 200, f"Jojo login: {r.status_code} {r.text}"
    body = r.json()
    assert body["user"]["role"] == "master_admin", body
    return s


@pytest.fixture(scope="module")
def customer():
    s, r = _login(CUST)
    assert r.status_code == 200, f"Customer login: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids
    s, r = _login(YASH)
    if r.status_code == 200:
        for sid in ids:
            try:
                s.delete(f"{API}/admin/staff/{sid}", timeout=15)
            except Exception:
                pass


# ─── 1. Login flows ───────────────────────────────────────
class TestLogins:
    def test_yash_login(self, yash):
        r = yash.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["role"] == "super_admin"

    def test_jojo_login(self, jojo):
        r = jojo.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["role"] == "master_admin"


# ─── 2. Admin endpoints accessible to BOTH roles ──────────
ADMIN_ENDPOINTS = [
    "/admin/analytics",
    "/admin/all-orders",
    "/admin/staff-performance",
    "/admin/staff",
]


class TestAdminAccess:
    @pytest.mark.parametrize("endpoint", ADMIN_ENDPOINTS)
    def test_yash_can_access(self, yash, endpoint):
        r = yash.get(f"{API}{endpoint}", timeout=20)
        assert r.status_code == 200, f"Yash {endpoint}: {r.status_code} {r.text[:200]}"

    @pytest.mark.parametrize("endpoint", ADMIN_ENDPOINTS)
    def test_jojo_can_access(self, jojo, endpoint):
        r = jojo.get(f"{API}{endpoint}", timeout=20)
        assert r.status_code == 200, f"Jojo {endpoint}: {r.status_code} {r.text[:200]}"

    @pytest.mark.parametrize("endpoint", ADMIN_ENDPOINTS)
    def test_customer_forbidden(self, customer, endpoint):
        r = customer.get(f"{API}{endpoint}", timeout=15)
        assert r.status_code == 403, f"Customer {endpoint}: expected 403 got {r.status_code} {r.text[:200]}"


# ─── 3. Staff Performance shape ───────────────────────────
class TestStaffPerformanceShape:
    def test_shape_keys(self, yash):
        r = yash.get(f"{API}/admin/staff-performance", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "staff" in data and "unassigned" in data, data
        assert isinstance(data["staff"], list)
        assert isinstance(data["unassigned"], dict)
        assert "total_orders" in data["unassigned"]
        assert "total_revenue" in data["unassigned"]
        # If staff present, validate keys
        if data["staff"]:
            row = data["staff"][0]
            for key in ("staff_id", "name", "email", "referral_code",
                        "whatsapp_number", "total_orders", "total_revenue",
                        "customers_count", "by_status", "last_order_at",
                        "conversion_rate"):
                assert key in row, f"missing {key} in {row}"


# ─── 4. 409 fix for explicit duplicate referral_code ──────
class TestReferral409Fix:
    def test_explicit_duplicate_returns_409(self, yash, created_ids):
        suffix = uuid.uuid4().hex[:6].lower()
        ref = f"DUP{suffix[:3].upper()}"
        # First create
        r1 = yash.post(f"{API}/admin/staff", json={
            "name": "RefBase",
            "email": f"TEST_dupref_{suffix}@masterliqours.my",
            "referral_code": ref,
        }, timeout=15)
        assert r1.status_code == 201, r1.text
        body = r1.json()
        created_ids.append(body["staff_id"])
        assert body["referral_code"] == ref.upper()

        # Second with same explicit code -> must 409
        r2 = yash.post(f"{API}/admin/staff", json={
            "name": "RefClash",
            "email": f"TEST_dupref2_{suffix}@masterliqours.my",
            "referral_code": ref,
        }, timeout=15)
        assert r2.status_code == 409, f"Expected 409 got {r2.status_code}: {r2.text}"
        detail = r2.json().get("detail", "").lower()
        assert "referral" in detail and "dah dipakai" in detail, detail

    def test_auto_referral_collision_regenerates(self, yash, created_ids):
        """Auto-generated referrals (no explicit code) should still survive collisions."""
        suffix = uuid.uuid4().hex[:6].lower()
        # Same name -> may trigger random collision but should still succeed
        r1 = yash.post(f"{API}/admin/staff", json={
            "name": "AutoGen",
            "email": f"TEST_auto1_{suffix}@masterliqours.my",
        }, timeout=15)
        assert r1.status_code == 201, r1.text
        created_ids.append(r1.json()["staff_id"])

        r2 = yash.post(f"{API}/admin/staff", json={
            "name": "AutoGen",
            "email": f"TEST_auto2_{suffix}@masterliqours.my",
        }, timeout=15)
        assert r2.status_code == 201, r2.text
        created_ids.append(r2.json()["staff_id"])
        # Codes should differ
        assert r1.json()["referral_code"] != r2.json()["referral_code"]


# ─── 5. Google OAuth exchange (error path only) ───────────
class TestGoogleOAuth:
    def test_invalid_code_returns_401(self):
        r = requests.post(
            f"{API}/auth/google/exchange",
            json={
                "code": "obviously_invalid_code_xyz_12345",
                "redirect_uri": "https://premium-spirits-app.preview.emergentagent.com/auth/google/callback",
            },
            timeout=20,
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "")
        assert "Google" in detail or "google" in detail.lower(), detail


# ─── 6. Regression endpoints ──────────────────────────────
class TestRegression:
    def test_products(self):
        r = requests.get(f"{API}/products", timeout=20)
        assert r.status_code == 200
        data = r.json()
        # API may return {items:[...], total:N} or a bare list
        items = data.get("items") if isinstance(data, dict) else data
        assert isinstance(items, list)
        assert len(items) >= 12, f"Expected >=12 products, got {len(items)}"

    def test_brands(self):
        r = requests.get(f"{API}/brands", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_hero_banners(self):
        r = requests.get(f"{API}/hero-banners", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_drink_reveal_today(self):
        r = requests.get(f"{API}/drink-reveal/today", timeout=15)
        assert r.status_code == 200
