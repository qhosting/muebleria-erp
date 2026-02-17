
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const userCount = await prisma.user.count()
        console.log(`Connection successful. User count: ${userCount}`)
    } catch (error: any) {
        console.error('--- DB CONNECTION ERROR ---')
        console.error('Message:', error.message)
        console.error('Code:', error.code)
        console.error('--- END ERROR ---')
    } finally {
        await prisma.$disconnect()
    }
}

main()
