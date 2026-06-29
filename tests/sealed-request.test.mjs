import assert from "node:assert/strict";
import test from "node:test";
import {
  openImageGenerationRequest,
  sealImageGenerationRequest,
} from "../src/sealed-request.mjs";

test("sealImageGenerationRequest hides prompt and can be opened with generation private key", async () => {
  const payload = {
    tool: "image-gen",
    model: "flux2_dev",
    prompt: "private product photo prompt",
  };
  const { sealedRequest, generationPrivateKey } =
    await sealImageGenerationRequest(payload);
  const serialized = JSON.stringify(sealedRequest);

  assert.equal(sealedRequest.keyAgreement, "X25519");
  assert.equal(sealedRequest.keyDerivation, "HKDF-SHA-256");
  assert.equal(sealedRequest.encryption, "AES-256-GCM");
  assert.ok(!serialized.includes(payload.prompt));
  assert.ok(!serialized.includes("privateKey"));

  const opened = await openImageGenerationRequest({
    sealedRequest,
    generationPrivateKey,
  });

  assert.deepEqual(opened, payload);
});
