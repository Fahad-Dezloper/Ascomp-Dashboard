import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const projectorId = 'ae8f28b840be2a19e44e8255'
    const services = await prisma.serviceRecord.findMany({
        where: { projectorId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            serviceNumber: true,
            endTime: true,
            softwareVersion: true,
            screenHeight: true,
            createdAt: true
        }
    })
    console.log('Services for projector:', projectorId)
    console.log(JSON.stringify(services, null, 2))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
