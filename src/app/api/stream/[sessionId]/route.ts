import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: {"sessionId":"${params.sessionId}"}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
