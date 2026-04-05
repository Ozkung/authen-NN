# Auth Project (Next.js 16 & NestJS 11)

Full-stack authentication system with email verification.

## Prerequisites
- **Bun** installed
- **MongoDB** running locally (`mongodb://localhost:27017/auth-db`)
- **Mail Server**: For testing emails, use [Mailtrap](https://mailtrap.io/) or a local SMTP server like [MailHog](https://github.com/mailhog/MailHog).

## Setup

### Backend (NestJS)
1. Navigate to backend: `cd backend`
2. Install dependencies: `bun install`
3. Configure `.env`:
   - Update `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` with your SMTP settings.
4. Run: `bun run start:dev` (runs on http://localhost:3001)

### Frontend (Next.js)
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `bun install`
3. Run: `bun run dev` (runs on http://localhost:3000)

## Features
- **Register**: Creates a user, hashes password, and sends a verification link to email.
- **Verify Email**: Click the link in the email to activate the account.
- **Login**: Only verified users can login. Returns a JWT.
- **Home**: Displays login status.
