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
  purpose: "NEW_DEVICE_LOGIN" | "EMAIL_VERIFICATION" | "PASSWORD_RESET",
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

export const sendInviteEmail = async (
  to: string,
  name: string,
  role: string,
  appUrl: string,
) => {
  const roleLabel: Record<string, string> = {
    STUDENT: "Student",
    ADMIN: "Administrator",
    SUPER_ADMIN: "Super Administrator",
    INSTRUCTOR: "Instructor",
  };
  await transporter.sendMail({
    from: `"SmartStart Dairy™" <${process.env.SMTP_USER}>`,
    to,
    subject: "You've been invited to SmartStart Dairy™",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#0f766e;margin-bottom:4px">SmartStart Dairy™</h2>
        <p style="color:#6b7280;font-size:13px;margin-top:0">Dairy Farming Education Platform</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
        <p>Hi <strong>${name}</strong>,</p>
        <p>You have been invited to join <strong>SmartStart Dairy™</strong> as a <strong>${roleLabel[role] ?? role}</strong>.</p>
        <p>Sign in with your Google account to access the platform:</p>
        <a href="${appUrl}/auth/login"
           style="display:inline-block;background:#0f766e;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0">
          Sign in with Google →
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  });
};

export const sendEnrollmentEmail = async (
  to: string,
  name: string,
  courseTitleEn: string,
  appUrl: string,
) => {
  await transporter.sendMail({
    from: `"SmartStart Dairy™" <${process.env.SMTP_USER}>`,
    to,
    subject: `You've been enrolled in ${courseTitleEn} — SmartStart Dairy™`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <h2 style="color:#0f766e;margin-bottom:4px">SmartStart Dairy™</h2>
        <p style="color:#6b7280;font-size:13px;margin-top:0">Dairy Farming Education Platform</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
        <p>Hi <strong>${name}</strong>,</p>
        <p>You have been enrolled in:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin:12px 0">
          <strong style="color:#166534">${courseTitleEn}</strong>
        </div>
        <p>Log in to start learning:</p>
        <a href="${appUrl}/courses"
           style="display:inline-block;background:#0f766e;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:8px 0">
          Go to My Courses →
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          SmartStart Dairy™ · DTRI
        </p>
      </div>
    `,
  });
};

export const sendNotificationEmail = async (
  to: string,
  title: string,
  body: string,
) => {
  await transporter.sendMail({
    from: `"SmartStart Dairy" <${process.env.SMTP_USER}>`,
    to,
    subject: title,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto"><h2>${title}</h2><p>${body}</p></div>`,
  });
};
