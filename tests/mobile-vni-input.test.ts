import { describe, expect, it } from "vitest";
import { applyVniInputEdit, typeWithVni } from "../mobile/src/lib/vni-input";

describe("mobile VNI input", () => {
  it.each([
    ["ban1 ca1", "bán cá"],
    ["tie61ng Vie65t", "tiếng Việt"],
    ["d9i", "đi"],
    ["truong72", "trường"],
    ["muo61n", "muốn"],
    ["goi1", "gói"],
    ["D9a8k", "Đăk"],
  ])("converts %s to %s", (input, expected) => {
    expect(typeWithVni(input)).toBe(expected);
  });

  it("keeps a digit when the word has no Vietnamese vowel target", () => {
    expect(typeWithVni("VPS2")).toBe("VPS2");
  });

  it("lets the user press the same tone digit twice to type a literal digit", () => {
    expect(typeWithVni("ban11")).toBe("ban1");
  });

  it("does not rewrite pasted text because conversion only follows one key edit", () => {
    expect(applyVniInputEdit("", "ban1")).toBe("ban1");
  });
});
