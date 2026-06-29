import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { usage } from "../src/args.mjs";

const packageRoot = path.resolve(new URL("..", import.meta.url).pathname);
const packageJsonPath = path.join(packageRoot, "package.json");
const readmePath = path.join(packageRoot, "README.md");
const apiDocsPath = path.join(packageRoot, "docs", "api.md");
const checkOnly = process.argv.includes("--check");

const readPackageJson = async () => JSON.parse(await readFile(packageJsonPath, "utf8"));

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
npx ${packageJson.name} "product photo of a watch" --accessToken ux_...AIax --model flux2_dev --output ./watch.png
\`\`\`

## Usage

\`\`\`js
import { generateImage, generateImages } from "${packageJson.name}";

const image = await generateImage({
  accessToken: "ux_...AIax",
  prompt: "product photo of a watch",
  model: "flux2_dev",
});

await image.save("./watch.png");
\`\`\`

\`\`\`js
for await (const result of generateImages(
  [
    { prompt: "product photo of a watch", model: "flux2_dev" },
    { prompt: "studio product photo of headphones", model: "flux2_dev" },
  ],
  { accessToken: "ux_...AIax" },
)) {
  if (result.ok) await result.image.save(\`./image-\${result.index}.png\`);
}
\`\`\`

\`\`\`sh
${command} "studio product photo of a watch" --model flux2_dev --output ./watch.png --accessToken ux_...AIax
\`\`\`

## API

\`\`\`js
import {
  createSealedImageGenerationTask,
  generateImage,
  generateImages,
  submitImageGenerationTask,
  submitSealedImageGenerationTask,
} from "${packageJson.name}";
\`\`\`

\`generateImage(options)\` seals a prompt, submits the task, streams the Generated Image from the Generation Session, and returns a \`GeneratedImage\`. Pass \`accessToken\`, \`prompt\`, and optionally \`apiUrl\`, \`model\`, \`source\`, \`sources\`, \`output\`, \`onProgress\`, or \`fetchImpl\`.

\`generateImages(images, options)\` submits a batch and returns an async iterator. Each result is either \`{ ok: true, image }\` or \`{ ok: false, error }\`. The SDK keeps scheduling internal and does not expose a concurrency setting.

\`GeneratedImage.save(path)\` writes the image to disk, creates parent directories, and infers the extension from the image content type.

\`submitSealedImageGenerationTask(options)\` is the lower-level task submission helper.

\`createSealedImageGenerationTask(options)\` returns \`{ task, generationPrivateKey }\` without sending the task. Use this when another boundary owns submission.

\`submitImageGenerationTask(options)\` sends an already sealed task to \`/v1/image-generation-tasks\`.

## CLI Options

\`\`\`text
${usage().trim()}
\`\`\`

\`UNEXPOSED_ACCESS_TOKEN\` and \`UNEXPOSED_API_URL\` can be used instead of \`--accessToken\` and \`--api-url\`.

## How It Works

The client creates a one-use Generation Key Pair, seals the prompt and optional source images with a sender key, and submits only the encrypted task payload. The Task Manager receives the Access Token, model name, and sealed request. It does not receive the Generation Key Pair private key or decrypted prompt/source content. The SDK sends the private key directly to the Generation Session, which streams image bytes back to the SDK.

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
- \`generateImage(options)\`: generate one image and return a \`GeneratedImage\`.
- \`generateImages(images, options)\`: generate a batch and yield each image result.
- \`GeneratedImage\`: generated image bytes plus \`save(path)\`.
- \`createSealedImageGenerationTask(options)\`: create a sealed task without submitting it.
- \`submitImageGenerationTask(options)\`: submit an already sealed task.
- \`sealImageGenerationRequest(payload)\`: seal a request payload.
- \`openImageGenerationRequest(options)\`: open a sealed request with its Generation Key Pair private key.
- \`TaskManagerError\`: error thrown for non-2xx Task Manager responses.
- \`DEFAULT_API_URL\`: default Task Manager URL.

## generateImage

\`\`\`js
const image = await generateImage({
  accessToken: "ux_...AIax",
  prompt: "product photo of a watch",
  model: "flux2_dev",
});

await image.save("./watch.png");
\`\`\`

Options:

- \`accessToken\`: Access Token used for access and billing checks. Falls back to \`UNEXPOSED_ACCESS_TOKEN\`.
- \`prompt\`: prompt to seal. Required unless the model catalogue marks the model promptless.
- \`apiUrl\`: Task Manager base URL. Defaults to \`DEFAULT_API_URL\`.
- \`model\`: allowed image model identifier. Defaults to \`flux2_dev\`.
- \`source\`: optional source image path or object.
- \`sources\`: optional source image paths or objects.
- \`output\`: optional path to save while generating.
- \`onProgress\`: optional content-blind progress callback.
- \`fetchImpl\`: optional fetch-compatible function for tests or custom runtimes.

## generateImages

\`\`\`js
for await (const result of generateImages(
  [
    { prompt: "product photo of a watch", model: "flux2_dev" },
    { prompt: "studio product photo of headphones", model: "flux2_dev" },
  ],
  { accessToken: "ux_...AIax" },
)) {
  if (result.ok) {
    await result.image.save(\`./image-\${result.index}.png\`);
  } else {
    console.error(result.error);
  }
}
\`\`\`

Batch submission sends one request to the Task Manager. Each image is still its own Image Generation Task and its own Credit Reservation. The SDK keeps connection scheduling internal.

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
