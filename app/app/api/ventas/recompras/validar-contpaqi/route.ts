
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getContpaqiService } from '@/lib/contpaqi-service';

const getConceptNameLocal = (doc: any): string => {
  if (!doc) return 'Venta / Cargo';
  if (doc.concepto && typeof doc.concepto === 'object') {
    const nested = doc.concepto;
    const name = nested.nombre || nested.Nombre || nested.cNombre || 
                 nested.cNombreConcepto || nested.CNOMBRECONCEPTO || 
                 nested.nombreConcepto || nested.NombreConcepto || 
                 nested.cNombreClasificacion || nested.codigo || 
                 nested.cCodigoConcepto || nested.codigoConcepto ||
                 nested.cnombreconcepto;
    if (name) return String(name);
  }
  const directName = doc.CNOMBRECONCEPTO || doc.cNombreConcepto || doc.cnombreconcepto || doc.nombreConcepto || doc.NombreConcepto || doc.cNombreClasificacion || doc.conceptoNombre || doc.ConceptoNombre || doc.cNombre || doc.Nombre || doc.nombre;
  if (directName) return String(directName);
  return 'Venta / Cargo';
};

const isAbonoDoc = (doc: any, conceptName: string) => {
  const name = conceptName.toUpperCase();
  const code = String(doc.codigoConcepto || doc.Concepto || doc.concepto || doc.CCODIGOCONCEPTO || '').trim();
  
  const abonoCodes = ['101', '102', '103', '112', '122', '130', '135', '6', '8', '13', '15', '45'];
  
  const total = Number(doc.cTotal || doc.ctotal || doc.total || doc.importe || doc.CTOTAL || 0);
  const pending = Number(doc.cSaldo || doc.csaldo || doc.saldo || doc.pendiente || doc.cPendiente || doc.CSALDO || doc.CPENDIENTE || 0);
  
  return abonoCodes.includes(code) ||
         name.includes('PAGO') || 
         name.includes('ABONO') || 
         name.includes('RECIBO') || 
         name.includes('DEV SOBRE VENTA') || 
         name.includes('NOTA DE CREDITO') || 
         name.includes('NC QUERETARO') || 
         name.startsWith('PC') || 
         name.includes('PC ') || 
         total < 0 || 
         (total > 0 && pending === 0 && (name.toLowerCase().includes('recibo') || name.startsWith('PC') || abonoCodes.includes(code)));
};

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { leadId } = body;

        if (!leadId) {
            return NextResponse.json({ error: 'Falta leadId' }, { status: 400 });
        }

        const lead = await prisma.lead.findUnique({
            where: { id: leadId }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead no válido' }, { status: 404 });
        }

        // Obtener el código de cliente sin consultar obligatoriamente el catálogo local
        let codigoCliente = (lead.datosExtraidos as any)?.codigoCliente || null;
        let sucursalId = undefined;

        if (!codigoCliente && lead.clienteId) {
            // Fallback: Si no está en datosExtraidos pero hay clienteId, buscamos en catálogo local
            const cliente = await prisma.cliente.findUnique({
                where: { id: lead.clienteId }
            });
            if (cliente) {
                codigoCliente = cliente.codigoCliente;
                sucursalId = cliente.sucursalId || undefined;
            }
        }

        // Si aún no se encuentra, buscar por expresión regular en las notas
        if (!codigoCliente && lead.notas) {
            const match = lead.notas.match(/(DQ|DP)\d+/i);
            if (match) {
                codigoCliente = match[0].toUpperCase();
            }
        }

        if (!codigoCliente) {
            return NextResponse.json({ error: 'No se pudo determinar el código de cliente de Contpaqi' }, { status: 400 });
        }

        // --- DETECTAR EMPRESA POR PREFIJO DE CÓDIGO ---
        let empresaId = sucursalId;
        
        // Si el código de cliente tiene un prefijo identificador como 'DQ' o 'DP', lo usamos con prioridad
        if (codigoCliente) {
            const prefix = codigoCliente.match(/^[a-zA-Z]+/)?.[0]?.toUpperCase();
            if (prefix && ['DP', 'DQ'].includes(prefix)) {
                // Buscamos si hay una empresa configurada cuyo nombre o baseDatos coincida o empiece con ese prefijo
                const configRaw = await prisma.configuracionSistema.findUnique({ where: { clave: 'sistema' } });
                const empresas = (configRaw as any)?.contpaqi?.empresas || [];
                const matchedEmpresa = empresas.find((e: any) => 
                    e.nombre?.toUpperCase().startsWith(prefix) || 
                    e.baseDatos?.toUpperCase().startsWith(prefix) ||
                    e.id?.toUpperCase() === prefix
                );
                if (matchedEmpresa) {
                    empresaId = matchedEmpresa.id;
                } else {
                    // Si no está configurada explícitamente en la DB, forzamos el prefijo como alias directo
                    empresaId = prefix;
                }
            }
        }

        const service = await getContpaqiService(prisma, empresaId);
        const contpaqiCliente = await service.getCliente(codigoCliente);

        if (!contpaqiCliente) {
            return NextResponse.json({ error: 'No se encontró el cliente en Contpaqi' }, { status: 404 });
        }

        // --- NUEVA BÚSQUEDA DE CUENTA ACTIVA ---
        // Buscamos si el cliente ya tiene una cuenta activa en nuestro sistema (posible recompra ya realizada)
        // Buscamos por nombre aproximado para mayor seguridad
        const cuentasActivas = await prisma.cliente.findMany({
            where: {
                nombreCompleto: {
                    contains: lead.nombre,
                    mode: 'insensitive'
                },
                statusCuenta: 'activo',
                id: { not: lead.clienteId || '' } // Que no sea la misma cuenta liquidada
            },
            select: {
                id: true,
                codigoCliente: true,
                descripcionProducto: true,
                fechaVenta: true,
                saldoActual: true
            }
        });

        // Extraer clasificaciones
        const clasificaciones = {
            cNombreClasificacion1: contpaqiCliente.cNombreClasificacion1 || contpaqiCliente.cnombreclasificacion1 || 'N/A',
            cNombreClasificacion2: contpaqiCliente.cNombreClasificacion2 || contpaqiCliente.cnombreclasificacion2 || 'N/A',
            cNombreClasificacion3: contpaqiCliente.cNombreClasificacion3 || contpaqiCliente.cnombreclasificacion3 || 'N/A',
            cNombreClasificacion4: contpaqiCliente.cNombreClasificacion4 || contpaqiCliente.cnombreclasificacion4 || 'N/A',
            cNombreClasificacion5: contpaqiCliente.cNombreClasificacion5 || contpaqiCliente.cnombreclasificacion5 || 'N/A',
            cNombreClasificacion6: contpaqiCliente.cNombreClasificacion6 || contpaqiCliente.cnombreclasificacion6 || 'N/A',
        };

        // Obtener documentos para determinar fecha de primer y último pago
        let fechaPrimerPago = null;
        let fechaUltimoPago = null;

        try {
            const documentos = await service.getClientDocumentos(codigoCliente);
            if (Array.isArray(documentos) && documentos.length > 0) {
                const abonos: any[] = [];
                documentos.forEach((doc: any) => {
                    const conceptName = getConceptNameLocal(doc);
                    // Excluir "Abono por Letras" (concepto 17)
                    const conceptCode = String(doc.codigoConcepto || doc.Concepto || doc.concepto || doc.CCODIGOCONCEPTO || '').trim();
                    if (conceptCode === '17' || conceptName.toUpperCase().includes('LETRAS')) {
                        return;
                    }

                    if (isAbonoDoc(doc, conceptName)) {
                        abonos.push(doc);
                    }
                });

                if (abonos.length > 0) {
                    abonos.sort((a, b) => new Date(a.cFecha || a.cfecha || a.fecha || a.CFECHA || 0).getTime() - new Date(b.cFecha || b.cfecha || b.fecha || b.CFECHA || 0).getTime());
                    
                    const firstAbono = abonos[0];
                    const lastAbono = abonos[abonos.length - 1];
                    
                    fechaPrimerPago = firstAbono.cFecha || firstAbono.cfecha || firstAbono.fecha || firstAbono.CFECHA || null;
                    fechaUltimoPago = lastAbono.cFecha || lastAbono.cfecha || lastAbono.fecha || lastAbono.CFECHA || null;
                }
            }
        } catch (docError) {
            console.warn(`No se pudieron obtener documentos detallados para cliente ${codigoCliente} en validación:`, docError);
        }

        return NextResponse.json({ 
            codigoCliente: codigoCliente,
            nombre: contpaqiCliente.cNombreCliente || contpaqiCliente.cnombrecliente,
            clasificaciones,
            recompraActiva: cuentasActivas.length > 0 ? cuentasActivas[0] : null,
            fechaPrimerPago,
            fechaUltimoPago
        });
    } catch (error: any) {
        console.error('Error al validar cliente en Contpaqi:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
