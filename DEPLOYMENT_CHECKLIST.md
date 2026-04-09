# Quick Deployment Checklist

Fast reference checklist to deploy **SY Data Sub** on Vercel in 15 minutes.

---

## 🚀 5-Minute Quick Start

### 1. **Set Up Environment Variables**
Copy your credentials and prepare them:

```
□ DATABASE_URL = postgresql://...
□ JWT_SECRET = (64+ char random string) 
□ FLUTTERWAVE_SECRET_KEY = SK_LIVE_...
□ FLUTTERWAVE_PUBLIC_KEY = PK_LIVE_...
□ FLUTTERWAVE_WEBHOOK_SECRET = (hash from FLW dashboard)
□ FLW_ACCOUNT_EMAIL = your-email@company.com
□ FLW_BVN = 12345678901
□ SMEPLUG_API_KEY = your-key
□ SMEPLUG_BASE_URL = https://smeplug.ng/api/v1
□ SAIFUL_API_KEY = your-key
□ SAIFUL_BASE_URL = https://app.saifulegendconnect.com/api
□ NEXT_PUBLIC_APP_URL = https://sydatasub.vercel.app
```

### 2. **Connect to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Paste: `https://github.com/syabdallah018/sydatasub.git`
4. Click "Import"

### 3. **Add Environment Variables**
In Vercel Dashboard → Environment Variables:

For **each variable above**:
- Name: `VARIABLE_NAME`
- Value: `paste_your_value`
- Select: ✓ Production ✓ Preview ✓ Development
- Click: "Add"

⏱️ **Takes ~3 minutes**

### 4. **Deploy**
1. Click "Deploy" button
2. Wait for ✓ "Ready" status (2-5 minutes)
3. Click generated URL (e.g., `https://sydatasub.vercel.app`)

### 5. **Test**
- [ ] Homepage loads
- [ ] Can click "Sign Up"
- [ ] Admin panel works (`/admin`)
- [ ] No error messages

---

## 📋 Detailed Step-by-Step

### Step A: Gather Credentials (5 min)

| Service | Where to Get |
|---------|-------------|
| **Database** | Vercel Postgres or Neon.tech |
| **JWT Secret** | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **Flutterwave** | dashboard.flutterwave.com → Settings |
| **SME Plug** | smeplug.ng → API Settings |
| **Saiful** | app.saifulegendconnect.com → API |

### Step B: Vercel Setup (8 min)

```bash
1. Visit: https://vercel.com
2. Login with GitHub
3. Click: "Add New" → "Project"
4. Paste: https://github.com/syabdallah018/sydatasub.git
5. Click: "Import"
6. Wait for auto-detection (Framework: Next.js)
7. Click: "Continue"
```

### Step C: Add Environment Variables (3 min)

**In Vercel Settings → Environment Variables:**

```
Variable 1/12:
Name: DATABASE_URL
Value: postgresql://...
Environments: ✓ ✓ ✓
Click: Add

Variable 2/12:
Name: JWT_SECRET
Value: (64-char random)
Environments: ✓ ✓ ✓
Click: Add

... repeat for all 12 variables ...
```

**All 12 variables needed:**
1. DATABASE_URL
2. JWT_SECRET
3. FLUTTERWAVE_SECRET_KEY
4. FLUTTERWAVE_PUBLIC_KEY
5. FLUTTERWAVE_WEBHOOK_SECRET
6. FLW_ACCOUNT_EMAIL
7. FLW_BVN
8. SMEPLUG_API_KEY
9. SMEPLUG_BASE_URL
10. SAIFUL_API_KEY
11. SAIFUL_BASE_URL
12. NEXT_PUBLIC_APP_URL

### Step D: Deploy! (2 min)

Once variables added:
1. Scroll down → Click "Deploy"
2. Watch status turn ✓ "Ready" (usually 2-5 min)
3. Click URL → Your app is live! 🎉

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] **URL Loads** → `https://sydatasub.vercel.app`
- [ ] **Homepage Responsive** → Mobile/desktop both work
- [ ] **Sign Up Works** → Click button → Form loads
- [ ] **Admin Panel** → Visit `/admin` → Dashboard shows
- [ ] **No Errors** → Browser console clean (F12)
- [ ] **API Works** → Can login (check network tab)
- [ ] **Database Connected** → No "DB error" messages
- [ ] **Payments Ready** → Flutterwave widget loads

---

## 🆘 Quick Fixes

**If build fails:**
```
→ Check: All 12 environment variables added
→ Try: Click "Redeploy" latest commit
```

**If app shows errors:**
```
→ Check: Vercel Logs (click deployment)
→ Look for: "error" in red
→ Fix: Usually missing env variable
```

**If database error:**
```
→ Check: DATABASE_URL value is correct (copy-paste exact)
→ Check: PostgreSQL service is running
```

**If payments not working:**
```
→ Check: Flutterwave keys not switched
→ Check: Using TEST keys for testing, LIVE for production
```

---

## 📚 Full Documentation

For detailed info, read:
- **ENV_SETUP.md** ← Every variable explained in detail
- **VERCEL_DEPLOYMENT.md** ← Complete deployment guide
- **DATABASE_SETUP.md** ← Database configuration guide

---

## 🎯 Timeline

| Step | Time | Action |
|------|------|--------|
| 1️⃣ | 2 min | Prepare credentials |
| 2️⃣ | 3 min | Connect GitHub to Vercel |
| 3️⃣ | 3 min | Add 12 environment variables |
| 4️⃣ | 1 min | Click Deploy |
| 5️⃣ | 5 min | Wait for build (Vercel builds) |
| 6️⃣ | 2 min | Test and verify |
| **Total** | **~15 min** | **Live on Vercel!** 🚀 |

---

## 🚨 Important Notes

❌ **DON'T:**
- Commit `.env` or `.env.local` to Git
- Use same secrets for dev/staging/production
- Share environment variables via email/Slack
- Log secrets in console

✅ **DO:**
- Add variables only in Vercel Dashboard
- Use strong, random secrets (32+ chars)
- Keep a secure password manager backup
- Rotate secrets periodically in production

---

## 🆘 Need Help?

**If stuck:**
1. Check Vercel Logs → click deployment → scroll down for errors
2. Read ENV_SETUP.md → for each variable's purpose
3. Read VERCEL_DEPLOYMENT.md → for complete step-by-step
4. Check official docs:
   - Vercel: https://vercel.com/docs
   - Next.js: https://nextjs.org/docs
   - Flutterwave: https://developer.flutterwave.com

---

**Status:** ✅ Ready to Deploy  
**Build Passed:** ✅ TypeScript + Next.js  
**Estimated Deploy Time:** 15 minutes  
**Last Updated:** April 9, 2026
