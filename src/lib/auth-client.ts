import { createAuthClient } from "better-auth/react";
import { nextCookies } from "better-auth/next-js";

export const authClient = createAuthClient({
	baseURL: typeof window !== 'undefined'
		? window.location.origin
		: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
	plugins: [nextCookies()],
});
