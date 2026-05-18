export async function notifyVisitor(playerName: string): Promise<void> {
  await fetch("/api/visitor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: playerName }),
    keepalive: true,
  });
}
