import { describe, it, expect } from "vitest";
import { UserError } from "@/lib/extraction/errors";

describe("UserError", () => {
  it("preserves message for user-facing display", () => {
    const e = new UserError("Report is too large");
    expect(e.message).toBe("Report is too large");
    expect(e.name).toBe("UserError");
  });

  it("is identifiable via instanceof for error routing", () => {
    const e: unknown = new UserError("x");
    expect(e instanceof UserError).toBe(true);
    expect(e instanceof Error).toBe(true);
  });

  it("is distinguishable from plain Error", () => {
    const u: unknown = new UserError("x");
    const plain: unknown = new Error("y");
    expect(u instanceof UserError).toBe(true);
    expect(plain instanceof UserError).toBe(false);
  });
});
