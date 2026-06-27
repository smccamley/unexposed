export const SEALED_REQUEST_PROTOCOL = "unexposed.sealed-request.v1";
export const SEALED_REQUEST_ASSOCIATED_DATA = "unexposed:image-gen:v1";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64Url = (value) => Buffer.from(value).toString("base64url");
const fromBase64Url = (value) => new Uint8Array(Buffer.from(value, "base64url"));
const toJsonBytes = (value) => textEncoder.encode(JSON.stringify(value));
const fromJsonBytes = (value) => JSON.parse(textDecoder.decode(value));

const randomBytes = (length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

const deriveAesKey = async ({ privateKey, publicKey, salt, usages }) => {
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "X25519", public: publicKey },
    privateKey,
    256,
  );
  const hkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, [
    "deriveKey",
  ]);

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: textEncoder.encode(SEALED_REQUEST_ASSOCIATED_DATA),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
};

const generateX25519KeyPair = () =>
  crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);

export const sealImageGenerationRequest = async (payload) => {
  const generationKeyPair = await generateX25519KeyPair();
  const senderKeyPair = await generateX25519KeyPair();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey({
    privateKey: senderKeyPair.privateKey,
    publicKey: generationKeyPair.publicKey,
    salt,
    usages: ["encrypt"],
  });
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: textEncoder.encode(SEALED_REQUEST_ASSOCIATED_DATA),
    },
    key,
    toJsonBytes(payload),
  );

  return {
    sealedRequest: {
      protocol: SEALED_REQUEST_PROTOCOL,
      keyAgreement: "X25519",
      keyDerivation: "HKDF-SHA-256",
      encryption: "AES-256-GCM",
      associatedData: SEALED_REQUEST_ASSOCIATED_DATA,
      generationPublicKey: toBase64Url(
        await crypto.subtle.exportKey("raw", generationKeyPair.publicKey),
      ),
      senderPublicKey: toBase64Url(await crypto.subtle.exportKey("raw", senderKeyPair.publicKey)),
      salt: toBase64Url(salt),
      iv: toBase64Url(iv),
      ciphertext: toBase64Url(ciphertext),
    },
    generationPrivateKey: generationKeyPair.privateKey,
  };
};

export const openImageGenerationRequest = async ({ sealedRequest, generationPrivateKey }) => {
  const senderPublicKey = await crypto.subtle.importKey(
    "raw",
    fromBase64Url(sealedRequest.senderPublicKey),
    { name: "X25519" },
    true,
    [],
  );
  const key = await deriveAesKey({
    privateKey: generationPrivateKey,
    publicKey: senderPublicKey,
    salt: fromBase64Url(sealedRequest.salt),
    usages: ["decrypt"],
  });
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64Url(sealedRequest.iv),
      additionalData: textEncoder.encode(sealedRequest.associatedData),
    },
    key,
    fromBase64Url(sealedRequest.ciphertext),
  );

  return fromJsonBytes(plaintext);
};
