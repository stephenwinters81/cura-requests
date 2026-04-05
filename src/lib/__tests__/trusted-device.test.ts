import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

vi.mock("@/lib/db", () => ({
  prisma: {
    trustedDevice: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import {
  createTrustedDevice,
  verifyTrustedDeviceFromToken,
  revokeTrustedDevices,
  buildTrustCookieOptions,
  COOKIE_NAME,
} from "@/lib/trusted-device";
import { prisma } from "@/lib/db";

const mockCreate = vi.mocked(prisma.trustedDevice.create);
const mockFindUnique = vi.mocked(prisma.trustedDevice.findUnique);
const mockDelete = vi.mocked(prisma.trustedDevice.delete);
const mockDeleteMany = vi.mocked(prisma.trustedDevice.deleteMany);

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

describe("trusted-device", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({} as any);
    mockDelete.mockResolvedValue({} as any);
    mockDeleteMany.mockResolvedValue({ count: 0 } as any);
  });

  describe("COOKIE_NAME", () => {
    it("uses __Host- prefix for security", () => {
      expect(COOKIE_NAME).toBe("__Host-device-trust");
    });
  });

  describe("createTrustedDevice", () => {
    it("creates a device record and returns a token", async () => {
      const token = await createTrustedDevice("user-1", "Mozilla/5.0");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(20);

      expect(mockCreate).toHaveBeenCalledOnce();
      const createArg = mockCreate.mock.calls[0][0];
      expect(createArg.data.userId).toBe("user-1");
      expect(createArg.data.tokenHash).toBe(hashToken(token));
      expect(createArg.data.label).toBe("Mozilla/5.0");
      expect(createArg.data.expiresAt).toBeInstanceOf(Date);
      // Should expire ~30 days from now
      const diffDays =
        (new Date(createArg.data.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(29);
      expect(diffDays).toBeLessThan(31);
    });

    it("truncates long user agent strings", async () => {
      const longUA = "x".repeat(500);
      await createTrustedDevice("user-1", longUA);

      expect(mockCreate.mock.calls[0][0].data.label).toBe("x".repeat(200));
    });

    it("handles null user agent", async () => {
      await createTrustedDevice("user-1");

      expect(mockCreate.mock.calls[0][0].data.label).toBeNull();
    });
  });

  describe("verifyTrustedDeviceFromToken", () => {
    it("returns true for valid non-expired token", async () => {
      const token = "test-token-123";
      mockFindUnique.mockResolvedValue({
        id: "device-1",
        userId: "user-1",
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 86400000), // tomorrow
      } as any);

      const result = await verifyTrustedDeviceFromToken("user-1", token);

      expect(result).toBe(true);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { tokenHash: hashToken(token) },
      });
    });

    it("returns false for unknown token", async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await verifyTrustedDeviceFromToken("user-1", "unknown");

      expect(result).toBe(false);
    });

    it("returns false when userId does not match", async () => {
      mockFindUnique.mockResolvedValue({
        id: "device-1",
        userId: "user-2", // different user
        tokenHash: hashToken("token"),
        expiresAt: new Date(Date.now() + 86400000),
      } as any);

      const result = await verifyTrustedDeviceFromToken("user-1", "token");

      expect(result).toBe(false);
    });

    it("returns false and deletes expired token", async () => {
      mockFindUnique.mockResolvedValue({
        id: "device-1",
        userId: "user-1",
        tokenHash: hashToken("token"),
        expiresAt: new Date(Date.now() - 86400000), // yesterday
      } as any);

      const result = await verifyTrustedDeviceFromToken("user-1", "token");

      expect(result).toBe(false);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: "device-1" } });
    });
  });

  describe("revokeTrustedDevices", () => {
    it("deletes all trusted devices for a user", async () => {
      mockDeleteMany.mockResolvedValue({ count: 3 } as any);

      const count = await revokeTrustedDevices("user-1");

      expect(count).toBe(3);
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
    });
  });

  describe("buildTrustCookieOptions", () => {
    it("returns secure cookie options", () => {
      const opts = buildTrustCookieOptions();

      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe("lax");
      expect(opts.path).toBe("/");
      expect(opts.maxAge).toBe(30 * 24 * 60 * 60);
    });
  });
});
