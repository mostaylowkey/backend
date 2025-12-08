const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",  // or smtp provider
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

module.exports = transporter;
