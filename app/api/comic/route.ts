import { generateObject, generateText } from "ai";
import { z } from "zod";

export const maxDuration = 120;

const TEXT_MODEL = process.env.HARU_TEXT_MODEL ?? "anthropic/claude-sonnet-4.5";
const IMAGE_MODEL =
  process.env.HARU_IMAGE_MODEL ?? "google/gemini-2.5-flash-image";

const requestSchema = z.object({
  line: z.string().trim().min(1).max(200),
  protagonist: z.string().trim().min(1).max(20),
});

const scriptSchema = z.object({
  title: z.string().describe("만화 제목, 10자 내외"),
  panels: z
    .array(
      z.object({
        scene: z
          .string()
          .describe(
            "이 컷의 장면 묘사 (인물의 표정, 동작, 배경). 대사 없이 그림만으로 전달되도록 시각적으로 구체적으로",
          ),
        dialogue: z.string().describe("이 컷에 어울리는 한 줄 캡션 (그림에는 넣지 않음)"),
      }),
    )
    .length(4),
});

type Script = z.infer<typeof scriptSchema>;

function hasGatewayCredentials() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN,
  );
}

function demoScript(line: string, hero: string): Script {
  return {
    title: `${hero}의 하루 (데모)`,
    panels: [
      {
        scene: `${hero}가 창밖을 보며 하루를 시작한다.`,
        dialogue: `"${line.slice(0, 30)}..." ...이게 오늘의 시작이었지.`,
      },
      {
        scene: `${hero}가 상황 한가운데에서 눈이 동그래진다.`,
        dialogue: "어? 이게 아닌데?",
      },
      {
        scene: `${hero}가 머리를 감싸쥐고 과장되게 좌절한다.`,
        dialogue: "아아아... 왜 하필 오늘...",
      },
      {
        scene: `${hero}가 이불 속에서 피식 웃는다.`,
        dialogue: "그래도 뭐, 이것도 하루네.",
      },
    ],
  };
}

async function writeScript(line: string, protagonist: string): Promise<Script> {
  const pov =
    protagonist === "나"
      ? "글쓴이 본인이 주인공입니다. 글쓴이의 시점에서 그날의 감정과 속마음이 드러나게 그려주세요."
      : `글에 등장하는 '${protagonist}'이(가) 주인공입니다. 같은 사건을 ${protagonist}의 시점에서 재해석해서, ${protagonist}이(가) 무엇을 보고 느꼈을지 상상해서 그려주세요. 글쓴이는 조연으로 등장합니다.`;

  const { object } = await generateObject({
    model: TEXT_MODEL,
    schema: scriptSchema,
    prompt: [
      "당신은 일상을 빵 터지게 그리는 개그 네컷만화 작가입니다.",
      "아래 '오늘의 한 줄'을 기승전결이 있는 4컷 개그 만화 대본으로 만들어주세요.",
      "이 만화는 대사 없이 그림만으로 이야기하는 무언(無言) 만화입니다.",
      "각 컷의 장면은 표정과 동작만으로 감정이 전달되게 구체적으로 묘사해주세요.",
      "톤 규칙 (중요):",
      "- 기본 톤은 무조건 명랑하고 웃긴 개그. 과장된 표정, 슬랩스틱, 엉뚱한 상상, 허를 찌르는 개그를 적극 활용.",
      "- 입력에 슬픔·불안·좌절 같은 부정적 감정이 직접 적혀 있지 않다면, 그런 어두운 정서는 절대 넣지 마세요. 좌절/한숨/우울 장면 금지.",
      "- 입력에 부정적 감정이 직접 있더라도 최대한 웃음으로 승화시키는 방향으로.",
      "마지막 컷은 여운보다는 빵 터지는 반전이나 허무 개그로 마무리해주세요.",
      "",
      `시점: ${pov}`,
      "",
      `오늘의 한 줄: "${line}"`,
    ].join("\n"),
  });

  return object;
}

async function drawComic(script: Script): Promise<string | null> {
  const panelLines = script.panels
    .map((p, i) => `Panel ${i + 1}: ${p.scene}`)
    .join("\n");

  try {
    // gemini-2.5-flash-image는 게이트웨이에서 언어 모델로 분류되어
    // generateImage 대신 generateText의 files 출력으로 이미지를 받는다
    const { files } = await generateText({
      model: IMAGE_MODEL,
      prompt: [
        "Generate a single image: a 4-panel comic strip in a 2x2 grid, square composition, with slightly wobbly hand-drawn black panel borders.",
        "Style: crude ballpoint-pen doodle comic drawn by hand in a notebook — black ink only on plain white paper.",
        "Characters are extremely simple wobbly blob shapes with tiny dot eyes and a small mouth, no detailed anatomy.",
        "Shaky imperfect linework, naive amateur charm. Use rough scribbled crosshatch/hatching fills for comedic over-dramatic emphasis, otherwise lots of empty white space.",
        "Mood: silly gag comic — exaggerated goofy expressions, comedic slapstick poses, funny timing. Keep it lighthearted and absurd, never gloomy.",
        "COMPLETELY WORDLESS: absolutely no text, no letters, no words, no speech bubbles, no title, no sound effects, no captions anywhere in the image.",
        "Also no letter-like scribbles, smudges, symbols, or calligraphy floating in the air — keep backgrounds clean.",
        "Tell the story purely through facial expressions, body language, and composition (motion lines and sweat drops are OK).",
        "Each of the 4 panels must show a clearly different moment — vary the camera angle, framing, and action so the story progresses panel to panel.",
        panelLines,
      ].join("\n"),
    });
    const image = files.find((f) => f.mediaType.startsWith("image/"));
    if (!image) return null;
    return image.base64.startsWith("data:")
      ? image.base64
      : `data:${image.mediaType};base64,${image.base64}`;
  } catch (error) {
    console.error("image generation failed:", error);
    return null;
  }
}

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
    return Response.json({
      demo: true,
      script: demoScript(line, protagonist),
      image: null,
    });
  }

  try {
    const script = await writeScript(line, protagonist);
    const image = await drawComic(script);
    return Response.json({ demo: false, script, image });
  } catch (error) {
    console.error("comic generation failed:", error);
    return Response.json(
      { error: "만화 생성에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
