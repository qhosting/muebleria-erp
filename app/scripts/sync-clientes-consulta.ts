import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const ADMIN_PHONE = '5214425060999@c.us';
const WAHA_URL = 'https://noweb.qhosting.net/api/sendText';
const WAHA_KEY = 'key_PDzXooo4V0WG0veQTUe3OGVWR31JnwgP';
const WAHA_SESSION = 'GMD8706';

async function enviarAlertaAdmin(errorMsg: string) {
    try {
        await fetch(WAHA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': WAHA_KEY
            },
            body: JSON.stringify({
                session: WAHA_SESSION,
                chatId: ADMIN_PHONE,
                text: `🚨 *ALERTA SISTEMA MUEBLERÍA DASO*\n\nError en la sincronización diaria de clientes ContPAQi para consultas n8n.\n\n❌ *Error:* ${errorMsg}\n⏰ *Hora:* ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}\n\nFavor de verificar el servidor ContPAQi.`
            })
        });
        console.log('🔔 Alerta enviada al administrador vía WhatsApp exitosamente.');
    } catch (e: any) {
        console.error('No se pudo enviar la alerta de WhatsApp al admin:', e.message);
    }
}

function limpiarTelefono(tel?: string | null): string {
    if (!tel) return '';
    return tel.replace(/\D/g, '');
}

