import { PrismaClient } from '@prisma/client';
import { getContpaqiService } from '../lib/contpaqi-service';

const dbUrl = 'postgres://postgres:d0a4221856f4ba5ea1ec@212.56.42.193:1080/dasoplus-db?sslmode=disable';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  console.log('🔍 CONSULTANDO CONFIGURACIÓN DE CONTPAQI EN BASE DE DATOS...\n');

  const config = await prisma.configuracionSistema.findUnique({
    where: { clave: 'sistema' },
  });

  console.log('Configuración ContPAQi en DB:', JSON.stringify(config?.contpaqi, null, 2));

  console.log('\n------------------------------------------------------');
  console.log('🧪 PROBANDO CONEXIÓN A CONTPAQI SERVICE...');
  console.log('------------------------------------------------------');

  try {
    const serviceDP = await getContpaqiService(prisma, 'DP');
    console.log('Instancia DP creada con config:', (serviceDP as any).config);

    console.log('\n1. Probando ping / health / metadata en ContPAQi...');
    const metadata = await serviceDP.getMetadata().catch(e => ({ error: e.message }));
    console.log('Resultado Metadata:', metadata);

    console.log('\n2. Probando obtener empresas...');
    const empresas = await serviceDP.getEmpresas().catch(e => ({ error: e.message }));
    console.log('Resultado Empresas:', empresas);

    console.log('\n3. Probando buscar cliente DP2608003 en ContPAQi...');
    const clienteContpaqi = await (serviceDP as any).getClienteByCodigo?.('DP2608003').catch((e: any) => ({ error: e.message }));
    console.log('Resultado Cliente DP2608003:', clienteContpaqi);

    console.log('\n4. Probando estado de cuenta / saldo DP2608003...');
    const estadoCuenta = await (serviceDP as any).getEstadoCuenta?.('DP2608003').catch((e: any) => ({ error: e.message }));
    console.log('Resultado Estado de Cuenta DP2608003:', estadoCuenta);

  } catch (error: any) {
    console.error('❌ Error general probando Contpaqi:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
