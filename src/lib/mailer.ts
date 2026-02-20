import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOtpEmail = async (
  to: string,
  code: string,
  purpose: "NEW_DEVICE_LOGIN" | "EMAIL_VERIFICATION" | "PASSWORD_RESET"
) => {
  const subjects: Record<string, string> = {
    NEW_DEVICE_LOGIN: "New Device Login – Verification Code",
    EMAIL_VERIFICATION: "Verify Your Email – SmartStart Dairy",
    PASSWORD_RESET: "Reset Your Password – SmartStart Dairy",
  };

  const messages: Record<string, string> = {
    NEW_DEVICE_LOGIN: `A login attempt was made from a new device. Use this OTP to verify: <b>${code}</b>`,
    EMAIL_VERIFICATION: `Welcome! Please verify your email with this code: <b>${code}</b>`,
    PASSWORD_RESET: `Your password reset code is: <b>${code}</b>`,
  };

  await transporter.sendMail({
    from: `"SmartStart Dairy" <${process.env.SMTP_USER}>`,
    to,
    subject: subjects[purpose],
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1d4ed8">SmartStart Dairy™</h2>
        <p>${messages[purpose]}</p>
        <p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `,
  });
};

export const sendNotificationEmail = async (
  to: string,
  title: string,
  body: string
) => {
  await transporter.sendMail({
    from: `"SmartStart Dairy" <${process.env.SMTP_USER}>`,
    to,
    subject: title,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto"><h2>${title}</h2><p>${body}</p></div>`,
  });
};