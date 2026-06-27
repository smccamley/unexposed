import assert from "node:assert/strict";
import test from "node:test";
import { runCli } from "../src/cli.mjs";

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
      "--access-token",
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
