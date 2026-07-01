export const DEFAULT_API_URL = "https://api.unexposed.ai";

export const usage = () => `Usage:
  unexposed-image-gen "prompt" [options]
  npx @unexposed/image-gen "prompt" --accessToken ux_...

Options:
  --accessToken <token>   Access Token for access and billing checks.
  --token <token>         Alias for --accessToken.
  --api-url <url>         Task Manager base URL. Default: ${DEFAULT_API_URL}
  --model <model>         Image model identifier. Default: flux2_dev
  --workflow <slug>       Account-private Workflow slug.
  --source <path>         Optional source image to encrypt with the prompt.
                           Repeat for Workflows with multiple image inputs.
  --output <path>         Local output path. Not sent to the Task Manager.
  --help                  Show this help text.

Environment:
  UNEXPOSED_ACCESS_TOKEN  Access Token used when --accessToken is omitted.
  UNEXPOSED_API_URL       Task Manager URL used when --api-url is omitted.
`;

const readOptionValue = (argv, index, name) => {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
};

export const parseArgs = (argv, env = {}) => {
  const options = {
    accessToken: env.UNEXPOSED_ACCESS_TOKEN ?? "",
    apiUrl: env.UNEXPOSED_API_URL ?? DEFAULT_API_URL,
    model: "flux2_dev",
    modelProvided: false,
    output: null,
    source: null,
    sources: [],
    workflow: null,
  };
  const promptParts = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") return { help: true, options };
    if (arg === "--accessToken" || arg === "--token") {
      options.accessToken = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg.startsWith("--accessToken=")) {
      options.accessToken = arg.slice("--accessToken=".length);
    } else if (arg.startsWith("--token=")) {
      options.accessToken = arg.slice("--token=".length);
    } else if (arg === "--api-url") {
      options.apiUrl = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg.startsWith("--api-url=")) {
      options.apiUrl = arg.slice("--api-url=".length);
    } else if (arg === "--model") {
      options.model = readOptionValue(argv, index, arg);
      options.modelProvided = true;
      index += 1;
    } else if (arg.startsWith("--model=")) {
      options.model = arg.slice("--model=".length);
      options.modelProvided = true;
    } else if (arg === "--workflow") {
      options.workflow = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg.startsWith("--workflow=")) {
      options.workflow = arg.slice("--workflow=".length);
    } else if (arg === "--source") {
      options.sources.push(readOptionValue(argv, index, arg));
      index += 1;
    } else if (arg.startsWith("--source=")) {
      options.sources.push(arg.slice("--source=".length));
    } else if (arg === "--output") {
      options.output = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      promptParts.push(arg);
    }
  }

  return {
    help: false,
    options: {
      ...options,
      source: options.sources[0] ?? null,
      prompt: promptParts.join(" ").trim(),
    },
  };
};
