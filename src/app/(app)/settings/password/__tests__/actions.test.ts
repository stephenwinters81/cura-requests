import { describe, it, expect, vi, beforeEach } from "vitest";
import { hash } from "bcryptjs";

// Mock dependencies before importing the action
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    trustedDevice: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { changePassword } from "../actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const mockAuth = vi.mocked(auth);
const mockFindUnique = vi.mocked(prisma.user.findUnique);
const mockUpdate = vi.mocked(prisma.user.update);
const mockLogAudit = vi.mocked(logAudit);

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    fd.set(k, v);
  }
  return fd;
}

describe("changePassword server action", () => {
  const currentPassword = "OldPass123";
  let currentHash: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    currentHash = await hash(currentPassword, 4); // low cost for tests
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test", role: "staff" },
      expires: "",
    } as any);
    mockFindUnique.mockResolvedValue({ passwordHash: currentHash } as any);
    mockUpdate.mockResolvedValue({} as any);
    mockLogAudit.mockResolvedValue(undefined as any);
  });

  it("changes password with valid input", async () => {
    const fd = makeFormData({
      currentPassword,
      newPassword: "NewPass456",
      confirmPassword: "NewPass456",
    });

    const result = await changePassword(fd);

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdate.mock.calls[0][0].where).toEqual({ id: "user-1" });
    expect(mockUpdate.mock.calls[0][0].data.passwordHash).toBeDefined();
    expect(mockUpdate.mock.calls[0][0].data.passwordHash).not.toBe(currentHash);
    expect(mockLogAudit).toHaveBeenCalledWith(
      "user-1",
      "password_changed",
      "user",
      "user-1",
      "User changed their own password"
    );
  });

  it("rejects when not authenticated", async () => {
    mockAuth.mockResolvedValue(null as any);

    const fd = makeFormData({
      currentPassword,
      newPassword: "NewPass456",
      confirmPassword: "NewPass456",
    });

    await expect(changePassword(fd)).rejects.toThrow("Not authenticated");
  });

  it("returns error for invalid form data (weak password)", async () => {
    const fd = makeFormData({
      currentPassword,
      newPassword: "weak",
      confirmPassword: "weak",
    });

    const result = await changePassword(fd);

    expect(result.error).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns error when current password is wrong", async () => {
    const fd = makeFormData({
      currentPassword: "WrongPass999",
      newPassword: "NewPass456",
      confirmPassword: "NewPass456",
    });

    const result = await changePassword(fd);

    expect(result).toEqual({ error: "Current password is incorrect" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns error when passwords do not match", async () => {
    const fd = makeFormData({
      currentPassword,
      newPassword: "NewPass456",
      confirmPassword: "Different789",
    });

    const result = await changePassword(fd);

    expect(result.error).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns error when new password equals current password", async () => {
    const fd = makeFormData({
      currentPassword,
      newPassword: currentPassword,
      confirmPassword: currentPassword,
    });

    const result = await changePassword(fd);

    expect(result.error).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns error when user not found in DB", async () => {
    mockFindUnique.mockResolvedValue(null);

    const fd = makeFormData({
      currentPassword,
      newPassword: "NewPass456",
      confirmPassword: "NewPass456",
    });

    const result = await changePassword(fd);

    expect(result).toEqual({ error: "User not found" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
