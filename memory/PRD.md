# Masterliqours — PRD

## Original Problem Statement
Premium Malaysian liquor e-commerce platform (`masterliqours.my`). Features required by user:
- Email/Password + Google Auth, Resend newsletter, Groq AI chat, Supabase Postgres backend.
- Roles: Master Admin (Jojo/Boss — sees everything), Super Admin (Yash — manages products, hero banners, flash sales, promo timers), Staff (Sam, Logen, Mukesh, Sharvin — handle deliveries & assigned customers), Customer.
- Points/Rewards system: Regular → Gold (5,000 pts: RM50 off shipping) → Platinum (10,000 pts: RM100 off shipping + 3% discount).
- Referral codes (SAM001, LOGEN002, MUKESH003, SHARVIN004) assign new users to a specific staff. AI/round-robin fallback when no code.
- **No payment gateway** — checkout ends with WhatsApp QR / wa.me redirect to the assigned staff (+60126884925 Sam/Mukesh, +60126884924 Logen/Sharvin).
- Visual style: Dark black + white + neon party colors, Malaysian audience, **Manglish** copy ("boss", "lah", "settle", "can", "dengan", "terus").
- Reference style: **Montage Events** (montageevents.my) — dark, huge Bebas Neue display headlines with neon cyan/lime/pink glow, gold logo, floating WhatsApp pill.
- Reference structure: **Mr.Chow** (shopwithmrchow.com) — announcement marquee bar, gold-mascot logo + search header, category chips row, hero carousel, flash sales, product carousels, brands, footer with newsletter.

## Tech Stack
- Frontend: React 19 + Tailwind + Outfit/Bebas Neue + react-icons/fa
- Backend: FastAPI + SQLAlchemy + asyncpg (Supabase Postgres)
- Integrations: Groq (AI chat), Resend (newsletter), WhatsApp click-to-chat
- Auth: session cookie + bcrypt password hash; Emergent Google session exchange ready (`/api/auth/google-session`)

## Architecture
```
/app
├── backend/
│   ├── server.py            # FastAPI app, auth, products, hero, flash-sales
│   ├── routes_orders.py     # /orders/checkout (returns staff_whatsapp + staff_name)
│   ├── routes_admin.py      # banner/product/flash-sale CRUD + analytics
│   ├── routes_staff.py      # /staff/my-orders, /staff/my-stock
│   ├── routes_ai.py         # Groq chat
│   ├── routes_newsletter.py # Resend subscribe
│   ├── models.py, schemas.py, auth_utils.py, database.py
│   └── tests/backend_test.py
└── frontend/src/
    ├── App.js                          # Routes + AnnouncementBar + Navbar + Footer + FloatingWhatsApp + ChatWidget
    ├── context.js                       # AuthProvider + CartProvider (lazy localStorage init)
    ├── index.css                        # Bebas Neue/Outfit, color tokens, btn/surface/card classes
    ├── components/
    │   ├── AnnouncementBar.js          # Hot-pink marquee strip
    │   ├── Navbar.js                   # Gold logo + search + sign-in/cart + nav menu
    │   ├── Footer.js                   # Newsletter + socials + categories
    │   ├── FloatingWhatsApp.js         # Bottom-right green pill
    │   ├── CategoryChips.js            # Horizontal scroll chips row
    │   ├── ProductCard.js              # White card on dark bg, hot-pink price
    │   └── ChatWidget.js               # Groq-backed AI assistant
    └── pages/
        ├── Home.js                     # Hero carousel + chips + flash sales + popular + tiers + how-it-works + CTA
        ├── Products.js                 # Sidebar filters + search + grid
        ├── ProductDetail.js            # White panel + neon-pink price + qty stepper
        ├── Cart.js, Checkout.js        # WhatsApp redirect with assigned staff
        ├── Login.js, Register.js       # Split-screen with image
        └── *Dashboard.js               # User / Staff / SuperAdmin / MasterAdmin
```

