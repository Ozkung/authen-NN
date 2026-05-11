# Save Plan — auth-NN

> Snapshot: 2026-05-11 | Stack: NestJS 11 · Next.js 16 · MongoDB · NextAuth v5

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER (port 3000)                           │
│                                                                      │
│   Next.js 16 App Router                                              │
│   ┌──────────────┐  ┌───────────────┐  ┌─────────────────────────┐   │
│   │  Auth Pages  │  │  Admin Hub    │  │  Store Workspace        │   │
│   │  /login      │  │  /admin       │  │  /[storeId]/[role]      │   │
│   │  /register   │  │               │  │  (URL uses _id)         │   │
│   │  /verify-..  │  │  List stores  │  │  Permissions panel      │   │
│   │  /forgot-..  │  │  Create store │  │  Team member mgmt       │   │
│   │  /reset-..   │  │  (logo/type   │  │  (owner/admin only)     │   │
│   │              │  │   hours/map)  │  │                         │   │
│   └──────┬───────┘  └──────┬────────┘  └─────────────┬───────────┘   │
│          │                 │                         │               │
│          └────────┬────────┘                         │               │
│                   │  NextAuth v5 (Credentials)       │               │
│                   │  Session: accessToken/storeId    │               │
│                   ▼                                  │               │
│          ┌─────────────────┐                         │               │
│          │  proxy.ts       │  route protection       │               │
│          │  (Next.js 16)   │  redirects              │               │
│          └─────────────────┘                         │               │
└──────────────────────────────────────────────────────┼───────────────┘
                    │ Bearer JWT                        │ Bearer JWT
                    ▼                                   ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        NestJS API (port 3001)                         │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ AuthModule   │  │ UsersModule  │  │ StoresModule                │  │
