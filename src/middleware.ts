import { proxy, config as proxyConfig } from "./proxy";
import type { NextRequest } from "next/server";

/**
 * Middleware oficial de Next.js (App Router).
 * Delega la ejecución y el RBAC a src/proxy.ts asegurando la ejecución perimetral.
 */
export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = proxyConfig;
