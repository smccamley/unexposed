import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const extensionFromContentType = (contentType) => {
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/webp") return ".webp";
  return ".png";
};

const pathWithExtension = async ({ contentType, imageId, outputPath }) => {
  const resolvedPath = path.resolve(outputPath);

  try {
    const info = await stat(resolvedPath);
    if (info.isDirectory()) {
      return path.join(resolvedPath, `${imageId}${extensionFromContentType(contentType)}`);
    }
  } catch {
    // The save path may not exist yet. Parent directories are created below.
  }

  if (path.extname(resolvedPath)) return resolvedPath;
  return `${resolvedPath}${extensionFromContentType(contentType)}`;
};

export class GeneratedImage {
  constructor({
    bytes,
    contentType = "image/png",
    id,
    model = null,
    path: savedPath = null,
    requestId,
  }) {
    this.bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this.contentType = contentType;
    this.extension = extensionFromContentType(contentType);
    this.id = id ?? requestId;
    this.model = model;
    this.path = savedPath;
    this.requestId = requestId;
    this.base64 = Buffer.from(this.bytes).toString("base64");
  }

  async save(outputPath) {
    const filePath = await pathWithExtension({
      contentType: this.contentType,
      imageId: this.id,
      outputPath,
    });

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, this.bytes);
    this.path = filePath;
    return filePath;
  }
}
