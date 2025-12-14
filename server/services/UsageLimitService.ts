import { v4 as uuidv4 } from 'uuid';

export interface PlanLimits {
  streamingMinutesPerMonth: number; // -1 = unlimited
  recordingMinutesPerMonth: number; // -1 = unlimited
  maxQuality: '720p' | '1080p' | '4K';
  maxParticipants: number;
  aiAssistant: boolean;
  recording: boolean;
  ptzControl: boolean;
  commentOverlay: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    streamingMinutesPerMonth: 60, // 1 hour
    recordingMinutesPerMonth: 0, // No recording
    maxQuality: '720p',
    maxParticipants: 3,
    aiAssistant: false,
    recording: false,
    ptzControl: false,
    commentOverlay: false,
    apiAccess: false,
  },
  pro: {
    streamingMinutesPerMonth: -1, // Unlimited
    recordingMinutesPerMonth: -1, // Unlimited
    maxQuality: '1080p',
    maxParticipants: 10,
    aiAssistant: true,
    recording: true,
    ptzControl: true,
    commentOverlay: true,
    apiAccess: false,
  },
  enterprise: {
    streamingMinutesPerMonth: -1, // Unlimited
    recordingMinutesPerMonth: -1, // Unlimited
    maxQuality: '4K',
    maxParticipants: 20,
    aiAssistant: true,
    recording: true,
    ptzControl: true,
    commentOverlay: true,
    apiAccess: true,
  },
};

export interface UsageData {
  streaming_minutes: number;
  recording_minutes: number;
  ai_commands_count: number;
  storage_mb: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  remainingMinutes?: number;
  upgradeRequired?: boolean;
}

