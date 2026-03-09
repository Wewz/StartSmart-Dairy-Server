import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash, randomUUID } from "crypto";

type CreateUploadUrlInput = {
  folder: string;
  filename: string;
  mimeType: string;
};

type UploadUrlResult = {
  /** Where the client should upload the file */
  uploadUrl: string;
  /** Unique key/public_id for the file */
  key: string;
  /** Alias for key — used as fileId in DB */
  fileId: string;
  /** Public URL to access the file after upload */
  publicUrl: string;
  /** Provider-specific: "spaces" | "cloudinary" */
  provider: "spaces" | "cloudinary";
  /** Cloudinary-only fields for signed upload */
  cloudinary?: {
    apiKey: string;
    signature: string;
    timestamp: number;
    publicId: string;
    folder: string;
  };
};

function normalizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

// ─── DO Spaces ────────────────────────────────────────────────────────────────

function getS3Client() {
  const endpoint = process.env.SPACES_ENDPOINT;
  const region = process.env.SPACES_REGION || "sgp1";
  const accessKeyId = process.env.SPACES_KEY;
  const secretAccessKey = process.env.SPACES_SECRET;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Storage is not configured. Set SPACES_ENDPOINT, SPACES_KEY, and SPACES_SECRET",
    );
  }

  return new S3Client({
    region,
    endpoint,
    forcePathStyle: false,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function createSpacesUploadUrl(
  input: CreateUploadUrlInput,
): Promise<UploadUrlResult> {
  const bucket = process.env.SPACES_BUCKET;
  const cdnBaseUrl = process.env.SPACES_CDN_BASE_URL;

  if (!bucket || !cdnBaseUrl) {
    throw new Error(
      "Storage bucket is not configured. Set SPACES_BUCKET and SPACES_CDN_BASE_URL",
    );
  }

  const client = getS3Client();
  const cleanName = normalizeFileName(input.filename);
  const key = `${input.folder}/${Date.now()}-${randomUUID()}-${cleanName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: input.mimeType,
    ACL: "public-read",
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 60 * 5,
  });

  return {
    uploadUrl,
    key,
    fileId: key,
    publicUrl: `${cdnBaseUrl.replace(/\/$/, "")}/${key}`,
    provider: "spaces",
  };
}

// ─── Cloudinary ───────────────────────────────────────────────────────────────

function cloudinarySign(params: Record<string, string | number>): string {
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) throw new Error("CLOUDINARY_API_SECRET is not set");

  // Sort params alphabetically, join as key=value&key=value, append secret
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return createHash("sha1")
    .update(sorted + secret)
    .digest("hex");
}

function getCloudinaryResourceType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/") || mimeType.startsWith("audio/"))
    return "video";
  return "raw"; // PDF, PPT, DOCX, etc.
}

async function createCloudinaryUploadUrl(
  input: CreateUploadUrlInput,
): Promise<UploadUrlResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET",
    );
  }

  const cleanName = normalizeFileName(input.filename);
  const nameWithoutExt = cleanName.replace(/\.[^.]+$/, "");
  const publicId = `${Date.now()}-${randomUUID().slice(0, 8)}-${nameWithoutExt}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const resourceType = getCloudinaryResourceType(input.mimeType);

  const paramsToSign: Record<string, string | number> = {
    folder: input.folder,
    public_id: publicId,
    timestamp,
  };

  const signature = cloudinarySign(paramsToSign);

  // The client will POST FormData to this URL
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  // Construct what the public URL will be after upload
  const ext = cleanName.includes(".") ? cleanName.split(".").pop() : "";
  const publicUrl =
    resourceType === "raw"
      ? `https://res.cloudinary.com/${cloudName}/raw/upload/${input.folder}/${publicId}.${ext}`
      : `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${input.folder}/${publicId}`;

  return {
    uploadUrl,
    key: `${input.folder}/${publicId}`,
    fileId: `${input.folder}/${publicId}`,
    publicUrl,
    provider: "cloudinary",
    cloudinary: {
      apiKey,
      signature,
      timestamp,
      publicId,
      folder: input.folder,
    },
  };
}

// ─── Unified Service ──────────────────────────────────────────────────────────

class StorageService {
  private get provider(): "cloudinary" | "spaces" {
    return (process.env.STORAGE_PROVIDER as "cloudinary" | "spaces") ||
      "cloudinary";
  }

  async createUploadUrl(input: CreateUploadUrlInput): Promise<UploadUrlResult> {
    if (this.provider === "cloudinary") {
      return createCloudinaryUploadUrl(input);
    }
    return createSpacesUploadUrl(input);
  }
}

export const storageService = new StorageService();
