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
	// In development, disable strict origin checking to allow v0 preview URLs
	if (process.env.NODE_ENV === "development") {
		return [];
	}

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

// Global singleton to ensure auth is only instantiated once
declare global {
	var __auth__: any;
}

function createAuthInstance() {
	if (global.__auth__) {
		return global.__auth__;
	}

	global.__auth__ = betterAuth<BetterAuthOptions>({
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

	return global.__auth__;
}

export const auth = createAuthInstance();
