import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma, withDbRetry } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("MISSING_CREDENTIALS");
        }
        try {
          // Fetch the user with robust database retries (handles cold starts and network drops)
          const user = await withDbRetry(
            () => prisma.user.findUnique({ where: { username: credentials.username } }),
            6, // Retry up to 6 times
            500 // Starting at 500ms delay with exponential backoff
          );

          if (!user) {
            console.log(`Login failed: User not found - ${credentials.username}`);
            throw new Error("USER_NOT_FOUND");
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isPasswordValid) {
            console.log(`Login failed: Invalid password - ${credentials.username}`);
            throw new Error("INVALID_PASSWORD");
          }

          // Role Validation
          const requestedRole = credentials.role ? credentials.role.toUpperCase() : null;
          let sessionRole = user.role;

          if (requestedRole) {
            if (requestedRole === "STUDENT") {
              if (user.role !== "STUDENT") {
                throw new Error("ROLE_MISMATCH");
              }
            } else if (requestedRole === "TEACHER") {
              if (user.role !== "TEACHER" && user.role !== "ADMIN") {
                throw new Error("ROLE_MISMATCH");
              }
              // Admins can act as teachers if they are assigned as teacher to any batch
              if (user.role === "ADMIN") {
                const adminIsTeacher = await withDbRetry(
                  () => prisma.batch.findFirst({
                    where: {
                      teachers: {
                        some: { id: user.id }
                      }
                    }
                  }),
                  6,
                  500
                );
                if (!adminIsTeacher) {
                  throw new Error("ADMIN_NOT_TEACHER");
                }
                sessionRole = "TEACHER"; // Allow Admin to act as Teacher
              }
            } else if (requestedRole === "ADMIN") {
              if (user.role !== "ADMIN") {
                throw new Error("ROLE_MISMATCH");
              }
            }
          }

          const activeToken = crypto.randomBytes(16).toString('hex');
          
          // Update user activeToken with robust database retries
          await withDbRetry(
            () => prisma.user.update({
              where: { id: user.id },
              data: { activeToken }
            }),
            6,
            500
          );

          return { 
            id: user.id, 
            name: user.name || user.username, 
            username: user.username, 
            role: sessionRole,
            mustChangePassword: user.mustChangePassword,
            onboardingCompleted: user.onboardingCompleted,
            isProfileVerified: user.isProfileVerified,
            activeToken
          };
        } catch (error: any) {
          if (["USER_NOT_FOUND", "INVALID_PASSWORD", "ROLE_MISMATCH", "ADMIN_NOT_TEACHER", "MISSING_CREDENTIALS"].includes(error.message)) {
            throw error;
          }
          console.error("DATABASE CONNECTION ERROR DURING LOGIN:", error.message);
          throw new Error("DB_ERROR");
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.username = (user as any).username;
        token.id = user.id;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.onboardingCompleted = (user as any).onboardingCompleted;
        token.isProfileVerified = (user as any).isProfileVerified;
        token.activeToken = (user as any).activeToken;
      }
      if (trigger === 'update' && session) {
        if (session.mustChangePassword !== undefined) token.mustChangePassword = session.mustChangePassword;
        if (session.onboardingCompleted !== undefined) token.onboardingCompleted = session.onboardingCompleted;
        if (session.isProfileVerified !== undefined) token.isProfileVerified = session.isProfileVerified;
        if (session.activeToken !== undefined) token.activeToken = session.activeToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
        (session.user as any).id = token.id;
        (session.user as any).mustChangePassword = token.mustChangePassword;
        (session.user as any).onboardingCompleted = token.onboardingCompleted;
        (session.user as any).isProfileVerified = token.isProfileVerified;
        (session.user as any).activeToken = token.activeToken;
      }
      return session;
    }
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

};
