# OnnPlay Studio - Integration Guide

## 🚀 Quick Start

Este guia fornece instruções passo a passo para integrar as funcionalidades pendentes no OnnPlay Studio.

---

## 1️⃣ Daily.co Video Conferencing

### Prerequisites
- Conta no Daily.co (https://daily.co)
- API Key do Daily.co

### Installation

```bash
cd /home/ubuntu/onnplay-studio/client
npm install @daily-co/daily-js
```

### Configuration

**1. Add environment variable:**

Create `.env` file in `/client/`:
```env
VITE_DAILY_API_KEY=your_daily_api_key_here
```

**2. Update DailyContext.tsx:**

```typescript
// Replace line 1 with:
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

// Replace joinRoom function (around line 62):
const joinRoom = useCallback(async (url: string, userName: string = 'User') => {
  setIsConnecting(true);
  setError(null);

  try {
    // Create Daily call object
    const daily = DailyIframe.createCallObject();
    
    // Setup event listeners
    daily.on('joined-meeting', handleJoinedMeeting);
    daily.on('participant-joined', handleParticipantJoined);
    daily.on('participant-left', handleParticipantLeft);
    daily.on('participant-updated', handleParticipantUpdated);
    daily.on('error', handleError);

    // Join the room
    await daily.join({ url, userName });
    
    setCallObject(daily);
    setRoomUrl(url);
    setIsConnected(true);
    setIsConnecting(false);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to join room');
    setIsConnecting(false);
  }
}, []);
```

**3. Implement event handlers:**

```typescript
const handleJoinedMeeting = useCallback(() => {
  console.log('✅ Joined Daily.co meeting');
}, []);

const handleParticipantJoined = useCallback((event: any) => {
  const participant: Participant = {
    id: event.participant.session_id,
    name: event.participant.user_name || 'Guest',
    isMuted: !event.participant.audio,
    isCameraOff: !event.participant.video,
    isSpeaking: false,
    isLocal: event.participant.local,
    videoTrack: event.participant.tracks?.video?.track,
    audioTrack: event.participant.tracks?.audio?.track,
  };
  
  setParticipants(prev => [...prev, participant]);
}, []);

const handleParticipantLeft = useCallback((event: any) => {
  setParticipants(prev => 
    prev.filter(p => p.id !== event.participant.session_id)
  );
}, []);

const handleParticipantUpdated = useCallback((event: any) => {
  setParticipants(prev => 
    prev.map(p => {
      if (p.id === event.participant.session_id) {
        return {
          ...p,
          isMuted: !event.participant.audio,
          isCameraOff: !event.participant.video,
        };
      }
      return p;
    })
  );
}, []);

const handleError = useCallback((error: any) => {
  console.error('Daily.co error:', error);
  setError(error.message);
}, []);
```

### Testing

```typescript
// In your component:
const { joinRoom } = useDailyContext();

// Join a room
await joinRoom('https://your-domain.daily.co/room-name', 'Your Name');
```

---

## 2️⃣ Canvas Capture & Recording

### Implementation

**1. Create ProgramCanvas component:**

Create `/client/src/components/studio/ProgramCanvas.tsx`:

```typescript
import React, { useRef, useEffect } from 'react';
import { useDailyContext } from '../../contexts/DailyContext';

interface ProgramCanvasProps {
  width?: number;
  height?: number;
}

export const ProgramCanvas: React.FC<ProgramCanvasProps> = ({
  width = 1920,
  height = 1080,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { participants } = useDailyContext();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render loop
    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Draw participants based on layout
      // TODO: Implement layout rendering
      
      requestAnimationFrame(render);
    };

    render();
  }, [participants, width, height]);

  return (
    <canvas
      ref={canvasRef}
      id="program-canvas"
      width={width}
      height={height}
      style={{ display: 'none' }}
    />
  );
};
```

**2. Update RecordingService to use canvas:**

```typescript
// In RecordingService.startRecording():
async startRecording(config: RecordingConfig): Promise<void> {
  const canvas = document.getElementById('program-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Program canvas not found');
  }

  // Capture stream from canvas
  const stream = canvas.captureStream(30); // 30 fps

  // Create MediaRecorder
  this.mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 6000000, // 6 Mbps
  });

  // Handle data
  this.mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      this.recordedChunks.push(event.data);
    }
  };

  // Start recording
  this.mediaRecorder.start(1000); // Collect data every second

  // Update state
  this.state = {
    isRecording: true,
    startTime: new Date(),
    duration: 0,
    fileSize: 0,
    fileName: `recording-${Date.now()}.${config.format}`,
  };

  // Start duration counter
  this.durationInterval = setInterval(() => {
    if (this.state.startTime) {
      this.state.duration = Math.floor(
        (Date.now() - this.state.startTime.getTime()) / 1000
      );
      this.notifyListeners();
    }
  }, 1000);

  this.notifyListeners();
}
```

**3. Add ProgramCanvas to Home.tsx:**

```typescript
import { ProgramCanvas } from '../components/studio/ProgramCanvas';

// Inside Home component:
return (
  <div>
    {/* Existing UI */}
    
    {/* Hidden canvas for recording/streaming */}
    <ProgramCanvas width={1920} height={1080} />
  </div>
);
```

---

## 3️⃣ Streaming Backend

### Architecture

```
Frontend → WebSocket → Backend → RTMP Server → Platform
```

### Backend Setup

**1. Create backend service:**

```bash
mkdir backend
cd backend
npm init -y
npm install express ws node-media-server dotenv
```

**2. Create server.js:**

```javascript
const express = require('express');
const WebSocket = require('ws');
const NodeMediaServer = require('node-media-server');

const app = express();
const PORT = process.env.PORT || 3001;

// RTMP Server configuration
const nms = new NodeMediaServer({
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*'
  },
  trans: {
    ffmpeg: '/usr/bin/ffmpeg',
    tasks: []
  }
});

// WebSocket server
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case 'start-stream':
        handleStartStream(data.destination);
        break;
      case 'stop-stream':
        handleStopStream(data.destinationId);
        break;
      case 'stream-data':
        handleStreamData(data.chunk);
        break;
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

function handleStartStream(destination) {
  // Configure RTMP output
  const task = {
    app: 'live',
    mode: 'push',
    edge: destination.streamUrl,
    name: destination.id
  };
  
  nms.config.trans.tasks.push(task);
  console.log('Stream started:', destination.platform);
}

function handleStopStream(destinationId) {
  // Remove RTMP output
  nms.config.trans.tasks = nms.config.trans.tasks.filter(
    t => t.name !== destinationId
  );
  console.log('Stream stopped:', destinationId);
}

function handleStreamData(chunk) {
  // Process incoming video data
  // Forward to RTMP server
}

// Start servers
nms.run();
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`WebSocket running on port 8080`);
  console.log(`RTMP server running on port 1935`);
});
```

**3. Update StreamingService to use WebSocket:**

```typescript
// In StreamingService.ts
private ws: WebSocket | null = null;

async startStream(destinationId: string): Promise<void> {
  const destination = this.destinations.get(destinationId);
  if (!destination) throw new Error('Destination not found');

  // Connect to backend WebSocket
  this.ws = new WebSocket('ws://localhost:8080');

  this.ws.onopen = () => {
    // Send start stream command
    this.ws?.send(JSON.stringify({
      type: 'start-stream',
      destination: {
        id: destination.id,
        platform: destination.platform,
        streamUrl: this.getStreamUrl(destination),
        streamKey: destination.streamKey,
      }
    }));
  };

  // Capture canvas and send data
  const canvas = document.getElementById('program-canvas') as HTMLCanvasElement;
  const stream = canvas.captureStream(30);
  
  // TODO: Encode and send stream data via WebSocket
}

private getStreamUrl(destination: StreamDestination): string {
  const urls: Record<string, string> = {
    youtube: 'rtmp://a.rtmp.youtube.com/live2',
    facebook: 'rtmps://live-api-s.facebook.com:443/rtmp',
    twitch: 'rtmp://live.twitch.tv/app',
  };
  
  return destination.streamUrl || urls[destination.platform] || '';
}
```

### Deployment

Deploy backend to Railway, Heroku, or your preferred platform.

Update frontend `.env`:
```env
VITE_BACKEND_URL=https://your-backend.com
VITE_WEBSOCKET_URL=wss://your-backend.com
```

---

## 4️⃣ PTZ Camera Control

### Requirements

- PTZ camera with API support
- Camera SDK or HTTP API

### Example Implementation

**1. Create PTZCameraService:**

```typescript
// /client/src/services/PTZCameraService.ts

export class PTZCameraService {
  private cameraUrl: string;
  private apiKey: string;

  constructor(cameraUrl: string, apiKey: string) {
    this.cameraUrl = cameraUrl;
    this.apiKey = apiKey;
  }

  async pan(direction: 'left' | 'right', speed: number = 50) {
    await this.sendCommand({
      action: 'pan',
      direction,
      speed,
    });
  }

  async tilt(direction: 'up' | 'down', speed: number = 50) {
    await this.sendCommand({
      action: 'tilt',
      direction,
      speed,
    });
  }

  async zoom(direction: 'in' | 'out', speed: number = 50) {
    await this.sendCommand({
      action: 'zoom',
      direction,
      speed,
    });
  }

  async savePreset(presetId: number) {
    await this.sendCommand({
      action: 'save-preset',
      presetId,
    });
  }

  async recallPreset(presetId: number) {
    await this.sendCommand({
      action: 'recall-preset',
      presetId,
    });
  }

  private async sendCommand(command: any) {
    const response = await fetch(`${this.cameraUrl}/api/ptz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error('PTZ command failed');
    }

    return response.json();
  }
}
```

**2. Integrate with CameraControl component:**

```typescript
// In CameraControl.tsx
import { PTZCameraService } from '../../services/PTZCameraService';

