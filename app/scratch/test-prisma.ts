
import { prisma } from '../lib/db';

async function test() {
    try {
        const count = await (prisma as any).documentoBoveda.count();
        console.log('DocumentoBoveda count:', count);
    } catch (e: any) {
        console.error('Error:', e.message);
    } finally {
        process.exit();
    }
}

test();
