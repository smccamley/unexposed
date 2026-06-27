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
UNEXPOSED_ACCESS_TOKEN=ux_... npx @unexposed/image-gen "editorial product photo of a watch"
```

## Usage

```js
import { submitSealedImageGenerationTask } from "@unexposed/image-gen";

const { result } = await submitSealedImageGenerationTask({
  accessToken: process.env.UNEXPOSED_ACCESS_TOKEN,
  prompt: "editorial product photo of a watch",
});

console.log(result);
```

```sh
unexposed-image-gen "turn this into a studio product photo" --source ./input.png --model default
```

## API

```js
import {
  createSealedImageGenerationTask,
  submitImageGenerationTask,
  submitSealedImageGenerationTask,
} from "@unexposed/image-gen";
```

`submitSealedImageGenerationTask(options)` seals a prompt and submits it to the Task Manager in one call. Pass `accessToken`, `prompt`, and optionally `apiUrl`, `model`, `source`, or `fetchImpl`.

`createSealedImageGenerationTask(options)` returns `{ task, generationPrivateKey }` without sending the task. Use this when another boundary owns submission.

`submitImageGenerationTask(options)` sends an already sealed task to `/v1/image-generation-tasks`.

## CLI Options

```text
Usage:
  unexposed-image-gen "prompt" [options]
  npx @unexposed/image-gen "prompt" --access-token ux_...

Options:
  --access-token <token>  Account token for access and billing checks.
  --api-url <url>         Task Manager base URL. Default: https://api.unexposed.ai
  --model <model>         Image model identifier. Default: default
  --source <path>         Optional source image to encrypt with the prompt.
  --output <path>         Future local output path. Not sent to the Task Manager.
  --help                  Show this help text.

Environment:
  UNEXPOSED_ACCESS_TOKEN  Account token used when --access-token is omitted.
  UNEXPOSED_API_URL       Task Manager URL used when --api-url is omitted.
```

`UNEXPOSED_ACCESS_TOKEN` and `UNEXPOSED_API_URL` can be used instead of the matching flags.

## How It Works

The client creates a one-use Generation Key Pair, seals the prompt and optional source image with a sender key, and submits only the encrypted task payload. The Task Manager receives the Access Token, model name, and sealed request. It does not receive the Generation Key Pair private key or decrypted prompt/source content.

## Current State

The client package is ready to publish. Billing and generation infrastructure may still reject live task submissions until the Task Manager is deployed for customer traffic.

More detail lives in [docs/api.md](docs/api.md).
