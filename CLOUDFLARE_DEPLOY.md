# Masterliqours — Production Deploy Guide

Free-tier stack: **Cloudflare Pages** (frontend) + **Fly.io** (backend) + **Cloudflare R2** (uploads) + **Supabase** (DB).
Total cost: **RM 0/month** for low-traffic.

---

## 0. One-time Prep (5 min)

### Push code to GitHub
1. In Emergent chat input, click **"Save to GitHub"** → push repo to your own GitHub account.
2. Confirm `/app/backend/`, `/app/frontend/`, `Dockerfile`, `fly.toml`, `_redirects` are all committed.

### Install CLIs locally
```bash
# Fly.io CLI
curl -L https://fly.io/install.sh | sh
# Then sign up: fly auth signup
```

---

## 1. Deploy Backend to Fly.io (10 min)

```bash
# clone your repo locally (or use github codespace)
git clone https://github.com/<you>/masterliqours.git
cd masterliqours/backend

# Login to fly
fly auth login

# Launch — fly.toml is already configured
fly launch --no-deploy --copy-config

# Set ALL secrets (NEVER commit these)
fly secrets set \
  DATABASE_URL="postgresql://postgres.nfueiblvvwwwvefmtoxw:ckKet4b69IlSwuhP@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true" \
  DIRECT_URL="postgresql://postgres.nfueiblvvwwwvefmtoxw:ckKet4b69IlSwuhP@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres" \
  SUPABASE_URL="https://nfueiblvvwwwvefmtoxw.supabase.co" \
  SUPABASE_SERVICE_KEY="<value from /app/backend/.env>" \
  RESEND_API_KEY="<value>" \
  SENDER_EMAIL="noreply@masterliqours.my" \
  GROQ_API_KEY="<value>" \
  WHATSAPP_TOKEN="<value>" \
  EMERGENT_LLM_KEY="<value>" \
  FRONTEND_URL="https://masterliqours.my" \
  DOMAIN="masterliqours.my" \
  TWILIO_ACCOUNT_SID="<value>" \
  TWILIO_AUTH_TOKEN="<value>" \
  TWILIO_FROM_NUMBER="+60126884924" \
  GOOGLE_CLIENT_ID="450907493101-mhk979qslefhps32sfipj1tgvsq61d82.apps.googleusercontent.com" \
  GOOGLE_CLIENT_SECRET="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" \
  R2_ACCOUNT_ID="52c1d557ffffc7359a34d5ddeffc037d" \
  R2_ACCESS_KEY_ID="ac9dfd7fa02cc99fe5236d0e02145d04" \
  R2_SECRET_ACCESS_KEY="56735eec71006e54e825c482744248caf1e252dd90298fac01bb5a21d4cf7c90" \
  R2_BUCKET="masterliqours-uploads" \
  R2_PUBLIC_URL="https://pub-6149577759724680adcfe08ef87d3022.r2.dev"

# Deploy
fly deploy

# Verify
fly status
curl https://masterliqours-api.fly.dev/api/health
```

You should see `{"status":"healthy"}`. Your backend is now live at `https://masterliqours-api.fly.dev`.

### Attach custom domain `api.masterliqours.my`
```bash
fly certs add api.masterliqours.my
fly certs show api.masterliqours.my   # gives you the DNS values to add
```

Then in **Cloudflare DNS** (step 3) add a CNAME `api` → `masterliqours-api.fly.dev` (proxied 🟠 OFF — see note in step 3).

---

## 2. Deploy Frontend to Cloudflare Pages (5 min)

1. Go to https://dash.cloudflare.com → **Workers & Pages** → Create → **Pages** → **Connect to Git**
2. Select your GitHub repo `masterliqours`
3. Build config:
   - **Project name**: `masterliqours`
   - **Production branch**: `main`
   - **Build command**: `cd frontend && yarn install && yarn build`
   - **Build output directory**: `frontend/build`
   - **Root directory**: leave blank (use repo root)
4. **Environment Variables** (Production):
   ```
   REACT_APP_BACKEND_URL = https://api.masterliqours.my
   REACT_APP_GOOGLE_CLIENT_ID = 450907493101-mhk979qslefhps32sfipj1tgvsq61d82.apps.googleusercontent.com
   REACT_APP_DOMAIN = masterliqours.my
   NODE_VERSION = 18
   ```
