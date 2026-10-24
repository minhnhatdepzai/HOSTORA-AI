import { describe, expect, it } from "vitest";
import { validatePublicUrl } from "@/lib/ssrf";

describe("website analyzer SSRF guard", () => {
  it.each([
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]",
  ])("blocks %s", async (url) => {
    await expect(validatePublicUrl(url)).rejects.toThrow();
  });
  it("accepts a public HTTPS host", async () => {
    await expect(
      validatePublicUrl("https://example.com"),
    ).resolves.toHaveProperty("hostname", "example.com");
  });
});
