# Contributing to QLekha

## Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/QLekha.git`
3. Install dependencies: `cd frontend && npm install`
4. Copy env vars: `cp .env.example .env.local`
5. Fill in your Supabase credentials
6. Run: `npm run dev`

## Stack
- React 18 + Vite + Tailwind CSS
- Supabase (PostgreSQL + Auth + Storage)
- React Router v6
- i18next (14 Indian languages)

## Branching
- `main` — production
- `develop` — staging
- `feature/xxx` — new features
- `fix/xxx` — bug fixes

## PR Guidelines
- One feature per PR
- Include screenshots for UI changes
- Test on mobile (375px width)
