const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.pago.count();
    console.log('Total pagos:', count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
