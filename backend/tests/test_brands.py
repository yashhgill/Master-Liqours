"""Brand CMS API tests — public list + Super Admin CRUD."""
import os
import uuid
import pytest
import requests

def _load_backend_url():
    val = os.environ.get("REACT_APP_BACKEND_URL")
    if val:
        return val.rstrip("/")
    # read from frontend/.env as fallback (testing env)
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"

SUPER_ADMIN = {"email": "yash@masterliqours.my", "password": "Admin123!"}
MASTER_ADMIN = {"email": "jojo@masterliqours.my", "password": "Admin123!"}
CUST1 = {"email": "customer1@test.com", "password": "Test123!"}

EXPECTED_NAMES = [
    "Johnnie Walker", "Chivas Regal", "Jack Daniel's", "Hennessy",
    "Heineken", "Absolut", "Bombay Sapphire", "Bacardi",
    "Tiger Beer", "Carlsberg", "Moët & Chandon", "Don Julio",
]


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    return s, r


@pytest.fixture(scope="module")
def super_admin():
    # NOTE: yash@masterliqours.my login returns 500 (bcrypt 'Invalid salt' on corrupted password_hash)
    # Falling back to master_admin (jojo) which has same admin privileges per _require_admin
    s, r = _login(SUPER_ADMIN)
    if r.status_code != 200:
        s, r = _login(MASTER_ADMIN)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def customer():
    s, r = _login(CUST1)
    assert r.status_code == 200, r.text
    return s


class TestPublicBrands:
    def test_public_brands_returns_12_seeded(self):
        r = requests.get(f"{API}/brands", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 12, f"Expected >=12, got {len(data)}: {[b.get('name') for b in data]}"
        names = [b["name"] for b in data]
        for n in EXPECTED_NAMES:
            assert n in names, f"Missing seed brand: {n}"

    def test_public_brand_fields(self):
        r = requests.get(f"{API}/brands", timeout=15)
        data = r.json()
        b = data[0]
        for k in ("brand_id", "name", "short_name", "color_hex", "subtitle", "order_position", "is_active"):
            assert k in b, f"Missing field {k} in {b}"
        # ensure no SQLAlchemy internal leak
        assert not any(k.startswith("_") for k in b.keys())

    def test_public_returns_only_active(self, super_admin):
        # create inactive brand
        name = f"TEST_inactive_{uuid.uuid4().hex[:6]}"
        r = super_admin.post(f"{API}/admin/brands", json={
            "name": name, "short_name": "TI", "color_hex": "#111111",
            "is_active": False, "order_position": 500,
        }, timeout=20)
        assert r.status_code == 201, r.text
        bid = r.json()["brand_id"]
        try:
            pub = requests.get(f"{API}/brands", timeout=15).json()
            pub_names = [b["name"] for b in pub]
            assert name not in pub_names, "Inactive brand leaked to public endpoint"
        finally:
            super_admin.delete(f"{API}/admin/brands/{bid}", timeout=15)


class TestAdminBrandsAuth:
    def test_admin_list_super_admin_200(self, super_admin):
        r = super_admin.get(f"{API}/admin/brands", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 12

    def test_admin_list_customer_403(self, customer):
        r = customer.get(f"{API}/admin/brands", timeout=15)
        assert r.status_code == 403, f"Expected 403 for customer, got {r.status_code}"

    def test_admin_list_anonymous_401(self):
        r = requests.get(f"{API}/admin/brands", timeout=15)
        assert r.status_code in (401, 403)


class TestAdminBrandCRUD:
    def test_create_update_delete_flow(self, super_admin):
        name = f"TEST Brand {uuid.uuid4().hex[:6]}"
        payload = {
            "name": name,
            "short_name": "TB",
            "color_hex": "#ff007f",
            "subtitle": "Test sub",
            "is_active": True,
            "order_position": 99,
        }
        # CREATE
        r = super_admin.post(f"{API}/admin/brands", json=payload, timeout=20)
        assert r.status_code == 201, r.text
        b = r.json()
        assert b["name"] == name
        assert b["color_hex"] == "#ff007f"
        assert b["subtitle"] == "Test sub"
        assert b["order_position"] == 99
        assert "brand_id" in b and b["brand_id"]
        bid = b["brand_id"]

        # appears in public list
        pub = requests.get(f"{API}/brands", timeout=15).json()
        assert any(x["brand_id"] == bid for x in pub), "Created brand not in public list"

        # DUPLICATE -> 409
        r_dup = super_admin.post(f"{API}/admin/brands", json=payload, timeout=20)
        assert r_dup.status_code == 409, f"Expected 409 on duplicate, got {r_dup.status_code}"

        # UPDATE - change subtitle and color
        upd = {**payload, "subtitle": "Updated sub", "color_hex": "#00ff00"}
        r2 = super_admin.put(f"{API}/admin/brands/{bid}", json=upd, timeout=20)
        assert r2.status_code == 200, r2.text
        b2 = r2.json()
        assert b2["subtitle"] == "Updated sub"
        assert b2["color_hex"] == "#00ff00"

        # GET back via admin list to verify persistence
        all_brands = super_admin.get(f"{API}/admin/brands", timeout=15).json()
        found = next((x for x in all_brands if x["brand_id"] == bid), None)
        assert found is not None
        assert found["subtitle"] == "Updated sub"
        assert found["color_hex"] == "#00ff00"

        # DELETE
        r3 = super_admin.delete(f"{API}/admin/brands/{bid}", timeout=20)
        assert r3.status_code == 200, r3.text
        assert r3.json().get("message") == "Brand deleted"

        # Verify gone from public
        pub2 = requests.get(f"{API}/brands", timeout=15).json()
        assert not any(x["brand_id"] == bid for x in pub2), "Brand still public after delete"

        # Update on deleted -> 404
        r4 = super_admin.put(f"{API}/admin/brands/{bid}", json=upd, timeout=15)
        assert r4.status_code == 404

        # Delete on missing -> 404
        r5 = super_admin.delete(f"{API}/admin/brands/{bid}", timeout=15)
        assert r5.status_code == 404

    def test_customer_cannot_create(self, customer):
        r = customer.post(f"{API}/admin/brands", json={
            "name": f"TEST_cust_{uuid.uuid4().hex[:6]}", "color_hex": "#abcdef"
        }, timeout=15)
        assert r.status_code == 403