5. Click **Save and Deploy**. Wait ~3 min for first build.

### Attach custom domain `masterliqours.my`
In Pages → your project → **Custom domains** → **Set up a custom domain** → enter `masterliqours.my` and `www.masterliqours.my`. Cloudflare auto-creates the DNS records.

---

## 3. Cloudflare DNS Records

In Cloudflare → `masterliqours.my` → **DNS** tab, you should have:

| Type  | Name | Target                          | Proxy |
|-------|------|---------------------------------|-------|
| CNAME | @    | masterliqours.pages.dev         | 🟠 ON  |
| CNAME | www  | masterliqours.pages.dev         | 🟠 ON  |
| CNAME | api  | masterliqours-api.fly.dev       | ⚫ OFF |

**Important**: `api` must be **DNS-only (proxy OFF)** otherwise Cloudflare's WebSocket/Stream proxy can break the session cookie's `SameSite=None; Secure` flow and Fly's healthcheck. If you want full Cloudflare proxy on the API, enable "Always Use HTTPS" only and skip Rocket Loader / Auto Minify for `/api/*`.

---

## 4. Google OAuth Console — Update Redirect URIs

Add these to your OAuth Client at https://console.cloud.google.com:

**Authorized JavaScript origins**:
- `https://masterliqours.my`
- `https://www.masterliqours.my`
- `https://premium-spirits-app.preview.emergentagent.com` (for preview)
- `http://localhost:3000` (for dev)

**Authorized redirect URIs**:
- `https://masterliqours.my/auth/google/callback`
- `https://www.masterliqours.my/auth/google/callback`
- `https://premium-spirits-app.preview.emergentagent.com/auth/google/callback`
- `http://localhost:3000/auth/google/callback`

Save. Wait ~30 sec for propagation.

---

## 5. Post-Deploy Checklist

- [ ] `https://masterliqours.my` loads the homepage
- [ ] `https://api.masterliqours.my/api/health` returns `{"status":"healthy"}`
- [ ] Login with `yash@masterliqours.my` / `Admin123!` works
- [ ] "Continue with Google" button → reaches Google → returns to `/auth/google/callback` → logs you in
- [ ] Admin → Staff → create staff → temp password shown
- [ ] Admin → Products → upload a product image → image URL starts with `https://pub-...r2.dev/...` (R2!)
- [ ] Cart → Checkout → WhatsApp QR redirect works

---

## 6. Ongoing Costs

| Service           | Free Tier                       | Pay Trigger             |
|-------------------|---------------------------------|--------------------------|
| Cloudflare Pages  | Unlimited bandwidth + 500 builds/mo | Mostly never |
| Cloudflare R2     | 10GB storage + zero egress      | After 10GB stored        |
| Fly.io            | 3 shared VMs (256MB) free       | Scaling beyond 3 VMs     |
| Supabase          | 500MB DB + 5GB bandwidth        | Heavy reads or DB growth |
| Twilio SMS        | Pay-as-you-go (~RM 0.20/SMS)    | Per SMS                  |
| Resend            | 3000 emails/mo free             | Beyond 3000 emails       |

Realistic monthly bill for low traffic Malaysia ecommerce: **RM 0 – RM 10**.

---

## 7. Troubleshooting

| Issue                          | Fix                                                                  |
|--------------------------------|----------------------------------------------------------------------|
| `redirect_uri_mismatch`        | Add exact URL to Google Console (step 4)                             |
| Cookie not persisting          | Confirm DNS `api` is **proxy OFF** and `SameSite=None;Secure` cookie |
| Fly app sleeping               | `min_machines_running = 1` in fly.toml (already set)                |
| R2 image 403                   | Bucket → Settings → Public Access → enable r2.dev subdomain          |
| Build fails on Cloudflare      | Set `NODE_VERSION=18` env var                                        |
| CORS error in browser console  | `fly secrets set CORS_ORIGINS="https://masterliqours.my,..."`        |

---

🍻 **Selamat lah boss, you're live!**