async function sincronizarArchivo(filePath: string, empresa: 'DP' | 'DQ') {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
    }

    console.log(`📦 Leyendo datos de ${empresa} desde ${filePath}...`);
    let content = fs.readFileSync(filePath, 'utf-8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    const rawRecords: any[] = JSON.parse(content);
    console.log(`  -> ${rawRecords.length} registros leídos para ${empresa}.`);

    // Deduplicar por código de cliente
    const uniqueMap = new Map<string, any>();
    for (const r of rawRecords) {
        const cod = (r.codigo || '').trim().toUpperCase();
        if (!cod) continue;
        if (!uniqueMap.has(cod)) {
            uniqueMap.set(cod, { ...r, codigo: cod });
        } else {
            const existing = uniqueMap.get(cod);
            if (!existing.producto1 && r.producto1) existing.producto1 = r.producto1;
            if (!existing.calle && r.calle) existing.calle = r.calle;
            if (!existing.telefono1 && r.telefono1) existing.telefono1 = r.telefono1;
            if ((!existing.saldoActual || existing.saldoActual === 0) && r.saldoActual) {
                existing.saldoActual = r.saldoActual;
            }
        }
    }
    const records = Array.from(uniqueMap.values());
    console.log(`  -> ${records.length} clientes únicos tras deduplicación.`);

    const BATCH_SIZE = 500;
    let procesados = 0;


    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);

        const valuesSql: string[] = [];

        for (const c of batch) {
            const cod = (c.codigo || '').trim().replace(/'/g, "''");
            if (!cod) continue;

            const nom = (c.nombre || '').trim().replace(/'/g, "''");
            const calle = (c.calle || '').trim().replace(/'/g, "''");
            const noExt = (c.noExterior || '').trim().replace(/'/g, "''");
            const noInt = (c.noInterior || '').trim().replace(/'/g, "''");
            const col = (c.colonia || '').trim().replace(/'/g, "''");
            const mun = (c.municipio || '').trim().replace(/'/g, "''");
            const est = (c.estado || '').trim().replace(/'/g, "''");
            const dirComp = [calle, noExt ? `No. ${noExt}` : '', noInt ? `Int. ${noInt}` : '', col ? `Col. ${col}` : '', mun, est]
                .filter(Boolean)
                .join(', ')
                .replace(/'/g, "''");

            const tel = (c.telefono1 || '').trim().replace(/'/g, "''");
            const telLimpio = limpiarTelefono(c.telefono1);
            const tel2 = (c.telefono2 || '').trim().replace(/'/g, "''");
            const tel2Limpio = limpiarTelefono(c.telefono2);
            const aval = (c.aval || '').trim().replace(/'/g, "''");
            const tipo = c.tipo === 1 ? 'COBRANZA NORMAL' : 'CREDITO';
            const estatus = c.estatus === 1 ? 'ACTIVO' : 'INACTIVO';
            const saldo = parseFloat(String(c.saldoActual || 0)) || 0;
            const prod1 = (c.producto1 || '').trim().replace(/'/g, "''");

            valuesSql.push(`(
                gen_random_uuid()::text,
                '${cod}',
                '${empresa}',
                '${nom}',
                ${calle ? `'${calle}'` : 'NULL'},
                ${noExt ? `'${noExt}'` : 'NULL'},
                ${noInt ? `'${noInt}'` : 'NULL'},
                ${col ? `'${col}'` : 'NULL'},
                ${mun ? `'${mun}'` : 'NULL'},
                ${est ? `'${est}'` : 'NULL'},
                ${dirComp ? `'${dirComp}'` : 'NULL'},
                ${tel ? `'${tel}'` : 'NULL'},
                ${telLimpio ? `'${telLimpio}'` : 'NULL'},
                ${tel2 ? `'${tel2}'` : 'NULL'},
                ${tel2Limpio ? `'${tel2Limpio}'` : 'NULL'},
                ${aval ? `'${aval}'` : 'NULL'},
                '${tipo}',
                '${estatus}',
                ${saldo},
                ${prod1 ? `'${prod1}'` : 'NULL'},
                NOW(),
                NOW(),
                NOW()
            )`);
        }

        if (valuesSql.length > 0) {
            const query = `
                INSERT INTO clientes_consulta_bot (
                    "id",
                    "codigoCliente",
                    "empresa",
                    "nombreCliente",
                    "calle",
                    "numeroExterior",
                    "numeroInterior",
                    "colonia",
                    "municipio",
                    "estado",
                    "direccionCompleta",
                    "telefono",
                    "telefonoLimpio",
                    "telefono2",
                    "telefono2Limpio",
                    "ref2",
                    "tipoCliente",
                    "estatus",
                    "saldoActual",
                    "producto1",
                    "ultimaSincronizacion",
                    "createdAt",
                    "updatedAt"
                )
                VALUES ${valuesSql.join(',\n')}
                ON CONFLICT ("empresa", "codigoCliente")
                DO UPDATE SET
                    "nombreCliente" = EXCLUDED."nombreCliente",
                    "calle" = EXCLUDED."calle",
                    "numeroExterior" = EXCLUDED."numeroExterior",
                    "numeroInterior" = EXCLUDED."numeroInterior",
                    "colonia" = EXCLUDED."colonia",
                    "municipio" = EXCLUDED."municipio",
                    "estado" = EXCLUDED."estado",
                    "direccionCompleta" = EXCLUDED."direccionCompleta",
                    "telefono" = EXCLUDED."telefono",
                    "telefonoLimpio" = EXCLUDED."telefonoLimpio",
                    "telefono2" = EXCLUDED."telefono2",
                    "telefono2Limpio" = EXCLUDED."telefono2Limpio",
                    "ref2" = EXCLUDED."ref2",
                    "tipoCliente" = EXCLUDED."tipoCliente",
                    "estatus" = EXCLUDED."estatus",
                    "saldoActual" = EXCLUDED."saldoActual",
                    "producto1" = COALESCE(EXCLUDED."producto1", clientes_consulta_bot."producto1"),
                    "ultimaSincronizacion" = NOW(),
                    "updatedAt" = NOW();
            `;

            await prisma.$executeRawUnsafe(query);
            procesados += valuesSql.length;
            if (procesados % 5000 === 0 || procesados === records.length) {
                console.log(`  ✓ [${empresa}] Sincronizados ${procesados} de ${records.length} clientes...`);
            }
        }
    }

    console.log(`✅ [${empresa}] Sincronización completada exitosamente (${procesados} clientes).`);
}

async function main() {
    console.log('🚀 Iniciando proceso de sincronización de clientes ContPAQi -> muebleria-erp...');
    const basePath = path.resolve(__dirname, '../../scratch');
    const dpPath = path.join(basePath, 'clientes_dp.json');
    const dqPath = path.join(basePath, 'clientes_dq.json');

    try {
        await sincronizarArchivo(dpPath, 'DP');
        await sincronizarArchivo(dqPath, 'DQ');

        const totalEnBd = await prisma.clienteConsultaBot.count();
        console.log(`🎉 Sincronización finalizada con éxito. Total en base de datos: ${totalEnBd} clientes.`);
    } catch (err: any) {
        console.error('❌ Error durante la sincronización:', err);
        await enviarAlertaAdmin(err.message || String(err));
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
