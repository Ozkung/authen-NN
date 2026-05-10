# PLAN — auth-NN Authentication Flow

> Architecture reference and implementation plan.
> Stack: Next.js 15 (App Router) · NestJS 11 · MongoDB (Mongoose) · NextAuth v5 · JWT · Nodemailer

---

## Auth Flow Diagrams

### 1. Registration

```
Browser (Register Page)
        │
        │  POST /auth/register
        │  { email, password, displayName, gender, birthDate }
        ▼
NestJS AuthController.register()
        │
        ├─► UsersService.findByEmail()
        │        └─ User exists? ──► 400 "User already exists"
        │
        ├─► bcrypt.hash(password, 10)
        ├─► crypto.randomBytes(32) → verificationToken
        │
        ├─► UsersService.create({ email, hashedPw, verificationToken, isVerified: false, ... })
        │        └─ Saved to MongoDB  ◄── 🔴 BUG: user created BEFORE email is sent
        │
        ├─► MailService.sendVerificationEmail(email, token)
        │        └─ SMTP error? ──► 500 (user stuck in DB, can't re-register)
        │
        └─► 200 { message: "User registered. Please check your email..." }
                │
                ▼
        Browser shows success → user checks email
```

---

### 2. Email Verification

```
Gmail / Mailhog Inbox
        │
        │  Click link: GET /verify-email?token=<hex>
        ▼
Next.js /verify-email page  ◄── 🔴 BUG: middleware blocks logged-in users
        │
        │  GET http://localhost:3001/auth/verify?token=<hex>
        ▼
NestJS AuthController.verify()
        │
        ├─► UsersService.findByVerificationToken(token)
        │        └─ Not found? ──► 400 "Invalid or expired token"
        │
        ├─► UsersService.update(userId, { isVerified: true, verificationToken: undefined })
        │
        └─► 200 { message: "Email verified successfully" }
                │
                ▼
        Frontend shows success + 5-second countdown → redirect /login
```

---

### 3. Login (NextAuth Credentials Flow)

```
Browser (Login Page)
        │
        │  signIn("credentials", { email, password, identityStore? })
        ▼
NextAuth /api/auth/[...nextauth]  (Next.js Route Handler)
        │
        ├─► authorize(credentials)
        │        │  🔴 BUG: identityStore is ignored here
        │        │
        │        │  POST http://localhost:3001/auth/login
        │        │  { email, password }
        │        ▼
        │   NestJS AuthController.login()
        │        │
        │        ├─► UsersService.findByEmail(email)
        │        │        └─ Not found? ──► 401
        │        │
        │        ├─► user.isVerified? ──► false: 401 "Please verify your email first"
        │        │
        │        ├─► bcrypt.compare(password, user.password)
        │        │        └─ No match? ──► 401
        │        │
        │        └─► JwtService.signAsync({ sub: user._id, email }) → access_token (1h)
        │                │
        │                ▼
        │   authorize returns { id: token, email, accessToken: token }
        │
        ├─► jwt() callback: token.accessToken = user.accessToken
        ├─► session() callback: session.accessToken = token.accessToken
        │
        └─► Session stored (cookie) → router.push("/")
                │
                ▼
        Home page reads useSession() → shows dashboard
```

---

### 4. Forgot Password

```
Browser (Forgot Password Page)
        │
        │  POST /auth/forgot-password { email }
        ▼
NestJS AuthController.forgotPassword()
        │
        ├─► UsersService.findByEmail(email)
        │        └─ Not found? ──► 200 (security: don't reveal user existence)
        │
        ├─► crypto.randomBytes(32) → resetToken
        ├─► resetExpires = now + 1 hour
        │
        ├─► UsersService.update(userId, { forgotPasswordToken, forgotPasswordExpires })
        │
        ├─► MailService.sendResetPasswordEmail(email, resetToken)
        │
        └─► 200 { message: "Reset password link sent..." }
                │
                ▼
        User checks email → clicks link → /reset-password?token=<hex>
```

---

### 5. Password Reset

```
Browser (Reset Password Page)
        │  (token read from URL query param)
        │
        │  POST /auth/reset-password { token, password }
        ▼
NestJS AuthController.resetPassword()
        │
        ├─► UsersService.findByResetToken(token)
        │        Query: { forgotPasswordToken: token, forgotPasswordExpires: { $gt: now } }
        │        └─ Not found / expired? ──► 400 "Invalid or expired reset token"
        │
        ├─► bcrypt.hash(newPassword, 10)
        │
        ├─► UsersService.update(userId, { password: hashed,
        │       forgotPasswordToken: undefined,   ◄── 🔴 BUG: undefined not unset in Mongo
        │       forgotPasswordExpires: undefined })
        │
        └─► 200 { message: "Password reset successfully. You can now login." }
                │
                ▼
        Frontend waits 2.5s → redirect /login
```

---

### 6. Protected Routes (AuthGuard)

```
Any HTTP Request to NestJS
        │
        ▼
AuthGuard.canActivate()
        │
        ├─► Reflector checks @Public() on handler/class
        │        └─ isPublic = true? ──► Allow (return true)
        │
        ├─► Extract Authorization header: "Bearer <token>"
        │        └─ No token? ──► 401
        │
        ├─► JwtService.verifyAsync(token, { secret: JWT_SECRET })
        │        └─ Invalid/expired? ──► 401
        │                              🟠 BUG: fallback 'secretKey' if env missing
        │
        ├─► request['user'] = payload { sub, email }
        └─► Allow
```

