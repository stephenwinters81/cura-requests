import { describe, it, expect } from "vitest";
import { passwordChangeSchema } from "@/lib/validation";

describe("passwordChangeSchema", () => {
  const valid = {
    currentPassword: "OldPass123",
    newPassword: "NewPass456",
    confirmPassword: "NewPass456",
  };

  it("accepts valid input", () => {
    const result = passwordChangeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects empty current password", () => {
    const result = passwordChangeSchema.safeParse({
      ...valid,
      currentPassword: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password shorter than 8 characters", () => {
    const result = passwordChangeSchema.safeParse({
      ...valid,
      newPassword: "Ab1",
      confirmPassword: "Ab1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password without uppercase", () => {
    const result = passwordChangeSchema.safeParse({
      ...valid,
      newPassword: "newpass456",
      confirmPassword: "newpass456",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password without lowercase", () => {
    const result = passwordChangeSchema.safeParse({
      ...valid,
      newPassword: "NEWPASS456",
      confirmPassword: "NEWPASS456",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password without a number", () => {
    const result = passwordChangeSchema.safeParse({
      ...valid,
      newPassword: "NewPassABC",
      confirmPassword: "NewPassABC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched confirm password", () => {
    const result = passwordChangeSchema.safeParse({
      ...valid,
      confirmPassword: "Different456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("confirmPassword");
    }
  });

  it("rejects new password same as current password", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "SamePass123",
      newPassword: "SamePass123",
      confirmPassword: "SamePass123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("newPassword");
    }
  });

  it("rejects empty confirm password", () => {
    const result = passwordChangeSchema.safeParse({
      ...valid,
      confirmPassword: "",
    });
    expect(result.success).toBe(false);
  });
});
