import { z } from "zod";
import { demoScript, hasGatewayCredentials, writeScript } from "@/lib/comic";

export const maxDuration = 60;

const requestSchema = z.object({
  line: z.string().trim().min(1).max(200),
  protagonist: z.string().trim().min(1).max(20),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "한 줄 입력을 확인해주세요. (1~200자)" },
      { status: 400 },
    );
  }

  const { line, protagonist } = parsed.data;

  if (!hasGatewayCredentials()) {
    return Response.json({ demo: true, script: demoScript(line, protagonist) });
  }

  try {
    const script = await writeScript(line, protagonist);
    return Response.json({ demo: false, script });
  } catch (error) {
    console.error("script generation failed:", error);
    return Response.json(
      { error: "만화 대본 작성에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
