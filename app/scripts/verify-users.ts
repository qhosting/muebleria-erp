
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando usuarios en la base de datos...\n');
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
    orderBy: {
      email: 'asc',
    },
  });

  if (users.length === 0) {
    console.log('❌ No se encontraron usuarios en la base de datos');
    return;
  }

  console.log(`✅ Se encontraron ${users.length} usuarios:\n`);
  
  users.forEach((user: typeof users[0], index: number) => {
    console.log(`${index + 1}. 👤 ${user.name}`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👔 Rol: ${user.role}`);
    console.log(`   ${user.isActive ? '✅' : '❌'} ${user.isActive ? 'Activo' : 'Inactivo'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });
