import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth";
import emails from "./routes/emails";
import webhook from "./routes/webhook";
import folders from "./routes/folders";
import contacts from "./routes/contacts";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for frontend
app.use("/*", cors({
  origin: "*", // In production, replace with your frontend domain
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Health check
app.get("/api/health", (c) => c.json({
  status: "ok",
  timestamp: new Date().toISOString()
}));

// Mount routes
app.route("/api/auth", auth);
app.route("/api/emails", emails);
app.route("/api/folders", folders);
app.route("/api/contacts", contacts);
app.route("/api/webhook", webhook);

// 404 handler
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
