
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Eliminar datos operacionales
    const deletedPagos = await prisma.pago.deleteMany();
    const deletedClientes = await prisma.cliente.deleteMany();
    const deletedMotararios = await prisma.motarario.deleteMany();
    const deletedRutas = await prisma.rutaCobranza.deleteMany();
    
    // Limpiar usuarios excepto los por defecto
    await prisma.user.deleteMany({
      where: {
        email: {
          notIn: [
            'admin@economica.local',
            'gestor@economica.local',
            'cobrador@economica.local',
            'reportes@economica.local',
            'cristal@muebleria.com'
          ]
        }
      }
    });

    // Recrear usuarios por defecto si no existen
    await prisma.user.upsert({
      where: { email: 'admin@economica.local' },
      update: {},
      create: {
        email: 'admin@economica.local',
        name: 'Administrador Sistema',
        password: await bcrypt.hash('admin123', 12),
        role: 'admin',
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { email: 'gestor@economica.local' },
      update: {},
      create: {
        email: 'gestor@economica.local',
        name: 'Gestor de Cobranza',
        password: await bcrypt.hash('gestor123', 12),
        role: 'gestor_cobranza',
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { email: 'cobrador@economica.local' },
      update: {},
      create: {
        email: 'cobrador@economica.local',
        name: 'Cobrador de Campo',
        password: await bcrypt.hash('cobrador123', 12),
        role: 'cobrador',
        isActive: true,
      },
    });

    await prisma.user.upsert({
      where: { email: 'reportes@economica.local' },
      update: {},
      create: {
        email: 'reportes@economica.local',
        name: 'Usuario de Reportes',
        password: await bcrypt.hash('reportes123', 12),
        role: 'reporte_cobranza',
        isActive: true,
      },
    });

    // Limpiar plantillas excepto la estándar
    await prisma.plantillaTicket.deleteMany({
      where: {
        nombre: {
          not: 'Ticket Estándar'
        }
      }
    });

    // Crear plantilla estándar si no existe
    await prisma.plantillaTicket.upsert({
      where: { nombre: 'Ticket Estándar' },
      update: {},
      create: {
        nombre: 'Ticket Estándar',
        contenido: `
================================
    MUEBLERÍA LA ECONÓMICA
================================
Cliente: {{cliente_nombre}}
Código: {{cliente_codigo}}
Fecha: {{fecha}}
--------------------------------
Concepto: {{concepto}}
Monto: {{monto}}
--------------------------------
Saldo Anterior: {{saldo_anterior}}
Saldo Nuevo: {{saldo_nuevo}}
--------------------------------
Cobrador: {{cobrador}}
Firma: _________________
================================
        `,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: 'Base de datos reseteada exitosamente',
      stats: {
        pagos: deletedPagos.count,
        clientes: deletedClientes.count,
        rutas: deletedRutas.count,
        motararios: deletedMotararios.count
      }
    });

  } catch (error: any) {
    console.error('Error al resetear BD:', error);
    return NextResponse.json(
      { error: 'Error al resetear la base de datos', details: error.message },
      { status: 500 }
    );
  }
}
