import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma, withDbRetry } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder-client-secret",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
        isApp: { label: "IsApp", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("MISSING_CREDENTIALS");
        }
        try {
          // Fetch the user with robust database retries (handles cold starts and network drops)
          const user = await withDbRetry(
            () => prisma.user.findFirst({
              where: {
                OR: [
                  { username: credentials.username },
                  { studentProfile: { email: credentials.username } }
                ]
              },
              select: {
                id: true,
                username: true,
                name: true,
                passwordHash: true,
                role: true,
                isStoreUser: true,
                mustChangePassword: true,
                onboardingCompleted: true,
                isProfileVerified: true,
                activeToken: true,
              }
            }),
            4,
            400
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
                    },
                    select: { id: true }
                  }),
                  4,
                  400
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

          // Get existing user db token to preserve the other token type
          const existingUser = await withDbRetry(
            () => prisma.user.findUnique({
              where: { id: user.id },
              select: { activeToken: true }
            }),
            4,
            400
          );

          let webToken = "";
          let appToken = "";
          const currentDbToken = existingUser?.activeToken || "";
          if (currentDbToken.includes('|')) {
            const parts = currentDbToken.split('|');
            parts.forEach(part => {
              if (part.startsWith('web:')) webToken = part.slice(4);
              else if (part.startsWith('app:')) appToken = part.slice(4);
            });
          } else {
            webToken = currentDbToken;
          }

          const isApp = credentials?.isApp === "true";
          const newSessionToken = crypto.randomBytes(16).toString('hex');
          if (isApp) {
            appToken = newSessionToken;
          } else {
            webToken = newSessionToken;
          }

          const dbTokenString = `web:${webToken}|app:${appToken}`;

          // Update user activeToken with robust database retries
          await withDbRetry(
            () => prisma.user.update({
              where: { id: user.id },
              data: { activeToken: dbTokenString }
            }),
            4,
            400
          );

          return { 
            id: user.id, 
            name: user.name || user.username, 
            username: user.username, 
            role: sessionRole,
            mustChangePassword: user.mustChangePassword,
            onboardingCompleted: user.onboardingCompleted,
            isProfileVerified: user.isProfileVerified,
            activeToken: newSessionToken
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
        if (trigger === 'signIn' && token.email && !token.id) {
          // This is an OAuth sign in (Google)
          let dbUser = await withDbRetry(() => prisma.user.findFirst({ where: { studentProfile: { email: token.email as string } } }));
          if (!dbUser) {
            // Create user
            const baseUsername = token.email.split('@')[0];
            let uniqueUsername = baseUsername;
            let counter = 1;
            while (await withDbRetry(() => prisma.user.findUnique({ where: { username: uniqueUsername } }))) {
              uniqueUsername = `${baseUsername}${counter}`;
              counter++;
            }
            dbUser = await withDbRetry(() => prisma.user.create({
              data: {
                username: uniqueUsername,
                name: token.name || uniqueUsername,
                passwordHash: 'OAUTH_PENDING_PASSWORD',
                role: 'STUDENT',
                isStoreUser: true, // Self-created accounts via OAuth are external/store users
                mustChangePassword: false,
                onboardingCompleted: true,
                isProfileVerified: true,
                studentProfile: {
                  create: {
                    email: token.email as string
                  }
                }
              }
            }));
          }
          token.role = dbUser.role;
          token.username = dbUser.username;
          token.id = dbUser.id;
          token.isStoreUser = dbUser.isStoreUser;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.onboardingCompleted = dbUser.onboardingCompleted;
          token.isProfileVerified = dbUser.isProfileVerified;
          token.activeToken = dbUser.activeToken;
        } else {
          // Credentials login
          token.role = (user as any).role;
          token.username = (user as any).username;
          token.id = user.id;
          token.email = (user as any).email;
          token.isStoreUser = (user as any).isStoreUser;
          token.mustChangePassword = (user as any).mustChangePassword;
          token.onboardingCompleted = (user as any).onboardingCompleted;
          token.isProfileVerified = (user as any).isProfileVerified;
          token.activeToken = (user as any).activeToken;
        }
      }
      if (trigger === 'update' && session) {
        if (session.mustChangePassword !== undefined) token.mustChangePassword = session.mustChangePassword;
        if (session.onboardingCompleted !== undefined) token.onboardingCompleted = session.onboardingCompleted;
        if (session.isProfileVerified !== undefined) token.isProfileVerified = session.isProfileVerified;
        if (session.activeToken !== undefined) token.activeToken = session.activeToken;
        if (session.email !== undefined) token.email = session.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
        (session.user as any).id = token.id;
        (session.user as any).email = token.email;
        (session.user as any).isStoreUser = token.isStoreUser;
        (session.user as any).mustChangePassword = token.mustChangePassword;
        (session.user as any).onboardingCompleted = token.onboardingCompleted;
        (session.user as any).isProfileVerified = token.isProfileVerified;
        (session.user as any).activeToken = token.activeToken;
      }
      return session;
    }
  },
  events: {
    async signOut({ token }) {
      if (token?.id) {
        try {
          const user = await withDbRetry(
            () => prisma.user.findUnique({
              where: { id: token.id as string },
              select: { activeToken: true }
            }),
            3,
            200
          );

          if (user && user.activeToken) {
            let webToken = "";
            let appToken = "";
            const currentDbToken = user.activeToken || "";
            if (currentDbToken.includes('|')) {
              const parts = currentDbToken.split('|');
              parts.forEach(part => {
                if (part.startsWith('web:')) webToken = part.slice(4);
                else if (part.startsWith('app:')) appToken = part.slice(4);
              });
            } else {
              webToken = currentDbToken;
            }

            const sessionToken = (token as any).activeToken;
            if (sessionToken === webToken) {
              webToken = "";
            } else if (sessionToken === appToken) {
              appToken = "";
            }

            const newDbToken = `web:${webToken}|app:${appToken}`;
            await withDbRetry(
              () => prisma.user.update({
                where: { id: token.id as string },
                data: { activeToken: newDbToken }
              }),
              3,
              200
            );
          }
        } catch (error) {
          console.error("Error clearing activeToken on signOut:", error);
        }
      }
    }
  },
  pages: { signIn: "/login" },
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days (2592000 seconds)
  },
  secret: process.env.NEXTAUTH_SECRET,
};
