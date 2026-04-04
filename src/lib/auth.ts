import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { verify as otpVerify, generateSecret, generateURI } from "otplib";
import { prisma } from "@/lib/db";
import { decryptField } from "@/lib/encryption";
import { logAudit } from "@/lib/audit";
import { loginSchema, mfaSchema } from "@/lib/validation";

// --- Type Augmentation ---

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      mfaVerified: boolean;
      mfaEnabled: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    mfaVerified: boolean;
    mfaEnabled: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    email: string;
    name: string;
    role: string;
    mfaVerified: boolean;
    mfaEnabled: boolean;
  }
}

// --- Lockout Configuration ---

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

function isLockedOut(user: { failedAttempts: number; lockedAt: Date | null }): boolean {
  if (user.failedAttempts < MAX_FAILED_ATTEMPTS || !user.lockedAt) return false;
  const elapsed = Date.now() - user.lockedAt.getTime();
  return elapsed < LOCKOUT_DURATION_MS;
}

function lockoutRemainingMs(user: { lockedAt: Date | null }): number {
  if (!user.lockedAt) return 0;
  const remaining = LOCKOUT_DURATION_MS - (Date.now() - user.lockedAt.getTime());
  return Math.max(0, remaining);
}

// --- Auth.js v5 Configuration ---

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 900, // 15 minutes
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const mfaCode = credentials?.mfaCode as string | undefined;

        if (!email) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // --- MFA verification flow ---
        if (mfaCode) {
          const parsed = mfaSchema.safeParse({ code: mfaCode });
          if (!parsed.success) return null;

          if (!user.mfaSecret) return null;

          let decryptedSecret: string;
          try {
            decryptedSecret = await decryptField(user.mfaSecret);
          } catch {
            decryptedSecret = user.mfaSecret; // fallback for pre-encryption secrets
          }

          const verifyResult = await otpVerify({
            token: mfaCode,
            secret: decryptedSecret,
          });
          const isValid = verifyResult.valid;

          if (!isValid) {
            // Increment failed attempts and potentially lock out (same as password failures)
            const newAttempts = user.failedAttempts + 1;
            const updateData: { failedAttempts: number; lockedAt?: Date } = {
              failedAttempts: newAttempts,
            };
            if (newAttempts >= MAX_FAILED_ATTEMPTS) {
              updateData.lockedAt = new Date();
            }
            await prisma.user.update({ where: { id: user.id }, data: updateData });
            await logAudit(
              user.id,
              "login_failed",
              "session",
              undefined,
              `Invalid MFA code (attempt ${newAttempts}/${MAX_FAILED_ATTEMPTS})`
            );
            return null;
          }

          // Reset failed attempts on successful MFA
          if (user.failedAttempts > 0) {
            await prisma.user.update({
              where: { id: user.id },
              data: { failedAttempts: 0, lockedAt: null },
            });
          }

          await logAudit(user.id, "login", "session", undefined, "MFA verified");

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mfaVerified: true,
            mfaEnabled: user.mfaEnabled,
          };
        }

        // --- Password flow ---
        if (!password) return null;

        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) return null;

        // Check lockout
        if (isLockedOut(user)) {
          const remainingMs = lockoutRemainingMs(user);
          const remainingMin = Math.ceil(remainingMs / 60000);
          await logAudit(
            user.id,
            "lockout",
            "session",
            undefined,
            `Account locked. ${remainingMin} min remaining.`
          );
          throw new Error(`LOCKOUT:${remainingMin}`);
        }

        const passwordValid = await compare(password, user.passwordHash);

        if (!passwordValid) {
          const newAttempts = user.failedAttempts + 1;
          const updateData: { failedAttempts: number; lockedAt?: Date } = {
            failedAttempts: newAttempts,
          };
          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            updateData.lockedAt = new Date();
          }
          await prisma.user.update({ where: { id: user.id }, data: updateData });
          await logAudit(
            user.id,
            "login_failed",
            "session",
            undefined,
            `Failed attempt ${newAttempts}/${MAX_FAILED_ATTEMPTS}`
          );
          return null;
        }

        // Reset failed attempts on success
        if (user.failedAttempts > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockedAt: null },
          });
        }

        await logAudit(user.id, "login", "session", undefined, "Password verified");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mfaVerified: !user.mfaEnabled,
          mfaEnabled: user.mfaEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in
      if (user) {
        token.userId = user.id as string;
        token.email = user.email as string;
        token.name = user.name as string;
        token.role = user.role;
        token.mfaVerified = user.mfaVerified;
        token.mfaEnabled = user.mfaEnabled;
      }

      // Session update — only allow mfaEnabled changes (after MFA setup)
      // mfaVerified can only be set via the authorize() flow, never via client update
      if (trigger === "update" && session) {
        if (session.mfaEnabled !== undefined) {
          token.mfaEnabled = session.mfaEnabled;
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.userId as string,
        email: (token.email ?? "") as string,
        name: (token.name ?? "") as string,
        role: token.role as string,
        mfaVerified: token.mfaVerified as boolean,
        mfaEnabled: token.mfaEnabled as boolean,
      };
      return session;
    },
  },
});
