# ইজিদোকান (EasyDukan) — দোকানের হিসাব, একদম সহজে

Stack: **Next.js 14 + Tailwind** (frontend) · **NestJS + GraphQL (Apollo, schema-first)** · **Prisma** · **PostgreSQL**

## চালানোর নিয়ম

### 1) Database
```bash
docker compose up -d        # local PostgreSQL (অথবা Neon-এর URL backend/.env এ বসাও)
```

### 2) Backend (port 4000)
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run start:dev
```
GraphQL: http://localhost:4000/graphql

### 3) Frontend (port 3000)
```bash
cd frontend
npm install
npm run dev
```
http://localhost:3000 → "নতুন দোকান খুলুন" দিয়ে রেজিস্ট্রেশন করো।

## Environment
- `backend/.env` → `DATABASE_URL`, `JWT_SECRET`, `PORT`, `FRONTEND_URL`
- `frontend/.env.local` → `NEXT_PUBLIC_API_URL`

## যা যা আছে (MVP)
রেজিস্ট্রেশন/লগইন · দোকান সেটআপ · আজকের হিসাব ড্যাশবোর্ড · দ্রুত বিক্রি + পণ্য দিয়ে বিক্রি · বাকির খাতা (কাস্টমার, টাকা গ্রহণ, লেজার, WhatsApp রিমাইন্ডার লিংক) · খরচ · মালদাতা (পাওনা/পরিশোধ) · পণ্য ও স্টক এলার্ট · মাল কেনা · হিসাব বন্ধ · রিপোর্ট (আজ/সপ্তাহ/মাস) · Role (Owner/Manager/Employee)

## Multi-tenant security
- সব ব্যবসার টেবিলে `tenantId` আছে।
- `tenantId` আসে JWT থেকে, ক্লায়েন্টের input থেকে নয়। প্রতিটি query/mutation-এ tenantId দিয়ে filter হয়।
- Role check: Employee শুধু বিক্রি করতে পারে; Manager হিসাব/স্টক/খরচ; Owner সব।

## পরের ধাপ (Phase 2/3)
Barcode, Invoice, SMS/WhatsApp API, Subscription plan, Voice input, PWA offline sync, Rate limiting, Audit log।
