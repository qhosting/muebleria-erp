
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  // No usar adapter con CredentialsProvider (incompatible)
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        phone: { label: 'Phone', type: 'text' },
        code: { label: 'Code', type: 'text' },
      },
      async authorize(credentials) {
        // --- LOGIN POR OTP ---
        if (credentials?.phone && credentials?.code) {
          const cleanPhone = credentials.phone.replace(/\D/g, "");
          
          // Verificar OTP en la base de datos
          const verification = await (prisma as any).otpVerification.findFirst({
            where: {
              phone: cleanPhone,
              code: credentials.code,
              verified: true, // Debe estar marcado como verificado por el frontend previamente
              expiresAt: { gte: new Date() }
            },
            orderBy: { createdAt: 'desc' }
          });

          if (!verification) {
            throw new Error('Código de verificación inválido o expirado');
          }

          // Buscar el usuario por teléfono
          const user = await prisma.user.findFirst({
            where: { 
              telefono: { contains: cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone },
              isActive: true
            },
          });

          if (!user) {
            throw new Error('Número de teléfono no vinculado a ninguna cuenta de empleado');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            enableLabsMobile: user.enableLabsMobile,
            enableNativeSms: user.enableNativeSms,
          };
        }

        // --- LOGIN TRADICIONAL ---
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Credenciales requeridas');
        }

        const user = await prisma.user.findFirst({
          where: {
            email: credentials.email,
            isActive: true
          },
        });

        if (!user?.password) {
          throw new Error('Usuario no encontrado');
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          throw new Error('Contraseña incorrecta');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          enableLabsMobile: user.enableLabsMobile,
          enableNativeSms: user.enableNativeSms,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 días en segundos
    updateAge: 24 * 60 * 60, // Se actualiza cada 24 horas
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
        path: '/',
        secure: process.env.NODE_ENV === 'development' ? false : true,
        maxAge: 30 * 24 * 60 * 60, // 30 días
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
        path: '/',
        secure: process.env.NODE_ENV === 'development' ? false : true,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
        path: '/',
        secure: process.env.NODE_ENV === 'development' ? false : true,
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.enableLabsMobile = (user as any).enableLabsMobile;
        token.enableNativeSms = (user as any).enableNativeSms;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id || token.sub;
        (session.user as any).role = token.role;
        (session.user as any).enableLabsMobile = token.enableLabsMobile;
        (session.user as any).enableNativeSms = token.enableNativeSms;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};
