import { createHash } from "node:crypto";

export const SESSION_COOKIE = "kargo_session";

/** Optional single-password gate. If DASHBOARD_PASSWORD is unset, the app is open. */
export function passwordEnabled() {
  return !!process.env.DASHBOARD_PASSWORD;
}

export function sessionToken() {
  return createHash("sha256").update(`kargo-hiring:${process.env.DASHBOARD_PASSWORD ?? ""}`).digest("hex");
}
