import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Read ' .env' file manually because it has a leading space
const envPath = path.join(__dirname, '..', ' .env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
      process.env[key] = val;
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  try {
    const clientCode = 'DP2605075';
    const client = await prisma.cliente.findFirst({
      where: {
        codigoCliente: clientCode
      }
    });

    if (!client) {
      console.log('Client not found');
      return;
    }

    console.log('Client found:', {
      id: client.id,
      nombreCompleto: client.nombreCompleto,
      codigoCliente: client.codigoCliente,
      periodicidad: client.periodicidad,
      montoPago: client.montoPago,
      fechaVenta: client.fechaVenta,
      saldoActual: client.saldoActual
    });

    if (client.estadoCuentaCache) {
      console.log('\n--- CACHE DATA ---');
      const cache = client.estadoCuentaCache as any;
      console.log('Cached At:', cache.cachedAt);
      
      const { data } = cache;
      if (data) {
        console.log('Cliente in Cache:', {
          montoFactura: data.cliente?.montoFactura,
          pagoInicial: data.cliente?.pagoInicial,
          deudaFinanciada: data.cliente?.deudaFinanciada,
          totalAbonosSubsecuentes: data.cliente?.totalAbonosSubsecuentes
        });

        console.log('\n--- DOCUMENTOS IN CACHE ---');
        const docs = data.estadoCuenta?.documentos || [];
        console.log(`Total documentos: ${docs.length}`);
        docs.forEach((doc: any, i: number) => {
          console.log(`[${i+1}] Concepto: ${doc.conceptoNombre || doc.cNombreConcepto || doc.cnombreconcepto || doc.CNOMBRECONCEPTO || 'N/A'} | Código Concepto: ${doc.codigoConcepto || doc.cCodigoConcepto} | Total: ${doc.cTotal || doc.ctotal || doc.total || doc.importe} | Saldo: ${doc.cSaldo || doc.csaldo || doc.saldo || doc.pendiente} | Fecha: ${doc.cFecha || doc.fecha}`);
        });

        console.log('\n--- TABLA AMORTIZACION IN CACHE ---');
        const tabla = data.cliente?.tablaAmortizacion || [];
        tabla.slice(0, 10).forEach((t: any) => {
          console.log(`Pago ${t.numPago}: Vence ${t.fechaVencimiento?.split('T')[0]} | Cuota ${t.monto} | Pagado ${t.pagado} | Pendiente ${t.pendiente} | Status ${t.status}`);
        });
      }
    } else {
      console.log('No cache found');
    }
  } catch (error: any) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
