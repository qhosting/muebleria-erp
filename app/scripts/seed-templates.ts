
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Creando plantillas...');

    // 1. Plantilla de Ticket de Pago (Profesional)
    await prisma.plantillaTicket.upsert({
        where: { nombre: 'Ticket de Pago Profesional' },
        update: {},
        create: {
            nombre: 'Ticket de Pago Profesional',
            tipo: 'ticket',
            contenido: `
================================
    {{empresa_nombre}}
================================
{{empresa_direccion}}
Tel: {{empresa_telefono}}
================================
FECHA: {{fecha}}
CLIENTE: {{cliente_nombre}}
CÓDIGO: {{cliente_codigo}}
--------------------------------
CONCEPTO: {{concepto}}
MONTO RECIBIDO: {{monto}}
--------------------------------
SALDO ANTERIOR: {{saldo_anterior}}
NUEVO SALDO: {{saldo_nuevo}}
--------------------------------
GESTIONADO POR: {{cobrador}}

¡Gracias por su puntualidad!
Conserve este ticket para cualquier
aclaración.
================================
      `.trim(),
            isActive: true,
        },
    });

    // 2. Mensaje de Bienvenida (Estándar)
    await prisma.plantillaTicket.upsert({
        where: { nombre: 'Bienvenida Estándar' },
        update: {},
        create: {
            nombre: 'Bienvenida Estándar',
            tipo: 'bienvenida',
            contenido: `
Hola {{cliente_nombre}}, ¡bienvenido a {{empresa_nombre}}! 🥳 

Nos alegra informarte que tu crédito ha sido aprobado con éxito. Tu número de cliente es {{cliente_codigo}}.

Recuerda que tus pagos de {{monto_pago}} serán con una periodicidad {{periodicidad}}, debiendo realizarse cada día {{dia_pago}}.

Estamos a tus órdenes para cualquier duda. ¡Gracias por tu preferencia!
      `.trim(),
            isActive: true,
        },
    });

    // 3. Mensaje de Bienvenida (Recordatorio)
    await prisma.plantillaTicket.upsert({
        where: { nombre: 'Bienvenida con Recordatorio' },
        update: {},
        create: {
            nombre: 'Bienvenida con Recordatorio',
            tipo: 'bienvenida',
            contenido: `
¡Felicidades {{cliente_nombre}}! 🎉 

Ya eres parte de la familia {{empresa_nombre}}. Te recordamos los detalles de tu cuenta:
- Código: {{cliente_codigo}}
- Pago: {{monto_pago}}
- Frecuencia: {{periodicidad}}
- Día de cobro: {{dia_pago}}

Mantener tu cuenta al corriente te ayuda a generar un excelente historial con nosotros para futuros créditos. ¡Bienvenido!
      `.trim(),
            isActive: true,
        },
    });

    console.log('✅ Plantillas creadas con éxito');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