---

### 7. Next.js Middleware (Route Protection)

```
Browser navigates to any URL
        │
        ▼
middleware.ts → auth() middleware (NextAuth)
        │
        ├─► authorized({ auth, nextUrl }) callback
        │
        ├─ pathname === "/" (dashboard)?
        │        ├─ isLoggedIn → Allow
        │        └─ Not logged in → Redirect /login
        │
        ├─ pathname in [/login, /register, /forgot-password,
        │               /reset-password, /verify-email]?  ◄── 🔴 BUG: /verify-email here
        │        ├─ isLoggedIn → Redirect /
        │        └─ Not logged in → Allow
        │
        └─ Other paths → Allow
```

---

## Component Map

```
auth-NN/
├── backend/                          NestJS API (port 3001)
│   └── src/
│       ├── app.module.ts             Root: ConfigModule + MongooseModule (forRootAsync)
│       ├── main.ts                   Bootstrap: CORS enabled, port 3001
│       ├── auth/
│       │   ├── auth.module.ts        JwtModule (async), imports UsersModule + MailModule
│       │   ├── auth.controller.ts    @Public() routes: register, login, verify, forgot, reset
│       │   └── auth.service.ts       Core auth logic
│       ├── users/
│       │   ├── users.module.ts       Exports UsersService
│       │   ├── users.service.ts      CRUD via Mongoose UserModel
│       │   └── schemas/user.schema.ts  User document definition
│       ├── mail/
│       │   ├── mail.module.ts        @Global() — available everywhere
│       │   └── mail.service.ts       Nodemailer transporter (Gmail SMTP / Mailhog)
│       └── common/
│           ├── guards/auth.guard.ts  JWT validation, @Public() bypass
│           ├── decorators/public.decorator.ts  IS_PUBLIC_KEY metadata
│           ├── middleware/logger.middleware.ts  Request logger
│           └── interceptors/logging.interceptor.ts  Response logger
│
└── frontend/                         Next.js 15 App Router (port 3000)
    └── src/
        ├── auth.ts                   NextAuth config: Credentials provider, JWT/session callbacks
        ├── middleware.ts             Route protection via NextAuth auth()
        └── app/
            ├── layout.tsx            Nunito font, Providers wrapper
            ├── providers.tsx         SessionProvider + HeroUI RouterProvider
            ├── globals.css           Playful theme design system (orange × blue)
            ├── components/
            │   └── MaxCard.tsx       Shared auth card shell (background + card + brand)
            ├── page.tsx              Home: landing (guest) / dashboard (authed)
            ├── login/page.tsx        Email + Password + Identity Store (optional)
            ├── register/page.tsx     Full registration form
            ├── verify-email/page.tsx Token verification + 5s countdown
            ├── forgot-password/page.tsx  Email input → reset link
            ├── reset-password/page.tsx   New password form (reads token from URL)
            └── api/auth/[...nextauth]/route.ts  NextAuth handlers
```

---

## Fix Priority Order

Tackle in this order to unblock development:

```
Phase 1 — Unblock (fix before any further testing)
  ├─ [1] Fix MongoDB URI fallback in app.module.ts
  ├─ [3] Remove /verify-email from auth middleware block list
  └─ [5] Fix token $unset in users.service.ts

Phase 2 — Correctness (fix before user testing)
  ├─ [4] Atomic register: delete user if email send fails
  ├─ [2] Wire identityStore through to backend OR remove the field
  └─ [6] Fix frontend .env NEST_URL + replace hardcoded URLs

Phase 3 — Security (fix before production)
  ├─ [7] Remove JWT secret fallback — throw on missing env
  ├─ [8] Add DTOs + ValidationPipe to all endpoints
  ├─ [9] Add @nestjs/throttler rate limiting
  └─ [10] Enforce password strength in DTO

Phase 4 — Polish
  ├─ [11] Add timestamps to User schema
  ├─ [12] Add DB indexes on token fields
  ├─ [13] Implement refresh token flow
  └─ [15] Centralise API base URL in frontend
```

---

## Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Required | Example | Notes |
|---|---|---|---|
| `MONGODB_URI` | ✅ | `mongodb://root:pass@localhost:27017/` | Must end with `/` |
| `JWT_SECRET` | ✅ | `<random 64 chars>` | Never use default fallback |
| `MAIL_HOST` | ✅ | `smtp.gmail.com` | Not a URL — hostname only |
| `MAIL_PORT` | ✅ | `587` | 587=STARTTLS, 465=SSL |
| `MAIL_USER` | ✅ | `you@gmail.com` | Gmail address |
| `MAIL_PASS` | ✅ | `xxxx xxxx xxxx xxxx` | Google App Password |
| `FRONTEND_URL` | ✅ | `http://localhost:3000` | Used in email links |
| `PORT` | ❌ | `3001` | Defaults to 3001 |

### Frontend (`frontend/.env.local`)
| Variable | Required | Example | Notes |
|---|---|---|---|
| `AUTH_SECRET` | ✅ | `<random base64>` | NextAuth signing secret |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | Full URL of Next.js app |
| `NEXT_PUBLIC_API_URL` | ❌ | `http://localhost:3001` | Backend base URL (add this) |