## ✅ Implemented (latest changes Feb 2026)
- [Feb 2026] **Flash-sale form TZ-aware**: SuperAdminDashboard now converts datetime-local inputs to UTC ISO via `new Date(str).toISOString()` before POST; UI shows the user's IANA timezone label and a live preview of when the sale will run (stored in UTC).
- [Feb 2026] **Customer order detail page** (`/orders/:id`): new `OrderDetail.js` page with status badge, items list, delivery address, assigned staff card with "Re-send WhatsApp" button (wa.me link); accessible only to the order owner, staff, or admin roles. UserDashboard recent orders now link to this page; Checkout success "View order detail" button also navigates here.
- [Feb 2026] **"Your Active Drops" widget**: new `MyFlashSales.js` shown on home between Category Chips and Flash Sales sections — only rendered for logged-in customers when active flash sales exist; horizontal-scroll cards with per-card live HH:MM:SS countdown.
- [Feb 2026] Backend `/api/orders/:id` and `/api/orders/my-orders` now use `_enrich_with_staff` helper to populate `staff_name` + `staff_whatsapp` on every order (historical orders no longer return null).
- [Feb 2026] Hero carousel reads live banners from `/api/hero-banners` with fallback.
- [Feb 2026] Emergent Google Auth wired (Login button + AuthCallback page).
- [Feb 2026] ProductCard live HH:MM:SS countdown overlay for flash sales.
- [Feb 2026] Backend FastAPI + Supabase wired, seeded with real staff + admins + customers.
- [Feb 2026] All backend endpoints (auth, products, orders, admin, staff, AI, newsletter) verified — 18/18 backend tests PASS.
- [Feb 2026] Order checkout returns `staff_whatsapp` + `staff_name` → Frontend Checkout success screen routes to the assigned staff's WhatsApp.
- [Feb 2026] Full design overhaul matching Montage Events × Mr.Chow references:
  - Pink marquee announcement bar, gold gradient logo, dark sticky navbar with white search bar, neon menu row.
  - Hero with massive Bebas Neue "SPEND & WIN THE NIGHT" headline + hot-pink glow + Manglish subtext + Shop Now Lah CTA + chat ghost button + cyan/lime/gold stats row.
  - Horizontal category chips row (Wine/Beer/Whiskey/Gin/Rum/Vodka/Champagne/Tequila/Sake).
  - Flash sales section with neon-lime marquee strip header.
  - Tier rewards 3-card layout (Regular/Gold/Platinum) with gold and cyan glow borders.
  - How-It-Works 4-step grid with gold-numbered cards.
  - Magenta CTA banner section.
  - Footer with WhatsApp CTA strip, social icons, categories, info, newsletter signup with neon-lime feedback toast.
  - Floating WhatsApp pill bottom-right with green glow shadow.
- [Feb 2026] CartProvider lazy `useState` initializer — survives page reloads.
- [Feb 2026] AuthProvider 401 noise suppressed for anonymous visitors.
- [Feb 2026] Login response wrapped with `UserResponse` schema (no password_hash leak).
- [Feb 2026] Newsletter signup shows visible success toast with green neon styling.

## 🔍 Test Credentials
See `/app/memory/test_credentials.md`

## 🟡 P1 — Next
- Real Emergent Google Auth integration on `/login` (currently form-based, backend `/api/auth/google-session` ready).
- Hero banner CMS — Super Admin should be able to add banner background_image URLs that appear on the home hero carousel (right now hero uses 3 hardcoded slides; backend `/api/hero-banners` already wired and returns data, just needs hero to read from it).
- Flash sale countdown timer on product cards.
- Order detail page for customers (`/orders/:id`) with staff-WhatsApp re-send button.

## 🟢 P2 — Future
- Wishlist / favourites.
- Bulk Purchase landing page (route exists in nav).
- Cocktales section (cocktail recipes) per Mr.Chow inspiration.
- Multi-currency display.
- SMS notifications when staff updates order status.
- Real brand carousel section with actual brand logos.

## 🐞 Known Non-Blocking
- React-hooks/exhaustive-deps ESLint warnings in `ProductDetail.js`, `Products.js`, `SuperAdminDashboard.js` (function deps). Compiles + runs fine.
- Backend uses `datetime.utcnow()` (deprecated in Py 3.12+). Should migrate to `datetime.now(timezone.utc)`.
