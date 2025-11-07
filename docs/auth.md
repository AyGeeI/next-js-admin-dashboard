# Authentication Guide

This Next.js admin dashboard uses [Auth.js v5 (NextAuth)](https://authjs.dev/) for authentication with email/password credentials.

## Features

- Email + Password authentication
- JWT-based sessions (no database sessions required)
- Role-based access control (RBAC)
- Protected dashboard routes
- Secure password hashing with bcrypt
- User management via Prisma + SQLite (local) / PostgreSQL (production)

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:

```env
# Auth.js Configuration
# Generate a secure secret: openssl rand -base64 32
AUTH_SECRET=your-secret-here

# Database Configuration
DATABASE_URL="file:./prisma/dev.db"  # SQLite for local development
# DATABASE_URL="postgresql://user:password@host:port/database?schema=public"  # PostgreSQL for production
```

### 2. Database Setup

Run migrations and seed the database:

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (creates database schema)
npm run db:migrate

# Seed with default admin user
npm run db:seed
```

**Default admin credentials:**
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ IMPORTANT:** Change the admin password immediately after first login in production!

### 3. Start Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000/auth/v1/login](http://localhost:3000/auth/v1/login) to log in.

## Architecture

### Files Structure

```
src/
├── auth.config.ts              # Auth.js configuration (providers, callbacks)
├── auth.ts                     # Exported auth helpers (auth, signIn, signOut)
├── proxy.ts                    # Route protection proxy (Next.js 16 middleware)
├── lib/
│   └── prisma.ts              # Prisma client instance
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts   # Auth.js API route handler
│   └── (main)/
│       ├── auth/
│       │   └── v1/
│       │       └── login/
│       │           ├── page.tsx        # Login UI
│       │           └── actions.ts      # Login server action
│       └── dashboard/
│           ├── layout.tsx              # Protected layout (requires auth)
│           └── _components/
│               └── sidebar/
│                   ├── account-switcher.tsx  # User menu
│                   └── logout-action.ts      # Logout server action
prisma/
├── schema.prisma               # Database schema
└── seed.ts                     # Database seeding script
```

### Authentication Flow

1. **User visits `/dashboard/*`**
   - Proxy middleware ([src/proxy.ts](../src/proxy.ts)) checks for valid session
   - If not authenticated → redirect to `/auth/v1/login?from=/dashboard/...`

2. **User submits login form**
   - Client component ([login-form.tsx](../src/app/(main)/auth/_components/login-form.tsx)) submits to server action
   - Server action ([actions.ts](../src/app/(main)/auth/v1/login/actions.ts)) validates credentials
   - Auth.js Credentials provider ([auth.config.ts](../src/auth.config.ts)):
     - Validates email format and password length (Zod)
     - Queries user from database via Prisma
     - Compares password hash with bcrypt
     - Returns user object if valid
   - Creates JWT session with user data (id, email, name, role)
   - Redirects to original destination or `/dashboard/default`

3. **Authenticated user accesses dashboard**
   - Proxy middleware allows access
   - Dashboard layout ([layout.tsx](../src/app/(main)/dashboard/layout.tsx)) fetches session
   - Displays user info in account switcher

4. **User logs out**
   - Clicks "Log out" in account menu
   - Calls logout server action ([logout-action.ts](../src/app/(main)/dashboard/_components/sidebar/logout-action.ts))
   - Auth.js `signOut()` clears session
   - Redirects to `/auth/v1/login`

## User Management

### Database Schema

The User model is defined in [prisma/schema.prisma](../prisma/schema.prisma):

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  passwordHash String
  role         String   @default("user")
  createdAt    DateTime @default(now())
}
```

### Creating Users

You can create users manually via Prisma:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const passwordHash = await bcrypt.hash("your-password", 12);

await prisma.user.create({
  data: {
    email: "user@example.com",
    name: "User Name",
    passwordHash,
    role: "user", // or "admin"
  },
});
```

Or add them to [prisma/seed.ts](../prisma/seed.ts) and run:

```bash
npm run db:seed
```

### Changing Passwords

To change a user's password, update the `passwordHash`:

```typescript
import bcrypt from "bcrypt";

const newPasswordHash = await bcrypt.hash("new-password", 12);

await prisma.user.update({
  where: { email: "user@example.com" },
  data: { passwordHash: newPasswordHash },
});
```

### User Roles

Roles are stored as strings in the `role` field. Available roles:
- `"admin"` - Full access
- `"user"` - Standard access

Role is included in the JWT session and accessible via:

```typescript
import { auth } from "@/auth";

const session = await auth();
const userRole = session?.user?.role; // "admin" | "user"
```

## Route Protection

### Proxy Middleware Protection

All routes under `/dashboard/*` are protected by Next.js 16 proxy middleware:

```typescript
// src/proxy.ts
export const config = {
  matcher: ["/dashboard/:path*"],
};
```

> **Note:** Next.js 16 renamed "middleware" to "proxy" - the functionality remains the same.

### Component-level Protection

For additional protection in components:

```typescript
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/v1/login");
  }

  // Render protected content
}
```

### Role-based Access

Check user roles in server components:

```typescript
const session = await auth();

if (session?.user?.role !== "admin") {
  redirect("/unauthorized");
}
```

## Production Deployment

### 1. Environment Variables

Set in your deployment platform (Vercel, Railway, etc.):

```env
# Generate a strong secret for production
AUTH_SECRET=<generated-secret-32+-chars>

# Use PostgreSQL or Neon for production
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

**Generate AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 2. Database Migration

Run migrations on your production database:

```bash
npx prisma migrate deploy
```

### 3. Seed Production Database

Seed with initial admin user:

```bash
npx prisma db seed
```

Then **immediately change the default password!**

### 4. Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

Preview deployments will use preview environment variables.

## Security Best Practices

1. **Strong AUTH_SECRET**: Use a cryptographically secure random string (32+ characters)
2. **Change default password**: Never use `admin123` in production
3. **HTTPS only**: Always use HTTPS in production (enforced by Auth.js)
4. **Password requirements**: Implement strong password validation (minimum 8 chars, complexity rules)
5. **Rate limiting**: Add rate limiting to login endpoint to prevent brute force attacks
6. **Session expiry**: Configure session maxAge in auth config
7. **Environment secrets**: Never commit `.env` files to version control

## Troubleshooting

### Build fails with "Prisma Client not initialized"

Run:
```bash
npx prisma generate
npm run build
```

### Database locked error

Another process is using the SQLite database. Close:
- Prisma Studio
- Any running dev servers
- Database IDE connections

Then try again.

### "Invalid credentials" on correct password

1. Check if user exists: `npx prisma studio`
2. Verify password hash was created correctly
3. Check bcrypt salt rounds match (12 in seed.ts)

### Proxy redirect loop

Ensure proxy `matcher` doesn't include auth pages:
```typescript
// src/proxy.ts
export const config = {
  matcher: ["/dashboard/:path*"], // Don't include /auth/*
};
```

### Session not persisting

1. Check AUTH_SECRET is set in `.env`
2. Verify cookies are enabled in browser
3. Check HTTPS in production (required for secure cookies)

## Next Steps

- [ ] Implement password reset flow
- [ ] Add email verification
- [ ] Set up 2FA (two-factor authentication)
- [ ] Add session management (view active sessions, logout all devices)
- [ ] Implement account settings page
- [ ] Add user registration form (currently only login exists)
- [ ] Configure OAuth providers (Google, GitHub, etc.) if needed

## Resources

- [Auth.js Documentation](https://authjs.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
