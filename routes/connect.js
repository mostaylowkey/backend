const express = require("express");
const {
    createAccount,
    createOnboardingLink
} = require("../controllers/connectController.js");

const router = express.Router();

router.post("/create-account", createAccount);
router.post("/onboard", createOnboardingLink);

module.exports = router;
