import prisma from './src/lib/db'
async function main() {
  const config = await prisma.formConfiguration.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
  const uvFilter = Array.isArray(config?.config) ? config?.config.find((c: any) => c.key === 'uvFilter') : null
  console.log(JSON.stringify(uvFilter, null, 2))
}
main().finally(() => prisma.$disconnect())
