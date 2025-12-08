const stripe = require("../stripe.js");
const dotenv = require("dotenv");
dotenv.config();

/**
 * Create Checkout Session
 */
const createCheckoutSession = async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: { name: "My Product" },
                        unit_amount: 1000, // $10.00
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.DOMAIN}/success`,
            cancel_url: `${process.env.DOMAIN}/cancel`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Stripe Webhooks
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
        console.log("Webhook error:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        console.log("Payment complete:", session);
    }

    res.json({ received: true });
};

module.exports = {
    createCheckoutSession,
    handleWebhooks
};