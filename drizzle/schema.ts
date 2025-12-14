import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = sqliteTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role").default("user").notNull(), // user, admin, operator, moderator
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  /** Plano do usuário: free, pro, enterprise */
  plan: text("plan").default("free").notNull(), // free, pro, enterprise
  /** Data de início da assinatura (para planos pagos) */
  subscriptionStartedAt: integer("subscriptionStartedAt", { mode: "timestamp" }),
  /** ID da assinatura no Stripe */
  stripeSubscriptionId: text("stripeSubscriptionId"),
  /** ID do cliente no Stripe */
  stripeCustomerId: text("stripeCustomerId"),
  /** Email verificado */
  emailVerified: integer("emailVerified", { mode: "boolean" }).default(false).notNull(),
  /** Token de verificação de email */
  emailVerificationToken: text("emailVerificationToken"),
  /** Data de expiração do token de verificação */
  emailVerificationExpires: integer("emailVerificationExpires", { mode: "timestamp" }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Mixer Presets - Configurações salvas do mixer de áudio
 */
export const mixerPresets = sqliteTable("mixer_presets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  /** JSON com níveis dos canais: { ch1: 75, ch2: 60, ch3: 85, ch4: 70, master: 80 } */
  channelLevels: text("channelLevels", { mode: "json" }).notNull(),
  /** JSON com configurações de EQ: { bass: 0, mid: 0, treble: 0 } */
  eqSettings: text("eqSettings", { mode: "json" }),
  /** JSON com configurações de compressor */
  compressorSettings: text("compressorSettings", { mode: "json" }),
  /** JSON com configurações de efeitos */
  effectsSettings: text("effectsSettings", { mode: "json" }),
  isDefault: integer("isDefault", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type MixerPreset = typeof mixerPresets.$inferSelect;
export type InsertMixerPreset = typeof mixerPresets.$inferInsert;

/**
 * Transmission History - Histórico de transmissões
 */
export const transmissionHistory = sqliteTable("transmission_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  /** Plataformas usadas: ["youtube", "twitch", "facebook"] */
  platforms: text("platforms", { mode: "json" }).notNull(),
  /** Status: scheduled, live, ended, cancelled */
  status: text("status").default("scheduled").notNull(), // scheduled, live, ended, cancelled
  /** Duração em segundos */
  durationSeconds: integer("durationSeconds").default(0),
  /** Pico de espectadores */
  peakViewers: integer("peakViewers").default(0),
  /** Total de espectadores únicos */
  totalViewers: integer("totalViewers").default(0),
  /** Média de bitrate em kbps */
  avgBitrate: integer("avgBitrate"),
  /** URL da gravação (se disponível) */
  recordingUrl: text("recordingUrl"),
  /** Thumbnail da transmissão */
  thumbnailUrl: text("thumbnailUrl"),
  /** Timestamp de início */
  startedAt: integer("startedAt", { mode: "timestamp" }),
  /** Timestamp de término */
  endedAt: integer("endedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type TransmissionHistory = typeof transmissionHistory.$inferSelect;
export type InsertTransmissionHistory = typeof transmissionHistory.$inferInsert;

/**
 * Streaming Configurations - Configurações de streaming por plataforma
 */
export const streamingConfigs = sqliteTable("streaming_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  /** Nome da plataforma: youtube, twitch, facebook, instagram, tiktok, linkedin, rtmp */
  platform: text("platform").notNull(),
  /** Nome amigável para identificação */
  label: text("label"),
  /** Stream Key (criptografada) */
  streamKey: text("streamKey"),
  /** URL do servidor RTMP */
  rtmpUrl: text("rtmpUrl"),
  /** Se está habilitada para multistream */
  isEnabled: integer("isEnabled", { mode: "boolean" }).default(true).notNull(),
  /** Última vez que foi usada */
  lastUsedAt: integer("lastUsedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type StreamingConfig = typeof streamingConfigs.$inferSelect;
export type InsertStreamingConfig = typeof streamingConfigs.$inferInsert;

/**
 * Scenes - Cenas salvas do estúdio
 */
export const scenes = sqliteTable("scenes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  /** Tipo de cena: camera, screen, media, overlay */
  type: text("type").default("camera").notNull(), // camera, screen, media, overlay
  /** JSON com configuração da cena (posições, tamanhos, fontes) */
  config: text("config", { mode: "json" }),
  /** Thumbnail da cena */
  thumbnailUrl: text("thumbnailUrl"),
  /** Ordem de exibição na galeria */
  sortOrder: integer("sortOrder").default(0),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Scene = typeof scenes.$inferSelect;
export type InsertScene = typeof scenes.$inferInsert;

/**
 * Chat Messages - Mensagens do chat ao vivo (para histórico)
 */
export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transmissionId: integer("transmissionId").notNull(),
  userId: integer("userId"),
  userName: text("userName").notNull(),
  userRole: text("userRole").default("viewer").notNull(), // host, moderator, guest, viewer
  message: text("message").notNull(),
  /** Se a mensagem foi deletada por moderação */
  isDeleted: integer("isDeleted", { mode: "boolean" }).default(false).notNull(),
  /** Se o usuário foi bloqueado */
  isBlocked: integer("isBlocked", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;


/**
 * Active Transmissions - Transmissões ao vivo ativas
 */
export const activeTransmissions = sqliteTable("active_transmissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  /** Título da transmissão */
  title: text("title").notNull(),
  /** Descrição da transmissão */
  description: text("description"),
  /** Status: live, paused, ended */
  status: text("status").default("live").notNull(), // live, paused, ended
  /** URL única para convidados acessarem */
  inviteCode: text("inviteCode").notNull().unique(),
  /** Número de espectadores */
  viewerCount: integer("viewerCount").default(0).notNull(),
  /** Número de participantes confirmados */
  participantCount: integer("participantCount").default(0).notNull(),
  /** Plataformas onde está sendo transmitido */
  platforms: text("platforms", { mode: "json" }), // ["youtube", "twitch", "facebook"]
  /** Hora de início da transmissão */
  startedAt: integer("startedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  /** Hora de término da transmissão */
  endedAt: integer("endedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type ActiveTransmission = typeof activeTransmissions.$inferSelect;
export type InsertActiveTransmission = typeof activeTransmissions.$inferInsert;

/**
 * Transmission Invites - Convites para participar da transmissão
 */
export const transmissionInvites = sqliteTable("transmission_invites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transmissionId: integer("transmissionId").notNull(),
  /** Email ou nome do convidado */
  guestEmail: text("guestEmail"),
  guestName: text("guestName"),
  /** Status do convite: pending, accepted, rejected, expired */
  status: text("status").default("pending").notNull(), // pending, accepted, rejected, expired
  /** Token único para aceitar o convite */
  token: text("token").notNull().unique(),
  /** Hora em que o convite foi aceito */
  acceptedAt: integer("acceptedAt", { mode: "timestamp" }),
  /** Hora em que o convite expirou */
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type TransmissionInvite = typeof transmissionInvites.$inferSelect;
export type InsertTransmissionInvite = typeof transmissionInvites.$inferInsert;

/**
 * Transmission Participants - Participantes confirmados na transmissão
 */
export const transmissionParticipants = sqliteTable("transmission_participants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transmissionId: integer("transmissionId").notNull(),
  userId: integer("userId"),
  /** Nome do participante */
  name: text("name").notNull(),
  /** Email do participante */
  email: text("email"),
  /** Função: host, guest, moderator */
  role: text("role").default("guest").notNull(), // host, guest, moderator
  /** Status: connected, disconnected, speaking */
  status: text("status").default("disconnected").notNull(), // connected, disconnected, speaking
  /** Se o áudio está ativado */
  audioEnabled: integer("audioEnabled", { mode: "boolean" }).default(true).notNull(),
  /** Se o vídeo está ativado */
  videoEnabled: integer("videoEnabled", { mode: "boolean" }).default(true).notNull(),
  /** Hora em que se conectou */
  connectedAt: integer("connectedAt", { mode: "timestamp" }),
  /** Hora em que se desconectou */
  disconnectedAt: integer("disconnectedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type TransmissionParticipant = typeof transmissionParticipants.$inferSelect;
export type InsertTransmissionParticipant = typeof transmissionParticipants.$inferInsert;

/**
 * Usage Tracking - Rastreamento de uso de broadcast
 */
export const usageTracking = sqliteTable("usage_tracking", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  /** Mês de referência (YYYY-MM) */
  month: text("month").notNull(),
  /** Total de minutos usados no mês */
  totalMinutes: integer("totalMinutes").default(0).notNull(),
  /** Limite de minutos para o plano (0 = ilimitado) */
  limitMinutes: integer("limitMinutes").default(300).notNull(), // 5 horas = 300 minutos para FREE
  /** Última vez que foi atualizado */
  lastUpdatedAt: integer("lastUpdatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = typeof usageTracking.$inferInsert;

/**
 * Broadcast Sessions - Sessões de broadcast individuais
 */
export const broadcastSessions = sqliteTable("broadcast_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  /** ID da transmissão ativa */
  transmissionId: integer("transmissionId"),
  /** Duração em minutos */
  durationMinutes: integer("durationMinutes").default(0).notNull(),
  /** Hora de início */
  startedAt: integer("startedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  /** Hora de término */
  endedAt: integer("endedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type BroadcastSession = typeof broadcastSessions.$inferSelect;
export type InsertBroadcastSession = typeof broadcastSessions.$inferInsert;
