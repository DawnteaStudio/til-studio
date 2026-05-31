import crypto from "node:crypto";

export function verifyGitHubSignature(input: {
  body: string;
  signature: string | null;
  secret: string;
}): boolean {
  if (!input.signature?.startsWith("sha256=")) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", input.secret).update(input.body).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(input.signature);

  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}
