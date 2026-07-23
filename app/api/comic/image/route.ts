import { z } from "zod";
import { drawComic, hasGatewayCredentials, scriptSchema } from "@/lib/comic";

export const maxDuration = 120;

const requestSchema = z.object({ script: scriptSchema });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  if (!hasGatewayCredentials()) {
    return Response.json({ image: null });
  }

  const image = await drawComic(parsed.data.script);
  return Response.json({ image });
}
