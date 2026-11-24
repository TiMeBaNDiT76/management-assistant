import type { Services } from "../services/container";

/** tRPC request context: tenant + wired services. */
export interface TrpcContext {
  /** Tenant id from the verified Firebase JWT (empty string when unauthenticated). */
  ownerUserId: string;
  services: Services;
}
