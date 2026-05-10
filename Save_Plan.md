# Save Plan — auth-NN

> Snapshot: 2026-05-10 | Stack: NestJS 11 · Next.js 15 · MongoDB · NextAuth v5

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        BROWSER (port 3000)                           │
│                                                                      │
│   Next.js 15 App Router                                              │
│   ┌──────────────┐  ┌───────────────┐  ┌─────────────────────────┐   │
│   │  Auth Pages  │  │  Admin Hub    │  │  Store Workspace        │   │
│   │  /login      │  │  /admin       │  │  /[store]/[role]        │   │
│   │  /register   │  │               │  │                         │   │
│   │  /verify-..  │  │  List stores  │  │  Permissions panel      │   │
│   │  /forgot-..  │  │  Create store │  │  Team member mgmt       │   │
│   │  /reset-..   │  │               │  │  (owner/admin only)     │   │
│   └──────┬───────┘  └──────┬────────┘  └─────────────┬───────────┘   │
│          │                 │                         │               │
│          └────────┬────────┘                         │               │
│                   │  NextAuth v5 (Credentials)       │               │
│                   │  Session: accessToken/role/slug  │               │
│                   ▼                                  │               │
│          ┌─────────────────┐                         │               │
│          │  Next Middleware │  route protection      │               │
│          │  (auth.ts)      │  redirects              │               │
│          └─────────────────┘                         │               │
└──────────────────────────────────────────────────────┼───────────────┘
                    │ Bearer JWT                        │ Bearer JWT
                    ▼                                   ▼
┌───────────────────────────────────────────────────────────────────┐
│                       NestJS API (port 3001)                      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │ AuthModule   │  │ UsersModule  │  │ StoresModule           │   │
│  │              │  │              │  │                        │   │
│  │ /auth/login  │  │ UsersService │  │ GET /stores/mine       │   │
│  │ /auth/reg..  │  │  findByEmail │  │ POST /stores           │   │
│  │ /auth/verify │  │  update      │  │ GET /stores/:s/members │   │
│  │ /auth/forgot │  │  deleteById  │  │ POST /stores/:s/members│   │
│  │ /auth/reset  │  │              │  │ DELETE /stores/:s/..   │   │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────────┘   │
│         │                  │                                      │
│  ┌──────▼──────────────────▼────────────────────────────────────┐ │
│  │  JwtAuthGuard  ·  @Public() decorator  ·  LoggingInterceptor │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────┐                                                 │
│  │ MailModule   │  Nodemailer → Gmail SMTP (port 587, STARTTLS)   │
│  │  (Global)    │  - Verification email                           │
│  │              │  - Password reset email                         │
│  └──────────────┘                                                 │
└───────────────────────────────────────────────────────────────────┘
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
    → if identityStore provided:
        → findBySlug(identityStore)
        → findMember(storeId, userId)
        → storeSlug = store.slug, role = member.role
    → JWT sign { sub, email, storeSlug?, role? }
    → return { access_token, storeSlug, role }

  NextAuth authorize() returns:
    { id: access_token, email, accessToken, storeSlug, role }

  JWT callback stores in token:
    { accessToken, storeSlug, role }

  Session callback exposes:
    session.accessToken, session.storeSlug, session.role

  Frontend after signIn():
    → getSession()
    → if session.storeSlug && session.role → /${slug}/${role}
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
  → findByResetToken(token) — checks expiry via schema index
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
                                             │
                                    Click store card
                                             │
                                             ▼
                                    /[storeSlug]/[role]
                                             │
                                    ┌────────┴────────┐
                                    │                 │
                               owner/admin          staff
                               Permissions          Permissions
                               Team member          (read-only)
                               management
                               GET /stores/:slug/members
                               POST /stores/:slug/members (by email)
                               DELETE /stores/:slug/members/:userId

After Login (with identityStore) ──────────► /[storeSlug]/[role]
  (direct deep link)
