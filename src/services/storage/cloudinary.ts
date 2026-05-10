import { v2 as cloudinary } from "cloudinary";

// ─── Client config ────────────────────────────────────────────────────────────
// Configured once at module load. All functions below share this config.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true, // always https
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  public_id: string; // Cloudinary's unique ID — store this in DB
  secure_url: string; // HTTPS URL — use this everywhere
  format: string; // "pdf", "jpg", "png" etc.
  bytes: number; // file size in bytes
  resource_type: string;
}

// ─── Avatar upload ────────────────────────────────────────────────────────────
// Used for: teacher profile picture, student avatar
// Input: file buffer from multer (req.file.buffer)
// Returns: { public_id, secure_url } — save secure_url to users.avatar_url in DB

export async function uploadAvatar(
  buffer: Buffer,
  userId: string,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "edusphere/avatars",
        public_id: `avatar_${userId}`, // deterministic — re-upload replaces old one
        overwrite: true,
        resource_type: "image",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" }, // square crop, face-centered
          { quality: "auto", fetch_format: "auto" }, // auto WebP/AVIF
        ],
      },
      (error, result) => {
        if (error || !result)
          return reject(error ?? new Error("Upload failed"));
        resolve(result as UploadResult);
      },
    );
    uploadStream.end(buffer);
  });
}

// ─── PDF / note upload ────────────────────────────────────────────────────────
// Used for: teacher uploading class notes
// Input: file buffer from multer, classId + noteId for namespacing
// Returns: { public_id, secure_url } — save secure_url to notes_metadata.file_url in DB
// The AI service downloads from secure_url directly for ingestion

export async function uploadNote(
  buffer: Buffer,
  classId: string,
  noteId: string,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `edusphere/notes/${classId}`,
        public_id: `note_${noteId}`,
        overwrite: true,
        resource_type: "raw", // "raw" = non-image files (PDFs, docs, etc.)
      },
      (error, result) => {
        if (error || !result)
          return reject(error ?? new Error("Upload failed"));
        resolve(result as UploadResult);
      },
    );
    uploadStream.end(buffer);
  });
}

// ─── Delete file ──────────────────────────────────────────────────────────────
// Used for: teacher deletes a note, user deletes their avatar
// Pass the public_id you stored in DB — NOT the full URL

export async function deleteFile(
  publicId: string,
  resourceType: "image" | "raw" = "image",
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

// ─── Get secure URL from public_id ───────────────────────────────────────────
// Utility — if you only stored public_id in DB and need the URL back
// For PDFs: use resource_type "raw"

export function getSecureUrl(
  publicId: string,
  resourceType: "image" | "raw" = "image",
): string {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: resourceType,
  });
}
