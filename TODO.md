# TODO — auth-NN Project

> Generated 2026-05-10 after full codebase audit.
> Priority: 🔴 Critical (breaks functionality) · 🟠 High (security/data) · 🟡 Medium · 🟢 Low

---

## 🔴 Critical Bugs

### 1. MongoDB URI fallback is a string literal (app.module.ts:20)
**File:** `backend/src/app.module.ts`
**Problem:** The linter corrupted the `??` fallback into a template-literal string:
```ts
// WRONG — fallback is the literal text, not a URL
configService.get<string>('MONGODB_URI') ?? `configService.get<string>('MONGODB_URI')`
```
If `MONGODB_URI` is missing from `.env`, the connection string becomes
`"configService.get<string>('MONGODB_URI')auth-db?authSource=admin"` and Mongoose fails silently.
**Fix:** Change fallback to `'mongodb://localhost:27017/'`

---

### 2. `identityStore` field is silently dropped (auth.ts)
**File:** `frontend/src/auth.ts`
**Problem:** The login page sends `identityStore` via `signIn("credentials", { ..., identityStore })`,
but the NextAuth `authorize()` function only reads `credentials.email` and `credentials.password`.
The field never reaches the backend — it is completely ignored.
**Fix:** Either wire `identityStore` through to the backend POST, or remove the field from the login form.

---

### 3. `/verify-email` blocked for logged-in users (auth.ts:47–52)
**File:** `frontend/src/auth.ts`
**Problem:** The middleware's `authorized` callback treats `/verify-email` as an auth page and
redirects logged-in users to `/`. A user who registers on a new device while already logged in
on another device will never be able to click the verification link.
**Fix:** Remove `/verify-email` from `isOnAuthPage` list — it must be publicly accessible always.

---

### 4. User created but verification email fails → user stuck (auth.service.ts:44)
**File:** `backend/src/auth/auth.service.ts`
**Problem:** `usersService.create()` is called before `sendVerificationEmail()`. If SMTP fails,
the user document exists in MongoDB (`isVerified: false`) but no email was sent.
On retry the user gets `"User already exists"` and has no way to receive the verification email.
**Fix:** Wrap both operations in a try/catch; if email fails, delete the user document and return a
friendly error, or add a "resend verification email" endpoint.

---

### 5. `forgotPasswordToken` not cleared after reset (users.service.ts:31)
**File:** `backend/src/users/users.service.ts`
**Problem:** `update()` passes `{ forgotPasswordToken: undefined, forgotPasswordExpires: undefined }`.
Mongoose strips `undefined` values from update objects — the token fields are **not** unset in MongoDB.
The spent reset token remains in the database and could be reused (though the expiry check prevents
abuse within the 1-hour window, a permanent stale token is a data leak).
**Fix:** Use `$unset`:
```ts
this.userModel.findByIdAndUpdate(id, { $unset: { forgotPasswordToken: '', forgotPasswordExpires: '' } })
```

---

### 6. Frontend `.env` has wrong backend port (frontend/.env)
**File:** `frontend/.env`
**Problem:** `NEST_URL=http://localhost:4000` but the NestJS server runs on port **3001**.
This variable is also never consumed — all pages hardcode `http://localhost:3001` directly.
**Fix:** Correct the port AND use the env var in all fetch calls.

---

## 🟠 Security Issues

### 7. JWT secret has insecure hardcoded fallback
**Files:** `backend/src/common/guards/auth.guard.ts:35`, `backend/src/auth/auth.module.ts:16`
**Problem:** Both use `|| 'secretKey'` as a fallback when `JWT_SECRET` is missing.
Any token signed with `'secretKey'` is trivially forgeable.
**Fix:** Throw at startup if `JWT_SECRET` is not set (no fallback).

---

### 8. No request validation / DTOs
**File:** `backend/src/auth/auth.controller.ts`
**Problem:** All endpoints accept `body: any` with no validation pipe, no DTO classes,
no field-length limits, and no email-format enforcement.
A malformed payload (e.g., missing `email`, 10 MB password string) reaches the service layer.
**Fix:** Install `class-validator` + `class-transformer`, define DTO classes, enable global `ValidationPipe`.

---

### 9. No rate limiting
**Problem:** `/auth/login`, `/auth/register`, and `/auth/forgot-password` have no rate limiting.
Open to brute-force and credential-stuffing attacks.
**Fix:** Add `@nestjs/throttler` with a 5-attempts-per-minute limit on auth endpoints.

