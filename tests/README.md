# QLekha Test Suite

Complete unit, integration, and UI tests for QLekha.

## Setup

```bash
cd qlekha-tests
npm install
```

Create `.env.test` for integration tests:
```
SUPABASE_URL=https://yqtgfgvcohuwaaugxlrz.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

---

## Run Tests

| Command | What it runs |
|---|---|
| `npm test` | All tests |
| `npm run test:unit` | Unit tests only (no DB needed) |
| `npm run test:integration` | DB integration tests (needs Supabase) |
| `npm run test:ui` | UI component tests |
| `npm run test:coverage` | With coverage report |
| `npm run test:watch` | Watch mode during development |

---

## Test Coverage

### Unit Tests (`unit/`)

#### `auth.test.js` — 18 tests
| Test | What it checks |
|---|---|
| Signup Validation | Empty email, short password, mismatched passwords |
| Supabase Signup | signUp called correctly, already-registered error, rate limit |
| Login | signInWithPassword called, wrong password, unconfirmed email |
| OTP Verification | Short OTP rejected, 6-digit accepted, whitespace stripped |
| Onboarding Validation | Required fields, trial expiry |

#### `quote.test.js` — 22 tests
| Test | What it checks |
|---|---|
| Profile Price | Perimeter cost, missing profile, zero price |
| Glass Price | Area in sqft, missing glass, combined cost |
| GST Calculation | 0%, 18%, 28%, qty multiplier |
| Grand Total | Subtotal, GST amount, combined total |
| Discount & Installation | Subtraction, addition, negative guard |
| Quote Number | Format Q-YYYY-NNNN, 4-digit suffix |
| Quote Validity | 15-day, 30-day, future date |

#### `utils.test.js` — 24 tests
| Test | What it checks |
|---|---|
| normalisePhone | 10-digit, 12-digit, strips spaces/dashes/+ |
| fmt (KPI formatter) | 0, hundreds, K (thousands), L (lakhs) |
| fmtINR (PDF formatter) | Indian comma format, 2 decimals |
| fmtDate | ISO date, null handling |
| WhatsApp message builder | Quote message, invoice message, wa.me URL |
| Trial Days | 14-day calculation, expired, warning threshold |
| Invoice Status | Paid detection, partial, overdue |

---

### Integration Tests (`integration/`)

#### `database.test.js` — 20 tests
| Test | What it checks |
|---|---|
| Companies | Read, update settings |
| Clients | Insert, search by name, update |
| Stock: Profiles | Insert, update price, list, delete |
| Stock: Glass | Insert, update price |
| Quotes | Create, add items, status updates (draft→sent→approved) |
| Invoices | Convert from quote, record payment, mark paid |
| Dashboard KPIs | Count queries, sum revenue, recent quotes |

---

### UI Tests (`ui/`)

#### `components.test.jsx` — 18 tests
| Test | What it checks |
|---|---|
| Landing Page | Brand name, CTA buttons render |
| Login Form | Empty validation, calls handler with credentials |
| Signup Form | Short password error, mismatch error, valid submit |
| OTP Input | Incomplete OTP rejected, 6-digit accepted |
| Quote Wizard Steps | All 4 steps render, active step, completed checkmarks |
| Window Entry Form | Type selector, adds window with correct values |
| Invoice Status Badge | Pending=amber, paid=green, overdue=red |
| Sign Out | Calls signOut on click |

---

## Test Architecture

```
qlekha-tests/
├── unit/
│   ├── auth.test.js        ← Auth logic (no DOM, no DB)
│   ├── quote.test.js       ← Pricing calculations
│   └── utils.test.js       ← Phone, currency, date utilities
├── integration/
│   └── database.test.js    ← Real Supabase DB operations
├── ui/
│   └── components.test.jsx ← React component rendering + interactions
├── vitest.config.js
├── setup.js
└── package.json
```

## Key Design Decisions

- **Unit tests** are pure functions — no mocking needed for calculations
- **Integration tests** create isolated test data with a `__TEST_COMPANY__` marker and clean up after themselves
- **UI tests** mock Supabase so they work offline and run fast
- All tests run in under 30 seconds combined (unit + UI)
- Integration tests require network access to Supabase
