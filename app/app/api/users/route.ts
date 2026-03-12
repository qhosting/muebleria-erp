
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const userRole = (session.user as any).role;
    if (!['admin', 'gestor_cobranza'].includes(userRole)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const where: any = {};
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        codigoGestor: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            clientesAsignados: true,
            pagos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 [POST /api/users] Verificando sesión...');
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.error('❌ [POST /api/users] No hay sesión activa');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    console.log('👤 [POST /api/users] Usuario:', session.user.email, 'Rol:', userRole);
    
    if (userRole !== 'admin') {
      console.error('❌ [POST /api/users] Usuario sin permisos de admin');
      return NextResponse.json({ error: 'Solo administradores pueden crear usuarios' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, role, codigoGestor, isActive = true } = body;
    
    console.log('📝 [POST /api/users] Datos recibidos:', { email, name, role, codigoGestor, isActive, hasPassword: !!password });

    if (!email || !password || !name || !role) {
      console.error('❌ [POST /api/users] Campos requeridos faltantes');
      return NextResponse.json(
        { error: 'Todos los campos son requeridos (email, password, name, role)' },
        { status: 400 }
      );
    }

    console.log('🔍 [POST /api/users] Verificando si el email ya existe...');
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.error('❌ [POST /api/users] Email ya registrado:', email);
      return NextResponse.json(
        { error: 'El email ya está registrado' },
        { status: 400 }
      );
    }

    console.log('🔒 [POST /api/users] Hasheando contraseña...');
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log('💾 [POST /api/users] Creando usuario en la base de datos...');
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        codigoGestor: codigoGestor?.trim() || null,
        isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        codigoGestor: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log('✅ [POST /api/users] Usuario creado exitosamente:', newUser.id);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('❌ [POST /api/users] Error al crear usuario:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
