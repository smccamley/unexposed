import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { runCli } from "../src/cli.mjs";

const run = promisify(execFile);

const createWriter = () => {
  let text = "";
  return {
    write: (value) => {
      text += value;
    },
    text: () => text,
  };
};

test("runCli submits sealed task without prompt or local output path", async () => {
  let request;
  const stdout = createWriter();
  const stderr = createWriter();
  const code = await runCli(
    [
      "secret prompt",
      "--token",
      "ux_test",
      "--api-url",
      "http://localhost:8787",
      "--output",
      "/tmp/private-output.png",
    ],
    {},
    {
      stdout,
      stderr,
      fetchImpl: async (url, options) => {
        request = { url, options };
        return new Response(JSON.stringify({ error: "no funds" }), {
          status: 402,
          statusText: "Payment Required",
        });
      },
    },
  );
  const body = request.options.body;

  assert.equal(code, 1);
  assert.equal(request.options.headers.authorization, "Bearer ux_test");
  assert.equal(body.includes("secret prompt"), false);
  assert.equal(body.includes("/tmp/private-output.png"), false);
  assert.match(stderr.text(), /Task Manager returned HTTP 402/);
  assert.equal(stdout.text(), "");
});

test("runCli submits Workflow task with repeated sources", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "unexposed-image-gen-"));
  const sourceOne = path.join(tempDir, "one.png");
  const sourceTwo = path.join(tempDir, "two.png");
  let request;
  const stdout = createWriter();
  const stderr = createWriter();

  try {
    await Promise.all([writeFile(sourceOne, "one"), writeFile(sourceTwo, "two")]);

    const code = await runCli(
      [
        "secret prompt",
        "--token",
        "ux_test",
        "--api-url",
        "http://localhost:8787",
        "--workflow",
        "cool-workflow",
        "--source",
        sourceOne,
        "--source",
        sourceTwo,
      ],
      {},
      {
        stdout,
        stderr,
        fetchImpl: async (url, options) => {
          request = { url, options };
          return new Response(JSON.stringify({ error: "no funds" }), {
            status: 402,
            statusText: "Payment Required",
          });
        },
      },
    );
    const body = JSON.parse(request.options.body);

    assert.equal(code, 1);
    assert.equal(body.workflow, "cool-workflow");
    assert.equal(body.model, undefined);
    assert.equal(request.options.body.includes("secret prompt"), false);
    assert.equal(request.options.body.includes(sourceOne), false);
    assert.equal(request.options.body.includes(sourceTwo), false);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("runCli rejects explicit model with Workflow", async () => {
  const stdout = createWriter();
  const stderr = createWriter();
  const code = await runCli(
    ["prompt", "--token", "ux_test", "--workflow", "cool-workflow", "--model", "qwen"],
    {},
    {
      stdout,
      stderr,
      fetchImpl: async () => {
        throw new Error("fetch should not be called");
      },
    },
  );

  assert.equal(code, 1);
  assert.match(stderr.text(), /Use --workflow or --model/);
});

test("CLI runs when invoked through an npm-style symlink", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "unexposed-image-gen-"));
  const cliPath = fileURLToPath(new URL("../src/cli.mjs", import.meta.url));
  const binPath = path.join(tempDir, "unexposed-image-gen");

  try {
    await symlink(cliPath, binPath);
    const { stdout } = await run(process.execPath, [binPath, "--help"]);
    assert.match(stdout, /Usage:/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