---

### 10. No password strength enforcement
**Problem:** Backend accepts any password (1 character, all spaces, etc.).
**Fix:** Enforce minimum 8 characters, at least one number or symbol, in a DTO validator.

---

## 🟡 Data / Architecture Issues

### 11. `User` schema missing timestamps
**File:** `backend/src/users/schemas/user.schema.ts`
**Problem:** `@Schema()` has no `{ timestamps: true }` — documents have no `createdAt`/`updatedAt`.
**Fix:** Change to `@Schema({ timestamps: true })`.

---

### 12. No DB index on `verificationToken` / `forgotPasswordToken`
**File:** `backend/src/users/schemas/user.schema.ts`
**Problem:** `findByVerificationToken` and `findByResetToken` do full collection scans.
**Fix:** Add `@Prop({ index: true })` or a sparse index on both token fields.

---

### 13. No JWT refresh token
**Problem:** Access token expires in 1 hour with no refresh mechanism.
Users get silently logged out mid-session.
**Fix:** Implement a refresh token (long-lived, stored in HttpOnly cookie) and a `POST /auth/refresh` endpoint.

---

### 14. `mail.service.ts` — `secure` not set for Gmail SMTP
**File:** `backend/src/mail/mail.service.ts`
**Problem:** `nodemailer` is not told `secure: false` for port 587 (STARTTLS). While nodemailer
auto-detects this for port 587, being explicit prevents misconfiguration surprises when `MAIL_PORT`
changes.
**Fix:** Add `secure: false, tls: { rejectUnauthorized: false }` for local dev; `secure: true` for port 465 in production.

---

## 🟢 Code Quality

### 15. All frontend pages hardcode `http://localhost:3001`
**Files:** All pages under `frontend/src/app/`
**Problem:** The API base URL is repeated in every file. Changing it (e.g., for staging) requires
editing 6+ files.
**Fix:** Create `frontend/src/lib/api.ts` exporting `const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'` and use it everywhere.

---

### 16. `User` extends `Document` — missing `_id` type annotation
**File:** `backend/src/users/schemas/user.schema.ts`
**Problem:** `user._id as any` casts appear in `auth.service.ts` because `_id` type is `unknown`.
**Fix:** Type `_id` explicitly as `Types.ObjectId` or use Mongoose's `HydratedDocument<User>`.

---

### 17. `app.controller.ts` / `app.service.ts` — unused default files
**Files:** `backend/src/app.controller.ts`, `backend/src/app.service.ts`, `backend/src/app.controller.spec.ts`
**Problem:** Generated boilerplate not removed after scaffolding.
**Fix:** Delete if unused or add a health-check route (`GET /health`).

---

### 18. No `NEXTAUTH_SECRET` rotation strategy
**File:** `frontend/.env.local`
**Problem:** The `AUTH_SECRET` is present but there is no mechanism to rotate it.
All existing sessions are invalidated on rotation.
**Fix:** Document the rotation process in a runbook.

---

## Summary Table

| # | Severity | Area | Short Description |
|---|----------|------|-------------------|
| 1 | 🔴 | Backend | MongoDB URI fallback is broken string literal |
| 2 | 🔴 | Frontend | `identityStore` sent but never used |
| 3 | 🔴 | Frontend | `/verify-email` blocked for logged-in users |
| 4 | 🔴 | Backend | User created even if email send fails |
| 5 | 🔴 | Backend | Reset token not unset after password reset |
| 6 | 🔴 | Frontend | `.env` has wrong/unused backend port |
| 7 | 🟠 | Security | JWT secret has insecure hardcoded fallback |
| 8 | 🟠 | Security | No request validation / DTOs |
| 9 | 🟠 | Security | No rate limiting on auth endpoints |
| 10 | 🟠 | Security | No password strength enforcement |
| 11 | 🟡 | Data | User schema missing timestamps |
| 12 | 🟡 | Data | No DB index on token fields |
| 13 | 🟡 | Arch | No JWT refresh token |
| 14 | 🟡 | Config | `secure` not set for Gmail SMTP |
| 15 | 🟢 | Quality | Hardcoded API URL in every page |
| 16 | 🟢 | Quality | `_id` typed as `any` |
| 17 | 🟢 | Quality | Unused boilerplate controller/service |
| 18 | 🟢 | Quality | No `AUTH_SECRET` rotation strategy |
