export function formatFileSize(bytes: number | string) {
  const value = typeof bytes === "string" ? Number(bytes) : bytes;

  if (!Number.isFinite(value) || value < 1024) {
    return `${Number.isFinite(value) ? value : 0} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export const FILE_BUCKET = "workspace-files";
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "application/json": [".json"],
  "application/zip": [".zip"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
};

export function fileExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export function sanitizeFileName(name: string) {
  const trimmed = name.replace(/[/\\]/g, "_").replace(/[^\w.\- ()[\]]+/g, "_").trim();
  const safe = trimmed.replace(/^\.+/, "") || "file";
  return safe.slice(0, 180);
}

export const FILE_ACCEPT = [
  ...Object.keys(ALLOWED_FILE_TYPES),
  ...Object.values(ALLOWED_FILE_TYPES).flat(),
].join(",");

export function mimeFromFile(file: { name: string; type: string }) {
  if (file.type && ALLOWED_FILE_TYPES[file.type]) {
    return file.type;
  }

  const extension = fileExtension(file.name);
  const match = Object.entries(ALLOWED_FILE_TYPES).find(([, extensions]) => extensions.includes(extension));
  return match?.[0] ?? file.type;
}

export function isPreviewableMime(mimeType: string | null | undefined) {
  if (!mimeType) {
    return false;
  }

  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}

export function validateUploadFile(file: { name: string; size: number; type: string }) {
  if (file.size <= 0) {
    return "Choose a file to upload.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "Files must be 20 MB or smaller.";
  }

  const extension = fileExtension(file.name);
  const allowedByType = ALLOWED_FILE_TYPES[file.type];
  const allowedByExt = Object.values(ALLOWED_FILE_TYPES).some((extensions) => extensions.includes(extension));

  if (!allowedByType && !allowedByExt) {
    return "That file type is not allowed. Use images, PDF, Office documents, CSV, text, or zip.";
  }

  if (allowedByType && extension && !allowedByType.includes(extension)) {
    return "The file extension does not match its type.";
  }

  return null;
}
