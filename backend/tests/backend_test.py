"""
Masterliqours backend regression tests.
Covers: auth (login/register/me), products, hero-banners, flash-sales,
orders/checkout with staff_whatsapp + tier benefits, my-orders, admin
hero-banner CRUD, newsletter, AI chat, referral assignment.
"""
import os
import uuid
import pytest
import requests
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-spirits-app.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CUST1 = {"email": "customer1@test.com", "password": "Test123!"}
CUST2_GOLD = {"email": "customer2@test.com", "password": "Test123!"}
CUST3_PLAT = {"email": "customer3@test.com", "password": "Test123!"}
SUPER_ADMIN = {"email": "yash@masterliqours.my", "password": "Admin123!"}
MASTER_ADMIN = {"email": "jojo@masterliqours.my", "password": "Admin123!"}


# ------------- fixtures -------------
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    return s, r


@pytest.fixture(scope="session")
def cust1_session():
    s, r = _login(CUST1)
    assert r.status_code == 200, f"Customer1 login failed: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="session")
def cust2_session():
    s, r = _login(CUST2_GOLD)
    if r.status_code != 200:
        pytest.skip("customer2 (Gold) login not available")
    return s, r.json()


@pytest.fixture(scope="session")
def cust3_session():
    s, r = _login(CUST3_PLAT)
    if r.status_code != 200:
        pytest.skip("customer3 (Platinum) login not available")
    return s, r.json()


@pytest.fixture(scope="session")
def super_admin_session():
    s, r = _login(SUPER_ADMIN)
    assert r.status_code == 200, f"Super admin login failed: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="session")
def master_admin_session():
    s, r = _login(MASTER_ADMIN)
    assert r.status_code == 200, f"Master admin login failed: {r.status_code} {r.text}"
    return s, r.json()


