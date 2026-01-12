import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import { createAuthRoutes } from "./routes/auth";
import { createPaymentRoutes } from "./routes/payments";
import { createUsageRoutes } from "./routes/usage";
import { createBroadcastRoutes } from "./routes/broadcast";
import youtubeRoutes from "./routes/youtube";
import youtubeOAuthRoutes from "./routes/youtubeOAuth";
import twitchOAuthRoutes from "./routes/twitchOAuth";
import { AuthService } from "./services/AuthService";
import { StripeService } from "./services/StripeService";
import { UsageLimitService } from "./services/UsageLimitService";
import { BroadcastTrackingService } from "./services/BroadcastTrackingService";
import { rtmpStreamingService } from "./services/RTMPStreamingService";
import { greenRoomService } from "./services/GreenRoomService";
import { createDatabase } from "./db/database";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy (required for Railway and other reverse proxies)
  app.set('trust proxy', true);

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    })
  );

  // Body parsing middleware
  // Note: Stripe webhook needs raw body, so we handle it separately
  app.use(
    "/api/payments/webhook",
    express.raw({ type: "application/json" })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize database
  const db = await createDatabase();

  // Initialize services
  const authService = new AuthService(db);
  const stripeService = new StripeService(db);
  const usageLimitService = new UsageLimitService(db);
  const broadcastService = new BroadcastTrackingService(db);

  // Initialize RTMP Streaming WebSocket server
  rtmpStreamingService.initialize(server);
  console.log('📺 RTMP Streaming service initialized');

  // Initialize Green Room (Waiting Room) service
  greenRoomService.initialize(server);
  console.log('👥 Green Room service initialized');

  // API routes
  app.use("/api/auth", createAuthRoutes(authService));
  app.use("/api/payments", createPaymentRoutes(stripeService, authService));
  app.use("/api/usage", createUsageRoutes(usageLimitService, authService));
  app.use("/api/broadcast", createBroadcastRoutes(broadcastService, authService));
  app.use("/api/youtube", youtubeRoutes);
  app.use("/api/youtube", youtubeOAuthRoutes);
  app.use("/api/twitch", twitchOAuthRoutes);

  // Stream status endpoint
  app.get("/api/stream/status", (req, res) => {
    res.json({
      active: rtmpStreamingService.hasActiveStreams(),
      streams: rtmpStreamingService.getStats(),
    });
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      streaming: rtmpStreamingService.hasActiveStreams(),
    });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Rota especial para forcar refresh do cache
  app.get("/fresh", (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('X-Accel-Expires', '0');
    const fs = require('fs');
    const indexPath = path.join(staticPath, "index.html");
    const html = fs.readFileSync(indexPath, 'utf8');
    res.type('html').send(html);
  });

  // Handle client-side routing - serve index.html for all routes
  // This must be last to not interfere with API routes
  app.get("*", (req, res) => {
    // Don't serve index.html for API routes - they should have been handled above
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found', path: req.path });
    }
    // Disable caching for index.html to ensure fresh content
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = Number(process.env.PORT) || 3000;
  const httpServer = server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${port}/`);
    console.log(`📡 API available at http://localhost:${port}/api`);
    console.log(`📺 WebSocket streaming at ws://localhost:${port}/api/stream/ws`);
    console.log(`🎨 Frontend served from ${staticPath}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    rtmpStreamingService.stopAllStreams();
    await broadcastService.cleanup();
    httpServer.close(() => {
      console.log('HTTP server closed');
    });
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    rtmpStreamingService.stopAllStreams();
    await broadcastService.cleanup();
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer().catch(console.error);
