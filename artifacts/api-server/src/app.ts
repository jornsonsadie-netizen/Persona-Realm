import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res: any) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cookieParser());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files statically
const isVercel = !!process.env.VERCEL || !!process.env.LAMBDA_TASK_ROOT || __dirname.includes("/var/task");
const uploadsDir = isVercel ? "/tmp/uploads" : path.join(__dirname, "..", "uploads");

if (isVercel) {
  logger.info({ uploadsDir }, "Vercel environment detected, using ephemeral uploads directory");
}

// Log DB host for debugging (safe part of URL)
if (process.env.DATABASE_URL) {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    logger.info(`[DEBUG] DB Host: ${dbUrl.host}`);
  } catch (e) {
    logger.warn("[DEBUG] DATABASE_URL is set but could not be parsed as a URL");
  }
} else {
  logger.error("[DEBUG] DATABASE_URL is NOT set in environment variables");
}

app.use("/api/uploads/files", express.static(uploadsDir));

app.use("/api", router);

export default app;
