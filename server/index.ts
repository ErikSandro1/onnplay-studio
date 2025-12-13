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
import { AuthService } from "./services/AuthService";
import { StripeService } from "./services/StripeService";
import { UsageLimitService } from "./services/UsageLimitService";
import { BroadcastTrackingService } from "./services/BroadcastTrackingService";
import { createDatabase } from "./db/database";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

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

  // API routes
  app.use("/api/auth", createAuthRoutes(authService));
  app.use("/api/payments", createPaymentRoutes(stripeService, authService));
  app.use("/api/usage", createUsageRoutes(usageLimitService, authService));
  app.use("/api/broadcast", createBroadcastRoutes(broadcastService, authService));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  // This must be last to not interfere with API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}/`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`🎨 Frontend served from ${publicPath}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await broadcastService.cleanup();
    server.close(() => {
      console.log('HTTP server closed');
    });
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    await broadcastService.cleanup();
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });rtServer().catch(console.error);
