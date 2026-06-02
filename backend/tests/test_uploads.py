"""Tests for upload + CSV bulk import endpoints (iteration 9).

Covers:
- POST /api/admin/upload (image upload, ext validation, auth)
- GET  /api/uploads/<filename> (static serve)
- POST /api/admin/products/bulk-import (CSV parse, idempotent, validation)
"""
import io
import os
import struct
import zlib

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://premium-spirits-app.preview.emergentagent.com").rstrip("/")

SUPER_ADMIN = {"email": "yash@masterliqours.my", "password": "Admin123!"}
CUSTOMER = {"email": "customer1@test.com", "password": "Test123!"}


def _make_png_bytes(w=2, h=2):
    """Generate a minimal valid PNG."""
    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data +
                struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF))
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    raw = b""
    for _ in range(h):
        raw += b"\x00" + b"\xff\x00\x00" * w
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def customer_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER, timeout=15)
    assert r.status_code == 200, f"Customer login failed: {r.status_code} {r.text}"
    return s


# ---------------- Upload endpoint ----------------

class TestUpload:
    def test_upload_png_success(self, admin_session):
        png = _make_png_bytes()
        files = {"file": ("test_upload.png", png, "image/png")}
        r = admin_session.post(f"{BASE_URL}/api/admin/upload", files=files, timeout=15)
        assert r.status_code == 201, f"{r.status_code} {r.text}"
        data = r.json()
        assert "url" in data and data["url"].startswith("/api/uploads/")
        assert data["url"].endswith(".png")
        assert "filename" in data
        assert data["size"] == len(png)
        # Stash for next test
        TestUpload.last_url = data["url"]

    def test_static_serve(self, admin_session):
        assert hasattr(TestUpload, "last_url")
        r = requests.get(f"{BASE_URL}{TestUpload.last_url}", timeout=15)
        assert r.status_code == 200
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_upload_invalid_ext(self, admin_session):
        files = {"file": ("evil.exe", b"MZ\x00\x00", "application/octet-stream")}
        r = admin_session.post(f"{BASE_URL}/api/admin/upload", files=files, timeout=15)
        assert r.status_code == 400
        assert "support" in r.text.lower() or "format" in r.text.lower()

    def test_upload_requires_admin_anon(self):
        files = {"file": ("a.png", _make_png_bytes(), "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files, timeout=15)
        assert r.status_code in (401, 403)

    def test_upload_forbidden_for_customer(self, customer_session):
        files = {"file": ("a.png", _make_png_bytes(), "image/png")}
        r = customer_session.post(f"{BASE_URL}/api/admin/upload", files=files, timeout=15)
        assert r.status_code == 403


# ---------------- CSV bulk import ----------------

class TestBulkImport:
    def test_valid_csv_creates_products(self, admin_session):
        csv_body = (
            "name,price,category,description,image_url\n"
            "TEST_Upload Whisky A,250,Whiskey,From CSV,\n"
            "TEST_Upload Whisky B,310.50,Whiskey,Another,\n"
        )
        files = {"file": ("products.csv", csv_body.encode("utf-8"), "text/csv")}
        r = admin_session.post(f"{BASE_URL}/api/admin/products/bulk-import", files=files, timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text}"
        data = r.json()
        assert "created" in data and "skipped" in data and "errors" in data
        # On first run both created; on rerun both skipped — accept either.
        assert data["created"] + data["skipped"] == 2

    def test_duplicate_names_are_skipped(self, admin_session):
        # Same CSV again → both should be skipped (idempotent by name).
        csv_body = (
            "name,price,category\n"
            "TEST_Upload Whisky A,250,Whiskey\n"
            "TEST_Upload Whisky B,310.50,Whiskey\n"
        )
        files = {"file": ("dupes.csv", csv_body.encode("utf-8"), "text/csv")}
        r = admin_session.post(f"{BASE_URL}/api/admin/products/bulk-import", files=files, timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert data["skipped"] >= 2

    def test_missing_required_columns(self, admin_session):
        csv_body = "name,description\nFoo,bar\n"  # missing price+category
        files = {"file": ("bad.csv", csv_body.encode("utf-8"), "text/csv")}
        r = admin_session.post(f"{BASE_URL}/api/admin/products/bulk-import", files=files, timeout=15)
        assert r.status_code == 400

    def test_non_csv_rejected(self, admin_session):
        files = {"file": ("not_csv.txt", b"hello world", "text/plain")}
        r = admin_session.post(f"{BASE_URL}/api/admin/products/bulk-import", files=files, timeout=15)
        assert r.status_code == 400

    def test_bulk_import_forbidden_for_customer(self, customer_session):
        csv_body = "name,price,category\nFoo,1,Whiskey\n"
        files = {"file": ("x.csv", csv_body.encode("utf-8"), "text/csv")}
        r = customer_session.post(f"{BASE_URL}/api/admin/products/bulk-import", files=files, timeout=15)
        assert r.status_code == 403


# ---------------- Cleanup ----------------

def test_zz_cleanup(admin_session):
    """Delete TEST_-prefixed products created by bulk import tests."""
    r = admin_session.get(f"{BASE_URL}/api/products", timeout=15)
    if r.status_code != 200:
        return
    for p in r.json():
        if (p.get("name") or "").startswith("TEST_Upload Whisky"):
            admin_session.delete(f"{BASE_URL}/api/admin/products/{p['product_id']}", timeout=10)
