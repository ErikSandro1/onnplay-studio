import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ==================== MIXER PRESETS ====================
  mixerPresets: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getMixerPresets(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getMixerPresetById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        channelLevels: z.record(z.string(), z.number()),
        eqSettings: z.record(z.string(), z.number()).optional(),
        compressorSettings: z.record(z.string(), z.number()).optional(),
        effectsSettings: z.record(z.string(), z.unknown()).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createMixerPreset({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          channelLevels: input.channelLevels,
          eqSettings: input.eqSettings,
          compressorSettings: input.compressorSettings,
          effectsSettings: input.effectsSettings,
          isDefault: input.isDefault ?? false,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        channelLevels: z.record(z.string(), z.number()).optional(),
        eqSettings: z.record(z.string(), z.number()).optional(),
        compressorSettings: z.record(z.string(), z.number()).optional(),
        effectsSettings: z.record(z.string(), z.unknown()).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return await db.updateMixerPreset(id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteMixerPreset(input.id);
      }),
  }),

  // ==================== TRANSMISSION HISTORY ====================
  transmissions: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getTransmissionHistory(ctx.user.id, input?.limit ?? 50);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTransmissionById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        platforms: z.array(z.string()),
        status: z.enum(["scheduled", "live", "ended", "cancelled"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createTransmission({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          platforms: input.platforms,
          status: input.status ?? "scheduled",
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        platforms: z.array(z.string()).optional(),
        status: z.enum(["scheduled", "live", "ended", "cancelled"]).optional(),
        durationSeconds: z.number().optional(),
        peakViewers: z.number().optional(),
        totalViewers: z.number().optional(),
        avgBitrate: z.number().optional(),
        recordingUrl: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        startedAt: z.date().optional(),
        endedAt: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateTransmission(id, data as any);
      }),

    start: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateTransmission(input.id, {
          status: "live",
          startedAt: new Date(),
        });
      }),

    end: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        durationSeconds: z.number().optional(),
        peakViewers: z.number().optional(),
        totalViewers: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...stats } = input;
        return await db.updateTransmission(id, {
          status: "ended",
          endedAt: new Date(),
          ...stats,
        } as any);
      }),
  }),

  // ==================== STREAMING CONFIGS ====================
  streamingConfigs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getStreamingConfigs(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        platform: z.string().min(1).max(50),
        label: z.string().max(100).optional(),
        streamKey: z.string().optional(),
        rtmpUrl: z.string().optional(),
        isEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createStreamingConfig({
          userId: ctx.user.id,
          platform: input.platform,
          label: input.label,
          streamKey: input.streamKey,
          rtmpUrl: input.rtmpUrl,
          isEnabled: input.isEnabled ?? true,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        platform: z.string().min(1).max(50).optional(),
        label: z.string().max(100).optional(),
        streamKey: z.string().optional(),
        rtmpUrl: z.string().optional(),
        isEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateStreamingConfig(id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteStreamingConfig(input.id);
      }),
  }),

  // ==================== SCENES ====================
  scenes: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getScenes(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        type: z.enum(["camera", "screen", "media", "overlay"]).optional(),
        config: z.record(z.string(), z.unknown()).optional(),
        thumbnailUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createScene({
          userId: ctx.user.id,
          name: input.name,
          type: input.type ?? "camera",
          config: input.config,
          thumbnailUrl: input.thumbnailUrl,
          sortOrder: input.sortOrder ?? 0,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        type: z.enum(["camera", "screen", "media", "overlay"]).optional(),
        config: z.record(z.string(), z.unknown()).optional(),
        thumbnailUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateScene(id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteScene(input.id);
      }),

    reorder: protectedProcedure
      .input(z.object({
        scenes: z.array(z.object({
          id: z.number(),
          sortOrder: z.number(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        for (const scene of input.scenes) {
          await db.updateScene(scene.id, { sortOrder: scene.sortOrder } as any);
        }
        return { success: true };
      }),
  }),

  // ==================== CHAT MESSAGES ====================
  chat: router({
    list: protectedProcedure
      .input(z.object({ 
        transmissionId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getChatMessages(input.transmissionId, input.limit ?? 100);
      }),

    send: protectedProcedure
      .input(z.object({
        transmissionId: z.number(),
        message: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createChatMessage({
          transmissionId: input.transmissionId,
          userId: ctx.user.id,
          userName: ctx.user.name ?? "Anônimo",
          userRole: ctx.user.role === "admin" ? "host" : "viewer",
          message: input.message,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteChatMessage(input.id);
      }),
  }),

  // ==================== ANALYTICS ====================
  analytics: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAnalyticsSummary(ctx.user.id);
    }),

    transmissionsByPeriod: protectedProcedure
      .input(z.object({ days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getTransmissionsByPeriod(ctx.user.id, input.days ?? 30);
      }),

    viewersByDay: protectedProcedure
      .input(z.object({ days: z.number().min(1).max(365).optional() }))
      .query(async ({ ctx, input }) => {
        return await db.getViewersByDay(ctx.user.id, input.days ?? 30);
      }),

    platformStats: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPlatformStats(ctx.user.id);
    }),
  }),

  // ==================== ACTIVE TRANSMISSIONS ====================
  activeLives: router({
    start: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        platforms: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Generate unique invite code
        const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        return await db.startTransmission({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          status: 'live',
          inviteCode,
          platforms: input.platforms,
        });
      }),

    getCurrent: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserActiveTransmission(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getActiveTransmission(input.id);
      }),

    getByCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await db.getActiveTransmissionByCode(input.code);
      }),

    end: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateTransmissionStatus(input.id, 'ended', new Date());
      }),

    updateViewers: protectedProcedure
      .input(z.object({ id: z.number(), count: z.number() }))
      .mutation(async ({ input }) => {
        return await db.updateTransmissionViewers(input.id, input.count);
      }),
  }),

  // ==================== TRANSMISSION INVITES ====================
  invites: router({
    create: protectedProcedure
      .input(z.object({
        transmissionId: z.number(),
        guestEmail: z.string().email().optional(),
        guestName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const token = Math.random().toString(36).substring(2, 32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        return await db.createInvite({
          transmissionId: input.transmissionId,
          guestEmail: input.guestEmail,
          guestName: input.guestName,
          status: 'pending',
          token,
          expiresAt,
        });
      }),

    getByTransmission: protectedProcedure
      .input(z.object({ transmissionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTransmissionInvites(input.transmissionId);
      }),

    accept: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const invite = await db.getInviteByToken(input.token);
        if (!invite) throw new Error('Invite not found');
        
        return await db.acceptInvite(invite.id);
      }),

    reject: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const invite = await db.getInviteByToken(input.token);
        if (!invite) throw new Error('Invite not found');
        
        return await db.rejectInvite(invite.id);
      }),
  }),

  // ==================== TRANSMISSION PARTICIPANTS ====================
  participants: router({
    add: protectedProcedure
      .input(z.object({
        transmissionId: z.number(),
        name: z.string().min(1).max(100),
        email: z.string().email().optional(),
        role: z.enum(['host', 'guest', 'moderator']).default('guest'),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.addParticipant({
          transmissionId: input.transmissionId,
          userId: ctx.user.id,
          name: input.name,
          email: input.email,
          role: input.role,
          status: 'connected',
        });
      }),

    list: protectedProcedure
      .input(z.object({ transmissionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTransmissionParticipants(input.transmissionId);
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        participantId: z.number(),
        status: z.enum(['connected', 'disconnected', 'speaking']),
      }))
      .mutation(async ({ input }) => {
        return await db.updateParticipantStatus(input.participantId, input.status);
      }),

    updateMedia: protectedProcedure
      .input(z.object({
        participantId: z.number(),
        audioEnabled: z.boolean(),
        videoEnabled: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        return await db.updateParticipantMedia(input.participantId, input.audioEnabled, input.videoEnabled);
      }),

    remove: protectedProcedure
      .input(z.object({ participantId: z.number() }))
      .mutation(async ({ input }) => {
        return await db.removeParticipant(input.participantId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
