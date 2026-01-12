// Daily.co Service - Server-side
// Creates and manages Daily.co rooms via API

interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  config?: {
    start_video_off?: boolean;
    start_audio_off?: boolean;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
  };
}

class DailyApiService {
  private apiKey: string;
  private baseUrl = 'https://api.daily.co/v1';
  private rooms: Map<string, DailyRoom> = new Map();

  constructor() {
    this.apiKey = process.env.DAILY_API_KEY || '';
  }

  /**
   * Create a new Daily.co room
   */
  async createRoom(roomName: string): Promise<DailyRoom | null> {
    if (!this.apiKey) {
      console.error('[Daily] API key not configured');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          name: roomName,
          privacy: 'public',
          properties: {
            start_video_off: false,
            start_audio_off: false,
            enable_chat: true,
            enable_screenshare: true,
            exp: Math.floor(Date.now() / 1000) + 86400 // Expires in 24 hours
          }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Daily] Error creating room:', error);
        
        // If room already exists, try to get it
        if (response.status === 400) {
          return this.getRoom(roomName);
        }
        return null;
      }

      const room = await response.json();
      console.log('[Daily] Room created:', room.name);
      
      const dailyRoom: DailyRoom = {
        id: room.id,
        name: room.name,
        url: room.url,
        created_at: room.created_at
      };
      
      this.rooms.set(roomName, dailyRoom);
      return dailyRoom;
    } catch (error) {
      console.error('[Daily] Error creating room:', error);
      return null;
    }
  }

  /**
   * Get an existing Daily.co room
   */
  async getRoom(roomName: string): Promise<DailyRoom | null> {
    if (!this.apiKey) {
      console.error('[Daily] API key not configured');
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        console.error('[Daily] Room not found:', roomName);
        return null;
      }

      const room = await response.json();
      
      const dailyRoom: DailyRoom = {
        id: room.id,
        name: room.name,
        url: room.url,
        created_at: room.created_at
      };
      
      this.rooms.set(roomName, dailyRoom);
      return dailyRoom;
    } catch (error) {
      console.error('[Daily] Error getting room:', error);
      return null;
    }
  }

  /**
   * Get or create a room
   */
  async getOrCreateRoom(roomName: string): Promise<DailyRoom | null> {
    // Check cache first
    if (this.rooms.has(roomName)) {
      return this.rooms.get(roomName)!;
    }

    // Try to get existing room
    let room = await this.getRoom(roomName);
    if (room) {
      return room;
    }

    // Create new room
    return this.createRoom(roomName);
  }

  /**
   * Delete a Daily.co room
   */
  async deleteRoom(roomName: string): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (response.ok) {
        this.rooms.delete(roomName);
        console.log('[Daily] Room deleted:', roomName);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Daily] Error deleting room:', error);
      return false;
    }
  }

  /**
   * Generate a meeting token for a participant
   */
  async createMeetingToken(roomName: string, userName: string, isOwner: boolean = false): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/meeting-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            user_name: userName,
            is_owner: isOwner,
            exp: Math.floor(Date.now() / 1000) + 3600 // Token expires in 1 hour
          }
        })
      });

      if (!response.ok) {
        console.error('[Daily] Error creating meeting token');
        return null;
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('[Daily] Error creating meeting token:', error);
      return null;
    }
  }
}

export const dailyApiService = new DailyApiService();
export { DailyRoom };
