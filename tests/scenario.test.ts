import { describe, expect, it } from "vitest";
import { simulateFlashSale } from "@/lib/scenario";

describe("flash sale simulator", () => {
  it("applies multiplier only within the selected window", () => {
    const data = simulateFlashSale(3600, 5, 2);
    expect(data).toHaveLength(12);
    expect(data[3].sale).toBe(data[3].baseline * 5);
    expect(data[5].sale).toBe(data[5].baseline);
  });
});