│  │              │  │              │  │                             │  │
│  │ /auth/login  │  │ UsersService │  │ GET  /stores/mine           │  │
│  │ /auth/reg..  │  │  findByEmail │  │ POST /stores (multipart)    │  │
│  │ /auth/verify │  │  update      │  │ GET  /stores/:id/members    │  │
│  │ /auth/forgot │  │  deleteById  │  │ POST /stores/:id/members    │  │
│  │ /auth/reset  │  │              │  │ DEL  /stores/:id/members/:u │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────────────────────────┘  │
│         │                  │                                           │
│  ┌──────▼──────────────────▼────────────────────────────────────────┐  │
│  │  JwtAuthGuard  ·  @Public() decorator  ·  LoggingInterceptor     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐   │
│  │ MailModule   │  │ Static Files  /uploads/logos/*               │   │
│  │  (Global)    │  │ (served via useStaticAssets)                 │   │
│  └──────────────┘  └──────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
          ┌──────────────────┐
          │  MongoDB         │
          │  auth-db         │
          │  ──────────────  │
          │  users           │
          │  stores          │
          │  storemembers    │
          └──────────────────┘
```

---

## 2. Complete Auth Flow

```
REGISTER
──────────────────────────────────────────────────────────────────────
User fills form → POST /auth/register
  → Check email unique
  → bcrypt.hash(password, 10)
  → crypto.randomBytes(32) → verificationToken
  → Create User (isVerified: false)
  → Send verification email
    ├── SUCCESS → return { message }
    └── FAIL    → deleteById(user) → throw BadRequest

VERIFY EMAIL
──────────────────────────────────────────────────────────────────────
User clicks email link → GET /verify-email?token=<hex> (frontend)
  → Frontend calls GET /auth/verify?token=<hex>
  → findByVerificationToken(token)
  → Update: isVerified=true, $unset verificationToken
  → 5-second countdown → redirect /login

LOGIN
──────────────────────────────────────────────────────────────────────
User fills login form → signIn("credentials", { email, password, identityStore? })
  → NextAuth Credentials.authorize()
  → POST /auth/login { email, password, identityStore? }

  Backend login():
    → findByEmail(email)
    → check isVerified
    → bcrypt.compare(password, hash)
    → if identityStore provided (= store _id):
        → findById(identityStore)          ← uses _id now (not slug)
        → findMember(storeId, userId)
        → storeId = store._id.toString(), role = member.role
    → JWT sign { sub, email, storeId?, role? }
    → return { access_token, storeId, role }

  NextAuth authorize() returns:
    { id: access_token, email, accessToken, storeId, role }

  JWT callback stores in token:
    { accessToken, storeId, role }

  Session callback exposes:
    session.accessToken, session.storeId, session.role

  Frontend after signIn():
    → getSession()
    → if session.storeId && session.role → /${storeId}/${role}
    → else → /admin

FORGOT PASSWORD
──────────────────────────────────────────────────────────────────────
User submits email → POST /auth/forgot-password
  → findByEmail (silent if not found — no user enumeration)
  → crypto.randomBytes(32) → resetToken
  → resetExpires = now + 1h
  → update user { forgotPasswordToken, forgotPasswordExpires }
  → send reset email → { message }

RESET PASSWORD
──────────────────────────────────────────────────────────────────────
User submits new password → POST /auth/reset-password { token, password }
  → findByResetToken(token) — checks expiry
  → bcrypt.hash(newPassword, 10)
  → update user: password, $unset forgotPasswordToken+Expires
  → { message: "Password reset successfully" }
```

---

## 3. Multi-Store Workspace Flow

```
After Login (no identityStore) ──────────► /admin
                                             │
                                    List all stores (GET /stores/mine)
                                    Create new store (POST /stores)
                                    [form: logo, name, type, hours, map]
                                             │
                                    Click store card
                                             │
                                             ▼
                                    /[store._id]/[role]     ← uses MongoDB _id
                                             │
                                    ┌────────┴────────┐
                                    │                 │
                               owner/admin          staff
                               Permissions          Permissions
                               Team member          (read-only)
                               management
                               GET /stores/:id/members
                               POST /stores/:id/members (by email)
                               DELETE /stores/:id/members/:userId

After Login (with identityStore = store _id) ──► /[storeId]/[role]
  (direct deep link)
```

---

## 4. Route Protection Map

| Path Pattern      | Auth Required | Logged-in Redirect | Notes                          |
| ----------------- | ------------- | ------------------ | ------------------------------ |
| `/login`          | No            | → `/admin`         |                                |
| `/register`       | No            | → `/admin`         |                                |
| `/forgot-password`| No            | → `/admin`         |                                |
| `/reset-password` | No            | → `/admin`         |                                |
| `/verify-email`   | No            | Stay (accessible)  | Token from query param         |
| `/`               | Yes           | —                  | Home page                      |
| `/admin`          | Yes           | —                  | Store hub                      |
| `/[store]/[role]` | Yes           | —                  | Workspace (`[store]` = `_id`)  |

**Implemented in:** `src/proxy.ts` (Next.js 16 — renamed from `middleware.ts`)

---

## 5. Data Models

### User
```typescript
{
  _id: ObjectId,
  email: string,                 // unique, required
  password: string,              // bcrypt hash
  displayName?: string,
  gender?: string,
  birthDate?: Date,
  isVerified: boolean,           // default: false
  verificationToken?: string,
  forgotPasswordToken?: string,
  forgotPasswordExpires?: Date,
}
// ⚠️ Missing: timestamps, index on token fields
```

### Store
```typescript
{
  _id: ObjectId,                 // ← used as URL identifier
  name: string,                  // required
  slug?: string,                 // auto-generated (name + timestamp base36), unique index
  owner: ObjectId,               // ref: User
  logo?: string,                 // path: /uploads/logos/<filename>
  businessType?: string,         // enum value (e.g. "restaurant", "cafe")
  operatingHours?: number,       // 2–24
  openTime?: string,             // "HH:MM" — only if operatingHours < 24
  closeTime?: string,            // "HH:MM" — only if operatingHours < 24
  googleMapLink?: string,        // URL
  createdAt: Date,
  updatedAt: Date,
}
```

### StoreMember
```typescript
{
  _id: ObjectId,
  store: ObjectId,               // ref: Store
  user: ObjectId,                // ref: User
  role: "owner" | "admin" | "staff",
  // Compound unique index: { store: 1, user: 1 }
}
```

---

## 6. Feature Completion Status

| Feature                              | Status   | Notes                                               |
| ------------------------------------ | -------- | --------------------------------------------------- |
| User registration                    | ✅ Done  | Atomic: user deleted if email fails                 |
| Email verification                   | ✅ Done  | Token-based, 5s countdown page                      |
| Login (basic)                        | ✅ Done  | JWT, bcrypt                                         |
| Login (with identityStore)           | ✅ Done  | identityStore = store `_id`; returns storeId + role |
| Forgot password                      | ✅ Done  | Silent user enumeration protection                  |
| Reset password                       | ✅ Done  | Token + 1h expiry, token cleared on use             |
| Route protection (proxy)             | ✅ Done  | `proxy.ts` (Next.js 16 convention)                  |
| Admin hub page                       | ✅ Done  | List stores, create store with full form            |
| Store create form — logo upload      | ✅ Done  | Multer diskStorage, 2MB limit, image only           |
| Store create form — business type    | ✅ Done  | 30-option dropdown (Thai + English)                 |
| Store create form — operating hours  | ✅ Done  | 2–24h select; open/close time if < 24h              |
| Store create form — Google Map       | ✅ Done  | URL input                                           |
| Store URL uses `_id`                 | ✅ Done  | `/${store._id}/${role}` throughout                  |
| Store workspace page                 | ✅ Done  | Role badge, permissions, member mgmt                |
| Add member by email                  | ✅ Done  | `POST /stores/:id/members`                          |
| List store members                   | ✅ Done  | `GET /stores/:id/members`                           |
| Remove member                        | ✅ Done  | `DELETE /stores/:id/members/:userId`                |
| Static file serving (logos)          | ✅ Done  | `http://localhost:3001/uploads/logos/...`            |
| Email sending                        | ✅ Done  | Gmail SMTP, app password                            |
| JWT in session                       | ✅ Done  | accessToken, storeId, role propagated               |
| Playful UI theme                     | ✅ Done  | #EF7722 × #0BA6DF, Nunito, animated                 |

---

## 7. Known Issues & Technical Debt

### 🔴 Critical

| # | Issue | File | Fix |
|---|---|---|---|
| 7 | JWT secret has hardcoded fallback `'secretKey'` | `backend/src/common/guards/auth.guard.ts` | Throw if `JWT_SECRET` not set |

### 🟠 Important

| # | Issue | File | Fix |
|---|---|---|---|
| 8 | No DTO validation (class-validator) on any endpoint | All controllers | Add `@Body() dto: CreateUserDto`, `ValidationPipe` globally |
| 9 | No rate limiting on `/auth/*` endpoints | `backend/src/main.ts` | Add `@nestjs/throttler` |
| 10 | No password strength rules | `auth.service.ts` | Min 8 chars, 1 uppercase, 1 number |

### 🟡 Should Fix

| # | Issue | File | Fix |
|---|---|---|---|
| 11 | No `timestamps` on User schema | `user.schema.ts` | Add `@Schema({ timestamps: true })` |
| 12 | No DB index on `verificationToken` / `forgotPasswordToken` | `user.schema.ts` | Add `@Prop({ index: true })` |
| 13 | No JWT refresh token | `auth.service.ts` | Return `refresh_token`, add `/auth/refresh` endpoint |
| 14 | Nodemailer `secure` flag not set for port 587 | `mail.service.ts` | Add `secure: false, requireTLS: true` for STARTTLS |
| 19 | Logo files stored locally — lost on redeploy | `uploads/logos/` | Migrate to S3 / Cloudinary / object storage |

### 🟢 Nice to Have

| # | Issue | Fix |
|---|---|---|
| 16 | `_id` typed as `any` throughout | Use `Types.ObjectId` properly |
| 17 | `app.controller.ts` / `app.service.ts` are unused boilerplate | Delete both files |
| 18 | No `AUTH_SECRET` rotation strategy | Document rotation procedure |
| 20 | `identityStore` field UX — user must enter raw `_id` | Show copyable `_id` on store card in admin |

---

## 8. Environment Variables Reference

### Backend `.env`
```env
MONGODB_URI=mongodb://root:password@localhost:27017/
JWT_SECRET=<strong-random-secret>
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASS=xxxx xxxx xxxx xxxx    # Gmail App Password
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Frontend `.env.local`
```env
AUTH_SECRET=<base64-random-32-bytes>   # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

---

## 9. API Endpoints Reference

### Auth (all @Public)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, displayName?, gender?, birthDate? }` | `{ message }` |
| POST | `/auth/login` | `{ email, password, identityStore? }` | `{ access_token, storeId, role }` |
| GET | `/auth/verify?token=` | — | `{ message }` |
| POST | `/auth/forgot-password` | `{ email }` | `{ message }` |
| POST | `/auth/reset-password` | `{ token, password }` | `{ message }` |

### Stores (JWT required)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/stores/mine` | Any | — | `[{ store, role }]` |
| POST | `/stores` | Any | `multipart/form-data`: `name, businessType?, operatingHours?, openTime?, closeTime?, googleMapLink?, logo?` | `Store` |
| GET | `/stores/:storeId/members` | owner/admin | — | `[{ user, role }]` |
| POST | `/stores/:storeId/members` | owner/admin | `{ email, role }` | `StoreMember` |
| DELETE | `/stores/:storeId/members/:userId` | owner | — | `{ message }` |

> **Note:** `POST /stores` uses `multipart/form-data` (not JSON) because of logo file upload.  
> Do **not** set `Content-Type` header manually — browser adds boundary automatically.

---

## 10. File Conventions

| Convention | File | Notes |
|---|---|---|
| Route protection | `src/proxy.ts` | Next.js 16: renamed from `middleware.ts`; export name `proxy` |
| API base URL | `src/lib/api.ts` | `NEXT_PUBLIC_API_URL \|\| 'http://localhost:3001'` |
| NextAuth config | `src/auth.ts` | Credentials provider, JWT/session callbacks |
| NextAuth routes | `src/app/api/auth/[...nextauth]/route.ts` | Handlers from auth.ts |

---

## 11. Dev Setup Commands

```bash
# MongoDB (Docker)
docker run -d --name mongo \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -p 27017:27017 mongo:latest

# MailHog (local SMTP for dev)
docker run -d --name mailhog \
  -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Backend
cd backend && bun run start:dev

# Frontend
cd frontend && bun run dev

# Logo uploads are stored in:
# backend/uploads/logos/  (served at http://localhost:3001/uploads/logos/...)
```

---

## 12. Immediate Next Steps (Priority Order)

1. **Show store `_id` on admin card** — users need to copy it for `identityStore` login field (issue #20)
2. **Add global `ValidationPipe`** to `backend/src/main.ts` + create DTOs — prevents crashes from malformed input
3. **Add `@nestjs/throttler`** to rate-limit `/auth/*` — prevents brute-force
4. **Fix JWT secret fallback** in `auth.guard.ts` — throw if `JWT_SECRET` env missing
5. **Add index on token fields** in `user.schema.ts` — performance fix
6. **Add timestamps to User schema** — needed for auditing
7. **Add `secure: false, requireTLS: true`** to Nodemailer config — correct STARTTLS
8. **Migrate logo storage to object storage** (S3/Cloudinary) before deploying
9. **Delete `app.controller.ts` / `app.service.ts`** — remove dead code
