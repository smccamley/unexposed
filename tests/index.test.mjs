import assert from "node:assert/strict";
import test from "node:test";
import {
  createSealedImageGenerationTask,
  openImageGenerationRequest,
  submitSealedImageGenerationTask,
} from "../src/index.mjs";

test("createSealedImageGenerationTask creates a sealed task and keeps the private key separate", async () => {
  const { generationPrivateKey, task } = await createSealedImageGenerationTask({
    model: "default",
    prompt: "private prompt",
  });
  const serializedTask = JSON.stringify(task);

  assert.equal(task.tool, "image-gen");
  assert.equal(task.model, "default");
  assert.equal(serializedTask.includes("private prompt"), false);
  assert.ok(generationPrivateKey);

  const opened = await openImageGenerationRequest({
    sealedRequest: task.sealedRequest,
    generationPrivateKey,
  });

  assert.deepEqual(opened, {
    tool: "image-gen",
    model: "default",
    prompt: "private prompt",
  });
});

test("submitSealedImageGenerationTask submits the sealed task", async () => {
  let request;
  const { result } = await submitSealedImageGenerationTask({
    accessToken: "ux_test",
    apiUrl: "http://localhost:8787",
    prompt: "private prompt",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ id: "task_123" }), {
        status: 202,
      });
    },
  });

  assert.equal(request.url, "http://localhost:8787/v1/image-generation-tasks");
  assert.equal(request.options.headers.authorization, "Bearer ux_test");
  assert.equal(request.options.body.includes("private prompt"), false);
  assert.deepEqual(result, { id: "task_123" });
});
