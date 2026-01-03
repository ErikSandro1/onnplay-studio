// PreWarmService.ts - Serviço de pré-aquecimento para YouTube Live
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface PreWarmSession {
  broadcastId: string;
  streamId: string;
  rtmpUrl: string;
  streamKey: string;
  ffmpegProcess: ChildProcess | null;
  isActive: boolean;
  isReady: boolean;
  userId: string;
  accountId: string;
}

// Store active pre-warm sessions
const preWarmSessions = new Map<string, PreWarmSession>();

// Default logo path
const DEFAULT_LOGO_PATH = path.join(process.cwd(), 'server/assets/waiting_screen.png');

export class PreWarmService {
  /**
   * Start pre-warming a stream after broadcast is created
   * This sends a logo image to YouTube so the stream becomes "active"
   */
  static startPreWarm(
    broadcastId: string,
    streamId: string,
    rtmpUrl: string,
    streamKey: string,
    userId: string,
    accountId: string,
    customImagePath?: string
  ): void {
    console.log(`[PreWarm] Starting pre-warm for broadcast: ${broadcastId}`);
    
    // Build full RTMP URL
    const fullRtmpUrl = `${rtmpUrl}/${streamKey}`;
    
    // Determine which image to use
    let imagePath = customImagePath || DEFAULT_LOGO_PATH;
    
    // Check if image exists, fallback to color if not
    const useImage = fs.existsSync(imagePath);
    
    if (useImage) {
      console.log(`[PreWarm] Using image: ${imagePath}`);
    } else {
      console.log(`[PreWarm] Image not found, using default color`);
    }
    
    // FFmpeg command to send logo image or test pattern
    let ffmpegArgs: string[];
    
    if (useImage) {
      // Use image as input - loop it to create continuous stream
      ffmpegArgs = [
        // Input: Loop the image
        '-re',
        '-loop', '1',
        '-i', imagePath,
        '-f', 'lavfi',
        '-i', 'anullsrc=r=44100:cl=stereo',
        
        // Video encoding
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'stillimage',
        '-b:v', '3000k',
        '-maxrate', '3000k',
        '-bufsize', '6000k',
        '-g', '60',
        '-keyint_min', '60',
        '-sc_threshold', '0',
        '-profile:v', 'main',
        '-level', '4.1',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2',
        '-r', '30',
        
        // Audio encoding
        '-c:a', 'aac',
        '-b:a', '64k',
        '-ar', '44100',
        '-ac', '2',
        
        // Duration limit (1 hour max for pre-warm)
        '-t', '3600',
        
        // Output
        '-f', 'flv',
        '-flvflags', 'no_duration_filesize',
        fullRtmpUrl
      ];
    } else {
      // Fallback: Generate black screen with text
      ffmpegArgs = [
        '-re',
        '-f', 'lavfi',
        '-i', 'color=c=0x1a1a2e:s=1280x720:r=30:d=3600',
        '-f', 'lavfi',
        '-i', 'anullsrc=r=44100:cl=stereo',
        
        // Add text overlay
        '-vf', "drawtext=text='A live começará em breve...':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2",
        
        // Video encoding
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-b:v', '3000k',
        '-maxrate', '3000k',
        '-bufsize', '6000k',
        '-g', '60',
        '-keyint_min', '60',
        '-sc_threshold', '0',
        '-profile:v', 'main',
        '-level', '4.1',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        
        // Audio encoding
        '-c:a', 'aac',
        '-b:a', '64k',
        '-ar', '44100',
        '-ac', '2',
        
        // Output
        '-f', 'flv',
        '-flvflags', 'no_duration_filesize',
        fullRtmpUrl
      ];
    }
    
    console.log(`[PreWarm] Starting FFmpeg pre-warm to: ${rtmpUrl}/****`);
    
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Store session
    const session: PreWarmSession = {
      broadcastId,
      streamId,
      rtmpUrl,
      streamKey,
      ffmpegProcess,
      isActive: true,
      isReady: false,
      userId,
      accountId
    };
    
    preWarmSessions.set(broadcastId, session);
    
    // Monitor FFmpeg output
    ffmpegProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('speed=') && output.includes('bitrate=')) {
        if (!session.isReady) {
          console.log(`[PreWarm] Stream ${broadcastId} is sending data`);
        }
      }
      // Log errors
      if (output.includes('Error') || output.includes('error')) {
        console.error(`[PreWarm] FFmpeg error: ${output}`);
      }
    });
    
    ffmpegProcess.on('close', (code) => {
      console.log(`[PreWarm] FFmpeg closed for ${broadcastId} with code ${code}`);
      session.isActive = false;
    });
    
    ffmpegProcess.on('error', (err) => {
      console.error(`[PreWarm] FFmpeg error for ${broadcastId}:`, err);
      session.isActive = false;
    });
  }
  
  /**
   * Mark a pre-warm session as ready (stream is active on YouTube)
   */
  static markReady(broadcastId: string): void {
    const session = preWarmSessions.get(broadcastId);
    if (session) {
      session.isReady = true;
      console.log(`[PreWarm] Broadcast ${broadcastId} is ready for instant go-live!`);
    }
  }
  
  /**
   * Check if a broadcast is pre-warmed and ready
   */
  static isReady(broadcastId: string): boolean {
    const session = preWarmSessions.get(broadcastId);
    return session?.isReady || false;
  }
  
  /**
   * Check if a broadcast has an active pre-warm session
   */
  static hasSession(broadcastId: string): boolean {
    return preWarmSessions.has(broadcastId);
  }
  
  /**
   * Stop pre-warm stream (called when real stream takes over)
   */
  static stopPreWarm(broadcastId: string): void {
    const session = preWarmSessions.get(broadcastId);
    if (session) {
      console.log(`[PreWarm] Stopping pre-warm for broadcast: ${broadcastId}`);
      if (session.ffmpegProcess && session.isActive) {
        session.ffmpegProcess.kill('SIGTERM');
      }
      preWarmSessions.delete(broadcastId);
    }
  }
  
  /**
   * Get session info
   */
  static getSession(broadcastId: string): PreWarmSession | undefined {
    return preWarmSessions.get(broadcastId);
  }
  
  /**
   * Clean up all sessions for a user
   */
  static cleanupUser(userId: string): void {
    for (const [broadcastId, session] of preWarmSessions.entries()) {
      if (session.userId === userId) {
        this.stopPreWarm(broadcastId);
      }
    }
  }
}

export { preWarmSessions, PreWarmSession };
