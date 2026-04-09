# Vercel Deployment Guide

Complete step-by-step guide to deploy **SY Data Sub** on Vercel with full environment setup.

---

## Prerequisites

✅ Verify before starting:
- [ ] GitHub account with access to [sydatasub repository](https://github.com/syabdallah018/sydatasub)
- [ ] Vercel account (free tier: [vercel.com](https://vercel.com))
- [ ] All environment variable credentials ready
- [ ] PostgreSQL database set up (Vercel Postgres, Neon, or other provider)

---

## Part 1: Connect Repository to Vercel

### Step 1: Login to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"Log In"** (or Sign Up if new)
3. Authenticate with GitHub
4. Authorize Vercel to access your GitHub account

### Step 2: Import Project
1. Click **"Add New..."** → **"Project"**
2. Under "Import Git Repository", paste:
   ```
   https://github.com/syabdallah018/sydatasub.git
   ```
3. Click **"Continue"**
4. Select repository owner: `syabdallah018`
5. Click **"Import"**

### Step 3: Configure Project Settings
You'll see the "Import Project" page:

**Framework Preset:** Next.js ✓ (auto-detected)

**Root Directory:** `./` (or leave empty)

**Build and Output Settings:**
- Build Command: `npm run build` ✓ (auto-filled)
- Output Directory: `.next` ✓ (auto-filled)
- Install Command: `npm install` ✓ (auto-filled)

**Environment Variables:** (We'll add these next)

---

## Part 2: Add Environment Variables

### Option A: Via Vercel Dashboard (Recommended)

1. **Scroll to "Environment Variables" section**

2. **Add Each Variable:** For each variable, click "Add Environment Variable"

   **Variable 1: DATABASE_URL**
   ```
   Name: DATABASE_URL
   Value: postgresql://username:password@host:port/database
   Environment: Production, Preview, Development (all 3 selected)
   Click: Add
   ```

   **Variable 2: JWT_SECRET**
   ```
   Name: JWT_SECRET
   Value: your_64_character_random_secret_here
   Environment: Production, Preview, Development
   Click: Add
   ```

   **Variable 3: FLUTTERWAVE_SECRET_KEY**
   ```
   Name: FLUTTERWAVE_SECRET_KEY
   Value: SK_LIVE_xxxxxxxxxxxxx (or SK_TEST_xxxxx for testing)
   Environment: Production, Preview, Development
   Click: Add
   ```

   **Variable 4: FLUTTERWAVE_PUBLIC_KEY**
   ```
   Name: FLUTTERWAVE_PUBLIC_KEY
   Value: PK_LIVE_xxxxxxxxxxxxx (or PK_TEST_xxxxx)
   Environment: Production, Preview, Development
   Click: Add
   ```

   **Variable 5: FLUTTERWAVE_WEBHOOK_SECRET**
   ```
   Name: FLUTTERWAVE_WEBHOOK_SECRET
   Value: Your_Webhook_Hash_From_FLW_Dashboard
   Environment: Production, Preview, Development
   Click: Add
   ```

   **Variable 6: FLW_ACCOUNT_EMAIL**
   ```
   Name: FLW_ACCOUNT_EMAIL
   Value: your-business-email@company.com
   Environment: Production, Preview, Development
   Click: Add
   ```

   **Variable 7: FLW_BVN**
   ```
   Name: FLW_BVN
   Value: 12345678901
   Environment: Production, Preview, Development
   Click: Add
   ```

   **Variable 8: SMEPLUG_API_KEY**
   ```
   Name: SMEPLUG_API_KEY
   Value: Your_SME_Plug_API_Key
   Environment: Production, Preview, Development
   Click: Add
   ```

   **Variable 9: SMEPLUG_BASE_URL**
   ```
   Name: SMEPLUG_BASE_URL
   Value: https://smeplug.ng/api/v1
   Environment: Production, Preview, Development
   Click: Add
   ```

   **Variable 10: SAIFUL_API_KEY**
   ```
   Name: SAIFUL_API_KEY
   Value: Your_Saiful_API_Key
   Environment: Production, Preview, Development
   Click: Add
   ```

   **Variable 11: SAIFUL_BASE_URL**
   ```
   Name: SAIFUL_BASE_URL
   Value: https://app.saifulegendconnect.com/api
   Environment: Production, Preview, Development
   Click: Add
   ```

   **Variable 12: NEXT_PUBLIC_APP_URL**
   ```
   Name: NEXT_PUBLIC_APP_URL
   Value: https://your-domain.vercel.app
   Environment: Production, Preview, Development
   Click: Add
   ```

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to project
cd /path/to/sy-data-sub

# Login to Vercel
vercel login

# Link to Vercel project
vercel link

# Add environment variables interactively
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add FLUTTERWAVE_SECRET_KEY
# ... repeat for all variables

# Deploy
vercel deploy --prod
```

### Option C: Using .env File

1. **Create `.env.production.local`** in project root:
   ```bash
   DATABASE_URL="postgresql://..."
   JWT_SECRET="your_secret_here"
   FLUTTERWAVE_SECRET_KEY="SK_LIVE_..."
   # ... all other variables
   ```

2. **Important:** Add to `.gitignore`:
   ```
   .env.local
   .env.production.local
   .env.*.local
   ```

3. **Push to GitHub:**
   ```bash
   git add vercel.json
   git commit -m "Add Vercel config"
   git push origin main
   ```

4. **Vercel auto-redeploys** when it detects push

---

## Part 3: Deploy

### Automatic Deployment
Once environment variables are added, you have 2 options:

**Option 1: From Git Push**
- Make sure variables are in Vercel Dashboard Settings
- Push any commit to `main` branch:
  ```bash
  git add .
  git commit -m "Update: add new feature"
  git push origin main
  ```
- Vercel auto-deploys when it detects push ✓

**Option 2: Manual Deploy Button**
1. Go to Vercel Dashboard
2. Click your project: `sydatasub`
3. Click **"Deployments"** tab
4. Click **"Redeploy"** on latest commit
5. Or click **"Deploy"** button (top right)

---

## Part 4: Verify Deployment

### Check Deployment Status

1. **Go to Project Dashboard:**
   ```
   https://vercel.com/dashboard/syabdallah018/sydatasub
   ```

2. **Check Latest Deployment:**
   - Status should show: ✓ **Ready** (green)
   - If red/orange, check build logs

3. **View Build Logs:**
   - Click on deployment
   - Scroll to see full build output
   - Watch for errors

### Test Live Application

1. **Visit Your App:**
   ```
   https://sydatasub.vercel.app
   ```
   (Replace with your custom domain if configured)

2. **Test Key Features:**
   - ✓ Homepage loads
   - ✓ Landing page responsive
   - ✓ Login/signup works
   - ✓ Database connection successful
   - ✓ Flutterwave payment integration working

### Check Vercel Provided URL

After successful deployment, Vercel provides:
- **Preview URL:** `https://[branch-name]--sydatasub.vercel.app` (auto-updated on commits)
- **Production URL:** `https://sydatasub.vercel.app` (main branch)

---

## Part 5: Custom Domain Setup (Optional)

### Connect Your Domain

1. **Go to Project Settings:**
   ```
   Vercel Dashboard → Project → Settings → Domains
   ```

2. **Add Domain:**
   - Click "Add"
   - Enter: `your-domain.com`
   - Choose DNS configuration:

#### Option A: Vercel Nameservers (Recommended)
1. Vercel shows nameservers
2. Update your domain registrar to point to Vercel's nameservers
3. Wait 24-48 hours for DNS propagation

#### Option B: CNAME Record
1. Add CNAME in your registrar:
   ```
   Host: your-domain.com
   Points to: cname.vercel-dns.com
   ```
2. DNS propagates in minutes

3. **Verify Domain Connected:**
   - Vercel shows ✓ when active
   - Visit: `https://your-domain.com`

### Update Environment Variable

1. **Go to Project Settings:**
   ```
   Settings → Environment Variables
   ```

2. **Update NEXT_PUBLIC_APP_URL:**
   ```
   Name: NEXT_PUBLIC_APP_URL
   Value: https://your-domain.com (was vercel.app)
   ```

3. **Trigger Redeploy:**
   - Click "Redeploy" latest commit
   - App now uses correct domain URLs

---

## Part 6: Database Connection

### Option A: Vercel Postgres (Easiest)

1. **In Vercel Dashboard:**
   - Go to Project → "Storage"
   - Click "Create Database" → "Postgres"

2. **Vercel Auto-Sets DATABASE_URL:**
   - Connection string auto-added to Environment Variables ✓
   - No manual setup needed

3. **Run Migrations:**
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

### Option B: External PostgreSQL (Neon, Railway, etc.)

1. **Get Connection String:**
   - Log into your provider (Neon, Railway, Supabase, etc.)
   - Copy PostgreSQL connection string

2. **Add to Vercel:**
   ```
   Settings → Environment Variables
   Name: DATABASE_URL
   Value: postgresql://user:pass@host:port/db
   ```

3. **Run Migrations:**
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

---

## Part 7: Troubleshooting

### Build Fails with "DATABASE_URL not found"

**Issue:** Environment variable not recognized during build

**Solution 1:**
```bash
# Verify variable is added
Vercel Dashboard → Settings → Environment Variables
# Check all 3 environments are selected: Production, Preview, Development
```

**Solution 2:**
```bash
# Redeploy after adding variable
Click "Redeploy" on latest commit to rebuild with new variables
```

### "Cannot find module" Errors

**Issue:** Dependencies missing from build

**Solution:**
```bash
# Reinstall and cleanup
rm -rf node_modules package-lock.json
npm install
git add -A
git commit -m "Reinstall dependencies"
git push origin main
```

### Database Connection Timeout

**Issue:** Can't connect to PostgreSQL

**Solution:**
1. Verify DATABASE_URL is correct (copy-paste exact value)
2. Check PostgreSQL service is running
3. Verify IP whitelist allows Vercel IPs
4. Test connection locally:
   ```bash
   npx prisma db execute --stdin < seed.sql
   ```

### "jwt error" or Token Validation Fails

**Issue:** JWT operations failing

**Solution:**
1. Verify JWT_SECRET:
   ```bash
   # Must be 32+ characters
   Vercel Settings → Environment Variables → JWT_SECRET
   echo $JWT_SECRET | wc -c  # Should be 65+ (with newline)
   ```

2. Ensure same JWT_SECRET in all environments (prod/preview/dev)

### Flutterwave Integration Not Working

**Issue:** Payment gateway errors

**Solution:**
1. Verify keys are not switched:
   - FLUTTERWAVE_SECRET_KEY ≠ FLUTTERWAVE_PUBLIC_KEY
2. Check TEST vs LIVE keys consistently:
   - For testing: Use SK_TEST_xxx and PK_TEST_xxx
   - For production: Use SK_LIVE_xxx and PK_LIVE_xxx
3. Verify webhook secret in Flutterwave dashboard matches FLUTTERWAVE_WEBHOOK_SECRET

---

## Part 8: Post-Deployment Checklist

After successful deployment, verify:

- [ ] App loads without errors (`https://sydatasub.vercel.app`)
- [ ] Database connected (check Vercel logs)
- [ ] Authentication works (signup, login)
- [ ] Flutterwave payments can be initiated
- [ ] Admin panel accessible (`/admin`)
- [ ] API endpoints responding (`/api/auth/me`)
- [ ] Emails/notifications working (if configured)
- [ ] Custom domain resolves (if configured)
- [ ] HTTPS enabled (auto by Vercel)
- [ ] Environment variables all set (no "undefined" errors)

---

## Part 9: Monitoring & Logs

### View Application Logs

1. **Vercel Dashboard:**
   ```
   Deployments → [Latest Deployment] → Logs
   ```

2. **Real-time Logs:**
   ```bash
   vercel logs --follow
   ```

3. **Search Logs:**
   ```bash
   vercel logs | grep "error"
   ```

### Performance Monitoring

1. **Vercel Analytics:**
   ```
   Project → Analytics
   ```
   - Web Vitals (LCP, FID, CLS)
   - Response times
   - Error rates

2. **Edge Logs:**
   ```
   Settings → Edge Middleware Logs
   ```

---

## Part 10: Continuous Deployment

Every time you push to `main` branch:

1. **Git Push Triggers Build:**
   ```bash
   git push origin main
   ```

2. **Vercel Auto-Detects:**
   - New commit on main branch
   - Starts build process

3. **Build Runs:**
   - Install dependencies
   - Run `npm run build`
   - Execute type checking
   - Compile TypeScript
   - Optimize assets

4. **Deploy:**
   - Update live application
   - Show deployment URL
   - Update Preview URL

5. **Monitoring:**
   - Vercel sends status updates
   - Deployment takes ~2-5 minutes
   - View logs in dashboard

---

## Getting Help

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Flutterwave Support:** https://developer.flutterwave.com/support
- **Prisma Support:** https://www.prisma.io/docs

---

**Deployment Status:** Ready for Vercel ✅  
**Last Updated:** April 9, 2026  
**Version:** 1.0.0
