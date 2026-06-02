"""P1 features regression: Drink Reveal + Staff order-status workflow + SMS dormant.

Auth is COOKIE-based (session_token httponly cookie). Use requests.Session().
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-spirits-app.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _login_session(email: str, password: str) -> requests.Session:
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=20)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    assert "session_token" in s.cookies, f"No session_token cookie for {email}"
    return s


@pytest.fixture(scope="module")
def sam():
    return _login_session("sam@masterliqours.my", "Staff123!")


@pytest.fixture(scope="module")
def logen():
    return _login_session("logen@masterliqours.my", "Staff123!")


@pytest.fixture(scope="module")
def customer():
    return _login_session("customer1@test.com", "Test123!")


# ---------------- Drink Reveal ----------------

class TestDrinkReveal:
    def test_today_endpoint_public(self):
        r = requests.get(f"{API}/drink-reveal/today", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "available" in data
        if data["available"]:
            assert data["discount_percentage"] == 30
            p = data["product"]
            for k in ("product_id", "name", "price", "image_url"):
                assert k in p
            assert "reveal_start" in data and "reveal_end" in data
            assert data["discounted_price"] == round(p["price"] * 0.7, 2)

    def test_deterministic_same_product(self):
        r1 = requests.get(f"{API}/drink-reveal/today", timeout=15).json()
        r2 = requests.get(f"{API}/drink-reveal/today", timeout=15).json()
        if r1.get("available") and r2.get("available"):
            assert r1["product"]["product_id"] == r2["product"]["product_id"]


# ---------------- Staff auth & listings ----------------

class TestStaffEndpoints:
    def test_sam_login_payload(self):
        r = requests.post(f"{API}/auth/login", json={"email": "sam@masterliqours.my", "password": "Staff123!"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "staff"
        assert data["user"]["name"].lower() == "sam"

    def test_all_4_staff_login(self):
        for email in ["sam@masterliqours.my", "logen@masterliqours.my", "mukesh@masterliqours.my", "sharvin@masterliqours.my"]:
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": "Staff123!"}, timeout=15)
            assert r.status_code == 200, f"{email} login failed: {r.text}"

    def test_my_orders_returns_list_with_status(self, sam):
        r = sam.get(f"{API}/staff/my-orders", timeout=15)
        assert r.status_code == 200, r.text
        orders = r.json()
        assert isinstance(orders, list)
        assert len(orders) >= 5, f"Expected 5+ orders for Sam, got {len(orders)}"
        for o in orders:
            assert "status" in o
            assert "order_id" in o

    def test_my_stock_non_empty(self, sam):
        r = sam.get(f"{API}/staff/my-stock", timeout=15)
        assert r.status_code == 200, r.text
        stock = r.json()
        assert isinstance(stock, list)
        assert len(stock) >= 1


# ---------------- PATCH order status ----------------

class TestOrderStatusPatch:
    def test_sam_can_update_own_order(self, sam):
        orders = sam.get(f"{API}/staff/my-orders", timeout=15).json()
        assert orders
        target = orders[0]
        order_id = target["order_id"]
        original_status = target["status"]

        r = sam.patch(f"{API}/orders/{order_id}/status", json={"status": "preparing"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "preparing"
        assert body["order_id"] == order_id
        assert body["message"] == "Status updated"

        # Revert if it wasn't already preparing
        if original_status and original_status != "preparing":
            sam.patch(f"{API}/orders/{order_id}/status", json={"status": original_status}, timeout=15)

    def test_logen_cannot_update_sams_order(self, sam, logen):
        orders = sam.get(f"{API}/staff/my-orders", timeout=15).json()
        order_id = orders[0]["order_id"]
        r = logen.patch(f"{API}/orders/{order_id}/status", json={"status": "preparing"}, timeout=15)
        assert r.status_code == 403, r.text
        assert "tak assigned" in r.json().get("detail", "").lower()

    def test_customer_cannot_update_status(self, sam, customer):
        orders = sam.get(f"{API}/staff/my-orders", timeout=15).json()
        order_id = orders[0]["order_id"]
        r = customer.patch(f"{API}/orders/{order_id}/status", json={"status": "preparing"}, timeout=15)
        assert r.status_code == 403
        assert "tak ada akses" in r.json().get("detail", "").lower()

    def test_invalid_status_400(self, sam):
        orders = sam.get(f"{API}/staff/my-orders", timeout=15).json()
        order_id = orders[0]["order_id"]
        r = sam.patch(f"{API}/orders/{order_id}/status", json={"status": "bogus_status"}, timeout=15)
        assert r.status_code == 400
        assert "invalid status" in r.json().get("detail", "").lower()

    def test_twilio_dormant_does_not_break_patch(self, sam):
        orders = sam.get(f"{API}/staff/my-orders", timeout=15).json()
        order_id = orders[0]["order_id"]
        r = sam.patch(f"{API}/orders/{order_id}/status", json={"status": "confirmed"}, timeout=15)
        assert r.status_code == 200, r.text


# ---------------- Regression ----------------

class TestRegression:
    def test_products_listing(self):
        r = requests.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_customer_my_orders(self, customer):
        r = customer.get(f"{API}/orders/my-orders", timeout=15)
        assert r.status_code == 200

    def test_master_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": "jojo@masterliqours.my", "password": "Admin123!"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "master_admin"

    def test_super_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": "yash@masterliqours.my", "password": "Admin123!"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "super_admin"
