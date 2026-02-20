import crypto from "crypto";

export const generateOtp = (): string => {
  return String(crypto.randomInt(100000, 999999));
};

export const generateDeviceFingerprint = (
  userAgent: string,
  platform: string,
  acceptLanguage: string
): string => {
  return crypto
    .createHash("sha256")
    .update(`${userAgent}|${platform}|${acceptLanguage}`)
    .digest("hex");
};

export const generateInviteCode = (prefix = "DAIRY"): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${code}`;
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};