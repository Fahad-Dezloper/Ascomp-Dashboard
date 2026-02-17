import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: false,
	async headers() {
		return [
			{
				source: "/((?!_next/static|_next/image|favicon|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg)$).*)",
				headers: [
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
				],
			},
		];
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**.public.blob.vercel-storage.com",
			},
			{
				protocol: "https",
				hostname: "dvazzolenhn0fdib.public.blob.vercel-storage.com",
			},
		],
	},
};

export default nextConfig;
