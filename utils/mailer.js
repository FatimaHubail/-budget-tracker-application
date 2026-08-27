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
        from: `"DinarWise" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `You've been invited to join ${groupName} on DinarWise`,
        // a plain-text alternative and descriptive link text (instead of a bare
        // "click here") both help this land in the inbox instead of spam
        text: `You've been invited to join the group "${groupName}" on DinarWise.\n\n` +
            `View your invitation: ${inviteLink}\n\n` +
            `If you weren't expecting this, you can safely ignore this email.`,
        html: `
            <p>You've been invited to join the group <strong>${groupName}</strong> on DinarWise.</p>
            <p><a href="${inviteLink}">View your invitation</a></p>
            <p style="color:#666; font-size: 0.85em;">If the link above doesn't work, copy and paste this URL into your browser:<br>${inviteLink}</p>
            <p style="color:#999; font-size: 0.8em;">If you weren't expecting this, you can safely ignore this email.</p>
        `
    });
}

module.exports = { sendInviteEmail };