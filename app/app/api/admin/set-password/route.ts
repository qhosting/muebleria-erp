import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const hashedPassword = await bcrypt.hash('x0420EZS*', 12);
    const email = 'admin@qhosting.net';

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        role: 'admin',
        isActive: true
      },
      create: {
        email,
        name: 'Administrador QHosting',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      mensaje: `Contraseña actualizada exitosamente para ${user.email}`,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
