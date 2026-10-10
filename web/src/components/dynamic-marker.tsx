import { connection } from "next/server";

/** Opts a subtree into request-time rendering under Cache Components.
 *  Used by private (/app) and token-addressed public routes, whose params are unknowable at build time. */
export async function DynamicMarker() {
  await connection();
  return null;
}
