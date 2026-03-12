
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rolesCount = await prisma.user.groupBy({
    by: ['role'],
    _count: {
      id: true
    }
  });
  console.log(JSON.stringify(rolesCount, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
