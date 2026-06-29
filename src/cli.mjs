#!/usr/bin/env node
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs, usage } from "./args.mjs";
import { generateImage } from "./index.mjs";
import { TaskManagerError } from "./task-manager-client.mjs";
import { GenerationSessionError } from "./generation-session-client.mjs";

const contentTypeFromPath = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "application/octet-stream";
};

const readSourceImage = async (sourcePath) => {
  if (!sourcePath) return null;
  const resolvedPath = path.resolve(sourcePath);
  const bytes = await readFile(resolvedPath);

  return {
    filename: path.basename(resolvedPath),
    contentType: contentTypeFromPath(resolvedPath),
    bytesBase64: bytes.toString("base64"),
  };
};

const buildPayload = async (options) => {
  const source = await readSourceImage(options.source);

  return {
    tool: "image-gen",
    model: options.model,
    prompt: options.prompt,
    ...(source ? { sources: [source] } : {}),
  };
};

const printBody = (stderr, body) => {
  if (!body) return;
  if (typeof body === "string") {
    stderr.write(`${body}\n`);
    return;
  }
  stderr.write(`${JSON.stringify(body, null, 2)}\n`);
};

export const runCli = async (
  argv = process.argv.slice(2),
  env = process.env,
  io = { stdout: process.stdout, stderr: process.stderr, fetchImpl: fetch },
) => {
  try {
    const { help, options } = parseArgs(argv, env);
    if (help) {
      io.stdout.write(usage());
      return 0;
    }
    if (!options.prompt) {
      io.stderr.write("Missing prompt.\n\n");
      io.stderr.write(usage());
      return 1;
    }
    if (!options.accessToken) {
      io.stderr.write(
        "Missing access token. Set UNEXPOSED_ACCESS_TOKEN or pass --accessToken.\n",
      );
      return 1;
    }

    const payload = await buildPayload(options);
    const image = await generateImage({
      accessToken: options.accessToken,
      apiUrl: options.apiUrl,
      fetchImpl: io.fetchImpl,
      model: options.model,
      output: options.output ?? ".",
      prompt: payload.prompt,
      sources: payload.sources,
    });

    io.stdout.write(`Saved ${image.path}\n`);
    return 0;
  } catch (error) {
    if (error instanceof TaskManagerError) {
      io.stderr.write("Unexposed image generation task failed.\n");
      io.stderr.write(`${error.message}\n`);
      printBody(io.stderr, error.body);
      return 1;
    }
    if (error instanceof GenerationSessionError) {
      io.stderr.write("Unexposed image generation failed.\n");
      io.stderr.write(`${error.message}\n`);
      if (error.requestId) io.stderr.write(`Request: ${error.requestId}\n`);
      return 1;
    }

    io.stderr.write(`${error.message}\n`);
    return 1;
  }
};

const realPathOrResolvedPath = async (filePath) =>
  realpath(filePath).catch(() => path.resolve(filePath));

const isDirectCliRun = async () => {
  if (!process.argv[1]) return false;
  const modulePath = await realPathOrResolvedPath(fileURLToPath(import.meta.url));
  const runPath = await realPathOrResolvedPath(process.argv[1]);
  return modulePath === runPath;
};

if (await isDirectCliRun()) {
  process.exit(await runCli());
}
