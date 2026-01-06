const stripe = require("../stripe.js");
const dotenv = require("dotenv");
const { InvProduct } = require("../utils/inv.js");

dotenv.config();

/**
 * Helper: choose an active Stripe price for a product
 * Strategy: pick the lowest active price with a unit_amount; fallback to first active.
 */
async function pickActivePrice(stripeProductId) {
    const pricesResp = await stripe.prices.list({
        product: stripeProductId,
        active: true,
        limit: 10,
    });

    if (!pricesResp.data.length) return null;

    const sorted = pricesResp.data
        .filter((p) => p.unit_amount != null)
        .sort((a, b) => a.unit_amount - b.unit_amount);

    return sorted[0] || pricesResp.data[0];
}

/**
 * Create Checkout Session
 * - Validates productId (Stripe prod_...) and quantity
 * - Confirms product exists in inventory (InvProduct.stripeId)
 * - Fetches an active Stripe price for that product
 * - Creates a hosted Stripe Checkout Session with metadata
 */
const createCheckoutSession = async (req, res) => {
    const request_id = req.id;
    const { productId, quantity = 1 } = req.body || {};

    try {
        if (typeof productId !== "string" || !productId.startsWith("prod_")) {
            return res.status(400).json({ error: "Invalid product id", request_id });
        }

        const qty = Number(quantity);
        if (!Number.isInteger(qty) || qty <= 0) {
            return res.status(400).json({ error: "Invalid quantity", request_id });
        }

        // Ensure this product is known/approved in your inventory
        const invProduct = await InvProduct.findOne({ stripeId: productId });
        if (!invProduct) {
            return res.status(404).json({ error: "Product not found", request_id });
        }

        // Fetch product to ensure it exists and isn’t deleted
        const product = await stripe.products.retrieve(productId, { expand: ["default_price"] });
        if (!product || product.deleted) {
            return res.status(404).json({ error: "Product not available", request_id });
        }

        // Pick an active price for this product
        const chosenPrice = await pickActivePrice(productId);
        if (!chosenPrice) {
            return res.status(404).json({ error: "No active price for product", request_id });
        }

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: chosenPrice.id,
                    quantity: qty,
                },
            ],
            metadata: {
                stripe_product_id: product.id,
                product_name: product.name,
            },
            success_url: `${process.env.DOMAIN}/success`,
            cancel_url: `${process.env.DOMAIN}/cancel`,
        });

        return res.json({ url: session.url, request_id });
    } catch (err) {
        req.log?.error({ err, request_id, productId }, "Failed to create checkout session");
        return res.status(400).json({ error: err.message || "Checkout failed", request_id });
    }
};

/**
 * Stripe Webhooks
 * - Assumes raw body middleware is applied before this route
 */
const handleWebhooks = (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        req.log?.error({ err }, "Webhook signature verification failed");
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        req.log?.info({ session_id: session.id, metadata: session.metadata }, "Payment complete");
        // TODO: Update internal order state here
    }

    res.json({ received: true });
};

module.exports = {
    createCheckoutSession,
    handleWebhooks,
};