import assert from "node:assert/strict";
import test from "node:test";
import {
  submitImageGenerationTask,
  TaskManagerError,
} from "../src/task-manager-client.mjs";

test("submitImageGenerationTask sends sealed task with bearer token", async () => {
  let request;
  const result = await submitImageGenerationTask({
    accessToken: "ux_test",
    apiUrl: "http://localhost:8787",
    task: { tool: "image-gen", sealedRequest: { ciphertext: "abc" } },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({ id: "task_123" }), {
        status: 202,
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.equal(request.url, "http://localhost:8787/v1/image-generation-tasks");
  assert.equal(request.options.headers.authorization, "Bearer ux_test");
  assert.equal(request.options.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(request.options.body), {
    tool: "image-gen",
    sealedRequest: { ciphertext: "abc" },
  });
  assert.deepEqual(result, { id: "task_123" });
});

test("submitImageGenerationTask throws clean error for failed task manager response", async () => {
  await assert.rejects(
    () =>
      submitImageGenerationTask({
        accessToken: "ux_test",
        apiUrl: "http://localhost:8787",
        task: { tool: "image-gen" },
        fetchImpl: async () =>
          new Response(JSON.stringify({ error: "no funds" }), {
            status: 402,
            statusText: "Payment Required",
          }),
      }),
    (error) => {
      assert.equal(error instanceof TaskManagerError, true);
      assert.equal(error.status, 402);
      assert.deepEqual(error.body, { error: "no funds" });
      return true;
    },
  );
});
