/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: To manage users, enable/disable login providers
 * (Google, GitHub, etc.), change app branding, or configure OAuth credentials,
 * use the Auth pane in the workspace toolbar. There is no external Clerk
 * dashboard — all auth configuration is done through the Auth pane.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */

import { createProxyMiddleware } from "http-proxy-middleware";
import type { RequestHandler } from "express";

const DEFAULT_CLERK_FAPI = "https://rapid-moth-56.clerk.accounts.dev";
export const CLERK_PROXY_PATH = "/api/__clerk";

export function clerkProxyMiddleware(): RequestHandler {
  // Only run proxy in production — Clerk proxying doesn't work for dev instances
  if (process.env.NODE_ENV !== "production") {
    return (_req, _res, next) => next();
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return (_req, _res, next) => next();
  }

  const fapiTarget = process.env.CLERK_FAPI_URL || DEFAULT_CLERK_FAPI;

  return createProxyMiddleware({
    target: fapiTarget,
    changeOrigin: true,
    pathRewrite: (path: string) =>
      path.replace(new RegExp(`^${CLERK_PROXY_PATH}`), ""),
    on: {
      proxyReq: (proxyReq, req) => {
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const host = req.headers.host || "";
        const proxyUrl = `${protocol}://${host}${CLERK_PROXY_PATH}`;

        // Add debugging logs
        console.log(`[DEBUG] Proxy Outgoing: ${proxyUrl}`);
        console.log(`[DEBUG] Key Type: ${secretKey.startsWith("sk_test") ? "TEST (Development)" : "LIVE (Production)"}`);

        proxyReq.setHeader("Clerk-Proxy-Url", proxyUrl);
        proxyReq.setHeader("Clerk-Secret-Key", secretKey);
        
        // Sni/Host normalization
        if (fapiTarget.includes("accounts.dev") || fapiTarget.includes("clerk.dev")) {
          const targetHost = new URL(fapiTarget).host;
          proxyReq.setHeader("Host", targetHost);
        }

        const xff = req.headers["x-forwarded-for"];
        const clientIp =
          (Array.isArray(xff) ? xff[0] : xff)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "";
        if (clientIp) {
          proxyReq.setHeader("X-Forwarded-For", clientIp);
        }
      },
      proxyRes: (proxyRes, req, res) => {
        // Ensure Set-Cookie headers are preserved and modified if necessary
        const cookies = proxyRes.headers["set-cookie"];
        if (cookies) {
          proxyRes.headers["set-cookie"] = cookies.map((cookie) => 
            cookie.replace(/Domain=[^;]+;?/i, "") // Let the browser handle the domain
          );
        }
      },
    },
    // Fix for some Vercel/Node versions regarding session affinity
    xfwd: true,
  }) as RequestHandler;
}
