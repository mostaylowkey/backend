const express = require("express");
const router = express.Router();
const { InvProduct } = require("../utils/inv.js");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Helpers
const isStripeProductId = (id) => typeof id === "string" && id.startsWith("prod_");

// GET /products — existing inventory-backed list (unchanged)
router.get("/", async (req, res) => {
    try {
        const products = await InvProduct.find({});
        // Optional: normalize id to stripeId if your frontend expects that
        // const normalized = products.map((p) => ({
        //   ...p.toObject(),
        //   id: p.stripeId,
        // }));
        // return res.json(normalized);
        res.json(products);
    } catch (err) {
        req.log?.error({ err, request_id: req.id }, "Error fetching products from inv");
        res
            .status(500)
            .json({ error: "Failed to fetch products from inv collection", request_id: req.id });
    }
});

// GET /products/:productId — authoritative Stripe product detail using stripeId
router.get("/:productId", async (req, res) => {
    const stripeId = req.params.productId;

    if (!isStripeProductId(stripeId)) {
        return res.status(400).json({ error: "Invalid product id", request_id: req.id });
    }

    try {
        // Ensure this product is known/approved in your inventory
        const invProduct = await InvProduct.findOne({ stripeId });
        if (!invProduct) {
            return res.status(404).json({ error: "Product not found", request_id: req.id });
        }

        // Fetch product from Stripe
        const product = await stripe.products.retrieve(stripeId, { expand: ["default_price"] });
        if (!product || product.deleted) {
            return res.status(404).json({ error: "Product not found", request_id: req.id });
        }

        // Fetch active prices
        const pricesResp = await stripe.prices.list({
            product: stripeId,
            active: true,
            limit: 10,
        });
        if (!pricesResp.data.length) {
            return res.status(404).json({ error: "No active prices for product", request_id: req.id });
        }

        // Choose a price (lowest active by default)
        const sorted = pricesResp.data
            .filter((p) => p.unit_amount != null)
            .sort((a, b) => a.unit_amount - b.unit_amount);
        const chosen = sorted[0] || pricesResp.data[0];

        const payload = {
            id: product.id, // Stripe product id (prod_xxx)
            name: product.name,
            description: product.description,
            images: product.images,
            price: chosen.unit_amount,
            currency: chosen.currency,
        };

        res.json({ ...payload, request_id: req.id });
    } catch (err) {
        req.log?.error({ err, request_id: req.id, stripeId }, "Error fetching Stripe product");
        res.status(500).json({ error: "Failed to fetch product", request_id: req.id });
    }
});

module.exports = router;