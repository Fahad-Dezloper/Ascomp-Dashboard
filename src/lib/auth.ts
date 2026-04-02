import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
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

function getTrustedOrigins() {
	const origins = new Set<string>();
	
	// Add configured origins
	parseOriginList(process.env.CORS_ORIGIN).forEach(o => origins.add(o));
	const appUrl = parseOrigin(process.env.NEXT_PUBLIC_APP_URL);
	if (appUrl) origins.add(appUrl);
	const authUrl = parseOrigin(process.env.BETTER_AUTH_URL);
	if (authUrl) origins.add(authUrl);
	const appUrlAlt = parseOrigin(process.env.APP_URL);
	if (appUrlAlt) origins.add(appUrlAlt);
	const vercelUrl = parseOrigin(process.env.VERCEL_URL);
	if (vercelUrl) origins.add(vercelUrl);
	const vercelBranchUrl = parseOrigin(process.env.VERCEL_BRANCH_URL);
	if (vercelBranchUrl) origins.add(vercelBranchUrl);
	const vercelProdUrl = parseOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
	if (vercelProdUrl) origins.add(vercelProdUrl);
	
	// Always allow localhost
	origins.add("http://localhost:3000");
	origins.add("http://localhost:3001");
	origins.add("http://localhost:8000");
	
	// Allow v0 preview URLs
	origins.add("https://vusercontent.net");
	
	return Array.from(origins);
}

// Create auth instance once and cache it
// This prevents Better Auth from being imported multiple times
declare global {
	var _authInstance: any;
}

function createAuthInstance() {
	if (global._authInstance) return global._authInstance;

	global._authInstance = betterAuth<BetterAuthOptions>({
		database: prismaAdapter(prisma, {
			provider: "postgresql",
		}),
		baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
		trustedOrigins: getTrustedOrigins(),
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
	});

	return global._authInstance;
}

export const auth = createAuthInstance();

