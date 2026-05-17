import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }
        try {
          const user = await prisma.user.findUnique({ where: { username: credentials.username } });
          if (!user) {
            console.log(`Login failed: User not found - ${credentials.username}`);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isPasswordValid) {
            console.log(`Login failed: Invalid password - ${credentials.username}`);
            return null;
          }

          return { 
            id: user.id, 
            name: user.name || user.username, 
            username: user.username, 
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            onboardingCompleted: user.onboardingCompleted,
            isProfileVerified: user.isProfileVerified
          };
        } catch (error: any) {
          console.error("DATABASE CONNECTION ERROR DURING LOGIN:", error.message);
          return null;
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
      }
      if (trigger === 'update' && session) {
        if (session.mustChangePassword !== undefined) token.mustChangePassword = session.mustChangePassword;
        if (session.onboardingCompleted !== undefined) token.onboardingCompleted = session.onboardingCompleted;
        if (session.isProfileVerified !== undefined) token.isProfileVerified = session.isProfileVerified;
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
      }
      return session;
    }
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,

};
