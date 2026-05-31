import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyGitHubSignature } from "@/lib/github/webhook";

describe("GitHub webhook signatures", () => {
  it("accepts a valid sha256 signature", () => {
    const body = JSON.stringify({ ref: "refs/heads/main" });
    const secret = "test-secret";
    const signature =
      "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyGitHubSignature({ body, secret, signature })).toBe(true);
  });

  it("rejects missing and invalid signatures", () => {
    expect(
      verifyGitHubSignature({
        body: "{}",
        secret: "test-secret",
        signature: null,
      }),
    ).toBe(false);
    expect(
      verifyGitHubSignature({
        body: "{}",
        secret: "test-secret",
        signature: "sha256=invalid",
      }),
    ).toBe(false);
  });
});
