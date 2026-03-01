import { nextCookies } from "better-auth/next-js";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { inferAdditionalFields } from "better-auth/client/plugins";
import prisma from "./db";

export const auth: any = betterAuth<BetterAuthOptions>({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	trustedOrigins: process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : ["http://localhost:3000"],
	emailAndPassword: {
		enabled: true,
	},
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: false,
				returned: true,
			},
			accessLevel: {
				type: "string",
				required: false,
				returned: true,
			}
		},
	},
	plugins: [nextCookies(), inferAdditionalFields<typeof auth>()],
});

