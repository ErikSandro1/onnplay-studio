import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

// Mock the database functions
vi.mock("./db", () => ({
  getMixerPresets: vi.fn(),
  getMixerPresetById: vi.fn(),
  createMixerPreset: vi.fn(),
  updateMixerPreset: vi.fn(),
  deleteMixerPreset: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("mixerPresets router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns presets for the authenticated user", async () => {
      const mockPresets = [
        {
          id: 1,
          userId: 1,
          name: "Default",
          channelLevels: { ch1: 75, ch2: 60 },
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.getMixerPresets).mockResolvedValue(mockPresets as any);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mixerPresets.list();

      expect(db.getMixerPresets).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockPresets);
    });
  });

  describe("get", () => {
    it("returns a specific preset by id", async () => {
      const mockPreset = {
        id: 1,
        userId: 1,
        name: "Default",
        channelLevels: { ch1: 75, ch2: 60 },
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getMixerPresetById).mockResolvedValue(mockPreset as any);

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mixerPresets.get({ id: 1 });

      expect(db.getMixerPresetById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockPreset);
    });
  });

  describe("create", () => {
    it("creates a new preset for the authenticated user", async () => {
      vi.mocked(db.createMixerPreset).mockResolvedValue({ id: 2 });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mixerPresets.create({
        name: "New Preset",
        channelLevels: { ch1: 80, ch2: 70, ch3: 60, ch4: 50 },
        isDefault: false,
      });

      expect(db.createMixerPreset).toHaveBeenCalledWith({
        userId: 1,
        name: "New Preset",
        description: undefined,
        channelLevels: { ch1: 80, ch2: 70, ch3: 60, ch4: 50 },
        eqSettings: undefined,
        compressorSettings: undefined,
        effectsSettings: undefined,
        isDefault: false,
      });
      expect(result).toEqual({ id: 2 });
    });
  });

  describe("update", () => {
    it("updates an existing preset", async () => {
      vi.mocked(db.updateMixerPreset).mockResolvedValue({ success: true });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mixerPresets.update({
        id: 1,
        name: "Updated Preset",
        channelLevels: { ch1: 90, ch2: 85 },
      });

      expect(db.updateMixerPreset).toHaveBeenCalledWith(1, {
        name: "Updated Preset",
        channelLevels: { ch1: 90, ch2: 85 },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("delete", () => {
    it("deletes a preset by id", async () => {
      vi.mocked(db.deleteMixerPreset).mockResolvedValue({ success: true });

      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mixerPresets.delete({ id: 1 });

      expect(db.deleteMixerPreset).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true });
    });
  });
});
