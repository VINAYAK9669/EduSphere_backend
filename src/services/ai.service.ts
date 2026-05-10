const AI_URL = process.env.AI_SERVICE_URL;

export async function proxyToAI(
  path: string,
  payload: Record<string, unknown>
): Promise<Response> {
  const res = await fetch(`${AI_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.AI_INTERNAL_SECRET!,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`AI service error: ${res.status}`);
  return res;
}