export class UsageLimitService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Get plan limits for a user
   */
  getPlanLimits(plan: string): PlanLimits {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  }

  /**
   * Get current month usage for a user
   */
  async getCurrentUsage(userId: string): Promise<UsageData> {
    const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const [usage] = await this.db.query(
      'SELECT * FROM user_usage WHERE user_id = ? AND month = ?',
      [userId, currentMonth]
    );

    if (!usage) {
      // Create usage record for current month
      const newUsage = {
        id: uuidv4(),
        user_id: userId,
        month: currentMonth,
        streaming_minutes: 0,
        recording_minutes: 0,
        ai_commands_count: 0,
        storage_mb: 0,
      };

      await this.db.query(
        `INSERT INTO user_usage (id, user_id, month, streaming_minutes, recording_minutes, ai_commands_count, storage_mb)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newUsage.id,
          newUsage.user_id,
          newUsage.month,
          newUsage.streaming_minutes,
          newUsage.recording_minutes,
          newUsage.ai_commands_count,
          newUsage.storage_mb,
        ]
      );

      return newUsage;
    }

    return usage;
  }

  /**
   * Check if user can start streaming
   */
  async canStartStreaming(userId: string, plan: string): Promise<UsageCheckResult> {
    const limits = this.getPlanLimits(plan);
    const usage = await this.getCurrentUsage(userId);

    // Unlimited plan
    if (limits.streamingMinutesPerMonth === -1) {
      return { allowed: true };
    }

    // Check if user has exceeded limit
    if (usage.streaming_minutes >= limits.streamingMinutesPerMonth) {
      return {
        allowed: false,
        reason: `Você atingiu o limite de ${limits.streamingMinutesPerMonth} minutos de transmissão neste mês.`,
        remainingMinutes: 0,
        upgradeRequired: true,
      };
    }

    // Check if user is close to limit
    const remaining = limits.streamingMinutesPerMonth - usage.streaming_minutes;
    return {
      allowed: true,
      remainingMinutes: remaining,
    };
  }

  /**
   * Check if user can start recording
   */
  async canStartRecording(userId: string, plan: string): Promise<UsageCheckResult> {
    const limits = this.getPlanLimits(plan);

    // Recording not available in plan
    if (!limits.recording) {
      return {
        allowed: false,
        reason: 'Gravação não está disponível no seu plano. Faça upgrade para Pro ou Enterprise.',
        upgradeRequired: true,
      };
    }

    const usage = await this.getCurrentUsage(userId);

    // Unlimited plan
    if (limits.recordingMinutesPerMonth === -1) {
      return { allowed: true };
    }

    // Check if user has exceeded limit
    if (usage.recording_minutes >= limits.recordingMinutesPerMonth) {
      return {
        allowed: false,
        reason: `Você atingiu o limite de ${limits.recordingMinutesPerMonth} minutos de gravação neste mês.`,
        remainingMinutes: 0,
        upgradeRequired: true,
      };
    }

    const remaining = limits.recordingMinutesPerMonth - usage.recording_minutes;
    return {
      allowed: true,
      remainingMinutes: remaining,
    };
  }

  /**
   * Check if user can use AI Assistant
   */
  canUseAI(plan: string): UsageCheckResult {
    const limits = this.getPlanLimits(plan);

    if (!limits.aiAssistant) {
      return {
        allowed: false,
        reason: 'AI Studio Assistant não está disponível no seu plano. Faça upgrade para Pro ou Enterprise.',
        upgradeRequired: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can use PTZ control
   */
  canUsePTZ(plan: string): UsageCheckResult {
    const limits = this.getPlanLimits(plan);

    if (!limits.ptzControl) {
      return {
        allowed: false,
        reason: 'Controle PTZ não está disponível no seu plano. Faça upgrade para Pro ou Enterprise.',
        upgradeRequired: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user can use comment overlay
   */
  canUseCommentOverlay(plan: string): UsageCheckResult {
    const limits = this.getPlanLimits(plan);

    if (!limits.commentOverlay) {
      return {
        allowed: false,
        reason: 'Overlay de comentários não está disponível no seu plano. Faça upgrade para Pro ou Enterprise.',
        upgradeRequired: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if quality is allowed for plan
   */
  isQualityAllowed(plan: string, quality: string): UsageCheckResult {
    const limits = this.getPlanLimits(plan);
    const qualityOrder = ['720p', '1080p', '4K'];
    const maxQualityIndex = qualityOrder.indexOf(limits.maxQuality);
    const requestedQualityIndex = qualityOrder.indexOf(quality);

    if (requestedQualityIndex > maxQualityIndex) {
      return {
        allowed: false,
        reason: `Qualidade ${quality} não está disponível no seu plano. Máximo permitido: ${limits.maxQuality}`,
        upgradeRequired: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Check if participant count is allowed
   */
  isParticipantCountAllowed(plan: string, count: number): UsageCheckResult {
    const limits = this.getPlanLimits(plan);

    if (count > limits.maxParticipants) {
      return {
        allowed: false,
        reason: `Seu plano permite até ${limits.maxParticipants} participantes. Você está tentando adicionar ${count}.`,
        upgradeRequired: true,
      };
    }

    return { allowed: true };
  }

  /**
   * Increment streaming minutes
   */
  async incrementStreamingMinutes(userId: string, minutes: number): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Ensure usage record exists
    await this.getCurrentUsage(userId);

    await this.db.query(
      `UPDATE user_usage 
       SET streaming_minutes = streaming_minutes + ?, updated_at = NOW()
       WHERE user_id = ? AND month = ?`,
      [minutes, userId, currentMonth]
    );
  }

  /**
   * Increment recording minutes
   */
  async incrementRecordingMinutes(userId: string, minutes: number): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Ensure usage record exists
    await this.getCurrentUsage(userId);

    await this.db.query(
      `UPDATE user_usage 
       SET recording_minutes = recording_minutes + ?, updated_at = NOW()
       WHERE user_id = ? AND month = ?`,
      [minutes, userId, currentMonth]
    );
  }

  /**
   * Increment AI commands count
   */
  async incrementAICommands(userId: string, count: number = 1): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Ensure usage record exists
    await this.getCurrentUsage(userId);

    await this.db.query(
      `UPDATE user_usage 
       SET ai_commands_count = ai_commands_count + ?, updated_at = NOW()
       WHERE user_id = ? AND month = ?`,
      [count, userId, currentMonth]
    );
  }

  /**
   * Get usage summary with limits
   */
  async getUsageSummary(userId: string, plan: string): Promise<any> {
    const limits = this.getPlanLimits(plan);
    const usage = await this.getCurrentUsage(userId);

    return {
      plan,
      limits: {
        streamingMinutes: limits.streamingMinutesPerMonth,
        recordingMinutes: limits.recordingMinutesPerMonth,
        maxQuality: limits.maxQuality,
        maxParticipants: limits.maxParticipants,
        features: {
          aiAssistant: limits.aiAssistant,
          recording: limits.recording,
          ptzControl: limits.ptzControl,
          commentOverlay: limits.commentOverlay,
          apiAccess: limits.apiAccess,
        },
      },
      usage: {
        streamingMinutes: usage.streaming_minutes,
        recordingMinutes: usage.recording_minutes,
        aiCommandsCount: usage.ai_commands_count,
        storageMb: usage.storage_mb,
      },
      remaining: {
        streamingMinutes:
          limits.streamingMinutesPerMonth === -1
            ? -1
            : Math.max(0, limits.streamingMinutesPerMonth - usage.streaming_minutes),
        recordingMinutes:
          limits.recordingMinutesPerMonth === -1
            ? -1
            : Math.max(0, limits.recordingMinutesPerMonth - usage.recording_minutes),
      },
      percentUsed: {
        streaming:
          limits.streamingMinutesPerMonth === -1
            ? 0
            : Math.min(
                100,
                (usage.streaming_minutes / limits.streamingMinutesPerMonth) * 100
              ),
        recording:
          limits.recordingMinutesPerMonth === -1
            ? 0
            : Math.min(
                100,
                (usage.recording_minutes / limits.recordingMinutesPerMonth) * 100
              ),
      },
    };
  }
}
