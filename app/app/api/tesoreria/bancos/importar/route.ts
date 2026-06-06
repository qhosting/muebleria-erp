import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

function clean(value: any): string {
    if (value === undefined || value === null) return '';
    return String(value).replace(/^'+|'+$/g, '').trim();
}

function parseExcelTime(val: any): string | null {
    if (val instanceof Date) {
        const hours = String(val.getHours()).padStart(2, '0');
        const minutes = String(val.getMinutes()).padStart(2, '0');
        const seconds = String(val.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
    if (typeof val === 'number') {
        const totalSeconds = Math.round(val * 24 * 60 * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds].map(x => String(x).padStart(2, '0')).join(':');
    }
    const str = clean(val);
    if (str && str.includes(':')) {
        return str.length === 5 ? str + ':00' : str;
    }
    return null;
}

function parseExcelDate(val: any): Date | null {
    if (val instanceof Date) return val;
    if (typeof val === 'number') {
        // Excel base date is 1899-12-30 due to leap year bug in 1900
        return new Date(Math.round((val - 25569) * 86400 * 1000));
    }
    const str = clean(val);
    if (!str) return null;
    
    // Format ddmmyyyy (like '29052026') or dd/mm/yyyy
    if (str.length === 8 && /^\d+$/.test(str)) {
        const day = parseInt(str.substring(0, 2));
        const month = parseInt(str.substring(2, 4)) - 1;
        const year = parseInt(str.substring(4, 8));
        return new Date(year, month, day);
    }
    if (str.includes('/')) {
        const parts = str.split('/').map(Number);
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
}

// Helper: Parse Santander rows parsed from SheetJS
function parseSantander(rows: any[][]): any[] {
    if (rows.length < 2) return [];
    
    const headers = rows[0].map(h => clean(h).toUpperCase());
    const records: any[] = [];
    
    const colIdx = (name: string) => headers.indexOf(name);
    
    const idxCuenta = colIdx('CUENTA');
    const idxFecha = colIdx('FECHA');
    const idxHora = colIdx('HORA');
    const idxSucursal = colIdx('SUCURSAL');
    const idxDescripcion = colIdx('DESCRIPCION');
    const idxCargoAbono = colIdx('CARGO/ABONO');
    const idxImporte = colIdx('IMPORTE');
    const idxSaldo = colIdx('SALDO');
    const idxReferencia = colIdx('REFERENCIA');
    const idxConcepto = colIdx('CONCEPTO');
    const idxBancoParticipante = colIdx('BANCO PARTICIPANTE');
    const idxCtaOrdenante = colIdx('CTA ORDENANTE');
    const idxNombreOrdenante = colIdx('NOMBRE ORDENANTE');
    const idxRfcOrdenante = colIdx('RFC ORDENANTE');
    const idxClaveRastreo = colIdx('CLAVE DE RASTREO');
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.every(cell => cell === "")) continue;
        
        const cargoAbono = idxCargoAbono >= 0 ? clean(row[idxCargoAbono]) : '';
        if (cargoAbono !== '+') continue; // Solo abonos (ingresos)
        
        const importe = idxImporte >= 0 ? parseFloat(clean(row[idxImporte])) || 0 : 0;
        if (importe <= 0) continue;
        
        const saldo = idxSaldo >= 0 ? parseFloat(clean(row[idxSaldo])) || 0 : 0;
        const referencia = idxReferencia >= 0 ? clean(row[idxReferencia]) : '';
        const concepto = idxConcepto >= 0 ? clean(row[idxConcepto]) : '';
        const bancoParticipante = idxBancoParticipante >= 0 ? clean(row[idxBancoParticipante]) : '';
        const claveRastreo = idxClaveRastreo >= 0 ? clean(row[idxClaveRastreo]) : '';
        const descripcion = idxDescripcion >= 0 ? clean(row[idxDescripcion]) : '';
        const nombreOrdenante = idxNombreOrdenante >= 0 ? clean(row[idxNombreOrdenante]) : '';
        const ctaOrdenante = idxCtaOrdenante >= 0 ? clean(row[idxCtaOrdenante]) : '';
        const rfcOrdenante = idxRfcOrdenante >= 0 ? clean(row[idxRfcOrdenante]) : '';
        const cuentaDestino = idxCuenta >= 0 ? clean(row[idxCuenta]) : '';
        
        const fechaRaw = idxFecha >= 0 ? row[idxFecha] : null;
        const fechaOperacion = parseExcelDate(fechaRaw);
        if (!fechaOperacion) continue;
        
        const horaRaw = idxHora >= 0 ? row[idxHora] : null;
        const horaOperacion = parseExcelTime(horaRaw);
        
        let clabeEmisor: string | null = null;
        let cuentaEmisor: string | null = null;
        if (ctaOrdenante) {
            if (ctaOrdenante.length === 18) {
                clabeEmisor = ctaOrdenante;
            } else {
                cuentaEmisor = ctaOrdenante;
            }
        }
        
        const descripcionDetallada = `${descripcion} | Concepto: ${concepto} | Origen: ${nombreOrdenante} (${bancoParticipante}) | RFC: ${rfcOrdenante} | CLABE/Cta: ${ctaOrdenante} | Banco Destino: SANTANDER | Cuenta Destino: ${cuentaDestino}`;
        
        records.push({
            bancoOrigen: bancoParticipante || 'SANTANDER',
            fechaOperacion,
            horaOperacion,
            descripcionGeneral: descripcion,
            cargo: 0,
            abono: importe,
            saldo,
            referencia: referencia || null,
            claveRastreo: claveRastreo || null,
            concepto: concepto || null,
            descripcionDetallada,
            clabeEmisor,
            cuentaEmisor,
        });
    }
    
    return records;
}

// Helper: Parse Banorte rows parsed from SheetJS
function parseBanorte(rows: any[][]): any[] {
    if (rows.length < 2) return [];
    
    const headers = rows[0].map(h => clean(h).toUpperCase());
    const records: any[] = [];
    
    const colIdx = (name: string) => headers.indexOf(name);
    
    const idxCuenta = colIdx('CUENTA');
    const idxFechaOperacion = colIdx('FECHA DE OPERACIÓN');
    const idxReferencia = colIdx('REFERENCIA');
    const idxDescripcion = colIdx('DESCRIPCIÓN');
    const idxDepositos = colIdx('DEPÓSITOS');
    const idxRetiros = colIdx('RETIROS');
    const idxSaldo = colIdx('SALDO');
    const idxDescripcionDetallada = colIdx('DESCRIPCIÓN DETALLADA');
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.every(cell => cell === "")) continue;
        
        const cuenta = idxCuenta >= 0 ? clean(row[idxCuenta]) : '';
        if (!cuenta) continue;
        
        const depositoStr = idxDepositos >= 0 ? clean(row[idxDepositos]) : '';
        const deposito = parseFloat(depositoStr.replace(/[$,]/g, '')) || 0;
        if (deposito <= 0) continue; // Solo abonos
        
        const retiroStr = idxRetiros >= 0 ? clean(row[idxRetiros]) : '';
        const retiro = parseFloat(retiroStr.replace(/[$,]/g, '')) || 0;
        
        const saldoStr = idxSaldo >= 0 ? clean(row[idxSaldo]) : '';
        const saldo = parseFloat(saldoStr.replace(/[$,"]/g, '')) || 0;
        
        const referencia = idxReferencia >= 0 ? clean(row[idxReferencia]) : '';
        const descripcion = idxDescripcion >= 0 ? clean(row[idxDescripcion]) : '';
        const descripcionDetallada = idxDescripcionDetallada >= 0 ? clean(row[idxDescripcionDetallada]) : '';
        
        const fechaRaw = idxFechaOperacion >= 0 ? row[idxFechaOperacion] : null;
        const fechaOperacion = parseExcelDate(fechaRaw);
        if (!fechaOperacion) continue;
        
        let claveRastreo: string | null = null;
        let bancoOrigen = 'BANORTE';
        let horaOperacion: string | null = null;
        let clabeEmisor: string | null = null;
        let cuentaEmisor: string | null = null;
        let nombreOrdenante: string | null = null;
        let rfcOrdenante: string | null = null;
        let concepto = descripcion;
        
        if (descripcionDetallada) {
            const matchRastreo = descripcionDetallada.match(/CVE RAST:\s*(\S+)/i);
            if (matchRastreo) claveRastreo = matchRastreo[1];
            
            const matchBanco = descripcionDetallada.match(/BCO:\d+\s+([^H,]+?)(?:\s+HR|,|$)/i);
            if (matchBanco) bancoOrigen = matchBanco[1].trim();
            
            const matchHora = descripcionDetallada.match(/HR LIQ:\s*(\d{2}:\d{2}:\d{2})/i);
            if (matchHora) horaOperacion = matchHora[1];
            
            const matchClabe = descripcionDetallada.match(/(?:CLABE|DE LA CLABE)\s*(\d{18})/i);
            if (matchClabe) clabeEmisor = matchClabe[1];
            
            const matchCliente = descripcionDetallada.match(/(?:DEL CLIENTE|ORDENANTE)\s+([^,]+)/i);
            if (matchCliente) nombreOrdenante = matchCliente[1].trim();
            
            const matchRfc = descripcionDetallada.match(/RFC\s*([A-Z0-9]{10,13})/i);
            if (matchRfc) rfcOrdenante = matchRfc[1];
            
            const matchConcepto = descripcionDetallada.match(/CONCEPTO:\s*([^,]+)/i);
            if (matchConcepto) concepto = matchConcepto[1].trim();
        }
        
        const fullDescripcionDetallada = `${descripcionDetallada} | Banco Destino: BANORTE | Cuenta Destino: ${cuenta}`;
        
        records.push({
            bancoOrigen,
            fechaOperacion,
            horaOperacion,
            descripcionGeneral: concepto,
            cargo: retiro,
            abono: deposito,
            saldo,
            referencia: referencia || null,
            claveRastreo: claveRastreo || null,
            concepto: concepto || null,
            descripcionDetallada: fullDescripcionDetallada,
            clabeEmisor,
            cuentaEmisor,
        });
    }
    
    return records;
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

        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse to JSON array of arrays (header: 1)
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        
        let records: any[] = [];

        if (banco === 'santander') {
            records = parseSantander(rows);
        } else if (banco === 'banorte') {
            records = parseBanorte(rows);
        } else {
            return NextResponse.json({ error: 'Banco no soportado' }, { status: 400 });
        }

        if (records.length === 0) {
            return NextResponse.json({
                error: 'No se encontraron registros de ingresos (abonos) en el archivo',
                total: 0
            }, { status: 400 });
        }

        // Insertar en la base de datos, evitando duplicados por claveRastreo o datos de la transacción
        let insertados = 0;
        let duplicados = 0;
        let errores = 0;

        for (const record of records) {
            try {
                // Verificar duplicado por clave de rastreo (única en SPEI)
                if (record.claveRastreo) {
                    const existing = await (prisma as any).movimientoBancario.findFirst({
                        where: { claveRastreo: record.claveRastreo }
                    });
                    if (existing) {
                        duplicados++;
                        continue;
                    }
                } else {
                    // Fallback para depósitos sin clave de rastreo (ej. depósito directo en efectivo)
                    // Evitar duplicar validando fecha, abono, referencia y concepto general
                    const existing = await (prisma as any).movimientoBancario.findFirst({
                        where: {
                            fechaOperacion: record.fechaOperacion,
                            abono: record.abono,
                            referencia: record.referencia || null,
                            concepto: record.concepto || null,
                            descripcionGeneral: record.descripcionGeneral || null
                        }
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
                        horaOperacion: record.horaOperacion ? new Date(`1970-01-01T${record.horaOperacion}Z`) : null,
                        descripcionGeneral: record.descripcionGeneral,
                        cargo: record.cargo,
                        abono: record.abono,
                        saldo: record.saldo,
                        referencia: record.referencia,
                        claveRastreo: record.claveRastreo,
                        concepto: record.concepto,
                        descripcionDetallada: record.descripcionDetallada,
                        clabeEmisor: record.clabeEmisor,
                        cuentaEmisor: record.cuentaEmisor,
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
