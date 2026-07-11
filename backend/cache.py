"""Simple in-memory TTL cache shared across the app."""
import time as _time

_store: dict = {}

def cache_get(key: str):
    entry = _store.get(key)
    if entry and _time.time() < entry["exp"]:
        return entry["val"]
    return None

def cache_set(key: str, val, ttl: int = 30, ttl_seconds: int = None):
    if ttl_seconds is not None:
        ttl = ttl_seconds
    _store[key] = {"val": val, "exp": _time.time() + ttl}

def cache_clear(prefix: str = ""):
    keys = [k for k in list(_store.keys()) if not prefix or k.startswith(prefix)]
    for k in keys:
        del _store[k]
