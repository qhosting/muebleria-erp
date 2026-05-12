
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.producto.deleteMany({});
  console.log(`Se eliminaron ${deleted.count} productos.`);
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
