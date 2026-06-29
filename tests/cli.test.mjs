import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, symlink } from "node:fs/promises";
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
