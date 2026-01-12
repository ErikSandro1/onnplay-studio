import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface WaitingGuest {
  id: string;
  socketId: string;
  name: string;
  roomId: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  joinedAt: Date;
}

interface AdmittedGuest {
  id: string;
  socketId: string;
  name: string;
  roomId: string;
  dailyParticipantId?: string;
}

interface Room {
  id: string;
  adminSocketId: string | null;
  guests: Map<string, WaitingGuest>;
  admittedGuests: Map<string, AdmittedGuest>; // Convidados que foram admitidos
  dailyRoomUrl?: string;
  createdAt: Date;
  expiresAt: Date; // Link expira após este tempo
}

class GreenRoomService {
  private io: SocketIOServer | null = null;
  private rooms: Map<string, Room> = new Map();
  private guestSockets: Map<string, string> = new Map(); // socketId -> guestId
  private dailyApiKey: string = process.env.DAILY_API_KEY || '';

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      path: '/greenroom',
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[GreenRoom] Client connected: ${socket.id}`);

      // Handle admin joining a room
      socket.on('admin-join-room', (data: { roomId: string }) => {
        this.handleAdminJoin(socket, data.roomId);
      });

      // Handle guest joining waiting room
      socket.on('guest-join-waiting-room', (data: { 
        roomId: string; 
        guestId: string; 
        name: string;
        videoEnabled: boolean;
        audioEnabled: boolean;
      }) => {
        this.handleGuestJoin(socket, data);
      });

      // Handle guest updating their status (camera/mic toggle)
      socket.on('guest-update-status', (data: {
        guestId: string;
        videoEnabled?: boolean;
        audioEnabled?: boolean;
      }) => {
        this.handleGuestStatusUpdate(socket, data);
      });

      // Handle admin admitting a guest
      socket.on('admin-admit-guest', (data: {
        roomId: string;
        guestId: string;
        destination: 'preview' | 'program';
      }) => {
        this.handleAdmitGuest(socket, data);
      });

      // Handle admin rejecting a guest
      socket.on('admin-reject-guest', (data: {
        roomId: string;
        guestId: string;
      }) => {
        this.handleRejectGuest(socket, data);
      });

      // Handle admin muting a participant
      socket.on('admin-mute-participant', (data: {
        participantId: string;
        roomId: string;
      }) => {
        this.handleMuteParticipant(socket, data);
      });

      // Handle admin toggling participant camera
      socket.on('admin-toggle-camera-participant', (data: {
        participantId: string;
        roomId: string;
      }) => {
        this.handleToggleCameraParticipant(socket, data);
      });

      // Handle admin removing a participant
      socket.on('admin-remove-participant', (data: {
        participantId: string;
        roomId: string;
      }) => {
        this.handleRemoveParticipant(socket, data);
      });

      // Handle guest registering after being admitted
      socket.on('guest-register-admitted', (data: {
        guestId: string;
        roomId: string;
      }) => {
        this.handleGuestRegisterAdmitted(socket, data);
      });

      // Handle chat message from anyone (host or guest)
      socket.on('chat-message', (data: {
        roomId: string;
        senderId: string;
        senderName: string;
        message: string;
        isHost: boolean;
      }) => {
        this.handleChatMessage(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });

    console.log('[GreenRoom] Service initialized');
  }

  private handleAdminJoin(socket: Socket, roomId: string) {
    let room = this.rooms.get(roomId);
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora de expiração
    
    if (!room) {
      room = {
        id: roomId,
        adminSocketId: socket.id,
        guests: new Map(),
        admittedGuests: new Map(),
        createdAt: now,
        expiresAt: expiresAt
      };
      this.rooms.set(roomId, room);
    } else {
      room.adminSocketId = socket.id;
      // Renovar expiração quando admin reconecta
      room.expiresAt = expiresAt;
    }

    socket.join(`room-${roomId}`);
    socket.join(`admin-${roomId}`);

    // Send current waiting guests to admin
    const waitingGuests = Array.from(room.guests.values());
    socket.emit('waiting-guests-list', { guests: waitingGuests });

    console.log(`[GreenRoom] Admin joined room ${roomId}, ${waitingGuests.length} guests waiting`);
  }

  private handleGuestJoin(socket: Socket, data: {
    roomId: string;
    guestId: string;
    name: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
  }) {
    const { roomId, guestId, name, videoEnabled, audioEnabled } = data;

    let room = this.rooms.get(roomId);
    
    // Verificar se o link expirou
    if (room && room.expiresAt && new Date() > room.expiresAt) {
      socket.emit('room-expired', { message: 'Este link de convite expirou.' });
      console.log(`[GreenRoom] Guest tried to join expired room ${roomId}`);
      return;
    }
    
    const now = new Date();
    if (!room) {
      room = {
        id: roomId,
        adminSocketId: null,
        guests: new Map(),
        admittedGuests: new Map(),
        createdAt: now,
        expiresAt: new Date(now.getTime() + 60 * 60 * 1000) // 1 hora
      };
      this.rooms.set(roomId, room);
    }

    const guest: WaitingGuest = {
      id: guestId,
      socketId: socket.id,
      name,
      roomId,
      videoEnabled,
      audioEnabled,
      joinedAt: new Date()
    };

    room.guests.set(guestId, guest);
    this.guestSockets.set(socket.id, guestId);

    socket.join(`room-${roomId}`);
    socket.join(`guest-${guestId}`);

    // Notify admin that a new guest is waiting
    if (room.adminSocketId && this.io) {
      this.io.to(`admin-${roomId}`).emit('guest-joined', { guest });
    }

    // Confirm to guest that they're in the waiting room
    socket.emit('joined-waiting-room', { 
      success: true, 
      guestId,
      position: room.guests.size 
    });

    console.log(`[GreenRoom] Guest ${name} (${guestId}) joined waiting room for ${roomId}`);
  }

  private handleGuestStatusUpdate(socket: Socket, data: {
    guestId: string;
    videoEnabled?: boolean;
    audioEnabled?: boolean;
  }) {
    const guestId = this.guestSockets.get(socket.id);
    if (!guestId) return;

    // Find the guest in rooms
    const rooms = Array.from(this.rooms.values());
    for (const room of rooms) {
      const guest = room.guests.get(guestId);
      if (guest) {
        if (data.videoEnabled !== undefined) guest.videoEnabled = data.videoEnabled;
        if (data.audioEnabled !== undefined) guest.audioEnabled = data.audioEnabled;

        // Notify admin of status change
        if (room.adminSocketId && this.io) {
          this.io.to(`admin-${room.id}`).emit('guest-status-updated', {
            guestId,
            videoEnabled: guest.videoEnabled,
            audioEnabled: guest.audioEnabled
          });
        }
        break;
      }
    }
  }

  private async handleAdmitGuest(socket: Socket, data: {
    roomId: string;
    guestId: string;
    destination: 'preview' | 'program';
  }) {
    const { roomId, guestId, destination } = data;
    const room = this.rooms.get(roomId);
    
    if (!room) return;

    const guest = room.guests.get(guestId);
    if (!guest) return;

    // Create Daily.co room if needed
    let dailyRoomUrl = room.dailyRoomUrl;
    if (!dailyRoomUrl && this.dailyApiKey) {
      try {
        const dailyRoomName = `live-${roomId.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 40)}`;
        const response = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.dailyApiKey}`
          },
          body: JSON.stringify({
            name: dailyRoomName,
            privacy: 'public',
            properties: {
              start_video_off: false,
              start_audio_off: false,
              enable_chat: true,
              enable_screenshare: true,
              exp: Math.floor(Date.now() / 1000) + 86400
            }
          })
        });

        if (response.ok) {
          const roomData = await response.json();
          dailyRoomUrl = roomData.url;
          room.dailyRoomUrl = dailyRoomUrl;
          console.log(`[GreenRoom] Created Daily.co room: ${dailyRoomUrl}`);
        } else {
          // Room might already exist, try to get it
          const getResponse = await fetch(`https://api.daily.co/v1/rooms/${dailyRoomName}`, {
            headers: { 'Authorization': `Bearer ${this.dailyApiKey}` }
          });
          if (getResponse.ok) {
            const roomData = await getResponse.json();
            dailyRoomUrl = roomData.url;
            room.dailyRoomUrl = dailyRoomUrl;
            console.log(`[GreenRoom] Using existing Daily.co room: ${dailyRoomUrl}`);
          }
        }
      } catch (error) {
        console.error('[GreenRoom] Error creating Daily.co room:', error);
      }
    }

    // Notify the guest that they've been admitted with Daily.co room URL
    if (this.io) {
      this.io.to(`guest-${guestId}`).emit('guest-admitted', { 
        destination,
        roomId,
        dailyRoomUrl: dailyRoomUrl || `https://onnplay.daily.co/live-${roomId}`
      });
    }

    // Remove guest from waiting room
    room.guests.delete(guestId);

    // Notify admin that guest was admitted
    socket.emit('guest-admitted-confirm', { guestId, destination, dailyRoomUrl });
    
    // Also broadcast to all admins in the room to update their counters
    if (this.io) {
      this.io.to(`admin-${roomId}`).emit('waiting-guests-list', { 
        guests: Array.from(room.guests.values()) 
      });
    }

    console.log(`[GreenRoom] Guest ${guest.name} admitted to ${destination}, Daily room: ${dailyRoomUrl}`);
  }

  private handleRejectGuest(socket: Socket, data: {
    roomId: string;
    guestId: string;
  }) {
    const { roomId, guestId } = data;
    const room = this.rooms.get(roomId);
    
    if (!room) return;

    const guest = room.guests.get(guestId);
    if (!guest) return;

    // Notify the guest that they've been rejected
    if (this.io) {
      this.io.to(`guest-${guestId}`).emit('guest-rejected', {});
    }

    // Remove guest from waiting room
    room.guests.delete(guestId);

    // Notify admin that guest was rejected
    socket.emit('guest-rejected-confirm', { guestId });
    
    // Also broadcast to all admins in the room to update their counters
    if (this.io) {
      this.io.to(`admin-${roomId}`).emit('waiting-guests-list', { 
        guests: Array.from(room.guests.values()) 
      });
    }

    console.log(`[GreenRoom] Guest ${guest.name} rejected from room ${roomId}`);
  }

  private handleDisconnect(socket: Socket) {
    const guestId = this.guestSockets.get(socket.id);
    
    if (guestId) {
      // Guest disconnected
      this.guestSockets.delete(socket.id);
      
      const rooms = Array.from(this.rooms.values());
      for (const room of rooms) {
        const guest = room.guests.get(guestId);
        if (guest) {
          room.guests.delete(guestId);
          
          // Notify admin that guest left
          if (room.adminSocketId && this.io) {
            this.io.to(`admin-${room.id}`).emit('guest-left', { guestId });
            // Also send updated list to sync counter
            this.io.to(`admin-${room.id}`).emit('waiting-guests-list', { 
              guests: Array.from(room.guests.values()) 
            });
          }
          
          console.log(`[GreenRoom] Guest ${guest.name} disconnected`);
          break;
        }
      }
    } else {
      // Check if admin disconnected
      const rooms = Array.from(this.rooms.values());
      for (const room of rooms) {
        if (room.adminSocketId === socket.id) {
          room.adminSocketId = null;
          console.log(`[GreenRoom] Admin disconnected from room ${room.id}`);
          break;
        }
      }
    }
  }

  /**
   * Handle admin muting a participant
   */
  private handleMuteParticipant(socket: Socket, data: {
    participantId: string;
    roomId: string;
  }) {
    const { participantId, roomId } = data;
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`[GreenRoom] Room ${roomId} not found for mute`);
      return;
    }

    // Find the admitted guest by participantId (can be guestId or dailySessionId)
    let admittedGuest = room.admittedGuests.get(participantId);
    
    // If not found directly, search by dailyParticipantId
    if (!admittedGuest) {
      for (const guest of room.admittedGuests.values()) {
        if (guest.dailyParticipantId === participantId) {
          admittedGuest = guest;
          break;
        }
      }
    }
    
    if (admittedGuest && this.io) {
      // Send mute command to the guest
      this.io.to(`admitted-${admittedGuest.id}`).emit('host-mute-command', {});
      console.log(`[GreenRoom] Admin sent mute command to ${admittedGuest.name}`);
    } else {
      console.log(`[GreenRoom] Could not find guest ${participantId} to mute`);
    }
  }

  /**
   * Handle admin toggling participant camera
   */
  private handleToggleCameraParticipant(socket: Socket, data: {
    participantId: string;
    roomId: string;
  }) {
    const { participantId, roomId } = data;
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`[GreenRoom] Room ${roomId} not found for toggle camera`);
      return;
    }

    // Find the admitted guest by participantId (can be guestId or dailySessionId)
    let admittedGuest = room.admittedGuests.get(participantId);
    
    // If not found directly, search by dailyParticipantId
    if (!admittedGuest) {
      for (const guest of room.admittedGuests.values()) {
        if (guest.dailyParticipantId === participantId) {
          admittedGuest = guest;
          break;
        }
      }
    }
    
    if (admittedGuest && this.io) {
      // Send toggle camera command to the guest
      this.io.to(`admitted-${admittedGuest.id}`).emit('host-toggle-camera-command', {});
      console.log(`[GreenRoom] Admin sent toggle camera command to ${admittedGuest.name}`);
    } else {
      console.log(`[GreenRoom] Could not find guest ${participantId} to toggle camera`);
    }
  }

  /**
   * Handle admin removing a participant
   */
  private handleRemoveParticipant(socket: Socket, data: {
    participantId: string;
    participantName?: string;
    roomId: string;
  }) {
    const { participantId, participantName, roomId } = data;
    console.log(`[GreenRoom] handleRemoveParticipant called with:`, { participantId, participantName, roomId });
    
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`[GreenRoom] Room ${roomId} not found for remove`);
      console.log(`[GreenRoom] Available rooms:`, Array.from(this.rooms.keys()));
      return;
    }

    console.log(`[GreenRoom] Trying to remove participant: id=${participantId}, name=${participantName}`);
    console.log(`[GreenRoom] Admitted guests:`, Array.from(room.admittedGuests.entries()).map(([k, v]) => ({ key: k, name: v.name })));

    // First try to find by participantId directly
    let admittedGuest = room.admittedGuests.get(participantId);
    let guestKey = participantId;
    
    // If not found by ID, try to find by name
    if (!admittedGuest && participantName) {
      for (const [key, guest] of room.admittedGuests.entries()) {
        if (guest.name.toLowerCase() === participantName.toLowerCase()) {
          admittedGuest = guest;
          guestKey = key;
          console.log(`[GreenRoom] Found guest by name: ${guest.name}`);
          break;
        }
      }
    }
    
    // If still not found, try to find any guest (for single guest scenarios)
    if (!admittedGuest && room.admittedGuests.size === 1) {
      const [key, guest] = room.admittedGuests.entries().next().value;
      admittedGuest = guest;
      guestKey = key;
      console.log(`[GreenRoom] Using single admitted guest: ${guest.name}`);
    }

    if (admittedGuest && this.io) {
      // Send remove command to the guest
      this.io.to(`admitted-${admittedGuest.id}`).emit('host-remove-command', {
        message: 'Você foi removido da sala pelo apresentador.'
      });
      
      // Remove from admitted guests
      room.admittedGuests.delete(guestKey);
      
      console.log(`[GreenRoom] Admin removed ${admittedGuest.name} from room`);
      
      // Notify admin of successful removal
      socket.emit('participant-removed', { participantId, participantName: admittedGuest.name });
    } else {
      console.log(`[GreenRoom] Could not find guest to remove`);
    }
  }

  /**
   * Handle guest registering after being admitted (to receive commands)
   */
  private handleGuestRegisterAdmitted(socket: Socket, data: {
    guestId: string;
    roomId: string;
    name?: string;
    dailySessionId?: string;
  }) {
    const { guestId, roomId, name, dailySessionId } = data;
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Register the admitted guest
    const admittedGuest: AdmittedGuest = {
      id: guestId,
      socketId: socket.id,
      name: name || 'Guest',
      roomId,
      dailyParticipantId: dailySessionId || undefined
    };

    room.admittedGuests.set(guestId, admittedGuest);
    
    // Also map by dailySessionId for quick lookup
    if (dailySessionId) {
      room.admittedGuests.set(dailySessionId, admittedGuest);
    }
    
    socket.join(`admitted-${guestId}`);

    console.log(`[GreenRoom] Guest ${name} registered as admitted in room ${roomId} with dailySessionId: ${dailySessionId}`);
  }

  getWaitingGuests(roomId: string): WaitingGuest[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.guests.values());
  }
}

export const greenRoomService = new GreenRoomService();
