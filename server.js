// ===============================
//  Imports & Setup
// ===============================
const http = require("http");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const pino = require("pino");
const pinoHttp = require("pino-http");
const crypto = require("crypto");
const mongoose = require("mongoose");

dotenv.config();

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// ===============================
//  Environment Contract (names only)
//  NODE_ENV, PORT, DOMAIN, MONGODB_URI, JWT_SECRET,
//  STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MAIL_USER, MAIL_PASS,
//  CORS_ORIGINS, INVENTORY_SYNC_ON_BOOT, LOG_LEVEL
// ===============================
const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = Number(process.env.PORT) || 3000;
const DOMAIN = process.env.DOMAIN || "api.592panel.me";
const INVENTORY_SYNC_ON_BOOT =
    (process.env.INVENTORY_SYNC_ON_BOOT || "").toLowerCase() === "true";

// ===============================
//  Logging (request IDs + structured logs)
// ===============================
const genReqId = (req) =>
    req.headers["x-request-id"] ||
    crypto.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

app.use(
    pinoHttp({
        logger,
        genReqId,
        customSuccessMessage: (req, res) =>
            `${req.method} ${req.url} -> ${res.statusCode}`,
        customErrorMessage: (req, res, err) =>
            `${req.method} ${req.url} -> ${res.statusCode || 500} ${err.message}`,
        serializers: {
            req(req) {
                return {
                    id: req.id,
                    method: req.method,
                    url: req.url,
                };
            },
            res(res) {
                return {
                    statusCode: res.statusCode,
                };
            },
        },
        autoLogging: true,
    })
);

// ===============================
//  Security & Performance Middleware
// ===============================
app.set("trust proxy", 1); // behind proxy/CDN
app.use(helmet());
app.use(compression());

// Stripe webhook needs raw body BEFORE express.json
app.use("/payments/webhook", express.raw({ type: "application/json" }));

// Body parser with limits
app.use(
    express.json({
        limit: "1mb",
    })
);

// ===============================
//  CORS (environment-aware)
// ===============================
const parseOrigins = (value = "") =>
    value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

const prodAllowed = parseOrigins(process.env.CORS_ORIGINS);
const devAllowed = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://169.254.83.107:8000",
];

const corsOptions = {
    origin(origin, callback) {
        // Allow non-browser / same-origin (no Origin header)
        if (!origin) return callback(null, true);

        const allowList = NODE_ENV === "production" ? prodAllowed : devAllowed;
        const allowed = allowList.includes(origin);

        if (allowed) return callback(null, true);

        // Log blocked origin with request id
        logger.warn({ origin, request_id: this?.req?.id }, "Blocked CORS origin");
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
};
app.use(cors(corsOptions));

// ===============================
//  Routes
// ===============================
app.use("/auth", require("./routes/Auth"));
app.use("/orders", require("./routes/orders"));
app.use("/contact", require("./routes/contact"));
app.use("/products", require("./routes/products"));
app.use("/payments", require("./routes/payments"));

// ===============================
//  Database & Readiness
// ===============================
const connectDB = require("./utils/db");

let depsReady = false;
let server; // will hold http server instance

async function start() {
    try {
        await connectDB();
        depsReady = true;
        logger.info("Mongo connected");

        // Start server only after deps are ready
        server = http.createServer(app);

        // Timeouts: keep-alive and headers (can tune as needed)
        server.keepAliveTimeout = 65000; // 65s (behind proxies)
        server.headersTimeout = 66000; // a bit higher than keepAliveTimeout

        server.listen(PORT, "0.0.0.0", () => {
            logger.info(`API Server running on port ${PORT}`);
            if (INVENTORY_SYNC_ON_BOOT) {
                runInventorySync();
            } else {
                logger.info("Inventory sync skipped (INVENTORY_SYNC_ON_BOOT != true)");
            }
        });

        setupGracefulShutdown();
    } catch (err) {
        logger.error({ err }, "Failed to start server");
        process.exit(1);
    }
}

async function runInventorySync() {
    try {
        const start = Date.now();
        const { createActiveInventory } = require("./utils/inv");
        await createActiveInventory();
        logger.info(
            { duration_ms: Date.now() - start },
            "💾 Inventory sync completed"
        );
    } catch (err) {
        logger.error({ err }, "Inventory sync failed");
    }
}

// ===============================
//  Health / Ready Endpoints
// ===============================
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "api", domain: DOMAIN });
});

app.get("/ready", (req, res) => {
    if (!depsReady) {
        return res.status(503).json({ status: "not_ready", request_id: req.id });
    }
    res.json({ status: "ready", request_id: req.id });
});

// Root ping (kept for backwards compatibility)
app.get("/", (req, res) => {
    res.json({
        status: "OK",
        message: "API is running",
        domain: DOMAIN,
    });
});

// ===============================
//  404 & Error Handling
// ===============================
app.use((req, res, next) => {
    res.status(404).json({ error: "Not found", request_id: req.id });
});

app.use((err, req, res, next) => {
    logger.error({ err, request_id: req.id }, "Unhandled error");
    res
        .status(err.status || 500)
        .json({ error: "Internal server error", request_id: req.id });
});

// Unhandled rejections / exceptions -> log and exit (let PM2/K8s restart)
process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled Rejection");
    shutdown(1);
});
process.on("uncaughtException", (err) => {
    logger.error({ err }, "Uncaught Exception");
    shutdown(1);
});

// ===============================
//  Graceful Shutdown
// ===============================
function setupGracefulShutdown() {
    ["SIGTERM", "SIGINT"].forEach((signal) => {
        process.on(signal, () => {
            logger.info({ signal }, "Received shutdown signal");
            shutdown(0);
        });
    });
}

function shutdown(code) {
    if (server) {
        server.close(() => {
            logger.info("HTTP server closed");
            mongoose.connection
                .close(false)
                .then(() => {
                    logger.info("Mongo connection closed");
                    process.exit(code);
                })
                .catch((err) => {
                    logger.error({ err }, "Error closing Mongo connection");
                    process.exit(code || 1);
                });
        });

        // Fallback timeout
        setTimeout(() => {
            logger.error("Forced shutdown after timeout");
            process.exit(code || 1);
        }, 10000).unref();
    } else {
        process.exit(code);
    }
}

// ===============================
//  Stripe Webhook Note
//  - Raw body middleware is mounted before express.json()
//  - Signature validation stays in controller (payments route)
// ===============================

// Kick off start
start();