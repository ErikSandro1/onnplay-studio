import { v4 as uuidv4 } from 'uuid';

export interface BroadcastSession {
  id: string;
  user_id: string;
  platform: string;
  quality: string;
  participants_count: number;
  started_at: Date;
  ended_at?: Date;
  duration_minutes?: number;
  peak_viewers?: number;
  status: 'live' | 'ended' | 'failed';
}

export interface RecordingSession {
  id: string;
  user_id: string;
  filename: string;
  quality: string;
  duration_minutes: number;
  file_size_mb: number;
  started_at: Date;
  ended_at: Date;
  status: 'completed' | 'failed';
}

export class BroadcastTrackingService {
  private db: any;
  private activeSessions: Map<string, { startTime: Date; intervalId: NodeJS.Timeout }> = new Map();

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Start tracking a broadcast session
   */
  async startBroadcast(
    userId: string,
    platform: string,
    quality: string,
    participantsCount: number
  ): Promise<string> {
    const broadcastId = uuidv4();
    const now = new Date();

    await this.db.query(
      `INSERT INTO broadcasts (id, user_id, platform, quality, participants_count, started_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [broadcastId, userId, platform, quality, participantsCount, now, 'live']
    );

    // Start tracking minutes in real-time
    const intervalId = setInterval(async () => {
      await this.updateBroadcastMinutes(broadcastId, userId);
    }, 60000); // Every minute

    this.activeSessions.set(broadcastId, {
      startTime: now,
      intervalId,
    });

    console.log(`📡 Broadcast started: ${broadcastId} (${platform}, ${quality})`);

    return broadcastId;
  }

  /**
   * Update broadcast minutes (called every minute)
   */
  private async updateBroadcastMinutes(broadcastId: string, userId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(broadcastId);
      if (!session) return;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const minutesElapsed = Math.floor((Date.now() - session.startTime.getTime()) / 60000);

      // Update broadcast record
      await this.db.query(
        `UPDATE broadcasts 
         SET duration_minutes = ?
         WHERE id = ?`,
        [minutesElapsed, broadcastId]
      );

      // Increment usage
      await this.db.query(
        `UPDATE user_usage 
         SET streaming_minutes = streaming_minutes + 1, updated_at = NOW()
         WHERE user_id = ? AND month = ?`,
        [userId, currentMonth]
      );

      console.log(`⏱️  Broadcast ${broadcastId}: ${minutesElapsed} minutes`);
    } catch (error) {
      console.error('Error updating broadcast minutes:', error);
    }
  }

  /**
   * End a broadcast session
   */
  async endBroadcast(
    broadcastId: string,
    peakViewers?: number
  ): Promise<void> {
    const session = this.activeSessions.get(broadcastId);
    if (!session) {
      console.warn(`Broadcast ${broadcastId} not found in active sessions`);
      return;
    }

    // Stop the interval
    clearInterval(session.intervalId);
    this.activeSessions.delete(broadcastId);

    const now = new Date();
    const durationMinutes = Math.floor((now.getTime() - session.startTime.getTime()) / 60000);

    await this.db.query(
      `UPDATE broadcasts 
       SET ended_at = ?, duration_minutes = ?, peak_viewers = ?, status = ?
       WHERE id = ?`,
      [now, durationMinutes, peakViewers || 0, 'ended', broadcastId]
    );

    console.log(`🛑 Broadcast ended: ${broadcastId} (${durationMinutes} minutes)`);
  }

  /**
   * Mark broadcast as failed
   */
  async failBroadcast(broadcastId: string): Promise<void> {
    const session = this.activeSessions.get(broadcastId);
    if (session) {
      clearInterval(session.intervalId);
      this.activeSessions.delete(broadcastId);
    }

    await this.db.query(
      `UPDATE broadcasts 
       SET status = ?, ended_at = NOW()
       WHERE id = ?`,
      ['failed', broadcastId]
    );

    console.log(`❌ Broadcast failed: ${broadcastId}`);
  }

  /**
   * Update peak viewers
   */
  async updatePeakViewers(broadcastId: string, viewers: number): Promise<void> {
    await this.db.query(
      `UPDATE broadcasts 
       SET peak_viewers = GREATEST(COALESCE(peak_viewers, 0), ?)
       WHERE id = ?`,
      [viewers, broadcastId]
    );
  }

  /**
   * Get broadcast by ID
   */
  async getBroadcast(broadcastId: string): Promise<BroadcastSession | null> {
    const [broadcast] = await this.db.query(
      'SELECT * FROM broadcasts WHERE id = ?',
      [broadcastId]
    );

    return broadcast || null;
  }

  /**
   * Get user's broadcasts
   */
  async getUserBroadcasts(
    userId: string,
    limit: number = 10
  ): Promise<BroadcastSession[]> {
    const broadcasts = await this.db.query(
      `SELECT * FROM broadcasts 
       WHERE user_id = ? 
       ORDER BY started_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    return broadcasts;
  }

  /**
   * Get active broadcasts for a user
   */
  async getActiveBroadcasts(userId: string): Promise<BroadcastSession[]> {
    const broadcasts = await this.db.query(
      `SELECT * FROM broadcasts 
       WHERE user_id = ? AND status = 'live'
       ORDER BY started_at DESC`,
      [userId]
    );

    return broadcasts;
  }

  /**
   * Start tracking a recording session
   */
  async startRecording(
    userId: string,
    filename: string,
    quality: string
  ): Promise<string> {
    const recordingId = uuidv4();
    const now = new Date();

    await this.db.query(
      `INSERT INTO recordings (id, user_id, filename, quality, started_at, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [recordingId, userId, filename, quality, now, 'recording']
    );

    // Start tracking minutes
    const intervalId = setInterval(async () => {
      await this.updateRecordingMinutes(recordingId, userId);
    }, 60000); // Every minute

    this.activeSessions.set(recordingId, {
      startTime: now,
      intervalId,
    });

    console.log(`🎥 Recording started: ${recordingId} (${filename})`);

    return recordingId;
  }

  /**
   * Update recording minutes (called every minute)
   */
  private async updateRecordingMinutes(recordingId: string, userId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(recordingId);
      if (!session) return;

      const currentMonth = new Date().toISOString().slice(0, 7);
      const minutesElapsed = Math.floor((Date.now() - session.startTime.getTime()) / 60000);

      // Update recording record
      await this.db.query(
        `UPDATE recordings 
         SET duration_minutes = ?
         WHERE id = ?`,
        [minutesElapsed, recordingId]
      );

      // Increment usage
      await this.db.query(
        `UPDATE user_usage 
         SET recording_minutes = recording_minutes + 1, updated_at = NOW()
         WHERE user_id = ? AND month = ?`,
        [userId, currentMonth]
      );
    } catch (error) {
      console.error('Error updating recording minutes:', error);
    }
  }

  /**
   * End a recording session
   */
  async endRecording(
    recordingId: string,
    fileSizeMb: number
  ): Promise<void> {
    const session = this.activeSessions.get(recordingId);
    if (!session) {
      console.warn(`Recording ${recordingId} not found in active sessions`);
      return;
    }

    // Stop the interval
    clearInterval(session.intervalId);
    this.activeSessions.delete(recordingId);

    const now = new Date();
    const durationMinutes = Math.floor((now.getTime() - session.startTime.getTime()) / 60000);

    await this.db.query(
      `UPDATE recordings 
       SET ended_at = ?, duration_minutes = ?, file_size_mb = ?, status = ?
       WHERE id = ?`,
      [now, durationMinutes, fileSizeMb, 'completed', recordingId]
    );

    // Update storage usage
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [recording] = await this.db.query(
      'SELECT user_id FROM recordings WHERE id = ?',
      [recordingId]
    );

    if (recording) {
      await this.db.query(
        `UPDATE user_usage 
         SET storage_mb = storage_mb + ?, updated_at = NOW()
         WHERE user_id = ? AND month = ?`,
        [fileSizeMb, recording.user_id, currentMonth]
      );
    }

    console.log(`🛑 Recording ended: ${recordingId} (${durationMinutes} minutes, ${fileSizeMb}MB)`);
  }

  /**
   * Get user's recordings
   */
  async getUserRecordings(
    userId: string,
    limit: number = 10
  ): Promise<RecordingSession[]> {
    const recordings = await this.db.query(
      `SELECT * FROM recordings 
       WHERE user_id = ? 
       ORDER BY started_at DESC 
       LIMIT ?`,
      [userId, limit]
    );

    return recordings;
  }

  /**
   * Get total stats for a user
   */
  async getUserStats(userId: string): Promise<any> {
    const [totalBroadcasts] = await this.db.query(
      `SELECT 
        COUNT(*) as total_broadcasts,
        SUM(duration_minutes) as total_streaming_minutes,
        AVG(duration_minutes) as avg_duration,
        MAX(peak_viewers) as max_viewers
       FROM broadcasts 
       WHERE user_id = ? AND status = 'ended'`,
      [userId]
    );

    const [totalRecordings] = await this.db.query(
      `SELECT 
        COUNT(*) as total_recordings,
        SUM(duration_minutes) as total_recording_minutes,
        SUM(file_size_mb) as total_storage_mb
       FROM recordings 
       WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );

    return {
      broadcasts: {
        total: totalBroadcasts?.total_broadcasts || 0,
        totalMinutes: totalBroadcasts?.total_streaming_minutes || 0,
        avgDuration: Math.round(totalBroadcasts?.avg_duration || 0),
        maxViewers: totalBroadcasts?.max_viewers || 0,
      },
      recordings: {
        total: totalRecordings?.total_recordings || 0,
        totalMinutes: totalRecordings?.total_recording_minutes || 0,
        totalStorageMb: Math.round(totalRecordings?.total_storage_mb || 0),
      },
    };
  }

  /**
   * Cleanup - stop all active sessions (for graceful shutdown)
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up active sessions...');
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      clearInterval(session.intervalId);
      
      // Mark as ended
      await this.db.query(
        `UPDATE broadcasts 
         SET status = 'ended', ended_at = NOW()
         WHERE id = ? AND status = 'live'`,
        [sessionId]
      );

      await this.db.query(
        `UPDATE recordings 
         SET status = 'completed', ended_at = NOW()
         WHERE id = ? AND status = 'recording'`,
        [sessionId]
      );
    }

    this.activeSessions.clear();
    console.log('✅ Cleanup complete');
  }
}
