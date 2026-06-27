export class TaskManagerError extends Error {
  constructor({ status, statusText, body }) {
    super(`Task Manager returned HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
    this.name = "TaskManagerError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

const taskEndpoint = (apiUrl) => {
  const baseUrl = String(apiUrl).replace(/\/+$/, "");
  return `${baseUrl}/v1/image-generation-tasks`;
};

const parseResponseBody = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const submitImageGenerationTask = async ({
  accessToken,
  apiUrl,
  fetchImpl = fetch,
  task,
}) => {
  const response = await fetchImpl(taskEndpoint(apiUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(task),
  });
  const body = parseResponseBody(await response.text());

  if (!response.ok) {
    throw new TaskManagerError({
      status: response.status,
      statusText: response.statusText,
      body,
    });
  }

  return body;
};
