# Unexposed Image Gen API Reference

This file is generated from `package.json` and `src/args.mjs`.

## Package

- Package: `@unexposed/image-gen`
- Version: `0.1.6`
- Node: `>=24`
- CLI: `unexposed-image-gen`

## Public Exports

- `submitSealedImageGenerationTask(options)`: seal and submit one image generation task.
- `generateImage(options)`: generate one image and return a `GeneratedImage`.
- `generateImages(images, options)`: generate a batch and yield each image result.
- `GeneratedImage`: generated image bytes plus `save(path)`.
- `createSealedImageGenerationTask(options)`: create a sealed task without submitting it.
- `submitImageGenerationTask(options)`: submit an already sealed task.
- `sealImageGenerationRequest(payload)`: seal a request payload.
- `openImageGenerationRequest(options)`: open a sealed request with its Generation Key Pair private key.
- `TaskManagerError`: error thrown for non-2xx Task Manager responses.
- `DEFAULT_API_URL`: default Task Manager URL.

## generateImage

```js
const image = await generateImage({
  accessToken: "ux_...AIax",
  prompt: "product photo of a watch",
  model: "flux2_dev",
});

await image.save("./watch.png");
```

Options:

- `accessToken`: Access Token used for access and billing checks. Falls back to `UNEXPOSED_ACCESS_TOKEN`.
- `prompt`: prompt to seal. Required unless the model catalogue marks the model promptless.
- `apiUrl`: Task Manager base URL. Defaults to `DEFAULT_API_URL`.
- `model`: allowed image model identifier. Defaults to `flux2_dev`.
- `workflow`: Account-private Workflow slug. Use instead of `model`.
- `source`: optional source image path or object.
- `sources`: optional source image paths or objects. Workflow source images bind by order.
- `output`: optional path to save while generating.
- `onProgress`: optional content-blind progress callback.
- `fetchImpl`: optional fetch-compatible function for tests or custom runtimes.

## generateImages

```js
for await (const result of generateImages(
  [
    { prompt: "product photo of a watch", model: "flux2_dev" },
    { prompt: "studio product photo of headphones", model: "flux2_dev" },
  ],
  { accessToken: "ux_...AIax" },
)) {
  if (result.ok) {
    await result.image.save(`./image-${result.index}.png`);
  } else {
    console.error(result.error);
  }
}
```

Batch submission sends one request to the Task Manager. Each image is still its own Image Generation Task and its own Credit Reservation. The SDK keeps connection scheduling internal.

## CLI

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
