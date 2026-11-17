"""First-party business analytics for Masterliqours.

POST /api/analytics/collect  - events from the site (sent via the Cloudflare
                               Pages Function /t, which adds country/state/city)
GET  /api/admin/analytics    - dashboard data (master / super admin only)

Privacy: no cookies, no IP addresses, no personal data. A random id per browser
tab session is used to count visitors.
"""
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from auth_utils import get_current_user, require_role
from database import get_db
from models import AnalyticsEvent, Order, OrderItem, OrderStatus, Product, Stock, User, UserRole

router = APIRouter(tags=["analytics"])
MYT = timedelta(hours=8)
TYPES = {"pageview", "product_view", "search", "add_to_cart", "checkout", "order", "whatsapp", "outbound", "category", "brand"}
BOT_RE = re.compile(r"bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp/|telegrambot|python|curl|wget|httpclient|monitor|uptime", re.I)

SOURCES = [
    ("Google", r"google\."), ("Bing", r"bing\.com"), ("ChatGPT", r"chatgpt\.com|chat\.openai\.com|openai\.com"),
    ("Perplexity", r"perplexity\.ai"), ("Claude", r"claude\.ai"), ("Gemini", r"gemini\.google"),
    ("Instagram", r"instagram\.com"), ("Facebook", r"facebook\.com|fb\.com|m\.facebook"), ("TikTok", r"tiktok\.com"),
    ("WhatsApp", r"whatsapp\.com|wa\.me"), ("Telegram", r"t\.me|telegram"), ("YouTube", r"youtube\.com|youtu\.be"),
    ("X / Twitter", r"twitter\.com|x\.com|t\.co"), ("Threads", r"threads\.net"), ("Yahoo", r"yahoo\."), ("DuckDuckGo", r"duckduckgo"),
]


def _source(ref_host: str, utm: str) -> str:
    if utm:
        u = utm.lower()
        for name, _ in SOURCES:
            if name.lower().split(' ')[0] in u:
                return name
        if u in ("ig",):
            return "Instagram"
        if u in ("fb",):
            return "Facebook"
        if u in ("wa",):
            return "WhatsApp"
        return utm[:40]
    if not ref_host:
        return "Direct"
    for name, rx in SOURCES:
        if re.search(rx, ref_host, re.I):
            return name
    return ref_host[:40]


def _device(ua: str) -> str:
    if re.search(r"ipad|tablet", ua, re.I):
        return "Tablet"
    if re.search(r"mobi|iphone|android", ua, re.I):
        return "Mobile"
    return "Desktop"


def _browser(ua: str) -> str:
    for name, rx in [("Instagram app", r"Instagram"), ("Facebook app", r"FBAN|FBAV"), ("TikTok app", r"musical_ly|TikTok"),
                     ("Edge", r"Edg/"), ("Samsung", r"SamsungBrowser"), ("Opera", r"OPR/"), ("Chrome", r"Chrome/|CriOS"),
                     ("Firefox", r"Firefox|FxiOS"), ("Safari", r"Safari")]:
        if re.search(rx, ua):
            return name
    return "Other"


class CollectIn(BaseModel):
    type: str
    session_id: str = Field(max_length=40)
    path: Optional[str] = None
    referrer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_campaign: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    category: Optional[str] = None
    in_stock: Optional[bool] = None
    query: Optional[str] = None
    results: Optional[int] = None
    value: Optional[float] = None
    # added by the Cloudflare function
    ua: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None