const ptzService = new PTZCameraService(
  process.env.VITE_PTZ_CAMERA_URL!,
  process.env.VITE_PTZ_API_KEY!
);

const handlePan = async (direction: 'left' | 'right') => {
  await ptzService.pan(direction, 50);
};
```

---

## 5️⃣ Environment Variables Summary

Create `/client/.env`:

```env
# Daily.co
VITE_DAILY_API_KEY=your_daily_api_key

# Backend
VITE_BACKEND_URL=https://your-backend.com
VITE_WEBSOCKET_URL=wss://your-backend.com

# PTZ Camera (optional)
VITE_PTZ_CAMERA_URL=http://camera-ip:port
VITE_PTZ_API_KEY=your_camera_api_key

# YouTube (for streaming)
VITE_YOUTUBE_RTMP_URL=rtmp://a.rtmp.youtube.com/live2

# Facebook (for streaming)
VITE_FACEBOOK_RTMP_URL=rtmps://live-api-s.facebook.com:443/rtmp

# Twitch (for streaming)
VITE_TWITCH_RTMP_URL=rtmp://live.twitch.tv/app
```

---

## 6️⃣ Testing Checklist

### Daily.co Integration
- [ ] Join room successfully
- [ ] See local video
- [ ] See remote participants (up to 20)
- [ ] Audio/video controls work
- [ ] Screen sharing works
- [ ] Participants list updates in real-time

### Recording
- [ ] Start recording
- [ ] Duration counter updates
- [ ] Stop recording
- [ ] File downloads automatically
- [ ] Video quality is good
- [ ] Audio is synchronized

### Streaming
- [ ] Add destination (YouTube/Facebook/RTMP)
- [ ] Start stream
- [ ] Status updates to "live"
- [ ] Stream is visible on platform
- [ ] Stop stream
- [ ] Multiple destinations work simultaneously

### PTZ Camera
- [ ] Pan left/right
- [ ] Tilt up/down
- [ ] Zoom in/out
- [ ] Save preset
- [ ] Recall preset
- [ ] Smooth movements

---

## 7️⃣ Troubleshooting

### Daily.co Issues

**Problem:** "Failed to join room"
- Check API key is correct
- Verify room URL format
- Check network connection
- Review browser console for errors

**Problem:** "No video/audio"
- Check browser permissions
- Verify camera/microphone access
- Check Daily.co dashboard for room status

### Recording Issues

**Problem:** "Program canvas not found"
- Ensure ProgramCanvas component is rendered
- Check canvas ID matches
- Verify canvas is in DOM

**Problem:** "Recording file is empty"
- Check MediaRecorder support in browser
- Verify canvas is rendering content
- Check codec compatibility

### Streaming Issues

**Problem:** "Connection refused"
- Verify backend is running
- Check WebSocket URL
- Review firewall settings

**Problem:** "Stream not appearing on platform"
- Verify stream key is correct
- Check RTMP URL format
- Review platform streaming settings
- Check backend logs

---

## 8️⃣ Support Resources

- **Daily.co Docs:** https://docs.daily.co/
- **MediaRecorder API:** https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- **Canvas API:** https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **WebSocket API:** https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Node Media Server:** https://github.com/illuspas/Node-Media-Server

---

## 9️⃣ Next Steps After Integration

1. **Performance Optimization**
   - Optimize canvas rendering
   - Reduce memory usage
   - Improve encoding efficiency

2. **Error Handling**
   - Add retry logic
   - Implement fallbacks
   - Better error messages

3. **User Experience**
   - Loading states
   - Progress indicators
   - Helpful tooltips

4. **Testing**
   - Unit tests
   - Integration tests
   - End-to-end tests

5. **Documentation**
   - User guide
   - API documentation
   - Video tutorials

---

**Good luck with your integrations! 🚀**
