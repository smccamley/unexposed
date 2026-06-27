import { DEFAULT_API_URL } from "./args.mjs";
import { sealImageGenerationRequest } from "./sealed-request.mjs";
import { submitImageGenerationTask } from "./task-manager-client.mjs";

export { DEFAULT_API_URL } from "./args.mjs";
export {
  openImageGenerationRequest,
  SEALED_REQUEST_ASSOCIATED_DATA,
  SEALED_REQUEST_PROTOCOL,
  sealImageGenerationRequest,
} from "./sealed-request.mjs";
export { submitImageGenerationTask, TaskManagerError } from "./task-manager-client.mjs";

export const createSealedImageGenerationTask = async ({
  model = "default",
  prompt,
  source = null,
}) => {
  if (!prompt) throw new Error("prompt is required");

  const payload = {
    tool: "image-gen",
    model,
    prompt,
    ...(source ? { source } : {}),
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

export const submitSealedImageGenerationTask = async ({
  accessToken,
  apiUrl = DEFAULT_API_URL,
  fetchImpl = fetch,
  model = "default",
  prompt,
  source = null,
}) => {
  const { generationPrivateKey, task } = await createSealedImageGenerationTask({
    model,
    prompt,
    source,
  });
  const result = await submitImageGenerationTask({
    accessToken,
    apiUrl,
    fetchImpl,
    task,
  });

  return { generationPrivateKey, result };
};
