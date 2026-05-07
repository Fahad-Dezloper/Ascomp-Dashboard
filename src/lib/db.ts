import { PrismaClient, Role, ServiceStatus } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
	prisma?: PrismaClient;
};

/** Delegate missing when the singleton was created before `prisma generate` picked up ServiceAssignmentRequest. */
function isStaleClient(client: PrismaClient): boolean {
	return !(
		client as unknown as { serviceAssignmentRequest?: unknown }
	).serviceAssignmentRequest;
}

let productionClient: PrismaClient | undefined;

function getPrismaSingleton(): PrismaClient {
	if (process.env.NODE_ENV !== "production") {
		const existing = globalForPrisma.prisma;
		if (existing && isStaleClient(existing)) {
			void existing.$disconnect().catch(() => undefined);
			delete globalForPrisma.prisma;
		}
		if (!globalForPrisma.prisma) {
			globalForPrisma.prisma = new PrismaClient();
		}
		return globalForPrisma.prisma;
	}

	if (productionClient && isStaleClient(productionClient)) {
		void productionClient.$disconnect().catch(() => undefined);
		productionClient = undefined;
	}
	if (!productionClient) {
		productionClient = new PrismaClient();
	}
	return productionClient;
}

/**
 * Proxy so every use of `prisma.foo` goes through a fresh staleness check. Fixes dev HMR / "generate
 * after start" leaving a PrismaClient without `serviceAssignmentRequest` on the cached export.
 */
const prisma = new Proxy({} as PrismaClient, {
	get(_target, prop, receiver) {
		const client = getPrismaSingleton();
		const value = Reflect.get(client, prop, receiver);
		if (typeof value === "function") {
			return value.bind(client);
		}
		return value;
	},
});

export default prisma;
export { Role, ServiceStatus };
