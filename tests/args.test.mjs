import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_API_URL, parseArgs } from "../src/args.mjs";

test("parseArgs reads prompt and defaults", () => {
  const parsed = parseArgs(["make", "a", "watch"], {});

  assert.equal(parsed.help, false);
  assert.equal(parsed.options.prompt, "make a watch");
  assert.equal(parsed.options.model, "flux2_dev");
  assert.equal(parsed.options.apiUrl, DEFAULT_API_URL);
});

test("parseArgs uses access token and api url from env", () => {
  const parsed = parseArgs(["prompt"], {
    UNEXPOSED_ACCESS_TOKEN: "ux_test",
    UNEXPOSED_API_URL: "http://localhost:8787",
  });

  assert.equal(parsed.options.accessToken, "ux_test");
  assert.equal(parsed.options.apiUrl, "http://localhost:8787");
});

test("parseArgs lets flags override env", () => {
  const parsed = parseArgs(
    [
      "prompt",
      "--accessToken",
      "ux_flag",
      "--api-url=http://localhost:9000",
      "--model",
      "flux",
      "--source",
      "./input.png",
      "--output=./out.png",
    ],
    {
      UNEXPOSED_ACCESS_TOKEN: "ux_env",
      UNEXPOSED_API_URL: "http://localhost:8787",
    },
  );

  assert.equal(parsed.options.accessToken, "ux_flag");
  assert.equal(parsed.options.apiUrl, "http://localhost:9000");
  assert.equal(parsed.options.model, "flux");
  assert.equal(parsed.options.source, "./input.png");
  assert.deepEqual(parsed.options.sources, ["./input.png"]);
  assert.equal(parsed.options.output, "./out.png");
});

test("parseArgs keeps --token as an access token alias", () => {
  const parsed = parseArgs(["prompt", "--token=ux_alias"], {});

  assert.equal(parsed.options.accessToken, "ux_alias");
});

test("parseArgs reads workflow and repeated sources", () => {
  const parsed = parseArgs(
    [
      "prompt",
      "--workflow",
      "cool-workflow",
      "--source",
      "./img1.png",
      "--source=./img2.png",
    ],
    {},
  );

  assert.equal(parsed.options.workflow, "cool-workflow");
  assert.equal(parsed.options.source, "./img1.png");
  assert.deepEqual(parsed.options.sources, ["./img1.png", "./img2.png"]);
});
