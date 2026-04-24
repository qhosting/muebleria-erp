
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST - Solicitud pública de crédito (NO requiere auth)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            nombre,
            telefono,
            direccionArea,
            interes,
            montoEstimado,
            ocupacion,
            ingresosMensuales,
            tipoPropiedad,
            notas,
        } = body;

        // Validaciones básicas
        if (!nombre || !telefono) {
            return NextResponse.json(
                { error: 'Nombre y teléfono son obligatorios' },
                { status: 400 }
            );
        }

        // Validar formato de teléfono (10 dígitos México)
        const telefonoLimpio = telefono.replace(/\D/g, '');
        if (telefonoLimpio.length < 10) {
            return NextResponse.json(
                { error: 'El teléfono debe tener al menos 10 dígitos' },
                { status: 400 }
            );
        }

        // Crear Lead con origen web
        const lead = await prisma.lead.create({
            data: {
                nombre: nombre.trim(),
                telefono: telefonoLimpio,
                direccionArea: direccionArea || null,
                interes: interes || 'Solicitud de crédito',
                montoEstimado: montoEstimado ? parseFloat(montoEstimado) : null,
                estado: 'nuevo',
                origen: 'web' as any,
                intencion: 'VENTA',
                urgencia: 'MEDIA',
                resumenInterno: `Solicitud desde e-commerce DOMIAHOME`,
                datosExtraidos: {
                    ocupacion: ocupacion || null,
                    ingresosMensuales: ingresosMensuales || null,
                    tipoPropiedad: tipoPropiedad || null,
                    fuenteFormulario: 'landing_page',
                    fechaSolicitud: new Date().toISOString(),
                },
                notas: notas || null,
            },
        });

        return NextResponse.json(
            {
                success: true,
                message: 'Tu solicitud ha sido recibida. Te contactaremos pronto.',
                leadId: lead.id,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error al crear solicitud de crédito:', error);
        return NextResponse.json(
            { error: 'Error al procesar tu solicitud. Intenta de nuevo.' },
            { status: 500 }
        );
    }
}
