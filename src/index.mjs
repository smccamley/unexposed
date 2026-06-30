import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_API_URL } from "./args.mjs";
import { streamGeneratedImage } from "./generation-session-client.mjs";
import { sealImageGenerationRequest } from "./sealed-request.mjs";
import { submitImageGenerationTask, submitImageGenerationTasks } from "./task-manager-client.mjs";

export { DEFAULT_API_URL } from "./args.mjs";
export { GeneratedImage } from "./generated-image.mjs";
export { GenerationSessionError, streamGeneratedImage } from "./generation-session-client.mjs";
export {
  openImageGenerationRequest,
  SEALED_REQUEST_ASSOCIATED_DATA,
  SEALED_REQUEST_PROTOCOL,
  sealImageGenerationRequest,
} from "./sealed-request.mjs";
export {
  submitImageGenerationTask,
  submitImageGenerationTasks,
  TaskManagerError,
} from "./task-manager-client.mjs";

const MAX_SOURCE_IMAGE_BYTES = 50 * 1024 * 1024;
const IMAGE_MODELS = new Set([
  "flux2_dev",
  "qwen",
  "krea2_turbo",
  "krea2_raw",
  "chroma",
]);

const contentTypeFromPath = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
};

const sourceImageFromPath = async (sourcePath) => {
  const resolvedPath = path.resolve(sourcePath);
  const bytes = await readFile(resolvedPath);
  if (bytes.byteLength > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("source image must be 50 MB or smaller");
  }

  return {
    bytesBase64: bytes.toString("base64"),
    contentType: contentTypeFromPath(resolvedPath),
    filename: path.basename(resolvedPath),
  };
};

const normalizeSourceImage = async (source) => {
  if (typeof source === "string") return sourceImageFromPath(source);
  if (!source || typeof source !== "object") throw new Error("source must be a path or image object");

  if (source.bytesBase64) return source;
  if (source.bytes) {
    const bytes = source.bytes instanceof Uint8Array ? source.bytes : new Uint8Array(source.bytes);
    if (bytes.byteLength > MAX_SOURCE_IMAGE_BYTES) {
      throw new Error("source image must be 50 MB or smaller");
    }

    return {
      bytesBase64: Buffer.from(bytes).toString("base64"),
      contentType: source.contentType ?? "application/octet-stream",
      filename: source.filename ?? "source",
    };
  }

  throw new Error("source image requires bytes or bytesBase64");
};

const normalizeSources = async ({ source, sources }) => {
  if (source && sources) throw new Error("Use source or sources, not both");
  const values = source ? [source] : (sources ?? []);
  return Promise.all(values.map(normalizeSourceImage));
};

export const createSealedImageGenerationTask = async ({
  model = "flux2_dev",
  prompt,
  source = null,
  sources = null,
}) => {
  if (!IMAGE_MODELS.has(model)) throw new Error("model is not supported by Unexposed");
  if (!prompt) throw new Error("prompt is required");
  const normalizedSources = await normalizeSources({ source, sources });

  const payload = {
    tool: "image-gen",
    model,
    prompt,
    ...(normalizedSources.length ? { sources: normalizedSources } : {}),
  };
  const { sealedRequest, generationPrivateKey } =
    await sealImageGenerationRequest(payload);

  return {
    generationPrivateKey,
    task: {
      tool: "image-gen",
      model,
      sealedRequest,
    },
  };
};

export const createSealedImageGenerationTasks = async (images) => {
  if (!Array.isArray(images) || !images.length) {
    throw new Error("images must be a non-empty array");
  }

  return Promise.all(images.map(createSealedImageGenerationTask));
};

export const submitSealedImageGenerationTask = async ({
  accessToken,
  apiUrl = DEFAULT_API_URL,
  fetchImpl = fetch,
  model = "flux2_dev",
  prompt,
  source = null,
  sources = null,
}) => {
  const { generationPrivateKey, task } = await createSealedImageGenerationTask({
    model,
    prompt,
    source,
    sources,
  });
  const result = await submitImageGenerationTask({
    accessToken,
    apiUrl,
    fetchImpl,
    task,
  });

  return { generationPrivateKey, result };
};