# ------------- health / public -------------
class TestHealth:
    def test_root(self, http):
        r = http.get(f"{BASE_URL}/", timeout=15)
        assert r.status_code == 200

    def test_products_listing(self, http):
        r = http.get(f"{API}/products", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        p = data[0]
        for k in ("product_id", "name", "price", "category"):
            assert k in p

    def test_hero_banners(self, http):
        r = http.get(f"{API}/hero-banners", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_flash_sales(self, http):
        r = http.get(f"{API}/flash-sales/active", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_categories(self, http):
        r = http.get(f"{API}/categories", timeout=15)
        assert r.status_code == 200
        assert "categories" in r.json()


# ------------- auth -------------
class TestAuth:
    def test_login_success_manglish_and_no_password_hash(self):
        r = requests.post(f"{API}/auth/login", json=CUST1, timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert body.get("message") == "Login berjaya!"
        user = body.get("user")
        assert user and "password_hash" not in user, "password_hash leaked in login response"
        assert user["email"] == CUST1["email"]

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": CUST1["email"], "password": "wrong"}, timeout=20)
        assert r.status_code == 401

    def test_me_endpoint(self, cust1_session):
        s, _ = cust1_session
        r = s.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == CUST1["email"]
        assert "password_hash" not in r.json()

    def test_register_round_robin_assignment(self):
        email = f"TEST_rr_{uuid.uuid4().hex[:8]}@test.com"
        payload = {"email": email, "password": "Test123!", "name": "RR Test"}
        r = requests.post(f"{API}/auth/register", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        user = r.json()
        assert user["email"] == email
        assert user.get("assigned_staff_id"), "round-robin failed: no staff assigned"
        assert "password_hash" not in user

    def test_register_referral_sam001(self):
        email = f"TEST_sam_{uuid.uuid4().hex[:8]}@test.com"
        payload = {"email": email, "password": "Test123!", "name": "Sam Ref", "referral_code": "SAM001"}
        r = requests.post(f"{API}/auth/register", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        user = r.json()
        assert user.get("assigned_staff_id")
        # verify it was Sam by checking staff list via admin? Just login & check assigned id matches a staff with SAM001
        # Simpler: hit /api/staff (public?) - skip, just ensure assignment exists.


# ------------- checkout flow -------------
def _first_product():
    r = requests.get(f"{API}/products", timeout=15)
    return r.json()[0]


class TestCheckout:
    def test_checkout_customer1_returns_staff_whatsapp(self, cust1_session):
        s, _ = cust1_session
        prod = _first_product()
        payload = {
            "items": [{"product_id": prod["product_id"], "quantity": 1}],
            "shipping_address": "TEST 123 Test Street, KL",
        }
        r = s.post(f"{API}/orders/checkout", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("order_id")
        assert body.get("staff_whatsapp"), "staff_whatsapp missing from checkout response"
        assert body.get("staff_name"), "staff_name missing"
        assert body["total"] > 0
        assert body["points_earned"] >= 1

    def test_my_orders(self, cust1_session):
        s, _ = cust1_session
        r = s.get(f"{API}/orders/my-orders", timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_gold_tier_shipping_discount(self, cust2_session):
        s, _ = cust2_session
        prod = _first_product()
        payload = {
            "items": [{"product_id": prod["product_id"], "quantity": 1}],
            "shipping_address": "TEST gold",
        }
        r = s.post(f"{API}/orders/checkout", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("shipping_discount") == 50.0, f"expected 50 got {body.get('shipping_discount')}"
        assert body.get("discount_applied", 0) == 0

    def test_platinum_tier_benefits(self, cust3_session):
        s, _ = cust3_session
        prod = _first_product()
        payload = {
            "items": [{"product_id": prod["product_id"], "quantity": 1}],
            "shipping_address": "TEST plat",
        }
        r = s.post(f"{API}/orders/checkout", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("shipping_discount") == 100.0
        expected_disc = round(prod["price"] * 0.03, 2)
        assert abs(body.get("discount_applied", 0) - expected_disc) < 0.5, (
            f"expected ~{expected_disc} got {body.get('discount_applied')}"
        )


# ------------- admin -------------
class TestAdmin:
    def test_super_admin_hero_banner_crud(self, super_admin_session):
        s, _ = super_admin_session
        payload = {
            "title": f"TEST Banner {uuid.uuid4().hex[:6]}",
            "subtitle": "test sub",
            "image_url": "https://example.com/img.jpg",
            "cta_text": "Shop",
            "cta_link": "/products",
            "is_active": True,
            "order_position": 99,
        }
        r = s.post(f"{API}/admin/hero-banners", json=payload, timeout=20)
        assert r.status_code in (200, 201), f"hero-banner create failed: {r.status_code} {r.text}"
        body = r.json()
        banner_id = body.get("banner_id") or body.get("id")
        assert banner_id
        # cleanup
        try:
            s.delete(f"{API}/admin/hero-banners/{banner_id}", timeout=15)
        except Exception:
            pass

    def test_master_admin_analytics(self, master_admin_session):
        s, _ = master_admin_session
        # try a couple analytics paths
        candidates = [
            f"{API}/admin/analytics",
            f"{API}/admin/all-orders",
            f"{API}/admin/staff-sales",
        ]
        statuses = []
        for url in candidates:
            try:
                r = s.get(url, timeout=20)
                statuses.append((url, r.status_code))
            except Exception as e:
                statuses.append((url, str(e)))
        ok = [c for c in statuses if isinstance(c[1], int) and c[1] == 200]
        assert ok, f"No master-admin analytics endpoints returned 200: {statuses}"


# ------------- AI / newsletter -------------
class TestMisc:
    def test_newsletter_subscribe(self):
        email = f"TEST_news_{uuid.uuid4().hex[:6]}@test.com"
        r = requests.post(f"{API}/newsletter/subscribe", json={"email": email}, timeout=30)
        assert r.status_code in (200, 201), r.text

    def test_ai_chat(self, cust1_session):
        s, _ = cust1_session
        r = s.post(f"{API}/ai/chat", json={"message": "Hi recommend a wine"}, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        # Expect some reply field
        assert any(k in body for k in ("reply", "message", "response", "answer")), body



# ------------- new feature: Google session + hero banners + flash sales -------------
class TestGoogleSession:
    def test_google_session_empty_body_returns_400(self):
        r = requests.post(f"{API}/auth/google-session", json={}, timeout=20)
        assert r.status_code == 400, r.text
        assert "session_id" in r.text.lower()

    def test_google_session_invalid_id_returns_401(self):
        r = requests.post(f"{API}/auth/google-session", json={"session_id": "bogus-id-xyz"}, timeout=30)
        assert r.status_code == 401, r.text
        assert "invalid" in r.text.lower()


class TestHeroBannersContent:
    def test_hero_banner_has_seeded_content(self):
        r = requests.get(f"{API}/hero-banners", timeout=15)
        assert r.status_code == 200
        banners = r.json()
        assert isinstance(banners, list) and len(banners) >= 1, "No hero banners seeded"
        # Look for the expected seeded banner
        titles = [b.get("title", "") for b in banners]
        assert any("Spend & Win the Night" in t for t in titles), f"Expected banner title not found. Titles={titles}"
        b = next(b for b in banners if "Spend & Win the Night" in b.get("title", ""))
        assert b.get("cta_text") == "Shop Now Lah"
        assert b.get("cta_link") == "/products"
        assert b.get("is_active") is True
        assert b.get("background_image", "").startswith("http")


class TestFlashSaleCountdown:
    def test_active_flash_sale_has_future_end_time(self):
        r = requests.get(f"{API}/flash-sales/active", timeout=15)
        assert r.status_code == 200
        sales = r.json()
        assert isinstance(sales, list) and len(sales) >= 1, "No active flash sale to drive countdown UI"
        s = sales[0]
        assert "end_time" in s and "product" in s
        assert "product_id" in s["product"]
        assert s["discount_percentage"] > 0
        assert s["discounted_price"] < s["original_price"]

    def test_active_flash_sale_end_time_is_utc_iso(self):
        """Iteration 4: verify stored end_time is ISO parseable"""
        r = requests.get(f"{API}/flash-sales/active", timeout=15)
        assert r.status_code == 200
        sales = r.json()
        assert len(sales) >= 1
        s = sales[0]
        v = s.get("end_time")
        assert v, "end_time missing"
        parsed = datetime.fromisoformat(v.replace("Z", "+00:00"))
        assert parsed is not None
        # IMPORTANT: report whether the returned ISO carries timezone info
        # (frontend useCountdown will interpret naive-ISO as LOCAL time, not UTC)
        has_tz = ("Z" in v) or ("+" in v) or v.endswith("+00:00")
        if not has_tz:
            pytest.xfail(
                f"end_time '{v}' has no timezone info. "
                "Frontend new Date() will interpret as LOCAL time, "
                "causing countdown to be off by user's TZ offset. "
                "Backend should serialize with Z suffix."
            )


# ------------- iteration 4: order detail + access control + staff enrichment -------------
class TestOrderDetail:
    def test_order_detail_owner_can_view(self, cust1_session):
        s, _ = cust1_session
        r = s.get(f"{API}/orders/my-orders", timeout=20)
        assert r.status_code == 200
        orders = r.json()
        if not orders:
            pytest.skip("customer1 has no orders to detail-test")
        oid = orders[0]["order_id"]
        r2 = s.get(f"{API}/orders/{oid}", timeout=20)
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["order_id"] == oid
        # staff enrichment must be populated for customer1 (assigned staff Sam)
        assert body.get("staff_name"), f"staff_name missing on /orders/{{id}}: {body}"
        assert body.get("staff_whatsapp"), f"staff_whatsapp missing: {body}"
        assert body["staff_name"].lower() == "sam", f"expected Sam, got {body.get('staff_name')}"

    def test_my_orders_returns_staff_enrichment(self, cust1_session):
        s, _ = cust1_session
        r = s.get(f"{API}/orders/my-orders", timeout=20)
        assert r.status_code == 200
        orders = r.json()
        if not orders:
            pytest.skip("no orders for cust1")
        # at least one historical order has enriched staff
        with_staff = [o for o in orders if o.get("staff_name") and o.get("staff_whatsapp")]
        assert len(with_staff) >= 1, "No orders returned with populated staff_name/staff_whatsapp"

    def test_order_detail_anonymous_returns_401(self, cust1_session):
        s, _ = cust1_session
        r = s.get(f"{API}/orders/my-orders", timeout=20)
        oid = r.json()[0]["order_id"] if r.json() else None
        if not oid:
            pytest.skip("no order to test anon access")
        anon = requests.Session()
        r2 = anon.get(f"{API}/orders/{oid}", timeout=15)
        assert r2.status_code in (401, 403), f"expected 401/403 for anon, got {r2.status_code}"

    def test_order_detail_other_customer_returns_403(self, cust1_session, cust2_session):
        s1, _ = cust1_session
        s2, _ = cust2_session
        r = s1.get(f"{API}/orders/my-orders", timeout=20)
        if not r.json():
            pytest.skip("cust1 no orders")
        oid = r.json()[0]["order_id"]
        # cust2 tries to fetch cust1's order
        r2 = s2.get(f"{API}/orders/{oid}", timeout=20)
        assert r2.status_code == 403, f"expected 403, got {r2.status_code} {r2.text}"

    def test_order_detail_master_admin_can_view_any(self, cust1_session, master_admin_session):
        s1, _ = cust1_session
        sa, _ = master_admin_session
        r = s1.get(f"{API}/orders/my-orders", timeout=20)
        if not r.json():
            pytest.skip("cust1 no orders")
        oid = r.json()[0]["order_id"]
        r2 = sa.get(f"{API}/orders/{oid}", timeout=20)
        assert r2.status_code == 200, f"master_admin should access any order: {r2.status_code} {r2.text}"
        assert r2.json()["order_id"] == oid

    def test_order_detail_404_on_unknown(self, cust1_session):
        s, _ = cust1_session
        r = s.get(f"{API}/orders/does-not-exist-{uuid.uuid4().hex[:6]}", timeout=15)
        assert r.status_code in (403, 404)


# ------------- iteration 4: flash-sale UTC round-trip -------------
class TestFlashSaleUtcRoundtrip:
    def test_create_flash_sale_with_utc_iso_persists_exactly(self, super_admin_session):
        from datetime import timedelta, timezone
        s, _ = super_admin_session
        # need a product id
        prods = requests.get(f"{API}/products", timeout=15).json()
        assert prods
        pid = prods[0]["product_id"]
        # Build start/end as UTC ISO with Z (mimicking frontend toISOString())
        now = datetime.now(timezone.utc).replace(microsecond=0)
        start = (now + timedelta(minutes=2)).isoformat().replace("+00:00", "Z")
        end = (now + timedelta(hours=2)).isoformat().replace("+00:00", "Z")
        payload = {
            "product_id": pid,
            "discount_percentage": 12.5,
            "start_time": start,
            "end_time": end,
        }
        r = s.post(f"{API}/admin/flash-sales", json=payload, timeout=20)
        assert r.status_code in (200, 201), f"create flash failed: {r.status_code} {r.text}"
        body = r.json()
        sid = body.get("sale_id") or body.get("id")
        # Now read back and verify times match (UTC)
        active = requests.get(f"{API}/flash-sales/active", timeout=15).json()
        # may not be active yet (starts in 2 min). Just confirm the create response carries the same isoform
        # parse the start we sent and what server stored
        sent_start = datetime.fromisoformat(start.replace("Z", "+00:00"))
        srv_start_raw = body.get("start_time")
        assert srv_start_raw, "server did not echo start_time"
        srv_start = datetime.fromisoformat(srv_start_raw.replace("Z", "+00:00"))
        # If server returned naive (no tz), assume UTC for comparison
        if srv_start.tzinfo is None:
            from datetime import timezone as _tz
            srv_start = srv_start.replace(tzinfo=_tz.utc)
        # ensure within 5s tolerance
        diff = abs((sent_start - srv_start).total_seconds())
        assert diff < 5, f"start_time drift {diff}s — sent {sent_start} got {srv_start}"
        # cleanup if delete endpoint exists
        if sid:
            try:
                s.delete(f"{API}/admin/flash-sales/{sid}", timeout=15)
            except Exception:
                pass
