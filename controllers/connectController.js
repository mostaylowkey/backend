const stripe = require("../stripe");
const dotenv = require("dotenv");
dotenv.config();

/**
 * Create a connected account
 */
const createAccount = async (req, res) => {
    try {
        const account = await stripe.accounts.create({
            type: "express",
        });
        res.json({ accountId: account.id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Send onboarding link
 */
const createOnboardingLink = async (req, res) => {
    const { accountId } = req.body;

    try {
        const link = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${process.env.DOMAIN}/onboarding/refresh`,
            return_url: `${process.env.DOMAIN}/onboarding/return`,
            type: "account_onboarding",
        });

        res.json({ url: link.url });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createAccount,
    createOnboardingLink
};