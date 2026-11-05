import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const mobileSource = path.join(root, "mobile/src");

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return tsxFiles(target);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [target] : [];
  });
}

describe("mobile keyboard layout", () => {
  it("resizes every routed screen above the Android keyboard", () => {
    const app = JSON.parse(
      readFileSync(path.join(root, "mobile/app.json"), "utf8"),
    ) as { expo: { android: { softwareKeyboardLayoutMode?: string } } };
    const rootLayout = readFileSync(
      path.join(mobileSource, "app/_layout.tsx"),
      "utf8",
    );
    const keyboardSafeView = readFileSync(
      path.join(mobileSource, "components/keyboard-safe-view.tsx"),
      "utf8",
    );

    expect(app.expo.android.softwareKeyboardLayoutMode).toBe("resize");
    expect(rootLayout).toContain("<KeyboardSafeView>");
    expect(rootLayout).toMatch(/<KeyboardSafeView>[\s\S]*<Stack/);
    expect(keyboardSafeView).toContain(
      'Platform.OS === "ios" ? "padding" : "height"',
    );
  });

  it("keeps input modals above the keyboard in their own native window", () => {
    const missing = tsxFiles(mobileSource)
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return source.includes("<Modal") && source.includes("<TextInput");
      })
      .filter(
        (file) => !readFileSync(file, "utf8").includes("<KeyboardSafeView"),
      )
      .map((file) => path.relative(root, file));

    expect(missing).toEqual([]);
  });

  it("gives every cinematic form sensible keyboard tap and drag defaults", () => {
    const ui = readFileSync(
      path.join(mobileSource, "components/ui.tsx"),
      "utf8",
    );
    expect(ui).toContain('keyboardShouldPersistTaps="handled"');
    expect(ui).toContain('keyboardDismissMode="on-drag"');
  });
});
