const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendInviteEmail(toEmail, inviteLink, groupName) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: `You've been invited to join ${groupName} on DinarWise`,
        html: `
            <p>You've been invited to join the group <strong>${groupName}</strong> on DinarWise.</p>
            <p><a href="${inviteLink}">Click here to accept or decline</a></p>
        `
    });
}

module.exports = { sendInviteEmail };