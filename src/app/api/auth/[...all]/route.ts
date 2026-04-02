import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handler = toNextJsHandler(auth.handler);

// Wrap the handlers to bypass origin validation for v0 preview URLs
async function withOriginBypass(req: NextRequest, isGet: boolean) {
	const origin = req.headers.get("origin");
	
	// If it's a v0 preview URL, temporarily allow it by modifying the host
	if (origin && origin.includes("vusercontent.net")) {
		// Create a clone with modified origin to bypass strict validation
		const headers = new Headers(req.headers);
		const baseUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		headers.set("origin", new URL(baseUrl).origin);
		
		const modifiedReq = new NextRequest(req, { headers });
		try {
			return isGet ? await (handler as any).GET(modifiedReq) : await (handler as any).POST(modifiedReq);
		} catch (error) {
			// If it fails, try with original origin
			return isGet ? await (handler as any).GET(req) : await (handler as any).POST(req);
		}
	}
	
	return isGet ? await (handler as any).GET(req) : await (handler as any).POST(req);
}

export async function GET(req: NextRequest) {
	return withOriginBypass(req, true);
}

export async function POST(req: NextRequest) {
	return withOriginBypass(req, false);
}
