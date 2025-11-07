import bcrypt from "bcrypt";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export default {
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        console.log("[AUTH] authorize called with:", credentials);

        // Validate credentials with Zod
        const schema = z.object({
          email: z.string().email("Invalid email address"),
          password: z.string().min(6, "Password must be at least 6 characters"),
        });

        const parsed = schema.safeParse(credentials);
        if (!parsed.success) {
          console.log("[AUTH] Validation failed:", parsed.error);
          return null;
        }

        const { email, password } = parsed.data;
        console.log("[AUTH] Looking for user:", email);

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.log("[AUTH] User not found");
          return null;
        }

        console.log("[AUTH] User found, checking password");

        // Compare password with bcrypt
        const isValidPassword = await bcrypt.compare(
          password,
          user.passwordHash,
        );

        console.log("[AUTH] Password valid:", isValidPassword);

        if (!isValidPassword) {
          return null;
        }

        // Return user object for session
        console.log("[AUTH] Login successful for:", user.email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      // Add role to token on sign in
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      // Add role and id to session from token
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/v1/login",
    error: "/auth/v1/login",
  },
} satisfies NextAuthConfig;
