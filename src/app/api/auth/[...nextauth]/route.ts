import NextAuth from "next-auth";
import { and, eq } from "drizzle-orm";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "~/db";
import { usersTable } from "~/db/schemas/users";
import { COOKIE_MAX_AGE, SESSION_KEY } from "~/utils/constants";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const [user] = await db
          .select()
          .from(usersTable)
          .where(and(eq(usersTable.email, credentials.email), eq(usersTable.is_verified, true)));

        if (!user) return null;

        return {
          id: user.id,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: COOKIE_MAX_AGE,
    generateSessionToken() {
      return SESSION_KEY;
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
      };

      return session;
    },
  },
});

export { handler as GET, handler as POST };