@router.post("/analytics/collect", status_code=204)
async def collect(data: CollectIn, x_analytics_key: Optional[str] = Header(None), db: AsyncSession = Depends(get_db)):
    key = os.environ.get("ANALYTICS_KEY")
    if key and x_analytics_key != key:
        raise HTTPException(status_code=403, detail="forbidden")
    if data.type not in TYPES:
        return None
    ua = data.ua or ""
    if BOT_RE.search(ua):
        return None
    path = (data.path or "")[:300]
    if path.startswith(("/admin", "/staff", "/master")):
        return None
    ref = (data.referrer or "").strip()
    ref_host = ""
    if ref:
        m = re.match(r"^[a-z]+://([^/]+)", ref, re.I)
        ref_host = (m.group(1) if m else ref)[:200].lower()
        if ref_host.endswith("masterliqours.my"):
            ref_host = ""
    db.add(AnalyticsEvent(
        type=data.type, session_id=data.session_id[:40], path=path,
        source=_source(ref_host, (data.utm_source or "").strip()), referrer=ref_host or None,
        utm_source=(data.utm_source or None) and data.utm_source[:80], utm_campaign=(data.utm_campaign or None) and data.utm_campaign[:120],
        country=(data.country or None) and data.country[:4], region=(data.region or None) and data.region[:80], city=(data.city or None) and data.city[:80],
        device=_device(ua), browser=_browser(ua),
        product_id=(data.product_id or None) and data.product_id[:36], product_name=(data.product_name or None) and data.product_name[:255],
        category=(data.category or None) and data.category[:60], in_stock=data.in_stock,
        query=(data.query or None) and data.query.strip().lower()[:120], results=data.results, value=data.value,
    ))
    await db.commit()
    return None


def _top(counter: Counter, n=10):
    return [{"name": k, "count": v} for k, v in counter.most_common(n) if k]


