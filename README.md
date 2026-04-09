# SY DATA SUB 📱 — Buy Data Instantly

Nigeria's fastest data delivery platform. Buy data for all networks at competitive prices with instant delivery.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [API Routes](#api-routes)
- [Database Setup](#database-setup)
- [Deployment](#deployment)
- [Flutterwave Integration](#flutterwave-integration)
- [Admin Panel](#admin-panel)
- [Data Plan Seeding](#data-plan-seeding)

---

## Overview

**SY DATA SUB** is a comprehensive fintech platform for purchasing mobile data and airtime in Nigeria. It features:

- ✅ **Multi-Network Support** - MTN, Airtel, Glo, 9Mobile
- ✅ **Real-Time Balance Management** - Instant balance updates
- ✅ **Payment Integration** - Flutterwave payment gateway
- ✅ **Automatic Rewards** - Bonus credits on deposits
- ✅ **Admin Dashboard** - Complete management panel
- ✅ **Agent Program** - Affiliate-style earning model
- ✅ **Guest Checkout** - One-time purchases without registration

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | TailwindCSS 4, Framer Motion |
| **Database** | PostgreSQL (Neon Serverless), Prisma 7 |
| **Authentication** | JWT (jose), next-themes |
| **Data Fetching** | React Query, axios |
| **Payment Gateway** | Flutterwave API |
| **UI Components** | shadcn/ui, Recharts |
| **Validation** | Zod |
| **Hashing** | bcryptjs |
| **State Management** | Zustand |
| **Hosting** | Vercel |

---

## Local Development

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** or **yarn**
- PostgreSQL database (or Neon account)
- Flutterwave account
- API A and API B data delivery partners

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd sy-data-sub
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. **Setup database**
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

5. **Run development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Admin Credentials (After Seeding)

- **Phone**: `08000000000`
- **PIN**: `000000`
- **URL**: `http://localhost:3000/admin`

---

## Environment Variables

Create a `.env.local` file with the following variables:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| **NODE_ENV** | Environment (development/production) | `development` | ✅ |
| **DATABASE_URL** | Neon PostgreSQL connection string | `postgresql://user:pass@...` | ✅ |
| **JWT_SECRET** | Secret key for JWT signing (min 32 chars) | `your-very-long-secret-key-min-32-chars` | ✅ |
| **NEXT_PUBLIC_APP_URL** | Public application URL | `http://localhost:3000` | ✅ |
| **FLUTTERWAVE_PUBLIC_KEY** | Flutterwave public key (test/live) | `FLWPUB_TEST_...` | ✅ |
| **FLUTTERWAVE_SECRET_KEY** | Flutterwave secret key | `FLWSECK_TEST_...` | ✅ |
| **FLUTTERWAVE_WEBHOOK_SECRET** | Webhook signature secret | `fs_test_webhook_...` | ✅ |
| **FLW_ACCOUNT_EMAIL** | Flutterwave account email | `your-flw-email@example.com` | ✅ |
| **FLW_BVN** | Flutterwave BVN (for virtual accounts) | `12345678901` | ✅ |
| **SMEPLUG_API_KEY** | API A data provider key | `sk_test_...` | ✅ |
| **SMEPLUG_BASE_URL** | API A base URL | `https://api.smeplug.com/` | ✅ |
| **SAIFUL_API_KEY** | API B data provider key | `sk_...` | ✅ |
| **SAIFUL_BASE_URL** | API B base URL | `https://api.saiful.com/` | ✅ |

### Getting Credentials

**Flutterwave**:
1. Visit [dashboard.flutterwave.com](https://dashboard.flutterwave.com)
2. Sign up and verify your account
3. Navigate to Settings → API → Keys
4. Copy test/live keys to `.env.local`
5. Add BVN from your Flutterwave account

**API A (SMEPlug)**:
1. Visit [smeplug.com](https://smeplug.com)
2. Register and get API credentials
3. Copy to `SMEPLUG_API_KEY` and `SMEPLUG_BASE_URL`

**API B (Saiful)**:
1. Contact Saiful team for integration
2. Get API credentials
3. Copy to `SAIFUL_API_KEY` and `SAIFUL_BASE_URL`

---

## API Routes

### Authentication

| Method | Route | Description | Protected |
|--------|-------|-------------|-----------|
| POST | `/api/auth/signup` | Create new user account | ❌ |
| POST | `/api/auth/login` | Login with phone & PIN | ❌ |
| GET | `/api/auth/me` | Get current user info | ✅ |

### Data & Airtime

| Method | Route | Description | Protected |
|--------|-------|-------------|-----------|
| GET | `/api/data/plans` | Get all data plans | ❌ |
| POST | `/api/data/purchase` | Purchase data (auto-delivery) | ✅ |
| POST | `/api/airtime/purchase` | Purchase airtime | ✅ |

### Wallet & Transactions

| Method | Route | Description | Protected |
|--------|-------|-------------|-----------|
| GET | `/api/transactions` | Get user's transactions | ✅ |
| GET | `/api/transactions/status?ref=REF` | Check payment status | ❌ |
| POST | `/api/transactions/verify-manual` | Manually verify payment | ❌ |

### Flutterwave (Payment)

| Method | Route | Description | Protected |
|--------|-------|-------------|-----------|
| POST | `/api/flutterwave/create-temp-account` | Create virtual account (guest) | ❌ |
| POST | `/api/flutterwave/webhook` | Webhook receiver (Flutterwave) | ❌ |

### Rewards

| Method | Route | Description | Protected |
|--------|-------|-------------|-----------|
| GET | `/api/rewards` | Get user's rewards | ✅ |
| GET | `/api/rewards/history` | Get reward history | ✅ |

### Admin Routes (Protected with ADMIN role)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/analytics` | Dashboard stats & charts |
| GET | `/api/admin/plans` | List all plans |
| POST | `/api/admin/plans` | Create new plan |
| PATCH | `/api/admin/plans/[id]` | Update plan |
| DELETE | `/api/admin/plans/[id]` | Delete plan |
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/[id]` | Get user details |
| PATCH | `/api/admin/users/[id]` | Update user info |
| POST | `/api/admin/users/[id]/balance` | Add/deduct balance |
| POST | `/api/admin/users/[id]/reset-pin` | Reset user PIN |
| GET | `/api/admin/transactions` | Get transactions (paginated, filterable) |

---

## Database Setup

### Database Schema

The project uses Prisma with PostgreSQL. Key models:

**User**
- `id`: Primary key
- `fullName`: User's name
- `phone`: 11-digit Nigerian number (unique)
- `email`: Email address
- `pinHash`: Hashed 6-digit PIN (bcryptjs)
- `balance`: Balance in kobo (₦1 = 100 kobo)
- `role`: USER | AGENT | ADMIN
- `isBanned`: Account ban status
- `createdAt`, `updatedAt`: Timestamps

**Plan**
- `id`: Primary key
- `name`: Display name (e.g., "500MB Share")
- `network`: MTN | AIRTEL | GLO | 9MOBILE
- `sizeLabel`: Data size (e.g., "500MB")
- `validity`: Validity period (e.g., "Weekly")
- `price`: Price in naira (₦)
- `apiSource`: API_A | API_B
- `externalPlanId`: Plan ID from data provider
- `externalNetworkId`: Network ID from provider
- `isActive`: Plan availability

**Transaction**
- `id`: Primary key
- `type`: DATA_PURCHASE | AIRTIME_PURCHASE | WALLET_FUNDING | REWARD_CREDIT
- `status`: PENDING | SUCCESS | FAILED
- `userId`: User ID (nullable for guests)
- `phoneNumber`: Target phone
- `amount`: Amount in naira
- `planId`: Related Plan ID (for data)
- `flwRef`: Flutterwave reference
- `description`: Transaction details
- `createdAt`: Timestamp

**VirtualAccount**
- `id`: Primary key
- `userId`: User ID
- `accountNumber`: Virtual account number
- `bankName`: Bank name
- `orderRef`: Unique order reference
- `accountName`: Account name
- `createdAt`: Timestamp

**Reward** & **UserReward**
- Track signup bonuses, deposit bonuses, referral rewards
- Automatic crediting on qualifying transactions

### Seeding Plans

Run once after database setup:

```bash
npx prisma db seed
```

This creates:
- 30+ MTN plans (API A)
- 5+ Airtel plans (API B)
- 3 reward types (Signup Bonus, First Deposit, High Roller)
- 1 admin user (phone: `08000000000`, PIN: `000000`)

To reseed:
```bash
npx prisma db seed
```

---

## Deployment

### Prerequisites

- Vercel account
- Neon PostgreSQL account
- All environment variables ready

### Step 1: Prepare Vercel

1. Push code to GitHub, GitLab, or Bitbucket
2. Visit [vercel.com](https://vercel.com)
3. Click "New Project" → Select your repository
4. Vercel auto-detects Next.js → Click "Deploy"

### Step 2: Add Environment Variables

In Vercel dashboard:
1. Select your project
2. Go to **Settings** → **Environment Variables**
3. Add all variables from [Environment Variables](#environment-variables) section:

```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secure-key-32-chars-min
FLUTTERWAVE_PUBLIC_KEY=FLWPUB_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_...
FLUTTERWAVE_WEBHOOK_SECRET=fs_...
FLW_ACCOUNT_EMAIL=your-email@example.com
FLW_BVN=12345678901
SMEPLUG_API_KEY=sk_...
SMEPLUG_BASE_URL=https://api.smeplug.com/
SAIFUL_API_KEY=sk_...
SAIFUL_BASE_URL=https://api.saiful.com/
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 3: Run Migrations

After environment variables are set:

```bash
# Via Vercel CLI
vercel env pull .env.local

# Run migrations on production database
NODE_ENV=production npx prisma migrate deploy

# Seed data
NODE_ENV=production npx prisma db seed
```

### Step 4: Deploy

```bash
# Push to main branch to trigger deployment
git push origin main

# Or deploy directly via Vercel CLI
vercel deploy --prod
```

### Vercel Configuration

`vercel.json` already configured with:
- **Webhook max duration**: 30 seconds
- **Data purchase timeout**: 15 seconds
- **Airtime purchase timeout**: 15 seconds

---

## Flutterwave Integration

### Webhook Setup

1. **In your Flutterwave Dashboard**:
   - Settings → Webhooks
   - Add webhook endpoint: `https://your-domain.com/api/flutterwave/webhook`
   - Enable these events:
     - `charge.completed`
     - `charge.updated`

2. **Get Webhook Secret**:
   - Dashboard → Settings → API
   - Copy "Hash" value → `FLUTTERWAVE_WEBHOOK_SECRET`

### Payment Flow

**Guest User (Temp Virtual Account)**:
```
1. Guest fills phone & selects plan
2. Endpoint: POST /api/flutterwave/create-temp-account
   - Parameters: phone, planId, amount
   - Returns: Virtual account details
3. Guest transfers money to account
4. Flutterwave webhook processes payment
5. Data automatically delivered to phone
```

**Registered User (Permanent Virtual Account)**:
```
1. User funds wallet via virtual account
2. Endpoint: POST /api/flutterwave/create-temp-account
   - Creates permanent VA tied to user
   - Returns: Account details
3. User transfers money
4. Webhook credits wallet + evaluates rewards
5. User can now purchase data instantly
```

### Webhook Signature Verification

Webhook requests include `verif-hash` header. Verification:
```ts
import { createHmac } from "crypto";

const secretKey = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
const expectedHash = createHmac("sha256", secretKey)
  .update(JSON.stringify(requestBody))
  .digest("hex");

const isValid = expectedHash === req.headers["verif-hash"];
```

---

## Admin Panel

### Access

- **URL**: `https://your-domain.com/admin`
- **Auth**: Login with admin credentials:
  - Phone: `08000000000`
  - PIN: `000000` (default)

**⚠️ Change the default PIN immediately in production!**

### Features

#### 📊 **Analytics Dashboard** (`/admin/analytics`)
- **Stats Cards**: Total users, transactions, revenue, today's revenue
- **Charts**:
  - Line: 7-day transaction trend
  - Pie: Revenue by network
  - Bar: Top 5 plans
- **Recent Transactions**: Last 20 transactions table

#### 📱 **Plans Management** (`/admin/plans`)
- View all plans (sortable table)
- **Create Plan** - Dialog form with all fields
- **Edit Plan** - Pre-filled form
- **Delete Plan** - Hard delete with confirmation
- **Toggle Active** - Inline toggle for availability

#### 👥 **Users Management** (`/admin/users`)
- View all users with search & role filter
- **User Detail Modal**:
  - Profile info (avatar, name, phone, role)
  - Balance management (add/deduct)
  - Change role (USER/AGENT/ADMIN)
  - Ban/Unban user
  - Reset PIN to 000000
  - View recent 10 transactions

#### 💵 **Transactions Viewer** (`/admin/transactions`)
- View all transactions (paginated)
- **Filters**:
  - By Status (ALL, PENDING, SUCCESS, FAILED)
  - By Type (ALL, DATA_PURCHASE, AIRTIME_PURCHASE, WALLET_FUNDING, REWARD_CREDIT)
  - By Date Range (start & end date)
- **Pagination**: 20 per page with prev/next
- **Color-Coded Status**: Green (success), Red (failed), Yellow (pending)

---

## Data Plan Seeding

### Manual Plan Creation (Admin Panel)

1. Login to `/admin`
2. Navigate to **Plans**
3. Click **Add Plan** button
4. Fill form:
   - Name: `500MB Share`
   - Network: `MTN`
   - Size Label: `500MB`
   - Validity: `Weekly`
   - Price: `300` (in naira)
   - API Source: `API_A` or `API_B`
   - External Plan ID: Get from provider
   - External Network ID: Get from provider
5. Click **Create**

### API A (SMEPlug) Plan IDs

| Plan | Size | Price | Validity | ID |
|------|------|-------|----------|-----|
| MTN 500MB | 500MB | ₦300 | Weekly | 423 |
| MTN 1GB | 1GB | ₦450 | Weekly | 424 |
| MTN 2GB | 2GB | ₦900 | Weekly | 425 |
| MTN 5GB | 5GB | ₦1,500 | Monthly | 176 |

*See `prisma/seed.ts` for complete list*

### API B (Saiful) Plan IDs

| Plan | Size | Price | Validity | ID |
|------|------|-------|----------|-----|
| MTN 5GB | 5GB | ₦1,500 | 14-30 Days | 85 |
| Airtel 5GB | 5GB | ₦1,500 | Monthly | 92 |

*Contact Saiful support for complete list*

---

## Building & Testing

### Local Build

```bash
npm run build
```

Must complete with 0 errors. Output: `.next/` directory

### Type Checking

```bash
npx tsc --noEmit
```

Must pass with 0 TypeScript errors

### Schema Validation

```bash
npx prisma validate
```

Must pass validation

### Lint Check

```bash
npm run lint
```

Must pass ESLint rules

### Complete Pre-Deployment Checklist

```bash
# 1. Build
npm run build

# 2. Type check
npx tsc --noEmit

# 3. Schema validate
npx prisma validate

# 4. Lint
npm run lint

# All should complete with 0 errors before deploying
```

---

## Rate Limiting

Implemented in-memory rate limiting for sensitive routes:

| Route | Limit |
|-------|-------|
| `POST /api/auth/login` | 5 attempts per 5 minutes per IP |
| `POST /api/data/purchase` | 10 attempts per minute per IP |
| `POST /api/airtime/purchase` | 10 attempts per minute per IP |

Limits are tracked by IP address and reset after the window expires. For large-scale deployments, upgrade to Redis-based rate limiting.

---

## Error Handling

All API routes return standardized JSON responses:

**Success (200-201)**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error (400-500)**:
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

---

## Troubleshooting

### Database Connection Issues
```
Error: connect ENOTFOUND neon.tech
```
- Verify `DATABASE_URL` is correct
- Check Neon dashboard for IP whitelisting
- Ensure `.env.local` file exists with valid URL

### Flutterwave Webhook Not Firing
- Verify webhook URL in Flutterwave dashboard
- Check webhook secret is correctly set in `.env`
- Test webhook in Flutterwave dashboard first

### Rate Limit Exceeded
- Wait for the window to reset (5 mins for login, 1 min for purchases)
- Try from different IP if using VPN
- Contact support for IP whitelisting

### Admin Login Fails
- Default PIN is `000000`
- If changed, check database for admin user PIN hash
- Reset PIN via admin panel if locked

---

## Support & Contribution

For issues, feature requests, or contributions:
- Email: support@sydatasub.com
- GitHub Issues: [your-repo-issues](about:blank)
- Slack: [sy-data-sub channel](about:blank)

---

## License

© 2026 SY DATA SUB. All rights reserved.

---

**Last Updated**: April 9, 2026

