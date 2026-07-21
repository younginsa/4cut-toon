import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 30;

const TEXT_MODEL =
  process.env.HARU_TEXT_MODEL ?? "google/gemini-3.1-flash-lite";

const requestSchema = z.object({
  line: z.string().trim().min(1).max(200),
});

const charactersSchema = z.object({
  characters: z
    .array(
      z.object({
        name: z.string().describe("인물을 부르는 짧은 이름. 글쓴이 본인은 반드시 '나'"),
        hint: z.string().describe("이 사건에서 이 인물의 역할 한 줄, 15자 내외"),
      }),
    )
    .min(1)
    .max(5),
});

const DEMO_DICTIONARY = [
  "엄마", "아빠", "팀장님", "팀장", "부장님", "과장님", "사장님", "선생님",
  "친구", "동생", "형", "누나", "언니", "오빠", "남편", "아내",
  "여자친구", "남자친구", "아저씨", "아줌마", "할머니", "할아버지",
  "고양이", "강아지", "아이", "딸", "아들", "동료", "손님", "의사",
];

function demoExtract(line: string) {
  const found = DEMO_DICTIONARY.filter((word) => line.includes(word)).map(
    (name) => ({ name, hint: "한 줄에 등장한 인물" }),
  );
  return [{ name: "나", hint: "이 하루를 쓴 사람" }, ...found].slice(0, 5);
}

function hasGatewayCredentials() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "한 줄 입력을 확인해주세요. (1~200자)" },
      { status: 400 },
    );
  }
  const { line } = parsed.data;

  if (!hasGatewayCredentials()) {
    return Response.json({ demo: true, characters: demoExtract(line) });
  }

  try {
    const { object } = await generateObject({
      model: TEXT_MODEL,
      schema: charactersSchema,
      prompt: [
        "아래 '오늘의 한 줄'에 등장하는 인물을 모두 추출해주세요.",
        "규칙:",
        "- 글쓴이 본인은 항상 첫 번째로, 이름은 '나'.",
        "- 사람뿐 아니라 동물 등 시점을 가질 수 있는 존재도 인물로 포함.",
        "- 문장에 암시만 된 인물(예: 커피를 준 사람)도 자연스러운 호칭으로 포함.",
        "- 최대 5명.",
        "",
        `오늘의 한 줄: "${line}"`,
      ].join("\n"),
    });
    return Response.json({ demo: false, characters: object.characters });
  } catch (error) {
    console.error("character extraction failed:", error);
    return Response.json(
      { error: "인물 추출에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
