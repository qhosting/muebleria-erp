import { prisma } from './lib/db';

async function testArqueo() {
  try {
    const count = await (prisma as any).arqueo.count();
    console.log('Arqueo count:', count);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('An unknown error occurred:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testArqueo();
