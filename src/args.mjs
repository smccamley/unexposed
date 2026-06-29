export const DEFAULT_API_URL = "https://api.unexposed.ai";

export const usage = () => `Usage:
  unexposed-image-gen "prompt" [options]
  npx @unexposed/image-gen "prompt" --accessToken ux_...

Options:
  --accessToken <token>   Access Token for access and billing checks.
  --token <token>         Alias for --accessToken.
  --api-url <url>         Task Manager base URL. Default: ${DEFAULT_API_URL}
  --model <model>         Image model identifier. Default: flux2_dev
  --source <path>         Optional source image to encrypt with the prompt.
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
    output: null,
    source: null,
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
      index += 1;
    } else if (arg.startsWith("--model=")) {
      options.model = arg.slice("--model=".length);
    } else if (arg === "--source") {
      options.source = readOptionValue(argv, index, arg);
      index += 1;
    } else if (arg.startsWith("--source=")) {
      options.source = arg.slice("--source=".length);
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
      prompt: promptParts.join(" ").trim(),
    },
  };
};
