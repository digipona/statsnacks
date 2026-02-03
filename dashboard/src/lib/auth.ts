/**
 * NextAuth.js configuration.
 */

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = process.env.AUTH_USERNAME || 'admin';
        const passwordHash = process.env.AUTH_PASSWORD_HASH || '';

        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // Check username
        if (credentials.username !== username) {
          return null;
        }

        // Check password
        const isValid = await bcrypt.compare(credentials.password, passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: '1',
          name: 'Admin',
          email: `${username}@local`,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};
