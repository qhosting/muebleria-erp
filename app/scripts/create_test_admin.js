
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  const password = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { email: 'test-admin@qhosting.net' },
    update: { password, role: 'admin' },
    create: {
      email: 'test-admin@qhosting.net',
      name: 'Test Admin',
      password,
      role: 'admin'
    }
  });
  console.log('Admin de prueba creado exitosamente');
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