const accessTokenFromOptions = (accessToken) => {
  const token = accessToken ?? process.env.UNEXPOSED_ACCESS_TOKEN;
  if (!token) throw new Error("accessToken is required");
  return token;
};

export const generateImage = async ({
  accessToken,
  apiUrl = DEFAULT_API_URL,
  fetchImpl = fetch,
  model = "flux2_dev",
  onProgress,
  output = null,
  prompt,
  source = null,
  sources = null,
}) => {
  const { generationPrivateKey, task } = await createSealedImageGenerationTask({
    model,
    prompt,
    source,
    sources,
  });
  const result = await submitImageGenerationTask({
    accessToken: accessTokenFromOptions(accessToken),
    apiUrl,
    fetchImpl,
    task,
  });
  const session = result?.tasks?.[0] ?? result;
  if (!session?.sessionUrl || !session?.sessionToken) {
    throw new Error("Task Manager did not return a Generation Session.");
  }

  return streamGeneratedImage({
    fetchImpl,
    generationPrivateKey,
    onProgress,
    output,
    sessionToken: session.sessionToken,
    sessionUrl: session.sessionUrl,
  });
};

const normalizeBatchOptions = (images, options = {}) => {
  if (!Array.isArray(images) || !images.length) {
    throw new Error("images must be a non-empty array");
  }

  return images.map((image, index) => ({
    accessToken: options.accessToken,
    apiUrl: options.apiUrl ?? DEFAULT_API_URL,
    fetchImpl: options.fetchImpl ?? fetch,
    index,
    onProgress: options.onProgress,
    output: typeof options.output === "function" ? options.output(image, index) : null,
    ...image,
  }));
};

async function* streamModelGroup(modelImages) {
  for (const image of modelImages) {
    try {
      const generatedImage = await streamGeneratedImage({
        fetchImpl: image.fetchImpl,
        generationPrivateKey: image.generationPrivateKey,
        onProgress: image.onProgress,
        output: image.output,
        sessionToken: image.sessionToken,
        sessionUrl: image.sessionUrl,
      });
      yield {
        ok: true,
        image: generatedImage,
        index: image.index,
        model: image.model,
        requestId: generatedImage.requestId,
      };
    } catch (error) {
      yield {
        ok: false,
        error,
        index: image.index,
        model: image.model,
        requestId: error.requestId ?? image.requestId ?? null,
      };
    }
  }
}

const workerPromise = (worker) => {
  const promise = worker.next().then((result) => ({ ...result, promise, worker }));
  return promise;
};

async function* mergeModelGroups(groups) {
  const pending = new Set(groups.map((group) => workerPromise(streamModelGroup(group))));

  while (pending.size) {
    const result = await Promise.race(pending);
    pending.delete(result.promise);
    if (result.done) continue;

    yield result.value;
    pending.add(workerPromise(result.worker));
  }
}

export async function* generateImages(images, options = {}) {
  const normalizedImages = normalizeBatchOptions(images, options);
  const sealedTasks = await createSealedImageGenerationTasks(normalizedImages);
  const result = await submitImageGenerationTasks({
    accessToken: accessTokenFromOptions(options.accessToken),
    apiUrl: options.apiUrl ?? DEFAULT_API_URL,
    fetchImpl: options.fetchImpl ?? fetch,
    tasks: sealedTasks.map(({ task }) => task),
  });
  const sessions = result?.tasks;
  if (!Array.isArray(sessions) || sessions.length !== sealedTasks.length) {
    throw new Error("Task Manager did not return one Generation Session per image.");
  }

  const groupsByModel = new Map();
  for (const [index, session] of sessions.entries()) {
    if (!session?.sessionUrl || !session?.sessionToken) {
      throw new Error("Task Manager did not return a Generation Session.");
    }

    const image = normalizedImages[index];
    const model = session.model ?? image.model ?? "flux2_dev";
    const group = groupsByModel.get(model) ?? [];
    group.push({
      ...image,
      generationPrivateKey: sealedTasks[index].generationPrivateKey,
      model,
      requestId: session.requestId,
      sessionToken: session.sessionToken,
      sessionUrl: session.sessionUrl,
    });
    groupsByModel.set(model, group);
  }

  yield* mergeModelGroups([...groupsByModel.values()]);
}