@router.get("/admin/analytics")
async def dashboard(days: int = Query(30, ge=1, le=365), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await require_role(user, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN)
    now = datetime.utcnow()
    since = now - timedelta(days=days)
    prev_since = since - timedelta(days=days)

    rows = (await db.execute(
        select(AnalyticsEvent.ts, AnalyticsEvent.type, AnalyticsEvent.session_id, AnalyticsEvent.path, AnalyticsEvent.source,
               AnalyticsEvent.utm_campaign, AnalyticsEvent.country, AnalyticsEvent.region, AnalyticsEvent.city,
               AnalyticsEvent.device, AnalyticsEvent.browser, AnalyticsEvent.product_id, AnalyticsEvent.product_name,
               AnalyticsEvent.category, AnalyticsEvent.in_stock, AnalyticsEvent.query, AnalyticsEvent.results)
        .where(AnalyticsEvent.ts >= since).limit(500000)
    )).all()

    prev = (await db.execute(
        select(AnalyticsEvent.type, func.count(), func.count(func.distinct(AnalyticsEvent.session_id)))
        .where(AnalyticsEvent.ts >= prev_since, AnalyticsEvent.ts < since).group_by(AnalyticsEvent.type)
    )).all()
    prev_counts = {t: c for t, c, _ in prev}
    prev_visitors = (await db.execute(select(func.count(func.distinct(AnalyticsEvent.session_id))).where(AnalyticsEvent.ts >= prev_since, AnalyticsEvent.ts < since))).scalar() or 0

    sessions = set()
    by_type = Counter()
    daily = defaultdict(lambda: {"visitors": set(), "views": 0})
    hours = Counter()
    sources, campaigns, countries, regions, cities, devices, browsers, pages = (Counter() for _ in range(8))
    session_source = {}
    session_region = {}
    viewed, view_meta, carted, categories = Counter(), {}, Counter(), Counter()
    searches, zero_searches = Counter(), Counter()
    funnel = defaultdict(set)

    for r in rows:
        (ts, typ, sid, path, src, camp, country, region, city, device, browser, pid, pname, cat, instock, q, results) = r
        sessions.add(sid)
        by_type[typ] += 1
        funnel[typ].add(sid)
        local = ts + MYT
        day = local.strftime("%Y-%m-%d")
        daily[day]["visitors"].add(sid)
        if typ == "pageview":
            daily[day]["views"] += 1
            hours[local.hour] += 1
            pages[(path or "/").split("?")[0][:80]] += 1
            if sid not in session_source:
                session_source[sid] = src or "Direct"
                if camp:
                    campaigns[camp] += 1
                countries[country or "?"] += 1
                if country == "MY" and region:
                    regions[region] += 1
                if city:
                    cities[city] += 1
                devices[device or "?"] += 1
                browsers[browser or "?"] += 1
        elif typ == "product_view" and pid:
            viewed[pid] += 1
            view_meta[pid] = (pname, cat, instock)
            if cat:
                categories[cat] += 1
        elif typ == "add_to_cart" and pid:
            carted[pid] += 1
            view_meta.setdefault(pid, (pname, cat, instock))
        elif typ == "search" and q:
            searches[q] += 1
            if results == 0:
                zero_searches[q] += 1
        elif typ == "category" and cat:
            categories[cat] += 1
    for s in session_source.values():
        sources[s] += 1

    # Live stock for the products people looked at
    pids = list({*viewed.keys(), *carted.keys()})
    stock = {}
    if pids:
        for pid, qty in (await db.execute(select(Stock.product_id, func.coalesce(func.sum(Stock.quantity), 0)).where(Stock.product_id.in_(pids)).group_by(Stock.product_id))).all():
            stock[pid] = int(qty or 0)
        names = {p: n for p, n in (await db.execute(select(Product.product_id, Product.name).where(Product.product_id.in_(pids)))).all()}
    else:
        names = {}

    def prod_row(pid, n):
        pname, cat, _ = view_meta.get(pid, (None, None, None))
        return {"product_id": pid, "name": names.get(pid) or pname or pid, "category": cat, "views": viewed.get(pid, 0),
                "carts": carted.get(pid, 0), "stock": stock.get(pid, 0)}

    top_viewed = [prod_row(p, n) for p, n in viewed.most_common(15)]
    stock_these = [r for r in (prod_row(p, n) for p, n in viewed.most_common(200)) if r["stock"] <= 0][:15]

    # Orders from the shop itself (Malaysia-time days)
    orders = (await db.execute(select(Order.created_at, Order.total, Order.status).where(Order.created_at >= since))).all()
    valid = [o for o in orders if o[2] != OrderStatus.CANCELLED]
    for o in valid:
        day = (o[0] + MYT).strftime("%Y-%m-%d")
        daily[day].setdefault("orders", 0)
        daily[day]["orders"] = daily[day].get("orders", 0) + 1

    start_local = (since + MYT).date()
    series = []
    for i in range(days + 1):
        d = (start_local + timedelta(days=i)).strftime("%Y-%m-%d")
        v = daily.get(d, {"visitors": set(), "views": 0})
        series.append({"day": d, "visitors": len(v["visitors"]), "views": v["views"], "orders": v.get("orders", 0)})

    visitors = len(sessions)
    return {
        "days": days,
        "summary": {
            "visitors": visitors, "visitors_prev": prev_visitors,
            "pageviews": by_type["pageview"], "pageviews_prev": prev_counts.get("pageview", 0),
            "product_views": by_type["product_view"], "searches": by_type["search"],
            "add_to_cart": by_type["add_to_cart"], "checkouts": by_type["checkout"], "whatsapp": by_type["whatsapp"],
            "orders": len(valid), "revenue": round(sum(o[1] or 0 for o in valid), 2),
            "conversion": round(100 * len(valid) / visitors, 2) if visitors else 0,
        },
        "funnel": [
            {"step": "Visited", "count": visitors},
            {"step": "Viewed a bottle", "count": len(funnel["product_view"])},
            {"step": "Added to cart", "count": len(funnel["add_to_cart"])},
            {"step": "Started checkout", "count": len(funnel["checkout"])},
            {"step": "Placed order", "count": len(funnel["order"])},
        ],
        "daily": series,
        "hours": [{"hour": h, "count": hours.get(h, 0)} for h in range(24)],
        "sources": _top(sources, 12), "campaigns": _top(campaigns, 10),
        "countries": _top(countries, 10), "regions": _top(regions, 16), "cities": _top(cities, 15),
        "devices": _top(devices, 5), "browsers": _top(browsers, 8), "pages": _top(pages, 15),
        "categories": _top(categories, 12),
        "top_viewed": top_viewed,
        "stock_these": stock_these,
        "top_carted": [prod_row(p, n) for p, n in carted.most_common(10)],
        "searches": _top(searches, 20),
        "zero_searches": _top(zero_searches, 20),
    }
