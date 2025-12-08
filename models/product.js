const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    stripeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true }, // store in cents
    currency: { type: String, default: "usd" },
    description: { type: String },
    image: { type: String },
    createdAt: { type: Date, default: Date.now },
}, { collection: "products" });

// Use this to prevent OverwriteModelError
module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
