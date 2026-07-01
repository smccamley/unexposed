# @unexposed/image-gen

![Unexposed Image Gen](media/unexposed-image-gen.svg)

> Thin Unexposed image generation client for sealed task submission.

## Highlights

- Sends only sealed prompts and source images to the Task Manager.
- Keeps the Generation Key Pair private key out of the Task Manager request.
- Works as a Node API or a tiny command line tool.
- Uses Node Web Crypto: X25519, HKDF-SHA-256, and AES-256-GCM.
- Has no runtime dependencies.

## Install

```sh
npm install @unexposed/image-gen
```

Or run the CLI directly:

```sh
npx @unexposed/image-gen "product photo of a watch" --accessToken ux_...AIax --model flux2_dev --output ./watch.png
```

## Usage

```js
import { generateImage, generateImages } from "@unexposed/image-gen";

const image = await generateImage({
  accessToken: "ux_...AIax",
  prompt: "product photo of a watch",
  model: "flux2_dev",
});

await image.save("./watch.png");
```

```js
for await (const result of generateImages(
  [
    { prompt: "product photo of a watch", model: "flux2_dev" },
    { prompt: "studio product photo of headphones", model: "flux2_dev" },
  ],
  { accessToken: "ux_...AIax" },
)) {
  if (result.ok) await result.image.save(`./image-${result.index}.png`);
}
```

```sh
unexposed-image-gen "studio product photo of a watch" --model flux2_dev --output ./watch.png --accessToken ux_...AIax
```

```sh
unexposed-image-gen "studio product photo of a watch" --workflow cool-workflow --source ./img1.png --accessToken ux_...AIax
```

## API

```js
import {
  createSealedImageGenerationTask,
  generateImage,
  generateImages,
  submitImageGenerationTask,
  submitSealedImageGenerationTask,
} from "@unexposed/image-gen";
```

`generateImage(options)` seals a prompt, submits the task, streams the Generated Image from the Generation Session, and returns a `GeneratedImage`. Pass `accessToken`, `prompt`, and either `model` or `workflow`. You may also pass `apiUrl`, `source`, `sources`, `output`, `onProgress`, or `fetchImpl`.

`generateImages(images, options)` submits a batch and returns an async iterator. Each result is either `{ ok: true, image }` or `{ ok: false, error }`. The SDK keeps scheduling internal and does not expose a concurrency setting.

`GeneratedImage.save(path)` writes the image to disk, creates parent directories, and infers the extension from the image content type.

`submitSealedImageGenerationTask(options)` is the lower-level task submission helper.

`createSealedImageGenerationTask(options)` returns `{ task, generationPrivateKey }` without sending the task. Use this when another boundary owns submission.

`submitImageGenerationTask(options)` sends an already sealed task to `/v1/image-generation-tasks`.

## CLI Options

```text
Usage:
  unexposed-image-gen "prompt" [options]
  npx @unexposed/image-gen "prompt" --accessToken ux_...

Options:
  --accessToken <token>   Access Token for access and billing checks.
  --token <token>         Alias for --accessToken.
  --api-url <url>         Task Manager base URL. Default: https://api.unexposed.ai
  --model <model>         Image model identifier. Default: flux2_dev
  --workflow <slug>       Account-private Workflow slug.
  --source <path>         Optional source image to encrypt with the prompt.
                           Repeat for Workflows with multiple image inputs.
  --output <path>         Local output path. Not sent to the Task Manager.
  --help                  Show this help text.

Environment:
  UNEXPOSED_ACCESS_TOKEN  Access Token used when --accessToken is omitted.
  UNEXPOSED_API_URL       Task Manager URL used when --api-url is omitted.
```

`UNEXPOSED_ACCESS_TOKEN` and `UNEXPOSED_API_URL` can be used instead of `--accessToken` and `--api-url`.

## How It Works

The client creates a one-use Generation Key Pair, seals the prompt and optional source images with a sender key, and submits only the encrypted task payload. The Task Manager receives the Access Token, model name or Workflow slug, and sealed request. It does not receive the Generation Key Pair private key or decrypted prompt/source content. The SDK sends the private key directly to the Generation Session, which streams image bytes back to the SDK.

More detail lives in [docs/api.md](docs/api.md).
