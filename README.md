# Masterliqours E-Commerce Platform 🥃

Satu platform e-commerce yang lengkap untuk jual minuman keras dengan sistem rewards, staff management, dan AI chatbot!

## 🚀 Quick Start

### 1. Add Your API Keys

Edit `/app/backend/.env` file dan replace placeholders with your real keys:

```bash
# Supabase Database (WAJIB!)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Resend for Newsletter
RESEND_API_KEY="re_your_actual_key_here"
SENDER_EMAIL="noreply@yourdomain.com"

# Groq AI for Chatbot & Recommendations
GROQ_API_KEY="gsk_your_actual_key_here"
```

### 2. Setup Database

Once you add your Supabase URL, run migrations:

```bash
cd /app/backend
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### 3. Start the App

```bash
sudo supervisorctl restart all
```

---

## 📋 Features

### For Customers (Users)
- 🛒 Browse products & add to cart
- 💳 Checkout dengan WhatsApp QR payment
- 🎁 Earn points on every order
- ⭐ Tier system: Regular → Gold (5000 pts) → Platinum (10000 pts)
- 💰 Discounts: Gold (RM50 off shipping), Platinum (RM100 off + 3% discount)
- 🤖 AI chatbot for support
- 📧 Weekly newsletter promotions

### For Staff (4 Members)
- 📦 Manage their own customer orders
- 📊 View their assigned customers
- 📱 Display their WhatsApp QR for payments
- 📈 Track their stock inventory
- ✅ Update order status

### For Super Admin
- 🏷️ Manage all products (add/edit/delete)
- ⚡ Create flash sales
- 🎫 Manage discount codes
- 💰 Update pricing

### For Master Admin (Top Boss)
- 👀 View ALL sales across all staff
- 📋 See ALL pending orders
- 📊 Staff performance analytics
- 🔧 Full system control

---

## 🎨 Design

Dark black/white theme dengan neon party colors (akan dibuat stunning! 🎉)

---

## 🔑 How to Get API Keys

### Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Click "Connect" → Select "Transaction Pooler"
4. Copy the connection string

### Resend
1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. Create API key
3. Copy the key (starts with `re_`)

### Groq
1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Create API key
3. Copy the key (starts with `gsk_`)

---

## 🎯 User Tiers & Benefits

| Tier | Points Required | Benefits |
|------|----------------|----------|
| Regular | 0 - 4,999 | Standard |
| Gold | 5,000 - 9,999 | RM50 off shipping |
| Platinum | 10,000+ | RM100 off shipping + 3% discount |

---

## 👥 System Roles

| Role | Access Level | Responsibilities |
|------|-------------|------------------|
| Customer | User | Shop, order, earn points |
| Staff (4x) | Limited Admin | Manage own orders & stock |
| Super Admin | Product Admin | Manage products, sales, discounts |
| Master Admin | Full Admin | Everything - sales, orders, analytics |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS, Radix UI
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Emergent Google Auth + Email/Password
- **Email**: Resend
- **AI**: Groq (Llama 3.3)

---

## 📝 Development Notes

Built by Emergent AI Agent E1
Language: Manglish for Malaysian market
Inspired by: shopwithmrchow.com

---

Siap untuk launch! 🚀 Once you add the API keys, everything akan berfungsi dengan sempurna!
