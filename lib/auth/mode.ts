/** Vercel always runs with hosted access controls, including preview deployments. */
export function isHostedMode(): boolean {
  return process.env.VERCEL === "1" || process.env.TIL_STUDIO_MODE === "hosted";
}
