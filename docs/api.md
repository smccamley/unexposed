# Unexposed Image Gen API Reference

This file is generated from `package.json` and `src/args.mjs`.

## Package

- Package: `@unexposed/image-gen`
- Version: `0.1.1`
- Node: `>=24`
- CLI: `unexposed-image-gen`

## Public Exports

- `submitSealedImageGenerationTask(options)`: seal and submit one image generation task.
- `createSealedImageGenerationTask(options)`: create a sealed task without submitting it.
- `submitImageGenerationTask(options)`: submit an already sealed task.
- `sealImageGenerationRequest(payload)`: seal a request payload.
- `openImageGenerationRequest(options)`: open a sealed request with its Generation Key Pair private key.
- `TaskManagerError`: error thrown for non-2xx Task Manager responses.
- `DEFAULT_API_URL`: default Task Manager URL.

## submitSealedImageGenerationTask

```js
const { result, generationPrivateKey } = await submitSealedImageGenerationTask({
  accessToken: "ux_...",
  prompt: "editorial product photo of a watch",
  model: "default",
});
```

Options:

- `accessToken`: Access Token used for access and billing checks.
- `prompt`: prompt to seal.
- `apiUrl`: Task Manager base URL. Defaults to `DEFAULT_API_URL`.
- `model`: image model identifier. Defaults to `default`.
- `source`: optional source image object to include in the sealed payload.
- `fetchImpl`: optional fetch-compatible function for tests or custom runtimes.

## CLI

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
