interface VisitorPayload {
  name: string;
}

const ntfyTopic = Deno.env.get("NTFY_TOPIC");

function isVisitorPayload(value: unknown): value is VisitorPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === "string";
}

async function notifyVisitor(name: string): Promise<void> {
  if (!ntfyTopic) {
    return;
  }

  const response = await fetch(`https://ntfy.sh/${ntfyTopic}`, {
    method: "POST",
    body: `😀 New multiplayer visitor: ${name}`,
  });

  if (!response.ok) {
    throw new Error(`ntfy request failed with status ${response.status}`);
  }

  console.log("Notification sent to ntfy!");
}

export async function handleVisitorRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "POST",
      },
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!isVisitorPayload(payload)) {
    return new Response("Invalid visitor payload", { status: 400 });
  }

  const name = payload.name.trim();
  if (!name) {
    return new Response("Name is required", { status: 400 });
  }

  try {
    await notifyVisitor(name);
  } catch (error) {
    console.error("Failed to send ntfy notification", error);
    return new Response("Failed to send notification", { status: 502 });
  }

  return new Response(null, { status: 204 });
}
