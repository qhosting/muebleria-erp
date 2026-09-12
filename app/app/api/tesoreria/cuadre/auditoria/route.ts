import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getCdmxDateRange(fechaDesdeStr: string, fechaHastaStr: string) {
    const desde = new Date(`${fechaDesdeStr}T00:00:00.000-06:00`);
    const hasta = new Date(`${fechaHastaStr}T23:59:59.999-06:00`);
    return { gte: desde, lte: hasta };
}

// Cache en memoria para el catálogo de clientes ContPAQi (expira cada 30 minutos)
const clientesMapCache: Record<string, { map: Map<number, string>; lastFetch: number }> = {};

async function getClientesMap(empresa: string): Promise<Map<number, string>> {
    const now = Date.now();
    if (clientesMapCache[empresa] && (now - clientesMapCache[empresa].lastFetch < 1000 * 60 * 30)) {
        return clientesMapCache[empresa].map;
    }
    const apiUrl = process.env.CONTPAQI_API_URL || 'http://vortex520.qhosting.net:5000';
    const apiKey = process.env.CONTPAQI_API_KEY || 'VERTEX123_CONTPAQI_ERP_2024';
    const url = `${apiUrl}/api/clientes?empresa=${empresa}&limit=50000`;
    try {
        const res = await fetch(url, {
            headers: {
                'X-API-Key': apiKey,
                'X-Company-Id': empresa
            },
            cache: 'no-store'
        });
        if (!res.ok) {
            console.error(`Error consultando catálogo clientes ContPAQi ${empresa}: HTTP ${res.status}`);
            return clientesMapCache[empresa]?.map || new Map();
        }
        const data = await res.json();
        const map = new Map<number, string>();
        if (Array.isArray(data)) {
            for (const c of data) {
                if (c.id != null && c.codigo) {
                    map.set(Number(c.id), c.codigo.trim().toUpperCase());
                }
            }
        }
        clientesMapCache[empresa] = { map, lastFetch: now };
        return map;
    } catch (err) {
        console.error(`Excepción al conectar con catálogo clientes ContPAQi (${empresa}):`, err);
        return clientesMapCache[empresa]?.map || new Map();
    }
}

