import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createSealedImageGenerationTask,
  generateImage,
  generateImages,
  openImageGenerationRequest,
  submitSealedImageGenerationTask,
} from "../src/index.mjs";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

const multipartImageResponse = ({ boundary = "test-boundary", requestId = "imgreq_123" } = {}) => {
  const jsonPart = Buffer.from(
    [
      `--${boundary}`,
      "Content-Type: application/json",
      "",
      JSON.stringify({ stage: "complete", requestId, model: "flux2_dev" }),
      "",
    ].join("\r\n"),
  );
  const imageHeader = Buffer.from(
    [`--${boundary}`, "Content-Type: image/png", "", ""].join("\r\n"),
  );
  const end = Buffer.from(`\r\n--${boundary}--\r\n`);

  return new Response(Buffer.concat([jsonPart, imageHeader, tinyPng, end]), {
    status: 200,
    headers: { "content-type": `multipart/mixed; boundary=${boundary}` },
  });
};

test("createSealedImageGenerationTask creates a sealed task and keeps the private key separate", async () => {
  const { generationPrivateKey, task } = await createSealedImageGenerationTask({
    model: "flux2_dev",
    prompt: "private prompt",
  });
  const serializedTask = JSON.stringify(task);

  assert.equal(task.tool, "image-gen");
  assert.equal(task.model, "flux2_dev");
  assert.equal(serializedTask.includes("private prompt"), false);
  assert.ok(generationPrivateKey);

  const opened = await openImageGenerationRequest({
    sealedRequest: task.sealedRequest,
    generationPrivateKey,
  });

  assert.deepEqual(opened, {
    tool: "image-gen",
    model: "flux2_dev",
    prompt: "private prompt",
  });
});

test("createSealedImageGenerationTask seals source image paths as sources", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "unexposed-source-"));
  const sourcePath = path.join(tempDir, "input.png");

  try {
    await writeFile(sourcePath, tinyPng);
    const { generationPrivateKey, task } = await createSealedImageGenerationTask({
      model: "flux2_dev",
      prompt: "private prompt",
      sources: [sourcePath],
    });
    const opened = await openImageGenerationRequest({
      sealedRequest: task.sealedRequest,
      generationPrivateKey,
    });

    assert.equal(opened.sources.length, 1);
    assert.equal(opened.sources[0].filename, "input.png");
    assert.equal(opened.sources[0].contentType, "image/png");
    assert.equal(opened.sources[0].bytesBase64, tinyPng.toString("base64"));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("createSealedImageGenerationTask rejects models outside the Unexposed boundary", async () => {
  await assert.rejects(
    createSealedImageGenerationTask({
      model: "upscaler",
      prompt: "private prompt",
    }),
    /model is not supported by Unexposed/,
  );
});

test("generateImages submits one batch and yields images", async () => {
  const requests = [];
  const results = [];

  for await (const result of generateImages(
    [
      { prompt: "first private prompt", model: "flux2_dev" },
      { prompt: "second private prompt", model: "qwen" },
    ],
    {
      accessToken: "ux_test",
      apiUrl: "http://localhost:8787",
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        if (url === "http://localhost:8787/v1/image-generation-tasks") {
          assert.equal(JSON.parse(options.body).tasks.length, 2);
          assert.equal(options.body.includes("first private prompt"), false);
          assert.equal(options.body.includes("second private prompt"), false);
          return new Response(
            JSON.stringify({
              tasks: [
                {
                  model: "flux2_dev",
                  requestId: "imgreq_first",
                  sessionToken: "uxsess_first",
                  sessionUrl: "http://session.test/first",
                },
                {
                  model: "qwen",
                  requestId: "imgreq_second",
                  sessionToken: "uxsess_second",
                  sessionUrl: "http://session.test/second",
                },
              ],
            }),
            { status: 202, headers: { "content-type": "application/json" } },
          );
        }

        return multipartImageResponse({
          requestId: url.endsWith("/first") ? "imgreq_first" : "imgreq_second",
        });
      },
    },
  )) {
    results.push(result);
  }

  assert.equal(requests[0].url, "http://localhost:8787/v1/image-generation-tasks");
  assert.equal(requests[0].options.headers.authorization, "Bearer ux_test");
  assert.equal(requests.length, 3);
  assert.equal(results.length, 2);
  assert.deepEqual(results.map((result) => result.ok), [true, true]);
  assert.deepEqual(
    results.map((result) => result.image.requestId).sort(),
    ["imgreq_first", "imgreq_second"],
  );
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

test("generateImage returns a generated image from a generation session", async () => {
  const events = [];
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "unexposed-image-gen-"));
  const outputPath = path.join(tempDir, "watch");
  const requests = [];

  try {
    const image = await generateImage({
      accessToken: "ux_test",
      apiUrl: "http://localhost:8787",
      output: outputPath,
      prompt: "private prompt",
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        if (url === "http://localhost:8787/v1/image-generation-tasks") {
          return new Response(
            JSON.stringify({
              tasks: [
                {
                  requestId: "imgreq_123",
                  sessionToken: "uxsess_test",
                  sessionUrl: "http://session.test/stream",
                },
              ],
            }),
            { status: 202, headers: { "content-type": "application/json" } },
          );
        }

        assert.equal(url, "http://session.test/stream");
        assert.equal(options.headers.authorization, "Bearer uxsess_test");
        assert.equal(options.body.includes("private prompt"), false);
        return multipartImageResponse();
      },
      onProgress: (event) => events.push(event),
    });

    assert.equal(image.requestId, "imgreq_123");
    assert.equal(image.contentType, "image/png");
    assert.equal(image.path, `${outputPath}.png`);
    assert.deepEqual(Buffer.from(image.bytes), tinyPng);
    assert.deepEqual(await readFile(image.path), tinyPng);
    assert.equal(requests[0].options.body.includes("private prompt"), false);
    assert.deepEqual(events.map((event) => event.stage), ["complete"]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