```

---

## 4. Route Protection Map

| Path Pattern       | Auth Required | Logged-in Redirect | Notes                             |
| ------------------ | ------------- | ------------------ | --------------------------------- |
| `/login`           | No            | → `/admin`         |                                   |
| `/register`        | No            | → `/admin`         |                                   |
| `/forgot-password` | No            | → `/admin`         |                                   |
| `/reset-password`  | No            | → `/admin`         |                                   |
| `/verify-email`    | No            | Stay (accessible)  | Token from query param            |
| `/`                | Yes           | —                  | Home page                         |
| `/admin`           | Yes           | —                  | Store hub                         |
| `/[store]/[role]`  | Yes           | —                  | Workspace (any slug/role pattern) |

---

## 5. Data Models

### User

```typescript
{
  _id: ObjectId,
  email: string,          // unique, required
  password: string,       // bcrypt hash
  displayName?: string,
  gender?: string,
  birthDate?: Date,
  isVerified: boolean,    // default: false
  verificationToken?: string,
  forgotPasswordToken?: string,
  forgotPasswordExpires?: Date,
}
// ⚠️ Missing: timestamps, index on token fields
```

### Store

```typescript
{
  _id: ObjectId,
  name: string,           // required
  slug: string,           // unique, indexed, required
  owner: ObjectId,        // ref: User
  createdAt: Date,
  updatedAt: Date,
}
```

### StoreMember

```typescript
{
  _id: ObjectId,
  store: ObjectId,        // ref: Store
  user: ObjectId,         // ref: User
  role: "owner"|"admin"|"staff",
  // Compound unique index: { store: 1, user: 1 }
}
```

---

## 6. Feature Completion Status

| Feature                       | Status  | Notes                                         |
| ----------------------------- | ------- | --------------------------------------------- |
| User registration             | ✅ Done | Atomic: user deleted if email fails           |
| Email verification            | ✅ Done | Token-based, 5s countdown page                |
| Login (basic)                 | ✅ Done | JWT, bcrypt                                   |
| Login (with identityStore)    | ✅ Done | Validates store membership, returns slug+role |
| Forgot password               | ✅ Done | Silent user enumeration protection            |
| Reset password                | ✅ Done | Token + 1h expiry, token cleared on use       |
| Route protection (middleware) | ✅ Done | NextAuth authorized() callback                |
| Admin hub page                | ✅ Done | List stores, create store                     |
| Store workspace page          | ✅ Done | Role badge, permissions, member mgmt          |
| Add member by email           | ✅ Done | POST /stores/:slug/members                    |
| List store members            | ✅ Done | GET /stores/:slug/members                     |
| Remove member                 | ✅ Done | DELETE /stores/:slug/members/:userId          |
| Email sending                 | ✅ Done | Gmail SMTP, app password                      |
| JWT in session                | ✅ Done | accessToken, storeSlug, role propagated       |
| Playful UI theme              | ✅ Done | #EF7722 × #0BA6DF, Nunito, animated           |

---

## 7. Known Issues & Technical Debt

### 🔴 Critical

| #   | Issue                                                                   | File                                      | Fix                                     |
| --- | ----------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| 1   | `MongooseModule.forRootAsync` fallback URI may be broken if env not set | `backend/src/app.module.ts`               | Verify string concatenation in fallback |
| 7   | JWT secret has hardcoded fallback `'secretKey'`                         | `backend/src/common/guards/auth.guard.ts` | Throw if `JWT_SECRET` not set           |

### 🟠 Important

| #   | Issue                                               | File                  | Fix                                                         |
| --- | --------------------------------------------------- | --------------------- | ----------------------------------------------------------- |
| 8   | No DTO validation (class-validator) on any endpoint | All controllers       | Add `@Body() dto: CreateUserDto`, `ValidationPipe` globally |
| 9   | No rate limiting on `/auth/*` endpoints             | `backend/src/main.ts` | Add `@nestjs/throttler`                                     |
| 10  | No password strength rules                          | `auth.service.ts`     | Min 8 chars, 1 uppercase, 1 number                          |

### 🟡 Should Fix

| #   | Issue                                                      | File              | Fix                                                  |
| --- | ---------------------------------------------------------- | ----------------- | ---------------------------------------------------- |
| 11  | No `timestamps` on User schema                             | `user.schema.ts`  | Add `@Schema({ timestamps: true })`                  |
| 12  | No DB index on `verificationToken` / `forgotPasswordToken` | `user.schema.ts`  | Add `@Prop({ index: true })`                         |
| 13  | No JWT refresh token                                       | `auth.service.ts` | Return `refresh_token`, add `/auth/refresh` endpoint |
| 14  | Nodemailer `secure` flag not set for port 587              | `mail.service.ts` | Add `secure: false, requireTLS: true` for STARTTLS   |

### 🟢 Nice to Have

| #   | Issue                                                         | Fix                                          |
| --- | ------------------------------------------------------------- | -------------------------------------------- |
| 16  | `_id` typed as `any` throughout                               | Create typed wrapper or use `Types.ObjectId` |
| 17  | `app.controller.ts` / `app.service.ts` are unused boilerplate | Delete both files                            |
| 18  | No `AUTH_SECRET` rotation strategy                            | Document rotation procedure                  |

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

| Method | Path                    | Body                                                     | Response                            |
| ------ | ----------------------- | -------------------------------------------------------- | ----------------------------------- |
| POST   | `/auth/register`        | `{ email, password, displayName?, gender?, birthDate? }` | `{ message }`                       |
| POST   | `/auth/login`           | `{ email, password, identityStore? }`                    | `{ access_token, storeSlug, role }` |
| GET    | `/auth/verify?token=`   | —                                                        | `{ message }`                       |
| POST   | `/auth/forgot-password` | `{ email }`                                              | `{ message }`                       |
| POST   | `/auth/reset-password`  | `{ token, password }`                                    | `{ message }`                       |

### Stores (JWT required)

| Method | Path                            | Auth        | Body              | Response            |
| ------ | ------------------------------- | ----------- | ----------------- | ------------------- |
| GET    | `/stores/mine`                  | Any         | —                 | `[{ store, role }]` |
| POST   | `/stores`                       | Any         | `{ name, slug }`  | `Store`             |
| GET    | `/stores/:slug/members`         | owner/admin | —                 | `[{ user, role }]`  |
| POST   | `/stores/:slug/members`         | owner/admin | `{ email, role }` | `StoreMember`       |
| DELETE | `/stores/:slug/members/:userId` | owner       | —                 | `{ message }`       |

---

## 10. Dev Setup Commands

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
```

---

## 11. Immediate Next Steps (Priority Order)

1. **Add global `ValidationPipe`** to `backend/src/main.ts` + create DTOs for all endpoints — prevents crashes from malformed input
2. **Add `@nestjs/throttler`** to rate-limit `/auth/*` — prevents brute-force
3. **Fix JWT secret fallback** in `auth.guard.ts` — throw if `JWT_SECRET` env is missing
4. **Add index on token fields** in `user.schema.ts` — performance fix
5. **Add timestamps to User schema** — needed for auditing
6. **Add `secure: false, requireTLS: true`** to Nodemailer config — correct STARTTLS setup
7. **Delete `app.controller.ts` / `app.service.ts`** — remove dead code
