
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { productos } = await request.json();

    if (!Array.isArray(productos)) {
      return NextResponse.json({ error: 'Formato de datos inválido' }, { status: 400 });
    }

    const results = {
      inserted: 0,
      updated: 0,
      errors: 0
    };

    // Procesar cada producto
    for (const p of productos) {
      try {
        // Generar un código único si no tiene (Marca-Modelo-Medida)
        const codigo = `${p.marca}-${p.nombre}-${p.medida}`.toUpperCase().replace(/\s+/g, '-');

        await prisma.producto.upsert({
          where: { codigo },
          update: {
            nombre: `${p.nombre} ${p.medida}`,
            categoria: p.categoria,
            marca: p.marca,
            medida: p.medida,
            precioVenta: p.precioContado,
            precio6Meses: p.precio6Meses,
            precio9Meses: p.precio9Meses,
            precio12Meses: p.precio12Meses,
            numSemanas: p.numSemanas,
            enganche: p.enganche,
            abonoSemanal: p.abonoSemanal,
            garantia: p.garantia,
          } as any,
          create: {
            codigo,
            nombre: `${p.nombre} ${p.medida}`,
            categoria: p.categoria,
            marca: p.marca,
            medida: p.medida,
            precioCompra: p.precioContado * 0.7, // Asunción de costo
            precioVenta: p.precioContado,
            precio6Meses: p.precio6Meses,
            precio9Meses: p.precio9Meses,
            precio12Meses: p.precio12Meses,
            numSemanas: p.numSemanas,
            enganche: p.enganche,
            abonoSemanal: p.abonoSemanal,
            garantia: p.garantia,
          } as any
        });

        results.inserted++; // count both for now
      } catch (err) {
        console.error('Error procesando producto:', p.nombre, err);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Proceso completado: ${results.inserted} procesados, ${results.errors} errores.`,
      results
    });

  } catch (error) {
    console.error('Error en importación:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
