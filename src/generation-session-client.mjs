import { GeneratedImage } from "./generated-image.mjs";

export class GenerationSessionError extends Error {
  constructor({ code = "generation_failed", event = null, message, requestId = null, status = null }) {
    super(message);
    this.name = "GenerationSessionError";
    this.code = code;
    this.event = event;
    this.requestId = requestId;
    this.status = status;
  }
}

const boundaryFromContentType = (contentType) => {
  const match = String(contentType ?? "").match(/boundary="?([^";]+)"?/i);
  return match?.[1] ?? null;
};

const splitBuffer = (buffer, separator) => {
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);

  while (index !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }

  parts.push(buffer.subarray(start));
  return parts;
};

const parseHeaderText = (text) =>
  Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => {
        const index = line.indexOf(":");
        if (index === -1) return null;
        return [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
      })
      .filter(Boolean),
  );

const parseMultipartBody = (bytes, boundary) => {
  const buffer = Buffer.from(bytes);
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];

  for (const rawPart of splitBuffer(buffer, boundaryBuffer)) {
    let part = rawPart;
    if (!part.length) continue;
    if (part.subarray(0, 2).toString() === "\r\n") part = part.subarray(2);
    if (part.subarray(0, 2).toString() === "--") continue;
    if (part.subarray(-2).toString() === "\r\n") part = part.subarray(0, -2);

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;

    const headers = parseHeaderText(part.subarray(0, headerEnd).toString("utf8"));
    const body = part.subarray(headerEnd + 4);
    parts.push({ body, headers });
  }

  return parts;
};

export const streamGeneratedImage = async ({
  fetchImpl = fetch,
  generationPrivateKey,
  onProgress,
  output,
  sessionToken,
  sessionUrl,
}) => {
  const generationPrivateKeyJwk = await crypto.subtle.exportKey("jwk", generationPrivateKey);
  const response = await fetchImpl(sessionUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${sessionToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ generationPrivateKeyJwk }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const boundary = boundaryFromContentType(contentType);
  if (!boundary) {
    const body = await response.text().catch(() => "");
    throw new GenerationSessionError({
      message: body || `Generation Session returned HTTP ${response.status}`,
      status: response.status,
    });
  }

  let image = null;
  let lastEvent = null;

  const parts = parseMultipartBody(new Uint8Array(await response.arrayBuffer()), boundary);
  for (const part of parts) {
    const partContentType = part.headers["content-type"] ?? "application/octet-stream";

    if (partContentType.includes("application/json")) {
      const event = JSON.parse(part.body.toString("utf8"));
      lastEvent = event;
      onProgress?.(event);
      continue;
    }

    if (partContentType.startsWith("image/")) {
      image = new GeneratedImage({
        bytes: new Uint8Array(part.body),
        contentType: partContentType,
        id: lastEvent?.imageId,
        model: lastEvent?.model,
        requestId: lastEvent?.requestId,
      });
    }
  }

  if (!response.ok || !image) {
    throw new GenerationSessionError({
      code: lastEvent?.code,
      event: lastEvent,
      message: lastEvent?.message ?? `Generation Session returned HTTP ${response.status}`,
      requestId: lastEvent?.requestId,
      status: response.status,
    });
  }

  if (output) await image.save(output);
  return image;
};
