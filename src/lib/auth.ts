import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/db";

const ALLOWED_EMAILS = [
  "naveen.dengani@gmail.com",
  "mayank.dengani25@gmail.com",
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", required: true },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase();
        const password = credentials.password as string;
        
        // Check if email is allowed
        if (!ALLOWED_EMAILS.includes(email)) {
          return null;
        }

        // Check password - accept "passkey-auth" or test password for testing
        const validPasswords = ["passkey-auth", "test123"];
        if (!validPasswords.includes(password)) {
          return null;
        }

        // Find user
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});