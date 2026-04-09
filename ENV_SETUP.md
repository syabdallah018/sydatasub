# Environment Variables Setup Guide

This guide explains every environment variable needed for **SY Data Sub** application deployment on Vercel and local development.

---

## Table of Contents
1. [Database Configuration](#database-configuration)
2. [JWT Authentication](#jwt-authentication)
3. [Flutterwave Payment Gateway](#flutterwave-payment-gateway)
4. [Third-Party APIs](#third-party-apis)
5. [Public Configuration](#public-configuration)
6. [Vercel Deployment](#vercel-deployment)
7. [Testing & Validation](#testing--validation)

---

## Database Configuration

### `DATABASE_URL`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** PostgreSQL Connection String

**Description:**
The complete PostgreSQL connection string for your database. This is used by Prisma ORM to connect to your database.

**Format:**
```
postgresql://username:password@host:port/database_name
```

**Example:**
```
postgresql://postgres:mypassword123@db.example.com:5432/sy_data_sub
```

**How to Get:**
1. **For Vercel (Recommended):** Use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
   - Go to Vercel Dashboard → Storage → Create new Postgres Database
   - Copy the "Prisma" connection string
   - Connect to your project and Vercel will auto-populate the variable

2. **For Other PostgreSQL Providers:**
   - **Neon**: [neon.tech](https://neon.tech) - Free tier available
   - **Supabase**: [supabase.com](https://supabase.com) - PostgreSQL + Auth
   - **Railway**: [railway.app](https://railway.app)
   - **Self-hosted**: Set up your own PostgreSQL server

**Vercel Setup:**
```bash
vercel env add DATABASE_URL
# Paste your PostgreSQL connection string
# Select: Production, Preview, Development
```

---

## JWT Authentication

### `JWT_SECRET`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** Encryption Secret

**Description:**
A cryptographic secret used to sign and verify JWT tokens. This must be:
- **At least 32 characters long** (recommended: 64+ characters)
- **Unique and random**
- **Never shared or committed to Git**
- The same across all environments for token verification

**Example:**
```
your_super_secret_jwt_key_min_32_chars_random_string_here_1a2b3c4d5e6f7g8h9i
```

**How to Generate Securely:**

**Option 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Online Generator** (use with caution, only for testing)
- Visit: [generate-random.org](https://www.random.org/strings/)
- Generate: 64 characters, alphanumeric

**Vercel Setup:**
```bash
vercel env add JWT_SECRET
# Paste your generated secret (64+ chars)
# Select: Production, Preview, Development
```

**Important:**
- Delete console history after entering the secret
- Never hardcode in your application
- Rotate periodically in production

---

## Flutterwave Payment Gateway

Flutterwave is the payment processing service for data/airtime purchases. You need a Flutterwave account to get these credentials.

### `FLUTTERWAVE_SECRET_KEY`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** API Key

**Description:**
Your Flutterwave Secret Key used for server-side API calls. This should be kept **confidential**.

**Vercel Setup:**
```bash
vercel env add FLUTTERWAVE_SECRET_KEY
# Paste your secret key
# Select: Production, Preview, Development
```

---

### `FLUTTERWAVE_PUBLIC_KEY`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** API Key (Public)

**Description:**
Your Flutterwave Public Key used for client-side operations and webhooks verification.

**Vercel Setup:**
```bash
vercel env add FLUTTERWAVE_PUBLIC_KEY
# Paste your public key
# Select: Production, Preview, Development
```

---

### `FLUTTERWAVE_WEBHOOK_SECRET`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** Webhook Secret

**Description:**
A secret used to verify that webhook requests are genuinely from Flutterwave. This prevents unauthorized webhook calls.

**Location in Flutterwave:**
1. Log in to [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Go to Settings → Webhooks
3. Copy the Webhook Secret Hash

**Vercel Setup:**
```bash
vercel env add FLUTTERWAVE_WEBHOOK_SECRET
# Paste your webhook secret
# Select: Production, Preview, Development
```

---

### `FLW_ACCOUNT_EMAIL`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** Email Address

**Description:**
The email address associated with your Flutterwave business account. This is used for virtual account creation and settlement.

**Example:**
```
business@sydatasub.com
```

**Where to Find:**
- In Flutterwave Dashboard under Account Settings

**Vercel Setup:**
```bash
vercel env add FLW_ACCOUNT_EMAIL
# Paste your account email
# Select: Production, Preview, Development
```

---

### `FLW_BVN`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** Bank Verification Number (Nigeria)

**Description:**
Your BVN (Bank Verification Number) from your Nigerian bank. This is required by Flutterwave for KYC compliance and virtual account creation in Nigeria.

**How to Get Your BVN:**
1. **Dial USSD:** `*565*0#` on any Nigerian mobile network
2. **Online:** Visit your bank's app/website and request BVN
3. **Physical:** Visit your bank branch with valid ID

**Format:**
```
11-digit number (e.g., 12345678901)
```

**Example:**
```
12345678901
```

**Vercel Setup:**
```bash
vercel env add FLW_BVN
# Paste your 11-digit BVN
# Select: Production, Preview, Development
```

---

## Third-Party APIs

### SME Plug API Configuration

**API Purpose:** Provides data and airtime services

#### `SMEPLUG_API_KEY`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** API Key

**Description:**
Your SME Plug API authentication key for server-side API calls.

**How to Get:**
1. Visit [smeplug.ng](https://smeplug.ng)
2. Create an account or log in
3. Go to Settings/API Keys
4. Copy your API Key

**Vercel Setup:**
```bash
vercel env add SMEPLUG_API_KEY
# Paste your SME Plug API key
# Select: Production, Preview, Development
```

---

#### `SMEPLUG_BASE_URL`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** API Endpoint URL

**Description:**
The base URL for SME Plug API endpoints. This is where all API requests are sent.

**Production URL:**
```
https://smeplug.ng/api/v1
```

**Vercel Setup:**
```bash
vercel env add SMEPLUG_BASE_URL
# Paste: https://smeplug.ng/api/v1
# Select: Production, Preview, Development
```

---

### Saiful Legend Connect API Configuration

**API Purpose:** Alternative provider for data and airtime services

#### `SAIFUL_API_KEY`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** API Key

**Description:**
Your Saiful Legend Connect API authentication key.

**How to Get:**
1. Visit [saifulegendconnect.com](https://app.saifulegendconnect.com)
2. Create an account or log in
3. Navigate to API Settings
4. Generate/copy your API Key

**Vercel Setup:**
```bash
vercel env add SAIFUL_API_KEY
# Paste your Saiful API key
# Select: Production, Preview, Development
```

---

#### `SAIFUL_BASE_URL`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** API Endpoint URL

**Description:**
The base URL for Saiful Legend Connect API.

**Production URL:**
```
https://app.saifulegendconnect.com/api
```

**Vercel Setup:**
```bash
vercel env add SAIFUL_BASE_URL
# Paste: https://app.saifulegendconnect.com/api
# Select: Production, Preview, Development
```

---

## Public Configuration

### `NEXT_PUBLIC_APP_URL`
**Required:** ✅ Yes  
**Environment:** Production & Development  
**Type:** Application URL (Public)

**Description:**
The public URL of your application. The `NEXT_PUBLIC_` prefix means this variable is exposed to the browser. It's used for:
- Building absolute URLs for redirects
- Email/SMS links
- API callback URLs
- Webhook configuration

**Examples:**
```
Development:  http://localhost:3000
Staging:      https://staging.sydatasub.com
Production:   https://sydatasub.com
```

**Important:**
- **Development:** `http://localhost:3000`
- **Vercel Preview:** Auto-generated (usually `https://branch--reponame.vercel.app`)
- **Production:** Your actual domain (e.g., `https://sydatasub.com`)

**Vercel Setup:**
```bash
# For Production
vercel env add NEXT_PUBLIC_APP_URL
# Paste: https://your-domain.com
# Select: Production only

# For Preview/Development (optional auto-handled by Vercel)
vercel env add NEXT_PUBLIC_APP_URL
# Paste: https://yourdomain.vercel.app (if custom preview domain)
```

---

## Vercel Deployment

### Step-by-Step Vercel Env Setup

#### Option 1: Using Vercel Dashboard (Recommended)

1. **Go to Your Vercel Project:**
   ```
   https://vercel.com/dashboard
   ```

2. **Select Project:** Click on `sydatasub`

3. **Open Settings:**
   - Click "Settings" tab → "Environment Variables"

4. **Add Each Variable:**
   ```
   Add Variable:
   - Name: DATABASE_URL
   - Value: postgresql://...
   - Environments: ✓ Production  ✓ Preview  ✓ Development
   - Add
   ```

5. **Repeat for all variables** (see [Complete Variables List](#complete-variables-list))

6. **Redeploy:** 
   - Trigger a new deployment for changes to take effect
   - Push to GitHub or click "Redeploy" on latest commit

#### Option 2: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
cd sy-data-sub
vercel link

# Add environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
# ... repeat for all variables

# Deploy
vercel deploy --prod
```

---

## Complete Variables List

**Quick Reference Table:**

| Variable | Required | Environment | Type | Example |
|----------|----------|-------------|------|---------|
| `DATABASE_URL` | ✅ | All | String | `postgresql://...` |
| `JWT_SECRET` | ✅ | All | String | 64+ char random string |
| `FLUTTERWAVE_SECRET_KEY` | ✅ | All | String | SK... |
| `FLUTTERWAVE_PUBLIC_KEY` | ✅ | All | String | PK... |
| `FLUTTERWAVE_WEBHOOK_SECRET` | ✅ | All | String | Hash string |
| `FLW_ACCOUNT_EMAIL` | ✅ | All | Email | business@example.com |
| `FLW_BVN` | ✅ | All | String | 11 digits |
| `SMEPLUG_API_KEY` | ✅ | All | String | API key |
| `SMEPLUG_BASE_URL` | ✅ | All | URL | https://smeplug.ng/api/v1 |
| `SAIFUL_API_KEY` | ✅ | All | String | API key |
| `SAIFUL_BASE_URL` | ✅ | All | URL | https://app.saifulegendconnect.com/api |
| `NEXT_PUBLIC_APP_URL` | ✅ | All | URL | https://sydatasub.com |

---

## Testing & Validation

### Verify Variables Are Set

After deploying to Vercel, verify variables are working:

```bash
# 1. Check local .env.local
cat .env.local
# All variables should be filled

# 2. Check Vercel Dashboard
# Visit: https://vercel.com/dashboard → Project → Settings → Environment Variables
# All variables should be listed

# 3. Test in Production
# Visit your app: https://sydatasub.com
# Try a data purchase to verify Flutterwave integration
```

### Common Issues & Solutions

**Issue: "Environment variable not found"**
- ✓ Verify variable is added in Vercel Settings
- ✓ Redeploy after adding variables
- ✓ Check variable name spelling matches exactly

**Issue: "Database connection error"**
- ✓ Verify DATABASE_URL format is correct
- ✓ Check PostgreSQL service is running
- ✓ Verify credentials are correct

**Issue: "Payment gateway errors"**
- ✓ Verify Flutterwave keys are correct
- ✓ Check if using test vs. live keys consistently
- ✓ Ensure webhook secret is properly set in Flutterwave dashboard

**Issue: "JWT token errors"**
- ✓ Ensure JWT_SECRET is at least 32 characters
- ✓ Same JWT_SECRET must be used across all instances
- ✓ Don't change JWT_SECRET in production (invalidates existing tokens)

---

## Security Best Practices

✅ **DO:**
- Store all secrets in Vercel Environment Variables (never in code)
- Use strong, random secrets (min 32 chars for JWT_SECRET)
- Keep .env.local in .gitignore
- Rotate secrets periodically in production
- Use different secrets for dev/staging/production

❌ **DON'T:**
- Commit `.env.local` or any `.env` files to Git
- Hardcode secrets in application code
- Share environment variables via email/chat
- Use the same secrets across environments
- Log sensitive data in console

---

## Support & Resources

- **Flutterwave Docs:** https://developer.flutterwave.com
- **Vercel Docs:** https://vercel.com/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js Docs:** https://nextjs.org/docs

---

**Last Updated:** April 9, 2026  
**Version:** 1.0.0
