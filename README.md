# QLekha by ForjitAI

> **Design. Quote. Close.**

India's AI-powered platform for aluminium, UPVC & glass window businesses.

## 🚀 What is QLekha?

QLekha is a SaaS product by [ForjitAI](https://forjitai.com) that helps window fabricators, dealers and contractors:
- Create professional quotes in under 5 minutes
- Send PDF directly to client's WhatsApp
- Manage billing — Proforma Invoice, Tax Invoice, Receipt
- Auto-generate workshop cutting lists
- Track payments and outstanding amounts
- Works in 14 Indian languages

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| PDF | React-PDF |
| WhatsApp | WhatsApp Cloud API (Meta) |
| Payments | Razorpay |
| Hosting | Vercel |
| i18n | i18next (14 Indian languages) |

## 📁 Project Structure

```
qlekha/
├── frontend/              # React app
│   ├── src/
│   │   ├── pages/         # All screens
│   │   ├── components/    # Reusable UI
│   │   ├── lib/           # Supabase client
│   │   └── styles/        # Global CSS
│   ├── package.json
│   └── vite.config.js
├── database/
│   └── schema.sql         # Full Supabase schema
├── .env.example
└── README.md
```

## ⚡ Quick Start

```bash
# Clone
git clone https://github.com/forjitai/QLekha.git
cd QLekha/frontend

# Install
npm install

# Set env vars
cp ../.env.example .env.local
# Fill in your Supabase URL + anon key

# Run
npm run dev
```

## 🌐 Languages Supported
English, हिन्दी, ಕನ್ನಡ, தமிழ், తెలుగు, മലയാളം, ગુજરાતી, मराठी, ਪੰਜਾਬੀ, বাংলা, ଓଡ଼ିଆ, অসমীয়া, اردو, राजस्थानी

## 📄 License
MIT © ForjitAI 2025
