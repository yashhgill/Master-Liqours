"""
Shared rate limiter.

Defined in its own module so that both server.py and the individual route
modules can import it without creating a circular import (server.py imports
the routers, so the routers cannot import from server.py).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
