import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma, withDbRetry, getNextStoreUsername } from "@/lib/prisma";
import { appCache } from "@/lib/cache";
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
                  { studentProfile: { email: credentials.username } },
                  { teacherProfile: { email: credentials.username } }
                ]
              },
              select: {
                id: true,
                username: true,
                name: true,
                passwordHash: true,
                role: true,
                isActive: true,
                isStoreUser: true,
                mustChangePassword: true,
                onboardingCompleted: true,
                isProfileVerified: true,
                activeToken: true,
                studentProfile: { select: { email: true } },
                teacherProfile: { select: { email: true } },
              }
            }),
            4,
            400
          );

          if (!user) {
            console.log(`Login failed: User not found - ${credentials.username}`);
            throw new Error("USER_NOT_FOUND");
          }

          if (user.isActive === false) {
            console.log(`Login blocked: Account deactivated - ${credentials.username}`);
            throw new Error("ACCOUNT_DEACTIVATED");
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
              // If an Admin or Teacher logs in from the default tab, automatically assign their real role
              if (user.role === "ADMIN") {
                sessionRole = "ADMIN";
              } else if (user.role === "TEACHER") {
                sessionRole = "TEACHER";
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
                if (adminIsTeacher) {
                  sessionRole = "TEACHER";
                } else {
                  sessionRole = "ADMIN";
                }
              }
            } else if (requestedRole === "ADMIN") {
              if (user.role !== "ADMIN") {
                throw new Error("ROLE_MISMATCH");
              }
            }
          }

          // Use activeToken directly from already fetched user model
          let webToken = "";
          let appToken = "";
          const currentDbToken = user?.activeToken || "";
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

          // Update user activeToken (non-fatal if token save encounters minor DB lock)
          try {
            await withDbRetry(
              () => prisma.user.update({
                where: { id: user.id },
                data: { activeToken: dbTokenString }
              }),
              4,
              400
            );
          } catch (tokenErr) {
            console.warn("Failed to update activeToken on login (non-fatal):", tokenErr);
          }

          const userEmail = user.studentProfile?.email || user.teacherProfile?.email || null;

          return { 
            id: user.id, 
            name: user.name || user.username, 
            username: user.username, 
            email: userEmail,
            role: sessionRole,
            isStoreUser: sessionRole === 'STUDENT' ? Boolean(user.isStoreUser) : false,
            mustChangePassword: user.mustChangePassword,
            onboardingCompleted: user.onboardingCompleted,
            isProfileVerified: user.isProfileVerified,
            activeToken: newSessionToken
          };
        } catch (error: any) {
          if (["USER_NOT_FOUND", "INVALID_PASSWORD", "ROLE_MISMATCH", "ADMIN_NOT_TEACHER", "MISSING_CREDENTIALS", "ACCOUNT_DEACTIVATED"].includes(error.message)) {
            throw error;
          }
          console.error("DATABASE CONNECTION ERROR DURING LOGIN:", error.message || error);
          throw new Error("DB_ERROR");
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }: any) {
      if (user) {
        // If user.role exists, this is 100% a Credentials login (Admin, Teacher, or Student)
        if ((user as any).role) {
          token.role = (user as any).role;
          token.username = (user as any).username;
          token.id = user.id;
          token.email = (user as any).email;
          token.isStoreUser = (user as any).role === 'STUDENT' ? Boolean((user as any).isStoreUser) : false;
          token.mustChangePassword = (user as any).mustChangePassword;
          token.onboardingCompleted = (user as any).onboardingCompleted;
          token.isProfileVerified = (user as any).isProfileVerified;
          token.activeToken = (user as any).activeToken;
        } else if (account?.provider === 'google' || trigger === 'signIn') {
          // This is a Google OAuth sign-in (no password / role provided by provider)
          let dbUser = await withDbRetry(() => prisma.user.findFirst({
            where: {
              OR: [
                { studentProfile: { email: token.email as string } },
                { teacherProfile: { email: token.email as string } }
              ]
            }
          }));

          if (!dbUser) {
            // Create self-registered OAuth store user
            const uniqueUsername = await getNextStoreUsername();
            dbUser = await withDbRetry(() => prisma.user.create({
              data: {
                username: uniqueUsername,
                name: token.name || uniqueUsername,
                passwordHash: 'OAUTH_PENDING_PASSWORD',
                role: 'STUDENT',
                isStoreUser: true,
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
          token.isStoreUser = dbUser.role === 'STUDENT' ? Boolean(dbUser.isStoreUser) : false;
          token.mustChangePassword = dbUser.mustChangePassword;
          token.onboardingCompleted = dbUser.onboardingCompleted;
          token.isProfileVerified = dbUser.isProfileVerified;
          token.activeToken = dbUser.activeToken;
        }
      } else if (token?.id) {
        try {
          const cacheKey = `user-jwt:${token.id}`;
          if (trigger === 'update') {
            appCache.delete(cacheKey);
          }
          const dbUser = await appCache.getOrSet(cacheKey, () => {
            return withDbRetry(() => prisma.user.findUnique({
              where: { id: token.id as string },
              select: { 
                name: true, 
                role: true,
                isStoreUser: true,
                isProfileVerified: true, 
                onboardingCompleted: true,
                mustChangePassword: true,
                studentProfile: { select: { email: true } },
                teacherProfile: { select: { email: true } }
              }
            }), 2, 100);
          }, 30);
          if (dbUser) {
            if (dbUser.name) token.name = dbUser.name;
            token.role = dbUser.role;
            token.isStoreUser = dbUser.role === 'STUDENT' ? Boolean(dbUser.isStoreUser) : false;
            token.isProfileVerified = dbUser.isProfileVerified;
            token.onboardingCompleted = dbUser.onboardingCompleted;
            token.mustChangePassword = dbUser.mustChangePassword;
            if (!token.email) {
              token.email = dbUser.studentProfile?.email || dbUser.teacherProfile?.email || null;
            }
          }
        } catch (e) {
          console.error("Error refreshing session status in jwt callback:", e);
        }
      }

      if (trigger === 'update' && session) {
        if (session.name !== undefined) token.name = session.name;
        if (session.mustChangePassword !== undefined) token.mustChangePassword = session.mustChangePassword;
        if (session.onboardingCompleted !== undefined) token.onboardingCompleted = session.onboardingCompleted;
        if (session.isProfileVerified !== undefined) token.isProfileVerified = session.isProfileVerified;
        if (session.activeToken !== undefined) token.activeToken = session.activeToken;
        if (session.email !== undefined) token.email = session.email;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.isStoreUser = token.role === 'STUDENT' ? Boolean(token.isStoreUser) : false;
        session.user.mustChangePassword = token.mustChangePassword;
        session.user.onboardingCompleted = token.onboardingCompleted;
        session.user.isProfileVerified = token.isProfileVerified;
        session.user.activeToken = token.activeToken;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {}
      return baseUrl;
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
