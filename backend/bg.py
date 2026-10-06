"""Fire-and-forget background work for slow, non-critical side effects
(push notifications, emails, SMS). These must never make a customer wait or
block the event loop. Errors are logged, never raised."""
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)
_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="bg")


def fire_and_forget(fn, *args, **kwargs):
    def _run():
        try:
            fn(*args, **kwargs)
        except Exception:  # noqa: BLE001
            logger.exception("Background task %s failed", getattr(fn, "__name__", fn))
    _pool.submit(_run)
