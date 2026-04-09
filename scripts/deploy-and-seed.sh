#!/bin/bash

# SY DATA SUB - Vercel Deploy & Seed Script
# Usage: ./scripts/deploy-and-seed.sh

set -e

echo "🚀 SY DATA SUB - Deploy & Database Seed"
echo "========================================"

# Step 1: Check if DATABASE_URL is set
echo "\n1️⃣ Checking DATABASE_URL..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set. Please run: vercel env add DATABASE_URL"
  exit 1
fi
echo "✅ DATABASE_URL is set"

# Step 2: Push to GitHub (triggers Vercel deploy)
echo "\n2️⃣ Pushing code to GitHub (triggers Vercel deploy)..."
git add .
git commit -m "chore: prepare for database migration and seeding" || true
git push origin main
echo "✅ Code pushed to GitHub"

# Step 3: Pull production environment from Vercel
echo "\n3️⃣ Pulling production environment from Vercel..."
vercel env pull .env.production.local
echo "✅ Environment pulled"

# Step 4: Run Prisma migrations
echo "\n4️⃣ Running Prisma migrations..."
npx prisma migrate deploy --skip-generate
echo "✅ Migrations completed"

# Step 5: Seed the database
echo "\n5️⃣ Seeding database with plans, rewards, and admin user..."
npm run seed
echo "✅ Database seeded successfully!"

echo "\n✨ All done! Your Vercel database is ready to use."
echo "You can now:"
echo "  - Visit your Vercel domain"
echo "  - Sign up a new user"
echo "  - Login with admin credentials:"
echo "    - Phone: 08000000000"
echo "    - PIN: 000000"
