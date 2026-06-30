export const DEFAULT_API_URL: "https://api.unexposed.ai";

export type PromptRequiredImageModel =
  | "flux2_dev"
  | "qwen"
  | "krea2_turbo"
  | "krea2_raw"
  | "chroma";

export type ImageModel = PromptRequiredImageModel;

export type ImageSource =
  | string
  | {
      filename?: string;
      contentType?: string;
      bytes?: Uint8Array | ArrayBuffer | number[];
      bytesBase64?: string;
    };

export type ImageSourceInput =
  | { source?: ImageSource; sources?: never }
  | { source?: never; sources?: ImageSource[] };

export interface GenerationProgressEvent {
  stage: string;
  requestId?: string;
  model?: ImageModel;
  creditsReserved?: number;
  creditsCharged?: number;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface GenerateImageBaseOptions {
  accessToken?: string;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  onProgress?: (event: GenerationProgressEvent) => void;
  output?: string | null;
}

export interface GenerateImagesBaseOptions {
  accessToken?: string;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  onProgress?: (event: GenerationProgressEvent) => void;
  output?: (image: GenerateImageOptions, index: number) => string | null;
}

export type GenerateImageOptions =
  & GenerateImageBaseOptions
  & ImageSourceInput
  & {
    model?: ImageModel;
    prompt: string;
  };

export class GeneratedImage {
  bytes: Uint8Array;
  base64: string;
  contentType: string;
  extension: string;
  id: string;
  model: string | null;
  path: string | null;
  requestId: string;
  save(outputPath: string): Promise<string>;
}

export class TaskManagerError extends Error {
  status: number;
  statusText: string;
  body: unknown;
}

export class GenerationSessionError extends Error {
  code: string;
  event: GenerationProgressEvent | null;
  requestId: string | null;
  status: number | null;
}

export function generateImage(options: GenerateImageOptions): Promise<GeneratedImage>;

export type GenerateImagesResult =
  | {
      ok: true;
      image: GeneratedImage;
      index: number;
      model: ImageModel;
      requestId: string;
    }
  | {
      ok: false;
      error: unknown;
      index: number;
      model: ImageModel;
      requestId: string | null;
    };

export function generateImages(
  images: GenerateImageOptions[],
  options?: GenerateImagesBaseOptions,
): AsyncGenerator<GenerateImagesResult>;

export function createSealedImageGenerationTask(options: GenerateImageOptions): Promise<{
  generationPrivateKey: CryptoKey;
  task: {
    tool: "image-gen";
    model: ImageModel;
    sealedRequest: unknown;
  };
}>;

export function createSealedImageGenerationTasks(images: GenerateImageOptions[]): Promise<Array<{
  generationPrivateKey: CryptoKey;
  task: {
    tool: "image-gen";
    model: ImageModel;
    sealedRequest: unknown;
  };
}>>;

export function submitSealedImageGenerationTask(options: GenerateImageOptions): Promise<{
  generationPrivateKey: CryptoKey;
  result: unknown;
}>;

export function submitImageGenerationTask(options: {
  accessToken: string;
  apiUrl: string;
  fetchImpl?: typeof fetch;
  task: unknown;
}): Promise<unknown>;

export function submitImageGenerationTasks(options: {
  accessToken: string;
  apiUrl: string;
  fetchImpl?: typeof fetch;
  tasks: unknown[];
}): Promise<unknown>;
