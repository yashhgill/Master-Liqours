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
- [Feb 2026] **Super Admin UX overhaul**:
  - New `POST /api/admin/upload` (multipart, 8MB cap, image-ext whitelist) + `POST /api/admin/products/bulk-import` (CSV).
  - Static mount `/api/uploads/` serving `/app/backend/uploads`.
  - New frontend `ImageUploader` component (drag-drop + preview + clear/replace) used in all admin forms.
  - New `resolveImageUrl()` helper auto-resolves relative `/api/uploads/...` to absolute via `REACT_APP_BACKEND_URL`.
  - SuperAdminDashboard fully rebuilt: every Product / Banner / Brand row has EDIT (PATCH) + DELETE buttons + label-driven forms with live previews.
  - Product tab now has a CSV bulk-import button + Sample CSV download + client-side search filter.
  - Tabs reordered to Products → Banners → Flash Sales → Brands.
- [Feb 2026] **"Made with Emergent" badge** hidden via inline `display:none !important` in `frontend/public/index.html`.
- [Feb 2026] Brand CMS (`/api/brands` + `/api/admin/brands` CRUD), Drink Reveal, Staff status workflow, Twilio SMS dormant, Order detail, MyFlashSales widget, Hero CMS, Emergent Google Auth, ProductCard countdown — all active.
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
