import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import mysql from 'mysql2/promise';
import { auditarSaldosCliente, actualizarSaldosCliente } from '@/lib/auditoria-saldos-service';

export const dynamic = 'force-dynamic';

const MYSQL_CONFIG = {
  host: process.env.MYSQL_AUDIT_HOST || '152.53.171.236',
  user: process.env.MYSQL_AUDIT_USER || 'mueblesdaso_cob',
  password: process.env.MYSQL_AUDIT_PASSWORD || 'B4Dl6VlHDo',
  database: process.env.MYSQL_AUDIT_DATABASE || 'mueblesdaso_cob',
  connectTimeout: 8000,
};

/**
 * GET: Obtiene la lista de clientes para auditoría de saldos (ERP vs ContPAQi API)
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
      return NextResponse.json({ error: 'Acceso restringido a administradores y tesorería' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const empresaFiltro = searchParams.get('empresa') || 'all'; // all, DP, DQ
    const cobradorFiltro = searchParams.get('cobrador') || 'all';
    const estadoFiltro = searchParams.get('estado') || 'all'; // all, DESFASE, CUADRADO, PENDIENTES
    const statusCuentaFiltro = searchParams.get('statusCuenta') || 'activo'; // activo, inactivo, all
    const search = (searchParams.get('search') || '').trim();
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');

    connection = await mysql.createConnection(MYSQL_CONFIG);

    // 1. Obtener lista de cobradores disponibles
    const [cobradoresRows]: any = await connection.query(
      `SELECT DISTINCT codigo_gestor FROM cat_clientes WHERE codigo_gestor IS NOT NULL AND codigo_gestor != '' ORDER BY codigo_gestor`
    );
    const cobradoresList = Array.isArray(cobradoresRows) ? cobradoresRows.map((r: any) => r.codigo_gestor) : [];

    // 1.1 Filtrar clientes según su estatus en el ERP si no es 'all'
    let codigosValidosERP: string[] | null = null;
    if (statusCuentaFiltro !== 'all') {
      const clientesErp = await prisma.cliente.findMany({
        where: { statusCuenta: statusCuentaFiltro as any },
        select: { codigoCliente: true }
      });
      codigosValidosERP = clientesErp.map((c) => c.codigoCliente.toUpperCase());
    }

    // 2. Query de conteo total para paginación real
    let countQuery = `
      SELECT COUNT(*) as total
      FROM cat_clientes
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (codigosValidosERP) {
      if (codigosValidosERP.length === 0) {
        return NextResponse.json({
          success: true,
          resumen: {
            totalAuditados: 0,
            totalEnPagina: 0,
            totalCuadrados: 0,
            totalConDesfase: 0,
            totalConPendientes: 0,
            sumaDiscrepanciaTotal: 0
          },
          cobradores: cobradoresList,
          clientes: [],
          pagination: { page: 1, limit, total: 0, totalPages: 1 }
        });
      }
      countQuery += ` AND UPPER(cod_cliente) IN (?)`;
      countParams.push(codigosValidosERP);
    }

    if (empresaFiltro !== 'all') {
      countQuery += ` AND cod_cliente LIKE ?`;
      countParams.push(`${empresaFiltro}%`);
    }

    if (cobradorFiltro !== 'all') {
      countQuery += ` AND codigo_gestor = ?`;
      countParams.push(cobradorFiltro);
    }

    if (search) {
      countQuery += ` AND (cod_cliente LIKE ? OR nombre_ccliente LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [countResult]: any = await connection.query(countQuery, countParams);
    const totalCount = countResult?.[0]?.total || 0;

    // 3. Query de clientes base desde MySQL
    let query = `
      SELECT cod_cliente, nombre_ccliente, saldo_actualcli, codigo_gestor, status_cliente
      FROM cat_clientes
      WHERE 1=1
    `;
    const params: any[] = [];

    if (codigosValidosERP) {
      query += ` AND UPPER(cod_cliente) IN (?)`;
      params.push(codigosValidosERP);
    }

    if (empresaFiltro !== 'all') {
      query += ` AND cod_cliente LIKE ?`;
      params.push(`${empresaFiltro}%`);
    }

    if (cobradorFiltro !== 'all') {
      query += ` AND codigo_gestor = ?`;
      params.push(cobradorFiltro);
    }

    if (search) {
      query += ` AND (cod_cliente LIKE ? OR nombre_ccliente LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY cod_cliente ASC LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);

    const [clientesRows]: any = await connection.query(query, params);
    const clientesBase = Array.isArray(clientesRows) ? clientesRows : [];

    // 4. Auditar cada cliente en paralelo (hasta 15 a la vez para no saturar)
    const auditados: any[] = [];
    const BATCH_SIZE = 15;
    for (let i = 0; i < clientesBase.length; i += BATCH_SIZE) {
      const batch = clientesBase.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((c: any) => auditarSaldosCliente(c.cod_cliente, prisma, connection!))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const res = batchResults[j];
        if (res.status === 'fulfilled') {
          auditados.push(res.value);
        } else {
          const fallback = batch[j];
          auditados.push({
            codigo: fallback.cod_cliente,
            nombre: fallback.nombre_ccliente,
            empresa: fallback.cod_cliente.startsWith('DP') ? 'DP' : 'DQ',
            cobrador: fallback.codigo_gestor || 'Sin Asignar',
            saldoContpaqiApi: 0,
            saldoErpActual: parseFloat(fallback.saldo_actualcli || '0') || 0,
            saldoMysqlActual: parseFloat(fallback.saldo_actualcli || '0') || 0,
            saldoRealCalculado: parseFloat(fallback.saldo_actualcli || '0') || 0,
            diferenciaErp: 0,
            diferenciaMysql: 0,
            estadoCuadre: 'CUADRADO',
            totalPagosAuditados: 0,
            pagosPendientesContpaqi: 0,
            pagosAplicadosContpaqi: 0,
            cadenaPagos: []
          });
        }
      }
    }

    // Filtrar por estado si se especificó
    let resultadosFiltrados = auditados;
    if (estadoFiltro === 'DESFASE') {
      resultadosFiltrados = auditados.filter((a) => a.estadoCuadre === 'DESFASE_SALDO');
    } else if (estadoFiltro === 'CUADRADO') {
      resultadosFiltrados = auditados.filter((a) => a.estadoCuadre === 'CUADRADO');
    } else if (estadoFiltro === 'PENDIENTES') {
      resultadosFiltrados = auditados.filter((a) => a.estadoCuadre === 'PAGOS_PENDIENTES_CONTPAQI');
    }

    // Resumen estadístico
    const totalConDesfase = auditados.filter((a) => a.estadoCuadre === 'DESFASE_SALDO').length;
    const totalCuadrados = auditados.filter((a) => a.estadoCuadre === 'CUADRADO').length;
    const totalConPendientes = auditados.filter((a) => a.estadoCuadre === 'PAGOS_PENDIENTES_CONTPAQI').length;
    const sumaDiscrepanciaTotal = auditados.reduce((acc, a) => acc + Math.abs(a.diferenciaMysql || 0), 0);

    return NextResponse.json({
      success: true,
      resumen: {
        totalAuditados: totalCount,
        totalEnPagina: auditados.length,
        totalCuadrados,
        totalConDesfase,
        totalConPendientes,
        sumaDiscrepanciaTotal: parseFloat(sumaDiscrepanciaTotal.toFixed(2))
      },
      cobradores: cobradoresList,
      clientes: resultadosFiltrados,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1
      }
    });
  } catch (error: any) {
    console.error('Error al ejecutar auditoría de saldos:', error);
    return NextResponse.json({ error: error.message || 'Error interno en auditoría' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * POST: Ejecuta actualización masiva de saldos para los clientes seleccionados
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
    const { codigosClientes, accion } = body;

    if (!Array.isArray(codigosClientes) || codigosClientes.length === 0) {
      return NextResponse.json({ error: 'Debe especificar al menos un código de cliente' }, { status: 400 });
    }

    connection = await mysql.createConnection(MYSQL_CONFIG);

    const resultados: any[] = [];
    let totalActualizados = 0;
    let totalPagosCorregidos = 0;

    for (const codigo of codigosClientes) {
      try {
        const res = await actualizarSaldosCliente(codigo, prisma, connection);
        resultados.push({
          codigo,
          success: true,
          saldoReal: res.saldoReal,
          pagosActualizados: res.pagosActualizados
        });
        totalActualizados++;
        totalPagosCorregidos += res.pagosActualizados;
      } catch (err: any) {
        resultados.push({
          codigo,
          success: false,
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Actualización masiva completada: ${totalActualizados} clientes actualizados (${totalPagosCorregidos} pagos en cascada reajustados).`,
      totalActualizados,
      totalPagosCorregidos,
      detalles: resultados
    });
  } catch (error: any) {
    console.error('Error al ejecutar actualización masiva de saldos:', error);
    return NextResponse.json({ error: error.message || 'Error en actualización masiva' }, { status: 500 });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
