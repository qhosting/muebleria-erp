import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

const MYSQL_CONFIG = {
  host: process.env.MYSQL_AUDIT_HOST || '152.53.171.236',
  user: process.env.MYSQL_AUDIT_USER || 'mueblesdaso_cob',
  password: process.env.MYSQL_AUDIT_PASSWORD || 'B4Dl6VlHDo',
  database: process.env.MYSQL_AUDIT_DATABASE || 'mueblesdaso_cob',
  connectTimeout: 8000,
};

/**
 * GET: Ejecuta la auditoría cruzada de pagos (Sábado a Viernes u otro rango) entre MySQL y PostgreSQL
 */
export async function GET(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'auditor' && userRole !== 'tesorero' && userRole !== 'direccion') {
      return NextResponse.json({ error: 'Acceso restringido a auditoría y administración' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // Rango por defecto: Sábado pasado al Viernes próximo
    const now = new Date();
    const sabado = new Date(now);
    sabado.setDate(now.getDate() - ((now.getDay() + 1) % 7));
    const viernes = new Date(sabado);
    viernes.setDate(sabado.getDate() + 6);

    const fechaInicio = searchParams.get('fechaInicio') || sabado.toISOString().split('T')[0];
    const fechaFin = searchParams.get('fechaFin') || viernes.toISOString().split('T')[0];
    const cobradorFiltro = searchParams.get('cobrador') || 'all';

    // 1. Conexión a MySQL
    connection = await mysql.createConnection(MYSQL_CONFIG);

    // Obtener lista de cobradores/gestores desde MySQL para el filtro
    const [gestoresMysql]: any = await connection.query(
      `SELECT DISTINCT codigo_gestor FROM pagos WHERE codigo_gestor IS NOT NULL AND codigo_gestor != '' ORDER BY codigo_gestor`
    );
    const listaCobradores = gestoresMysql.map((g: any) => g.codigo_gestor);

    // 2. Query de pagos en MySQL
    let mysqlQuery = `
      SELECT idpag, cod_cliente, nombre_ccliente, fechap, fechahora, montop, ref_pago, codigo_gestor, saldo_actualcli
      FROM pagos
      WHERE DATE(fechap) >= ? AND DATE(fechap) <= ?
    `;
    const mysqlParams: any[] = [fechaInicio, fechaFin];

    if (cobradorFiltro !== 'all') {
      mysqlQuery += ` AND (codigo_gestor = ? OR cod_cliente LIKE ?)`;
      mysqlParams.push(cobradorFiltro, `${cobradorFiltro}%`);
    }

    mysqlQuery += ` ORDER BY cod_cliente, fechap ASC`;
    const [pagosMysql]: any = await connection.query(mysqlQuery, mysqlParams);

    // 3. Query de pagos en ERP (PostgreSQL)
    const dStart = new Date(`${fechaInicio}T00:00:00.000Z`);
    const dEnd = new Date(`${fechaFin}T23:59:59.999Z`);

    const erpWhere: any = {
      fechaPago: {
        gte: dStart,
        lte: dEnd,
      },
    };

    if (cobradorFiltro !== 'all') {
      erpWhere.OR = [
        { cobrador: { name: { contains: cobradorFiltro, mode: 'insensitive' } } },
        { cobrador: { email: { contains: cobradorFiltro, mode: 'insensitive' } } },
        { cliente: { codigoCliente: { startsWith: cobradorFiltro, mode: 'insensitive' } } },
      ];
    }

    const pagosErp = await prisma.pago.findMany({
      where: erpWhere,
      include: {
        cliente: {
          select: { codigoCliente: true, nombreCompleto: true, saldoActual: true },
        },
        cobrador: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { fechaPago: 'asc' },
    });

    // 4. Agrupación y Cruce por Código de Cliente
    const clientesMap = new Map<string, {
      codigo: string;
      nombre: string;
      cobrador: string;
      saldoErp: number;
      saldoMysql: number;
      mysqlPagos: any[];
      mysqlTotal: number;
      erpPagos: any[];
      erpTotal: number;
      diferencia: number;
      estado: 'CUADRADO' | 'DESFASE_MONTO' | 'FALTANTE_ERP' | 'FALTANTE_MYSQL';
    }>();

    // Procesar MySQL
    for (const p of pagosMysql) {
      const cod = (p.cod_cliente || '').trim().toUpperCase();
      if (!cod) continue;
      if (!clientesMap.has(cod)) {
        clientesMap.set(cod, {
          codigo: cod,
          nombre: p.nombre_ccliente || 'Sin Nombre',
          cobrador: p.codigo_gestor || 'Sin Asignar',
          saldoErp: 0,
          saldoMysql: parseFloat(p.saldo_actualcli) || 0,
          mysqlPagos: [],
          mysqlTotal: 0,
          erpPagos: [],
          erpTotal: 0,
          diferencia: 0,
          estado: 'CUADRADO',
        });
      }
      const item = clientesMap.get(cod)!;
      item.mysqlPagos.push({
        id: p.idpag,
        fecha: p.fechap ? new Date(p.fechap).toISOString().slice(0, 10) : '',
        hora: p.fechahora || '',
        monto: parseFloat(p.montop) || 0,
        referencia: p.ref_pago || '',
        cobrador: p.codigo_gestor || '',
      });
      item.mysqlTotal += parseFloat(p.montop) || 0;
      if (p.saldo_actualcli) {
        item.saldoMysql = parseFloat(p.saldo_actualcli) || item.saldoMysql;
      }
    }

    // Procesar ERP
    for (const p of pagosErp) {
      const cod = (p.cliente?.codigoCliente || '').trim().toUpperCase();
      if (!cod) continue;
      if (!clientesMap.has(cod)) {
        clientesMap.set(cod, {
          codigo: cod,
          nombre: p.cliente?.nombreCompleto || 'Sin Nombre',
          cobrador: p.cobrador?.name || 'Sin Asignar',
          saldoErp: parseFloat(p.cliente?.saldoActual?.toString() || '0'),
          saldoMysql: 0,
          mysqlPagos: [],
          mysqlTotal: 0,
          erpPagos: [],
          erpTotal: 0,
          diferencia: 0,
          estado: 'CUADRADO',
        });
      }
      const item = clientesMap.get(cod)!;
      item.saldoErp = parseFloat(p.cliente?.saldoActual?.toString() || item.saldoErp.toString());
      if (p.cobrador?.name && item.cobrador === 'Sin Asignar') {
        item.cobrador = p.cobrador.name;
      }
      item.erpPagos.push({
        id: p.id,
        fecha: p.fechaPago.toISOString().slice(0, 10),
        monto: parseFloat(p.monto.toString()),
        referencia: p.numeroRecibo || p.concepto || '',
        cobrador: p.cobrador?.name || '',
      });
      item.erpTotal += parseFloat(p.monto.toString());
    }

    // Clasificar Estados
    const listaResultados: any[] = [];
    let totalCuadrados = 0;
    let totalDesfaseMonto = 0;
    let totalFaltantesErp = 0;
    let totalFaltantesMysql = 0;

    let sumaMontoMysql = 0;
    let sumaMontoErp = 0;

    for (const item of clientesMap.values()) {
      item.mysqlTotal = parseFloat(item.mysqlTotal.toFixed(2));
      item.erpTotal = parseFloat(item.erpTotal.toFixed(2));
      item.diferencia = parseFloat((item.erpTotal - item.mysqlTotal).toFixed(2));

      sumaMontoMysql += item.mysqlTotal;
      sumaMontoErp += item.erpTotal;

      if (item.mysqlPagos.length > 0 && item.erpPagos.length === 0) {
        item.estado = 'FALTANTE_ERP';
        totalFaltantesErp++;
      } else if (item.mysqlPagos.length === 0 && item.erpPagos.length > 0) {
        item.estado = 'FALTANTE_MYSQL';
        totalFaltantesMysql++;
      } else if (Math.abs(item.diferencia) > 0.01 || item.mysqlPagos.length !== item.erpPagos.length) {
        item.estado = 'DESFASE_MONTO';
        totalDesfaseMonto++;
      } else {
        item.estado = 'CUADRADO';
        totalCuadrados++;
      }

      listaResultados.push(item);
    }

    // Ordenar: primero los que tienen discrepancias (Faltantes y Desfases) ordenados por diferencia absoluta
    listaResultados.sort((a, b) => {
      if (a.estado !== 'CUADRADO' && b.estado === 'CUADRADO') return -1;
      if (a.estado === 'CUADRADO' && b.estado !== 'CUADRADO') return 1;
      return Math.abs(b.diferencia) - Math.abs(a.diferencia);
    });

    const diferenciaGlobal = parseFloat((sumaMontoErp - sumaMontoMysql).toFixed(2));
    const totalClientesAuditados = listaResultados.length;
    const porcentajeCuadre = totalClientesAuditados > 0
      ? parseFloat(((totalCuadrados / totalClientesAuditados) * 100).toFixed(1))
      : 100;

    return NextResponse.json({
      resumen: {
        fechaInicio,
        fechaFin,
        cobradorFiltro,
        totalPagosMysql: pagosMysql.length,
        totalPagosErp: pagosErp.length,
        montoTotalMysql: sumaMontoMysql,
        montoTotalErp: sumaMontoErp,
        diferenciaGlobal,
        totalClientesAuditados,
        totalCuadrados,
        totalDesfaseMonto,
        totalFaltantesErp,
        totalFaltantesMysql,
        porcentajeCuadre,
      },
      cobradores: listaCobradores,
      clientes: listaResultados,
    });

  } catch (error: any) {
    console.error('Error en GET /api/tesoreria/auditoria/cruce-mysql:', error);
    return NextResponse.json({ error: error.message || 'Error en auditoría cruzada' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

/**
 * POST: Auto-alineación / Importación de pagos faltantes desde MySQL hacia ERP
 */
export async function POST(request: NextRequest) {
  let connection: mysql.Connection | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'auditor' && userRole !== 'tesorero') {
      return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
    }

    const body = await request.json();
    const { fechaInicio, fechaFin, codigoCliente, cobradorFiltro = 'all' } = body;

    connection = await mysql.createConnection(MYSQL_CONFIG);

    let mysqlQuery = `
      SELECT idpag, cod_cliente, nombre_ccliente, fechap, fechahora, montop, ref_pago, codigo_gestor, saldo_actualcli
      FROM pagos
      WHERE DATE(fechap) >= ? AND DATE(fechap) <= ?
    `;
    const mysqlParams: any[] = [fechaInicio, fechaFin];

    if (codigoCliente) {
      mysqlQuery += ` AND cod_cliente = ?`;
      mysqlParams.push(codigoCliente.trim().toUpperCase());
    } else if (cobradorFiltro !== 'all') {
      mysqlQuery += ` AND (codigo_gestor = ? OR cod_cliente LIKE ?)`;
      mysqlParams.push(cobradorFiltro, `${cobradorFiltro}%`);
    }

    mysqlQuery += ` ORDER BY fechap ASC`;
    const [pagosMysql]: any = await connection.query(mysqlQuery, mysqlParams);

    let pagosInsertados = 0;
    let clientesActualizados = 0;

    for (const p of pagosMysql) {
      const cod = (p.cod_cliente || '').trim().toUpperCase();
      if (!cod) continue;

      const cliente = await prisma.cliente.findUnique({
        where: { codigoCliente: cod },
        include: { cobradorAsignado: true }
      });

      if (!cliente) continue;

      const montoNum = parseFloat(p.montop) || 0;
      if (montoNum <= 0) continue;

      const fechaP = p.fechap ? new Date(p.fechap) : new Date();

      // Verificar si ya existe este pago en ERP por cliente, fecha y monto similar
      const dMin = new Date(fechaP);
      dMin.setHours(0, 0, 0, 0);
      const dMax = new Date(fechaP);
      dMax.setHours(23, 59, 59, 999);

      const yaExiste = await prisma.pago.findFirst({
        where: {
          clienteId: cliente.id,
          monto: montoNum,
          fechaPago: {
            gte: dMin,
            lte: dMax,
          }
        }
      });

      if (!yaExiste) {
        const saldoPrevio = parseFloat(cliente.saldoActual.toString());
        const saldoNvo = Math.max(0, saldoPrevio - montoNum);

        await prisma.pago.create({
          data: {
            clienteId: cliente.id,
            cobradorId: cliente.cobradorAsignadoId || (session.user as any).id,
            monto: montoNum,
            fechaPago: fechaP,
            saldoAnterior: saldoPrevio,
            saldoNuevo: saldoNvo,
            numeroRecibo: p.ref_pago || `MYSQL-#${p.idpag}`,
            metodoPago: 'efectivo',
            concepto: `Alineación automática desde MySQL (ID: ${p.idpag})`,
          }
        });

        await prisma.cliente.update({
          where: { id: cliente.id },
          data: { saldoActual: saldoNvo }
        });

        pagosInsertados++;
        clientesActualizados++;
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Alineación completada: ${pagosInsertados} pagos importados hacia ERP.`,
      pagosInsertados,
      clientesActualizados,
    });

  } catch (error: any) {
    console.error('Error en POST /api/tesoreria/auditoria/cruce-mysql:', error);
    return NextResponse.json({ error: error.message || 'Error al alinear pagos' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}
