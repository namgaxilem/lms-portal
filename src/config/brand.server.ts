import "server-only";
import { resolveBrand, type Brand } from "./brand";

/**
 * The brand for this deployment: defaults overridden by BRAND_* environment
 * variables. Read on the server during (dynamic) rendering, so one build can be
 * deployed for several schools with different env files.
 */
export function getBrand(): Brand {
  return resolveBrand(process.env);
}
