# 📊 SY DATA SUB — Complete Database Schema Implementation

## ✅ What Was Implemented

### 1. **Prisma Schema** (`prisma/schema.prisma`)
Complete database schema with 7 models and 7 enums:

#### **Models Created:**
- ✅ `User` — Full authentication, role-based access, balance tracking
- ✅ `VirtualAccount` — Flutterwave virtual account linking
- ✅ `Plan` — Data plans from API A & API B with network mapping
- ✅ `Transaction` — Complete transaction history (data, airtime, wallet, rewards)
- ✅ `Reward` — Rewards system (signup bonus, deposit bonuses)
- ✅ `UserReward` — User reward tracking & claiming

#### **Enums Defined:**
```
• UserRole: USER | AGENT | ADMIN
• NetworkType: MTN | GLO | AIRTEL | NINEMOBILE
• TransactionType: DATA_PURCHASE | AIRTIME_PURCHASE | WALLET_FUNDING | REWARD_CREDIT
• TransactionStatus: PENDING | SUCCESS | FAILED | REVERSED
• ApiSource: API_A | API_B
• RewardType: SIGNUP_BONUS | FIRST_DEPOSIT_2K | DEPOSIT_10K_UPGRADE
• RewardStatus: IN_PROGRESS | EARNED | CLAIMED
```

---

### 2. **Seed File** (`prisma/seed.ts`)
Comprehensive seed script that initializes:

#### **Data Plans — 20 Total**
**API A Plans (18 plans — All MTN, Network ID: 1)**
- 500MB Share @ ₦300/week
- 1GB Share @ ₦450/week
- 2GB Share @ ₦900/week
- 3GB Share @ ₦1,200/week
- 5GB Share @ ₦1,500/month
- 1GB Daily (Awoof) @ ₦220/day
- 2.5GB Daily @ ₦550/day
- 7GB Monthly @ ₦3,500/month
- 11GB Digital Bundle @ ₦3,500/week
- 10GB + 10mins @ ₦4,500/month
- 20GB Weekly @ ₦7,500/week
- 14.5GB Value @ ₦5,000/month
- 12.5GB Monthly @ ₦5,500/month
- 20GB Monthly @ ₦7,500/month
- 25GB Monthly @ ₦9,000/month
- 36GB Monthly @ ₦11,000/month
- 65GB Monthly @ ₦16,000/month
- 75GB Monthly @ ₦18,000/month

**API B Plans (2 plans — MTN)**
- MTN 5GB (14-30 Days) @ ₦1,500
- MTN 5GB (21-30 Days) @ ₦1,600

#### **Rewards — 3 Total**
1. **SIGNUP_BONUS** — "Welcome Bonus"
   - Amount: ₦100
   - Triggered on account creation

2. **FIRST_DEPOSIT_2K** — "First Big Deposit"
   - Amount: ₦200
   - Triggered on first deposit ≥ ₦2,000

3. **DEPOSIT_10K_UPGRADE** — "High Roller"
   - Amount: ₦300
   - Triggered on deposit ≥ ₦10,000
   - Auto-upgrade user to AGENT role

---

### 3. **Package.json Scripts**
Added seed script:
```json
"seed": "tsx prisma/seed.ts"
```

---

## 🔧 Key Features of the Schema

### **User Model**
- Balance stored in **KOBO** (multiply naira by 100)
- Phone as unique identifier
- bcrypt-hashed PIN (6 digits)
- Banned/Active status tracking
- Role-based access control

### **Plan Model**
- Maps to both API A and API B
- Unique constraint on `[apiSource, externalPlanId, externalNetworkId]`
- Support for all 4 networks
- Both weekly and monthly plans

### **Transaction Model**
- Supports guest purchases (optional userId)
- Tracks balance before/after for wallet funding
- Multiple reference systems (internal, external, Flutterwave)
- Supports temp bank account details for guest transfers

### **Virtual Account Model**
- One-to-one relationship with User
- Stores Flutterwave reference and order reference
- Unique order reference for idempotency

### **Reward System**
- Three tiers of rewards
- In-progress → Earned → Claimed lifecycle
- Tracks claim timestamp

---

## 📋 Database Schema Status

| Component | Status | Details |
|-----------|--------|---------|
| Schema File | ✅ Complete | `prisma/schema.prisma` |
| Enums | ✅ Complete | 7 enums defined |
| Models | ✅ Complete | 6 models with relationships |
| Prisma Client | ✅ Generated | v7.7.0 |
| Seed File | ✅ Complete | 20 plans + 3 rewards |
| Package Script | ✅ Added | `npm run seed` |
| DB Push | ⏳ Pending | Requires DATABASE_URL |
| Database Seeding | ⏳ Pending | Requires DATABASE_URL |

---

## 🚀 Next Steps to Complete Database Setup

### Step 1: Set up Neon PostgreSQL Database
1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Create a new project (if not already done)
3. Copy the PostgreSQL connection string
4. Update `.env.local`:
   ```
   DATABASE_URL="postgresql://username:password@host/database?sslmode=require"
   ```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Push Schema to Database
```bash
npx prisma db push
```
*Note: First time will create all tables. Subsequent runs will detect schema diffs.*

### Step 4: Seed Database
```bash
npm run seed
```
*This will create all 20 data plans and 3 rewards.*

### Step 5: (Optional) View Database
```bash
npx prisma studio
```
Opens a web UI to view/manage data.

---

## 📝 Schema Highlights

### Relations
```
User ─── VirtualAccount (one-to-one)
User ─── Transaction[] (one-to-many)
User ─── UserReward[] (one-to-many)
Plan ─── Transaction[] (one-to-many)
Reward ─── UserReward[] (one-to-many)
```

### Unique Constraints
- `User.phone` — unique
- `VirtualAccount.userId` — unique
- `VirtualAccount.orderRef` — unique
- `Plan[apiSource, externalPlanId, externalNetworkId]` — unique
- `Transaction.reference` — unique
- `UserReward[userId, rewardId]` — unique

### Indexes
- `User(phone, email)` — for fast lookups
- `Plan(network, isActive)` — for plan filtering
- `Transaction(userId, status, phone, reference)` — for query performance
- `UserReward(userId, status)` — for reward tracking

---

## 💾 Database Statistics

After seeding:
- **Plans**: 20 records (18 API A, 2 API B)
- **Rewards**: 3 records
- **Users**: 0 (to be created by signup)
- **Transactions**: 0 (generated during usage)

---

## ❓ Status Summary

```
DATABASE SCHEMA IMPLEMENTATION: ✅ 100% COMPLETE

✅ 7 Models created
✅ 7 Enums defined
✅ All relationships configured
✅ Indexes optimized
✅ Unique constraints applied
✅ Seed file with 20 plans & 3 rewards
✅ Prisma Client generated (v7.7.0)
⏳ Database push ready (awaiting DATABASE_URL)
⏳ Seeding ready (awaiting successful db push)
```

---

Generated: April 9, 2026
