
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Helper: Parse Santander CSV
function parseSantander(csvText: string): any[] {
    const lines = csvText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Santander CSV is comma-separated with quoted fields sometimes
        // Columns: Cuenta,Fecha,Hora,Sucursal,Descripcion,Cargo/Abono,Importe,Saldo,Referencia,Concepto,Banco Participante,...,Clave de Rastreo
        const parts = splitCSVLine(line);
        if (parts.length < 20) continue;

        const cargoAbono = clean(parts[5]); // + = abono, - = cargo
        if (cargoAbono !== '+') continue; // Solo importamos ingresos

        const fechaRaw = clean(parts[1]); // '17022026' -> ddmmyyyy
        const horaRaw = clean(parts[2]);  // '22:04'
        const importe = parseFloat(clean(parts[6])) || 0;
        const saldo = parseFloat(clean(parts[7])) || 0;
        const referencia = clean(parts[8]);
        const concepto = clean(parts[9]);
        const bancoParticipante = clean(parts[10]);
        const claveRastreo = clean(parts[19]);
        const descripcion = clean(parts[4]);
        const nombreOrdenante = clean(parts[14]);

        // Parse fecha ddmmyyyy
        let fechaOperacion: Date;
        try {
            const day = parseInt(fechaRaw.substring(0, 2));
            const month = parseInt(fechaRaw.substring(2, 4)) - 1;
            const year = parseInt(fechaRaw.substring(4, 8));
            fechaOperacion = new Date(year, month, day);
        } catch {
            continue;
        }

        // Parse hora
        let horaOperacion: string | null = null;
        if (horaRaw && horaRaw.includes(':')) {
            horaOperacion = horaRaw.length === 5 ? horaRaw + ':00' : horaRaw;
        }

        const descripcionDetallada = `${descripcion} | Concepto: ${concepto} | Origen: ${nombreOrdenante} (${bancoParticipante})`;

        records.push({
            bancoOrigen: bancoParticipante?.trim() || 'SANTANDER',
            fechaOperacion,
            horaOperacion,
            descripcionGeneral: descripcion,
            cargo: 0,
            abono: importe,
            saldo,
            referencia,
            claveRastreo: claveRastreo?.trim() || null,
            concepto: concepto?.trim() || null,
            descripcionDetallada,
        });
    }

    return records;
}

// Helper: Parse Banorte CSV
function parseBanorte(csvText: string): any[] {
    const lines = csvText.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Banorte: CUENTA,FECHA DE OPERACIÓN,FECHA,REFERENCIA,DESCRIPCIÓN,COD. TRANSAC,SUCURSAL,DEPÓSITOS,RETIROS,SALDO,MOVIMIENTO,DESCRIPCIÓN DETALLADA,CHEQUE
        const parts = splitCSVLine(line);
        if (parts.length < 12) continue;

        const cuenta = clean(parts[0]);
        if (!cuenta) continue; // Skip empty rows

        const fechaStr = clean(parts[1]); // dd/mm/yyyy
        const referencia = clean(parts[3]);
        const descripcion = clean(parts[4]);
        const depositoStr = clean(parts[7]);
        const retiroStr = clean(parts[8]);
        const saldoStr = clean(parts[9]);
        const descripcionDetallada = clean(parts[11]);

        // Parse deposito amount (remove $, commas)
        const deposito = parseFloat(depositoStr.replace(/[$,]/g, '')) || 0;
        if (deposito <= 0) continue; // Solo importamos ingresos

        const retiro = parseFloat(retiroStr.replace(/[$,]/g, '')) || 0;
        const saldo = parseFloat(saldoStr.replace(/[$,"]/g, '')) || 0;

        // Parse fecha dd/mm/yyyy
        let fechaOperacion: Date;
        try {
            const [day, month, year] = fechaStr.split('/').map(Number);
            fechaOperacion = new Date(year, month - 1, day);
        } catch {
            continue;
        }

        // Extraer clave de rastreo y banco de la descripcion detallada
        let claveRastreo: string | null = null;
        let bancoOrigen = 'BANORTE';

        if (descripcionDetallada) {
            const matchRastreo = descripcionDetallada.match(/CVE RAST:\s*(\S+)/i);
            if (matchRastreo) claveRastreo = matchRastreo[1];

            const matchBanco = descripcionDetallada.match(/BCO:\d+\s+([^H]+?)(?:\s+HR)/i);
            if (matchBanco) bancoOrigen = matchBanco[1].trim();
        }

        // Extraer hora de la descripción detallada
        let horaOperacion: string | null = null;
        if (descripcionDetallada) {
            const matchHora = descripcionDetallada.match(/HR LIQ:\s*(\d{2}:\d{2}:\d{2})/i);
            if (matchHora) horaOperacion = matchHora[1];
        }

        records.push({
            bancoOrigen,
            fechaOperacion,
            horaOperacion,
            descripcionGeneral: descripcion,
            cargo: retiro,
            abono: deposito,
            saldo,
            referencia: referencia || null,
            claveRastreo,
            concepto: descripcion,
            descripcionDetallada: descripcionDetallada || descripcion,
        });
    }

    return records;
}

// Split CSV line handling quoted fields
function splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function clean(value: string): string {
    if (!value) return '';
    return value.replace(/^'+|'+$/g, '').trim();
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || !['admin', 'gestor_cobranza'].includes((session.user as any).role)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const banco = formData.get('banco') as string; // 'santander' | 'banorte'

        if (!file || !banco) {
            return NextResponse.json({ error: 'Archivo y banco son requeridos' }, { status: 400 });
        }

        const text = await file.text();
        let records: any[] = [];

        if (banco === 'santander') {
            records = parseSantander(text);
        } else if (banco === 'banorte') {
            records = parseBanorte(text);
        } else {
            return NextResponse.json({ error: 'Banco no soportado' }, { status: 400 });
        }

        if (records.length === 0) {
            return NextResponse.json({
                error: 'No se encontraron registros de ingresos (abonos) en el archivo',
                total: 0
            }, { status: 400 });
        }

        // Insertar en la base de datos, evitando duplicados por claveRastreo
        let insertados = 0;
        let duplicados = 0;
        let errores = 0;

        for (const record of records) {
            try {
                // Check for duplicates by claveRastreo if it exists
                if (record.claveRastreo) {
                    const existing = await (prisma as any).movimientoBancario.findFirst({
                        where: { claveRastreo: record.claveRastreo }
                    });
                    if (existing) {
                        duplicados++;
                        continue;
                    }
                }

                await (prisma as any).movimientoBancario.create({
                    data: {
                        bancoOrigen: record.bancoOrigen,
                        fechaOperacion: record.fechaOperacion,
                        descripcionGeneral: record.descripcionGeneral,
                        cargo: record.cargo,
                        abono: record.abono,
                        saldo: record.saldo,
                        referencia: record.referencia,
                        claveRastreo: record.claveRastreo,
                        concepto: record.concepto,
                        descripcionDetallada: record.descripcionDetallada,
                    }
                });
                insertados++;
            } catch (err) {
                console.error('Error insertando movimiento:', err);
                errores++;
            }
        }

        return NextResponse.json({
            success: true,
            banco: banco.toUpperCase(),
            total: records.length,
            insertados,
            duplicados,
            errores,
            mensaje: `Se importaron ${insertados} movimientos de ${banco.toUpperCase()}. ${duplicados} duplicados omitidos.`
        });

    } catch (error) {
        console.error('Error al importar estado de cuenta:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
