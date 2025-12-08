const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");

dotenv.config();

const app = express();

// CORS: allow your frontend origin (adjust DOMAIN if needed)
const allowedOrigins = [
    "https://592panel.me",
    "http://100.125.209.53:8000",
    "http://localhost:8000"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

// Call user orders
app.use("/orders", require("./routes/orders"));

// Contact route
app.use(express.json());
app.use("/contact", require("./routes/contact"));

// JSON parsers
app.use(express.json());
app.use(bodyParser.raw({ type: "application/json" })); // needed for Stripe webhooks only

// Auth routes (ensure case matches file name)
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

// DB Connect
const connectDB = require("./utils/db.js");

connectDB().then(async () => {
    const { createActiveInventory } = require("./utils/inv.js");
    await createActiveInventory();
});

// Feed Frontend Inv
const productRoutes = require("./routes/products");
app.use("/products", productRoutes);

// Payments & Connect
const paymentRoutes = require("./routes/payments.js");
const connectRoutes = require("./routes/connect.js");

app.use("/payments", paymentRoutes);
app.use("/connect", connectRoutes);

app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on port 3000");
});