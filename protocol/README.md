# Unexposed Image Generation Protocol

This folder contains shared protocol inputs for the public SDKs. SDKs should read these files in tests or generation scripts instead of keeping separate hand-written model tables.

## Model catalogue

`models.json` is the source of truth for:

- allowed public model IDs
- the default model
- prompt requirements
- source image requirements
- SDK size limits
- examples used by docs and tests

The server stays authoritative at runtime, but SDKs should use this catalogue for local validation, package types, examples, and conformance tests.

## Size limits

V1 uses intentionally simple limits:

- 50 MB per source image
- 50 MB per generated image
- 500 MB per batch submission

SDKs should check these before upload. The server must enforce them too.

## Live-only docs rule

Customer-facing docs may only expose SDK languages whose `generateImage` and `generateImages` behaviour works against the live service. Unsupported languages can exist in development folders, but they must not appear in the live docs selector until they work.
