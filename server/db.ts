import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { 
  InsertUser, 
  users, 
  mixerPresets, 
  InsertMixerPreset, 
  transmissionHistory, 
  InsertTransmissionHistory,
  streamingConfigs,
  InsertStreamingConfig,
  scenes,
  InsertScene,
  chatMessages,
  InsertChatMessage,
  activeTransmissions,
  InsertActiveTransmission,
  transmissionInvites,
  InsertTransmissionInvite,
  transmissionParticipants,
  InsertTransmissionParticipant
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const dbPath = process.env.DATABASE_URL.replace('file:', '');
      const sqlite = new Database(dbPath);
      _db = drizzle(sqlite);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER QUERIES ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== MIXER PRESETS QUERIES ====================

export async function getMixerPresets(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(mixerPresets).where(eq(mixerPresets.userId, userId)).orderBy(desc(mixerPresets.updatedAt));
}

export async function getMixerPresetById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(mixerPresets).where(eq(mixerPresets.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMixerPreset(preset: InsertMixerPreset) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(mixerPresets).values(preset);
  return { id: Number(result.lastInsertRowid) };
}

export async function updateMixerPreset(id: number, preset: Partial<InsertMixerPreset>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(mixerPresets).set(preset).where(eq(mixerPresets.id, id));
  return { success: true };
}

export async function deleteMixerPreset(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(mixerPresets).where(eq(mixerPresets.id, id));
  return { success: true };
}

// ==================== TRANSMISSION HISTORY QUERIES ====================

export async function getTransmissionHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(transmissionHistory).where(eq(transmissionHistory.userId, userId)).orderBy(desc(transmissionHistory.createdAt)).limit(limit);
}

export async function getTransmissionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(transmissionHistory).where(eq(transmissionHistory.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTransmission(transmission: InsertTransmissionHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(transmissionHistory).values(transmission);
  return { id: Number(result.lastInsertRowid) };
}

export async function updateTransmission(id: number, transmission: Partial<InsertTransmissionHistory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(transmissionHistory).set(transmission).where(eq(transmissionHistory.id, id));
  return { success: true };
}

// ==================== STREAMING CONFIGS QUERIES ====================

export async function getStreamingConfigs(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(streamingConfigs).where(eq(streamingConfigs.userId, userId)).orderBy(desc(streamingConfigs.updatedAt));
}

export async function createStreamingConfig(config: InsertStreamingConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(streamingConfigs).values(config);
  return { id: Number(result.lastInsertRowid) };
}

export async function updateStreamingConfig(id: number, config: Partial<InsertStreamingConfig>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(streamingConfigs).set(config).where(eq(streamingConfigs.id, id));
  return { success: true };
}

export async function deleteStreamingConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(streamingConfigs).where(eq(streamingConfigs.id, id));
  return { success: true };
}

// ==================== SCENES QUERIES ====================

export async function getScenes(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(scenes).where(eq(scenes.userId, userId)).orderBy(scenes.sortOrder);
}

export async function createScene(scene: InsertScene) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(scenes).values(scene);
  return { id: Number(result.lastInsertRowid) };
}

export async function updateScene(id: number, scene: Partial<InsertScene>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(scenes).set(scene).where(eq(scenes.id, id));
  return { success: true };
}

export async function deleteScene(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(scenes).where(eq(scenes.id, id));
  return { success: true };
}

// ==================== CHAT MESSAGES QUERIES ====================

export async function getChatMessages(transmissionId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(chatMessages)
    .where(and(eq(chatMessages.transmissionId, transmissionId), eq(chatMessages.isDeleted, false)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function createChatMessage(message: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatMessages).values(message);
  return { id: Number(result.lastInsertRowid) };
}

export async function deleteChatMessage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(chatMessages).set({ isDeleted: true }).where(eq(chatMessages.id, id));
  return { success: true };
}


// ==================== ANALYTICS QUERIES ====================

export async function getAnalyticsSummary(userId: number) {
  const db = await getDb();
  if (!db) {
    return {
      totalTransmissions: 0,
      totalDurationSeconds: 0,
      totalViewers: 0,
      avgViewers: 0,
      peakViewers: 0,
    };
  }

  const transmissions = await db.select().from(transmissionHistory).where(eq(transmissionHistory.userId, userId));
  
  const totalTransmissions = transmissions.length;
  const totalDurationSeconds = transmissions.reduce((acc, t) => acc + (t.durationSeconds ?? 0), 0);
  const totalViewers = transmissions.reduce((acc, t) => acc + (t.totalViewers ?? 0), 0);
  const avgViewers = totalTransmissions > 0 ? Math.round(totalViewers / totalTransmissions) : 0;
  const peakViewers = Math.max(...transmissions.map(t => t.peakViewers ?? 0), 0);

  return {
    totalTransmissions,
    totalDurationSeconds,
    totalViewers,
    avgViewers,
    peakViewers,
  };
}

export async function getTransmissionsByPeriod(userId: number, days: number) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const transmissions = await db.select().from(transmissionHistory)
    .where(eq(transmissionHistory.userId, userId))
    .orderBy(desc(transmissionHistory.createdAt));

  // Filter by date in JS since MySQL date comparison can be tricky
  return transmissions.filter(t => {
    const createdAt = new Date(t.createdAt);
    return createdAt >= startDate;
  });
}

export async function getViewersByDay(userId: number, days: number) {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const transmissions = await db.select().from(transmissionHistory)
    .where(eq(transmissionHistory.userId, userId))
    .orderBy(transmissionHistory.createdAt);

  // Group by day
  const viewersByDay: Record<string, { date: string; viewers: number; peakViewers: number; transmissions: number }> = {};

  transmissions.forEach(t => {
    const createdAt = new Date(t.createdAt);
    if (createdAt < startDate) return;

    const dateKey = createdAt.toISOString().split('T')[0];
    if (!viewersByDay[dateKey]) {
      viewersByDay[dateKey] = { date: dateKey, viewers: 0, peakViewers: 0, transmissions: 0 };
    }
    viewersByDay[dateKey].viewers += t.totalViewers ?? 0;
    viewersByDay[dateKey].peakViewers = Math.max(viewersByDay[dateKey].peakViewers, t.peakViewers ?? 0);
    viewersByDay[dateKey].transmissions += 1;
  });

  return Object.values(viewersByDay).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getPlatformStats(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const transmissions = await db.select().from(transmissionHistory)
    .where(eq(transmissionHistory.userId, userId));

  const platformStats: Record<string, { platform: string; count: number; totalViewers: number }> = {};

  transmissions.forEach(t => {
    const platforms = t.platforms as string[];
    if (!platforms) return;

    platforms.forEach(platform => {
      if (!platformStats[platform]) {
        platformStats[platform] = { platform, count: 0, totalViewers: 0 };
      }
      platformStats[platform].count += 1;
      platformStats[platform].totalViewers += t.totalViewers ?? 0;
    });
  });

  return Object.values(platformStats).sort((a, b) => b.count - a.count);
}


// ==================== ACTIVE TRANSMISSIONS QUERIES ====================

export async function startTransmission(transmission: InsertActiveTransmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(activeTransmissions).values(transmission);
  return { id: Number(result.lastInsertRowid) };
}

export async function getActiveTransmission(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(activeTransmissions).where(eq(activeTransmissions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveTransmissionByCode(inviteCode: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(activeTransmissions).where(eq(activeTransmissions.inviteCode, inviteCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserActiveTransmission(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(activeTransmissions)
    .where(and(eq(activeTransmissions.userId, userId), eq(activeTransmissions.status, "live")))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTransmissionStatus(id: number, status: "live" | "paused" | "ended", endedAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = { status };
  if (endedAt) updates.endedAt = endedAt;

  await db.update(activeTransmissions).set(updates).where(eq(activeTransmissions.id, id));
  return { success: true };
}

export async function updateTransmissionViewers(id: number, viewerCount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(activeTransmissions).set({ viewerCount }).where(eq(activeTransmissions.id, id));
  return { success: true };
}

// ==================== TRANSMISSION INVITES QUERIES ====================

export async function createInvite(invite: InsertTransmissionInvite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(transmissionInvites).values(invite);
  return { id: Number(result.lastInsertRowid) };
}

export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(transmissionInvites).where(eq(transmissionInvites.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTransmissionInvites(transmissionId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(transmissionInvites)
    .where(eq(transmissionInvites.transmissionId, transmissionId))
    .orderBy(desc(transmissionInvites.createdAt));
}

export async function acceptInvite(inviteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(transmissionInvites)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(transmissionInvites.id, inviteId));
  return { success: true };
}

export async function rejectInvite(inviteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(transmissionInvites)
    .set({ status: "rejected" })
    .where(eq(transmissionInvites.id, inviteId));
  return { success: true };
}

// ==================== TRANSMISSION PARTICIPANTS QUERIES ====================

export async function addParticipant(participant: InsertTransmissionParticipant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(transmissionParticipants).values(participant);
  return { id: Number(result.lastInsertRowid) };
}

export async function getTransmissionParticipants(transmissionId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(transmissionParticipants)
    .where(eq(transmissionParticipants.transmissionId, transmissionId))
    .orderBy(desc(transmissionParticipants.connectedAt));
}

export async function updateParticipantStatus(participantId: number, status: "connected" | "disconnected" | "speaking") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = { status };
  if (status === "connected") updates.connectedAt = new Date();
  if (status === "disconnected") updates.disconnectedAt = new Date();

  await db.update(transmissionParticipants).set(updates).where(eq(transmissionParticipants.id, participantId));
  return { success: true };
}

export async function updateParticipantMedia(participantId: number, audioEnabled: boolean, videoEnabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(transmissionParticipants)
    .set({ audioEnabled, videoEnabled })
    .where(eq(transmissionParticipants.id, participantId));
  return { success: true };
}

export async function removeParticipant(participantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(transmissionParticipants)
    .set({ status: "disconnected", disconnectedAt: new Date() })
    .where(eq(transmissionParticipants.id, participantId));
  return { success: true };
}
