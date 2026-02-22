import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const ANTERIOR_DIR = path.join(__dirname, '../../anterior');

// Función de utilidad temporal para cuando necesitamos generar IDs o resolver relaciones.
// En producción, este script debería leer las líneas de los archivos SQL o convertirlas
// a CSV para una extracción más estable, pero aquí está el mapeo central que usaremos.

async function syncUsersAndGestores() {
    console.log('--- 1. Sincronizando Gestores ---');
    // Extraes todos los códigos únicos de "codigo_gestor" y creas usuarios con rol 'cobrador'
    // si es que no existen en el sistema nuevo.
    const gestoresUnicos = ['DQJSP', 'DQBOT', 'DQRLC', 'DQGHM', 'DQJLV']; // Ejemplo
    for (const codigo of gestoresUnicos) {
        await prisma.user.upsert({
            where: { email: `${codigo.toLowerCase()}@legacy.com` },
            update: {},
            create: {
                email: `${codigo.toLowerCase()}@legacy.com`,
                name: `Gestor Legacy ${codigo}`,
                codigoGestor: codigo,
                role: 'cobrador',
                isActive: true,
            }
        });
    }
}

async function migrateClientes(clientesData: any[]) {
    console.log('--- 2. Migrando Clientes ---');
    for (const row of clientesData) {
        // Buscar si el cliente ya existe
        const existe = await prisma.cliente.findUnique({
            where: { codigoCliente: row.cod_cliente }
        });

        if (!existe) {
            // Intentar vincular gestor
            const gestor = await prisma.user.findFirst({
                where: { codigoGestor: row.codigo_gestor }
            });

            await prisma.cliente.create({
                data: {
                    codigoCliente: row.cod_cliente,
                    nombreCompleto: row.nombre_ccliente || 'Desconocido',
                    direccionCompleta: row.direccion || 'Sin dirección',
                    telefono: row.telefono,
                    vendedor: row.vendedor,
                    // Requisitos en el nuevo esquema (Agregamos valores por defecto seguros para legacy)
                    fechaVenta: new Date(row.fecha_alta || new Date()),
                    descripcionProducto: 'Producto Legacy',
                    diaPago: 'Lunes',
                    montoPago: 0,
                    periodicidad: 'semanal',
                    saldoActual: parseFloat(row.saldo_actualcli) || 0,
                    statusCuenta: row.status === 'ACTIVO' ? 'activo' : 'inactivo',
                    cobradorAsignadoId: gestor?.id, // se vincula automáticamente si se encontró
                }
            });
        }
    }
}

async function migrateTickets(ticketsData: any[]) {
    console.log('--- 3. Migrando Tickets ---');
    for (const row of ticketsData) {
        // Buscar al cliente relacionado
        const cliente = await prisma.cliente.findUnique({
            where: { codigoCliente: row.contrato } // contrato == cod_cliente
        });

        const gestor = await prisma.user.findFirst({
            where: { codigoGestor: row.codigo_gestor }
        });

        await prisma.ticket.upsert({
            where: { legacyId: row.id },
            update: {},
            create: {
                legacyId: row.id,
                monto: parseFloat(row.monto) || 0,
                referencia: row.referencia,
                folio: row.folio,
                fecha: row.fecha ? new Date(row.fecha) : null,
                creadoEn: row.creado_en ? new Date(row.creado_en) : new Date(),
                conciliado: Boolean(row.conciliado),
                concepto: row.concepto,
                cuentaOrigen: row.cuentaorigen,
                cuentaDestino: row.cuentadestino,
                clienteId: cliente?.id,
                gestorId: gestor?.id,
            }
        });
    }
}

async function migrateEstadoDeCuenta(estadoCuentaData: any[]) {
    console.log('--- 4. Migrando Estado de Cuenta (Bancos) ---');
    for (const row of estadoCuentaData) {
        const ticket = await prisma.ticket.findUnique({
            where: { legacyId: row.ticket_id }
        });

        const cliente = await prisma.cliente.findUnique({
            where: { codigoCliente: row.cod_cliente }
        });

        await prisma.movimientoBancario.upsert({
            where: { legacyId: row.id },
            update: {},
            create: {
                legacyId: row.id,
                bancoOrigen: row.banco_origen || row.bank || 'Desconocido',
                fechaOperacion: new Date(row.fecha_operacion),
                descripcionGeneral: row.descripcion_general,
                cargo: parseFloat(row.cargo) || null,
                abono: parseFloat(row.abono) || null,
                saldo: parseFloat(row.saldo) || null,
                referencia: row.referencia,
                claveRastreo: row.clave_rastreo,
                concepto: row.concepto,
                descripcionDetallada: row.descripcion_detallada,
                ticketId: ticket?.id,
                clienteId: cliente?.id,
            }
        });
    }
}

async function main() {
    console.log('Iniciando script de migración legacy a PostgreSQL...');

    await syncUsersAndGestores();

    // ==============================================================
    // AQUÍ VAMOS A PROCESAR LOS DATOS.
    // En producción se requiere extraer el array de JSONs desde el sql.
    // Ej: const clientes = await parseSqlToObjects(path.join(ANTERIOR_DIR, 'cat_clientes.sql'));
    // await migrateClientes(clientes);
    // ==============================================================

    console.log('Estructura del script finalizada. Listo para ingestar datos desde parseo u origen CSV.');
}

main()
    .catch((e) => {
        console.error('Error durante la migración:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
