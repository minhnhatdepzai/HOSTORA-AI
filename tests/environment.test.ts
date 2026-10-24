import { describe, expect, it } from "vitest";

describe("HOSTORA AI development environment", () => {
  it("runs on the required Node.js major version", () => {
    const major = Number.parseInt(
      process.versions.node.split(".")[0] ?? "0",
      10,
    );

    expect(major).toBeGreaterThanOrEqual(22);
  });

  it("supports modern JavaScript runtime features", async () => {
    const value = await Promise.resolve({ ready: true });

    expect(value).toEqual({ ready: true });
  });
});