async function fetchContpaqiDocs(empresa: string, fechaInicio: string, fechaFin: string) {
    const apiUrl = process.env.CONTPAQI_API_URL || 'http://vortex520.qhosting.net:5000';
    const apiKey = process.env.CONTPAQI_API_KEY || 'VERTEX123_CONTPAQI_ERP_2024';
    const url = `${apiUrl}/api/documentos?empresa=${empresa}&fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&limit=10000`;
    try {
        const res = await fetch(url, {
            headers: {
                'X-API-Key': apiKey,
                'X-Company-Id': empresa
            },
            cache: 'no-store'
        });
        if (!res.ok) {
            console.error(`Error consultando ContPAQi API ${empresa}: HTTP ${res.status}`);
            return [];
        }
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error(`Excepción al conectar con ContPAQi API (${empresa}):`, err);
        return [];
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const desdeParam = searchParams.get('desde');
        const hastaParam = searchParams.get('hasta');

        // Valores por defecto (semana actual de sábado a viernes)
        const now = new Date();
        const sab = new Date(now);
        sab.setDate(now.getDate() - ((now.getDay() + 1) % 7));
        const vie = new Date(sab);
        vie.setDate(sab.getDate() + 6);

        const fechaInicio = desdeParam || sab.toISOString().split('T')[0];
        const fechaFin = hastaParam || vie.toISOString().split('T')[0];

        // 1. Descargar documentos y catálogos de clientes de ContPAQi para DP y DQ en paralelo
        const [docsDP, docsDQ, clientesMapDP, clientesMapDQ] = await Promise.all([
            fetchContpaqiDocs('DP', fechaInicio, fechaFin),
            fetchContpaqiDocs('DQ', fechaInicio, fechaFin),
            getClientesMap('DP'),
            getClientesMap('DQ')
        ]);

        // Filtrar conceptos de cobranza de cuotas regulares (no cancelados):
        // DP: Concepto 101
        // DQ: Concepto 102
        // * NOTA: Los intereses moratorios no entran aquí porque en ContPAQi se generan en concepto independiente (PC INTERES MORATORIO con Nota de Cargo)
        const contpaqiDP = docsDP.filter((d: any) => !d.cancelado && (d.codigoConcepto || '').trim() === '101');
        const contpaqiDQ = docsDQ.filter((d: any) => !d.cancelado && (d.codigoConcepto || '').trim() === '102');

        // Mapeo ContPAQi por Agente
        const cpMap: Record<string, { DP: { count: number; total: number; docs: any[] }; DQ: { count: number; total: number; docs: any[] } }> = {};

        const ensureCpAgente = (agente: string) => {
            if (!cpMap[agente]) {
                cpMap[agente] = {
                    DP: { count: 0, total: 0, docs: [] },
                    DQ: { count: 0, total: 0, docs: [] }
                };
            }
        };

        for (const d of contpaqiDP) {
            const ag = (d.codigoAgente || 'SIN_AGENTE').trim().toUpperCase();
            ensureCpAgente(ag);
            cpMap[ag].DP.count++;
            cpMap[ag].DP.total += parseFloat(d.total) || 0;
            const codigoResuelto = (d.idClienteProveedor != null ? clientesMapDP.get(Number(d.idClienteProveedor)) : null) || d.codigoCliente || null;
            cpMap[ag].DP.docs.push({
                id: d.id,
                folio: d.folio,
                fecha: d.fecha,
                cliente: codigoResuelto,
                razonSocial: d.razonSocial,
                total: parseFloat(d.total) || 0,
                referencia: d.referencia
            });
        }

        for (const d of contpaqiDQ) {
            const ag = (d.codigoAgente || 'SIN_AGENTE').trim().toUpperCase();
            ensureCpAgente(ag);
            cpMap[ag].DQ.count++;
            cpMap[ag].DQ.total += parseFloat(d.total) || 0;
            const codigoResuelto = (d.idClienteProveedor != null ? clientesMapDQ.get(Number(d.idClienteProveedor)) : null) || d.codigoCliente || null;
            cpMap[ag].DQ.docs.push({
                id: d.id,
                folio: d.folio,
                fecha: d.fecha,
                cliente: codigoResuelto,
                razonSocial: d.razonSocial,
                total: parseFloat(d.total) || 0,
                referencia: d.referencia
            });
        }

        // 2. Obtener Pagos del ERP en el rango CDMX
        const dateRange = getCdmxDateRange(fechaInicio, fechaFin);
        const pagosERP = await prisma.pago.findMany({
            where: {
                fechaPago: dateRange
            },
            include: {
                cobrador: { select: { id: true, name: true, codigoGestor: true } },
                cliente: { select: { codigoCliente: true, nombreCompleto: true } },
                ticket: { select: { folio: true, referencia: true } }
            },
            orderBy: { fechaPago: 'asc' }
        });

        // Mapeo ERP por Gestor y Empresa
        const erpMap: Record<string, { nombre: string; DP: { count: number; total: number; pagos: any[] }; DQ: { count: number; total: number; pagos: any[] } }> = {};

        for (const p of pagosERP) {
            const codGestor = (p.cobrador?.codigoGestor || p.cobrador?.name || 'SIN_GESTOR').trim().toUpperCase();
            const clienteCod = (p.cliente?.codigoCliente || '').trim().toUpperCase();
            const isDP = clienteCod.startsWith('DP');
            const isDQ = clienteCod.startsWith('DQ');
            const tipo = isDP ? 'DP' : (isDQ ? 'DQ' : 'OTRO');
            const monto = parseFloat(p.monto.toString()) || 0;

            if (!erpMap[codGestor]) {
                erpMap[codGestor] = {
                    nombre: p.cobrador?.name || codGestor,
                    DP: { count: 0, total: 0, pagos: [] },
                    DQ: { count: 0, total: 0, pagos: [] }
                };
            }

            if (tipo === 'DP' || tipo === 'DQ') {
                erpMap[codGestor][tipo].count++;
                erpMap[codGestor][tipo].total += monto;
                erpMap[codGestor][tipo].pagos.push({
                    id: p.id,
                    fecha: p.fechaPago,
                    cliente: p.cliente?.codigoCliente,
                    nombreCliente: p.cliente?.nombreCompleto,
                    monto,
                    concepto: p.concepto,
                    sincronizado: p.sincronizado,
                    folioTicket: p.ticket?.folio || p.numeroRecibo
                });
            }
        }

        // 3. Filtrar únicamente los gestores que tienen registros en el ERP
        // (Los agentes que solo están en ContPAQi corresponden a capturas directas sin relación con el ERP)
        const gestoresERP = Object.keys(erpMap).sort();

        // 4. Armar filas de la Matriz de Auditoría
        interface FilaAuditoria {
            gestor: string;
            nombreGestor: string;
            empresa: 'DP' | 'DQ';
            erpCantidad: number;
            erpTotal: number;
            contpaqiCantidad: number;
            contpaqiTotal: number;
            diferencia: number;
            estado: 'CUADRADO' | 'DIFERENCIA';
            pagosERP?: any[];
            docsContpaqi?: any[];
            discrepancias?: any;
        }

        const filas: FilaAuditoria[] = [];

        let granTotalERP = 0;
        let granCantERP = 0;
        let granTotalCP = 0;
        let granCantCP = 0;

        let totalDP_ERP = 0;
        let totalDP_CP = 0;
        let totalDQ_ERP = 0;
        let totalDQ_CP = 0;

function analizarDiscrepancias(pagosERP: any[], docsCP: any[]) {
    const erpPorCliente = new Map<string, { total: number; count: number; pagos: any[] }>();
    for (const p of pagosERP) {
        const cod = (p.cliente || 'SIN_CODIGO').trim().toUpperCase();
        if (!erpPorCliente.has(cod)) {
            erpPorCliente.set(cod, { total: 0, count: 0, pagos: [] });
        }
        const item = erpPorCliente.get(cod)!;
        item.total += p.monto;
        item.count += 1;
        item.pagos.push(p);
    }

    const cpPorCliente = new Map<string, { total: number; count: number; docs: any[] }>();
    for (const d of docsCP) {
        const cod = (d.cliente || 'SIN_CODIGO').trim().toUpperCase();
        if (!cpPorCliente.has(cod)) {
            cpPorCliente.set(cod, { total: 0, count: 0, docs: [] });
        }
        const item = cpPorCliente.get(cod)!;
        item.total += d.total;
        item.count += 1;
        item.docs.push(d);
    }

    const soloEnERP: any[] = [];
    const soloEnContPAQi: any[] = [];
    const diferenciasMonto: any[] = [];
    const coincidentes: any[] = [];

    for (const [cod, erpVal] of erpPorCliente.entries()) {
        const cpVal = cpPorCliente.get(cod);
        if (!cpVal) {
            soloEnERP.push({
                cliente: cod,
                nombreCliente: erpVal.pagos[0]?.nombreCliente || cod,
                totalERP: parseFloat(erpVal.total.toFixed(2)),
                cantidadERP: erpVal.count,
                pagos: erpVal.pagos
            });
        } else {
            const dif = parseFloat((erpVal.total - cpVal.total).toFixed(2));
            if (Math.abs(dif) >= 0.01) {
                diferenciasMonto.push({
                    cliente: cod,
                    nombreCliente: erpVal.pagos[0]?.nombreCliente || cpVal.docs[0]?.razonSocial || cod,
                    totalERP: parseFloat(erpVal.total.toFixed(2)),
                    totalContpaqi: parseFloat(cpVal.total.toFixed(2)),
                    diferencia: dif,
                    cantidadERP: erpVal.count,
                    cantidadContpaqi: cpVal.count,
                    pagosERP: erpVal.pagos,
                    docsContpaqi: cpVal.docs
                });
            } else {
                coincidentes.push({
                    cliente: cod,
                    total: parseFloat(erpVal.total.toFixed(2)),
                    cantidadERP: erpVal.count,
                    cantidadContpaqi: cpVal.count
                });
            }
        }
    }

    for (const [cod, cpVal] of cpPorCliente.entries()) {
        if (!erpPorCliente.has(cod)) {
            soloEnContPAQi.push({
                cliente: cod,
                razonSocial: cpVal.docs[0]?.razonSocial || cod,
                totalContpaqi: parseFloat(cpVal.total.toFixed(2)),
                cantidadContpaqi: cpVal.count,
                docs: cpVal.docs
            });
        }
    }

    return {
        totalDiscrepancias: soloEnERP.length + soloEnContPAQi.length + diferenciasMonto.length,
        soloEnERP,
        soloEnContPAQi,
        diferenciasMonto,
        coincidentes
    };
}

        for (const gestor of gestoresERP) {
            const erpData = erpMap[gestor];
            const cpData = cpMap[gestor] || { DP: { count: 0, total: 0, docs: [] }, DQ: { count: 0, total: 0, docs: [] } };

            // Evaluar fila DP si el gestor tiene cobros DP en el ERP
            if (erpData.DP.count > 0) {
                const difDP = parseFloat((erpData.DP.total - cpData.DP.total).toFixed(2));
                const cuadradoDP = Math.abs(difDP) < 0.01 && erpData.DP.count === cpData.DP.count;
                const analisisDP = analizarDiscrepancias(erpData.DP.pagos, cpData.DP.docs);

                filas.push({
                    gestor,
                    nombreGestor: erpData.nombre || gestor,
                    empresa: 'DP',
                    erpCantidad: erpData.DP.count,
                    erpTotal: parseFloat(erpData.DP.total.toFixed(2)),
                    contpaqiCantidad: cpData.DP.count,
                    contpaqiTotal: parseFloat(cpData.DP.total.toFixed(2)),
                    diferencia: difDP,
                    estado: cuadradoDP ? 'CUADRADO' : 'DIFERENCIA',
                    pagosERP: erpData.DP.pagos,
                    docsContpaqi: cpData.DP.docs,
                    discrepancias: analisisDP
                });

                granTotalERP += erpData.DP.total;
                granCantERP += erpData.DP.count;
                granTotalCP += cpData.DP.total;
                granCantCP += cpData.DP.count;

                totalDP_ERP += erpData.DP.total;
                totalDP_CP += cpData.DP.total;
            }

            // Evaluar fila DQ si el gestor tiene cobros DQ en el ERP
            if (erpData.DQ.count > 0) {
                const difDQ = parseFloat((erpData.DQ.total - cpData.DQ.total).toFixed(2));
                const cuadradoDQ = Math.abs(difDQ) < 0.01 && erpData.DQ.count === cpData.DQ.count;
                const analisisDQ = analizarDiscrepancias(erpData.DQ.pagos, cpData.DQ.docs);

                filas.push({
                    gestor,
                    nombreGestor: erpData.nombre || gestor,
                    empresa: 'DQ',
                    erpCantidad: erpData.DQ.count,
                    erpTotal: parseFloat(erpData.DQ.total.toFixed(2)),
                    contpaqiCantidad: cpData.DQ.count,
                    contpaqiTotal: parseFloat(cpData.DQ.total.toFixed(2)),
                    diferencia: difDQ,
                    estado: cuadradoDQ ? 'CUADRADO' : 'DIFERENCIA',
                    pagosERP: erpData.DQ.pagos,
                    docsContpaqi: cpData.DQ.docs,
                    discrepancias: analisisDQ
                });

                granTotalERP += erpData.DQ.total;
                granCantERP += erpData.DQ.count;
                granTotalCP += cpData.DQ.total;
                granCantCP += cpData.DQ.count;

                totalDQ_ERP += erpData.DQ.total;
                totalDQ_CP += cpData.DQ.total;
            }
        }

        // Calcular capturas directas en ContPAQi (gestores que no existen en el ERP)
        let contpaqiDirectosCant = 0;
        let contpaqiDirectosTotal = 0;
        for (const [ag, data] of Object.entries(cpMap)) {
            if (!erpMap[ag]) {
                contpaqiDirectosCant += data.DP.count + data.DQ.count;
                contpaqiDirectosTotal += data.DP.total + data.DQ.total;
            }
        }

        const granDiferencia = parseFloat((granTotalERP - granTotalCP).toFixed(2));
        const totalFilasConDiferencia = filas.filter(f => f.estado === 'DIFERENCIA').length;

        return NextResponse.json({
            fechaInicio,
            fechaFin,
            resumen: {
                granCantERP,
                granTotalERP: parseFloat(granTotalERP.toFixed(2)),
                granCantCP,
                granTotalCP: parseFloat(granTotalCP.toFixed(2)),
                granDiferencia,
                cuadrado: Math.abs(granDiferencia) < 0.01 && granCantERP === granCantCP && totalFilasConDiferencia === 0,
                totalFilas: filas.length,
                filasCuadradas: filas.filter(f => f.estado === 'CUADRADO').length,
                filasConDiferencia: totalFilasConDiferencia,
                porcentajeCoincidencia: filas.length > 0 
                    ? parseFloat(((filas.filter(f => f.estado === 'CUADRADO').length / filas.length) * 100).toFixed(1))
                    : 100,
                porEmpresa: {
                    DP: {
                        erpTotal: parseFloat(totalDP_ERP.toFixed(2)),
                        contpaqiTotal: parseFloat(totalDP_CP.toFixed(2)),
                        diferencia: parseFloat((totalDP_ERP - totalDP_CP).toFixed(2))
                    },
                    DQ: {
                        erpTotal: parseFloat(totalDQ_ERP.toFixed(2)),
                        contpaqiTotal: parseFloat(totalDQ_CP.toFixed(2)),
                        diferencia: parseFloat((totalDQ_ERP - totalDQ_CP).toFixed(2))
                    }
                },
                contpaqiDirectos: {
                    cantidad: contpaqiDirectosCant,
                    total: parseFloat(contpaqiDirectosTotal.toFixed(2))
                }
            },
            filas
        });

    } catch (error: any) {
        console.error('Error en GET /api/tesoreria/cuadre/auditoria:', error);
        return NextResponse.json({ error: error.message || 'Error al procesar auditoría' }, { status: 500 });
    }
}
