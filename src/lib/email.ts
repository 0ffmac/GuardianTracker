import nodemailer from "nodemailer";
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const secure = process.env.SMTP_SECURE === "true";
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM || "No Reply <no-reply@example.com>";
if (!host || !user || !pass) {
  console.warn("SMTP env vars are missing; emails will not be sent.");
}
const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
});
export async function sendVerificationEmail(to: string, url: string) {
  if (!host || !user || !pass) {
    console.log("DEV: verification email link:", url);
    return;
  }
  await transporter.sendMail({
    from,
    to,
    subject: "Verify your Guard Royal Tracking account",
    text: `Please verify your email by visiting this link: ${url}`,
    html: `
      <p>Hi,</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${url}">Verify my email</a></p>
      <p>If you didn’t create an account, you can ignore this email.</p>
    `,
  });
}