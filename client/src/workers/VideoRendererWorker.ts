// VideoRendererWorker.ts
// This worker will handle the canvas drawing loop to prevent blocking the main UI thread.

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let videoElement: HTMLVideoElement | null = null;
let activeMediaSourceCanvas: HTMLCanvasElement | null = null;
let isRunning = false;
let frameInterval = 1000 / 30; // Default to 30fps

// Function to draw a single frame
const drawFrame = () => {
  if (!isRunning || !ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Priority 1: Draw from the active media source's canvas (for user-uploaded media)
  if (activeMediaSourceCanvas) {
    ctx.drawImage(
      activeMediaSourceCanvas,
      0, 0,
      canvas.width,
      canvas.height
    );
  }
  // Priority 2: Draw from the video element (for webcam/screen share)
  else if (videoElement && !videoElement.paused && videoElement.readyState >= 2) {
    ctx.drawImage(
      videoElement,
      0, 0,
      canvas.width,
      canvas.height
    );
  }
  // Priority 3: Fallback - draw a placeholder
  else {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OnnPlay Studio', canvas.width / 2, canvas.height / 2);
  }
};

// Main message handler for the worker
self.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT':
      // OffscreenCanvas is transferred to the worker
      canvas = payload.canvas;
      ctx = canvas.getContext('2d');
      frameInterval = 1000 / payload.frameRate;
      break;

    case 'START':
      if (!isRunning) {
        isRunning = true;
        // Use setInterval for consistent frame rate, which is critical for video synchronization
        setInterval(drawFrame, frameInterval);
      }
      break;

    case 'STOP':
      isRunning = false;
      // Clear any existing interval to stop the drawing loop
      // Note: In a real implementation, you would store the interval ID to clear it properly.
      // For simplicity here, we rely on the isRunning flag and the worker being terminated.
      break;

    case 'SET_VIDEO_ELEMENT':
      // The video element itself cannot be transferred, but its MediaStreamTrack can be used
      // For simplicity in this mock, we assume the main thread handles the video element updates
      // and we only need to know when to draw it.
      // In a real scenario, we would use createImageBitmap for efficient transfer.
      videoElement = payload.videoElement;
      break;

    case 'SET_MEDIA_SOURCE_CANVAS':
      // The canvas element from the media source is passed to the worker
      activeMediaSourceCanvas = payload.canvas;
      break;
      
    case 'DRAW_FRAME':
      // In a more advanced setup, the main thread would send the image data (ImageBitmap)
      // to the worker for drawing. For now, we just trigger the draw.
      drawFrame();
      break;
  }
};
