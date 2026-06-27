import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { usage } from "../src/args.mjs";

const packageRoot = path.resolve(new URL("..", import.meta.url).pathname);
const packageJsonPath = path.join(packageRoot, "package.json");
const readmePath = path.join(packageRoot, "README.md");
const apiDocsPath = path.join(packageRoot, "docs", "api.md");
const checkOnly = process.argv.includes("--check");

const readPackageJson = async () =>
  JSON.parse(await readFile(packageJsonPath, "utf8"));

const commandFromBin = (packageJson) =>
  Object.keys(packageJson.bin).includes("unexposed-image-gen")
    ? "unexposed-image-gen"
    : Object.keys(packageJson.bin)[0];

const readme = (packageJson) => {
  const command = commandFromBin(packageJson);

  return `# ${packageJson.name}

![Unexposed Image Gen](media/unexposed-image-gen.svg)

> ${packageJson.description}

## Highlights

- Sends only sealed prompts and source images to the Task Manager.
- Keeps the Generation Key Pair private key out of the Task Manager request.
- Works as a Node API or a tiny command line tool.
- Uses Node Web Crypto: X25519, HKDF-SHA-256, and AES-256-GCM.
- Has no runtime dependencies.

## Install

\`\`\`sh
npm install ${packageJson.name}
\`\`\`

Or run the CLI directly:

\`\`\`sh
UNEXPOSED_ACCESS_TOKEN=ux_... npx ${packageJson.name} "editorial product photo of a watch"
\`\`\`

## Usage

\`\`\`js
import { submitSealedImageGenerationTask } from "${packageJson.name}";

const { result } = await submitSealedImageGenerationTask({
  accessToken: process.env.UNEXPOSED_ACCESS_TOKEN,
  prompt: "editorial product photo of a watch",
});

console.log(result);
\`\`\`

\`\`\`sh
${command} "turn this into a studio product photo" --source ./input.png --model default
\`\`\`

## API

\`\`\`js
import {
  createSealedImageGenerationTask,
  submitImageGenerationTask,
  submitSealedImageGenerationTask,
} from "${packageJson.name}";
\`\`\`

\`submitSealedImageGenerationTask(options)\` seals a prompt and submits it to the Task Manager in one call. Pass \`accessToken\`, \`prompt\`, and optionally \`apiUrl\`, \`model\`, \`source\`, or \`fetchImpl\`.

\`createSealedImageGenerationTask(options)\` returns \`{ task, generationPrivateKey }\` without sending the task. Use this when another boundary owns submission.

\`submitImageGenerationTask(options)\` sends an already sealed task to \`/v1/image-generation-tasks\`.

## CLI Options

\`\`\`text
${usage().trim()}
\`\`\`

\`UNEXPOSED_ACCESS_TOKEN\` and \`UNEXPOSED_API_URL\` can be used instead of the matching flags.

## How It Works

The client creates a one-use Generation Key Pair, seals the prompt and optional source image with a sender key, and submits only the encrypted task payload. The Task Manager receives the Access Token, model name, and sealed request. It does not receive the Generation Key Pair private key or decrypted prompt/source content.

## Current State

The client package is ready to publish. Billing and generation infrastructure may still reject live task submissions until the Task Manager is deployed for customer traffic.

More detail lives in [docs/api.md](docs/api.md).
`;
};

const apiDocs = (packageJson) => `# Unexposed Image Gen API Reference

This file is generated from \`package.json\` and \`src/args.mjs\`.

## Package

- Package: \`${packageJson.name}\`
- Version: \`${packageJson.version}\`
- Node: \`${packageJson.engines.node}\`
- CLI: \`${Object.keys(packageJson.bin).join("`, `")}\`

## Public Exports

- \`submitSealedImageGenerationTask(options)\`: seal and submit one image generation task.
- \`createSealedImageGenerationTask(options)\`: create a sealed task without submitting it.
- \`submitImageGenerationTask(options)\`: submit an already sealed task.
- \`sealImageGenerationRequest(payload)\`: seal a request payload.
- \`openImageGenerationRequest(options)\`: open a sealed request with its Generation Key Pair private key.
- \`TaskManagerError\`: error thrown for non-2xx Task Manager responses.
- \`DEFAULT_API_URL\`: default Task Manager URL.

## submitSealedImageGenerationTask

\`\`\`js
const { result, generationPrivateKey } = await submitSealedImageGenerationTask({
  accessToken: "ux_...",
  prompt: "editorial product photo of a watch",
  model: "default",
});
\`\`\`

Options:

- \`accessToken\`: Access Token used for access and billing checks.
- \`prompt\`: prompt to seal.
- \`apiUrl\`: Task Manager base URL. Defaults to \`DEFAULT_API_URL\`.
- \`model\`: image model identifier. Defaults to \`default\`.
- \`source\`: optional source image object to include in the sealed payload.
- \`fetchImpl\`: optional fetch-compatible function for tests or custom runtimes.

## CLI

\`\`\`text
${usage().trim()}
\`\`\`
`;

const writeGeneratedFile = async (filePath, content) => {
  const current = await readFile(filePath, "utf8").catch(() => "");
  if (current === content) return false;
  if (checkOnly) {
    throw new Error(`${path.relative(packageRoot, filePath)} is out of date`);
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
  return true;
};

const packageJson = await readPackageJson();
const changed = [
  await writeGeneratedFile(readmePath, readme(packageJson)),
  await writeGeneratedFile(apiDocsPath, apiDocs(packageJson)),
].some(Boolean);

if (changed) {
  console.log("Updated generated package docs.");
} else {
  console.log("Generated package docs are up to date.");
}
