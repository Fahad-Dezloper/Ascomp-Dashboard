import { nextCookies } from "better-auth/next-js";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { inferAdditionalFields } from "better-auth/client/plugins";
import prisma from "./db";

const parseOrigin = (value?: string | null) => {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;

	try {
		return new URL(trimmed).origin;
	} catch {
		try {
			return new URL(`https://${trimmed}`).origin;
		} catch {
			return null;
		}
	}
};

const parseOriginList = (value?: string | null) =>
	(value ?? "")
		.split(",")
		.map((item) => parseOrigin(item))
		.filter((item): item is string => Boolean(item));

const trustedOrigins = Array.from(
	new Set([
		...parseOriginList(process.env.CORS_ORIGIN),
		parseOrigin(process.env.NEXT_PUBLIC_APP_URL),
		parseOrigin(process.env.BETTER_AUTH_URL),
		parseOrigin(process.env.APP_URL),
		parseOrigin(process.env.VERCEL_URL),
		parseOrigin(process.env.VERCEL_BRANCH_URL),
		parseOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
		"http://localhost:3000",
		// Allow v0 preview URLs
		"https://vusercontent.net",
	]),
);

export const auth: any = betterAuth<BetterAuthOptions>({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	trustedOrigins,
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
			},
			pvrAccess: {
				type: "string",
				required: false,
				returned: true,
			}
		},
	},
	plugins: [nextCookies(), inferAdditionalFields<typeof auth>()],
});

