"use client";

import { animate, stagger, svg } from "animejs";
import { useEffect, useState } from "react";

type Character = { name: string; hint: string };
type Panel = { scene: string; dialogue: string };
type ComicResult = {
  demo: boolean;
  script: { title: string; panels: Panel[]; povPanel?: number };
  image: string | null;
};

function track(event: string, data?: Record<string, string | number>) {
  if (typeof window === "undefined") return;
  (
    window as {
      umami?: { track: (e: string, d?: Record<string, string | number>) => void };
    }
  ).umami?.track(event, data);
}

// 이미지가 그려지는 동안 각 컷에 낙서가 "그려지는 중"인 연필 라인드로잉
const PENCIL_DOODLES = [
  // 웃는 얼굴
  "M50 12 a38 38 0 1 0 0.1 0 M36 42 a4 4 0 1 0 .1 0 M64 42 a4 4 0 1 0 .1 0 M33 60 q17 16 34 0",
  // 고양이
  "M28 42 l-9 -20 l18 7 M72 42 l9 -20 l-18 7 M50 24 a32 32 0 1 0 .1 0 M40 50 a3 3 0 1 0 .1 0 M60 50 a3 3 0 1 0 .1 0 M44 62 q6 7 12 0 M20 55 l-12 -3 M20 62 l-12 3 M80 55 l12 -3 M80 62 l12 3",
  // 하트
  "M50 80 C18 58 18 24 45 30 C50 32 50 36 50 36 C50 36 50 32 55 30 C82 24 82 58 50 80",
  // 소용돌이 낙서
  "M50 50 q12 -16 27 -5 q16 11 1 26 q-21 16 -37 -4 q-13 -19 6 -32 q24 -15 40 9",
];

function PencilSheet({ hero }: { hero: string }) {
  useEffect(() => {
    const animation = animate(svg.createDrawable(".pencil-path"), {
      draw: ["0 0", "0 1"],
      ease: "inOutSine",
      duration: 1600,
      delay: stagger(450),
      loop: true,
      alternate: true,
    });
    return () => {
      animation.revert();
    };
  }, []);

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border-2 border-line bg-panel shadow-[4px_4px_0_0_var(--line)]">
        {PENCIL_DOODLES.map((d, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center border-line ${
              i % 2 === 0 ? "border-r-2" : ""
            } ${i < 2 ? "border-b-2" : ""}`}
          >
            <svg
              viewBox="0 0 100 100"
              className="h-2/3 w-2/3"
              fill="none"
              stroke="var(--line)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            >
              <path className="pencil-path" d={d} />
            </svg>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-sm opacity-60">
        {hero}의 시점으로 그리는 중... 밑그림부터 슥슥
      </p>
    </div>
  );
}

function Stickman() {
  return (
    <svg
      className="stickman-svg"
      width="34"
      height="48"
      viewBox="0 0 40 56"
      fill="none"
      stroke="var(--line)"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <circle cx="20" cy="8" r="6" />
      <line x1="20" y1="14" x2="20" y2="38" />
      <line className="stickman-arm-l" x1="20" y1="23" x2="20" y2="34" />
      <line className="stickman-arm-r" x1="20" y1="23" x2="20" y2="34" />
      <line className="stickman-leg-l" x1="20" y1="38" x2="20" y2="52" />
      <line className="stickman-leg-r" x1="20" y1="38" x2="20" y2="52" />
    </svg>
  );
}

const PLACEHOLDERS = [
  "지하철에서 졸다가 옆자리 아저씨 어깨에 기대버렸다",
  "팀장님이 갑자기 커피를 사주셨다",
  "고양이가 내 키보드 위에서 잠들었다",
];

export default function Home() {
  const [line, setLine] = useState("");
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComicResult | null>(null);
  const [resultHero, setResultHero] = useState<string | null>(null);
  const [imagePending, setImagePending] = useState(false);
  const [placeholder] = useState(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
  );

  const busy = extracting || generating !== null || imagePending;

  function resetForNewLine(value: string) {
    setLine(value);
    setCharacters(null);
    setError(null);
  }

  async function extractCharacters(e: React.FormEvent) {
    e.preventDefault();
    if (!line.trim() || busy) return;
    setExtracting(true);
    setError(null);
    setResult(null);
    setCharacters(null);
    track("find_characters", { length: line.trim().length });
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: line.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "인물 추출에 실패했어요.");
      setCharacters(data.characters);
      track("characters_found", { count: data.characters.length });
    } catch (err) {
      track("characters_failed");
      setError(err instanceof Error ? err.message : "인물 추출에 실패했어요.");
    } finally {
      setExtracting(false);
    }
  }

  async function generateComic(hero: string) {
    if (busy) return;
    setGenerating(hero);
    setError(null);
    const isPovSwitch = result !== null;
    setResult(null);
    const pov = hero === "나" ? "나" : "상대";
    track("generate_comic", { pov, switch: isPovSwitch ? 1 : 0 });
    const t0 = Date.now();
    try {
      // 1단계: 대본 (2~3초) — 도착하면 연필 밑그림 애니메이션으로 전환
      const scriptRes = await fetch("/api/comic/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: line.trim(), protagonist: hero }),
      });
      const scriptData = await scriptRes.json();
      if (!scriptRes.ok)
        throw new Error(scriptData.error ?? "생성에 실패했어요.");
      setResult({ demo: scriptData.demo, script: scriptData.script, image: null });
      setResultHero(hero);
      setGenerating(null);

      if (scriptData.demo) {
        track("comic_generated", { pov, image: 0, demo: 1, seconds: 0 });
        return;
      }

      // 2단계: 이미지 — 완성되면 갈아끼우기
      setImagePending(true);
      const imageRes = await fetch("/api/comic/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scriptData.script }),
      });
      const imageData = imageRes.ok ? await imageRes.json() : { image: null };
      setResult((prev) => (prev ? { ...prev, image: imageData.image } : prev));
      track("comic_generated", {
        pov,
        image: imageData.image ? 1 : 0,
        demo: 0,
        seconds: Math.round((Date.now() - t0) / 1000),
      });
    } catch (err) {
      track("comic_failed", { pov });
      setError(err instanceof Error ? err.message : "생성에 실패했어요.");
    } finally {
      setGenerating(null);
      setImagePending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <header className="text-center">
        <h1 className="text-4xl font-black tracking-tight">
          하루<span className="text-accent">네컷</span>
        </h1>
        <p className="mt-2 text-sm opacity-70">
          오늘 하루를 한 줄로 적으면, 네컷만화가 됩니다.
        </p>
      </header>

      <form
        onSubmit={extractCharacters}
        className="mt-8 rounded-2xl border-2 border-line bg-panel p-4 shadow-[4px_4px_0_0_var(--line)]"
      >
        <label className="text-xs font-bold opacity-60">오늘의 한 줄</label>
        <textarea
          value={line}
          onChange={(e) => resetForNewLine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              extractCharacters(e);
            }
          }}
          placeholder={`예) ${placeholder}`}
          rows={2}
          maxLength={200}
          className="mt-1 w-full resize-none bg-transparent text-lg outline-none placeholder:opacity-40"
        />
        <p className="mt-2 text-xs opacity-50">
          딱 한 줄이면 충분해요. 등장 인물은 자동으로 찾아드려요.{" "}
          <span className="tabular-nums">({line.length}/200)</span>
        </p>
        <button
          type="submit"
          disabled={!line.trim() || busy}
          className="mt-3 w-full rounded-xl border-2 border-line bg-line py-3 text-base font-bold text-white transition enabled:hover:bg-accent enabled:hover:border-accent disabled:opacity-40"
        >
          {extracting ? "인물 찾는 중..." : "인물 찾기"}
        </button>
      </form>

      {characters && (
        <section className="mt-6 rounded-2xl border-2 border-line bg-panel p-4 shadow-[4px_4px_0_0_var(--line)]">
          <p className="text-sm font-bold">
            누구의 시점으로 그릴까요?{" "}
            <span className="font-normal opacity-50">주인공을 골라주세요</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {characters.map((c) => {
              const isGenerating = generating === c.name;
              const isHero = result && resultHero === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => generateComic(c.name)}
                  disabled={busy}
                  title={c.hint}
                  className={`group rounded-xl border-2 border-line px-4 py-2 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:bg-accent enabled:hover:text-white disabled:opacity-50 ${
                    isHero ? "bg-accent text-white" : "bg-panel"
                  }`}
                >
                  <span className="block text-sm font-black">
                    {isGenerating ? `${c.name} 그리는 중...` : c.name}
                  </span>
                  <span className="block text-[11px] opacity-60 group-hover:opacity-90">
                    {c.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {generating && (
        <div className="mt-8">
          <div className="relative grid grid-cols-2 overflow-hidden rounded-2xl border-2 border-line/30 bg-panel">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`aspect-square border-line/30 bg-panel ${
                  i % 2 === 0 ? "border-r-2" : ""
                } ${i < 2 ? "border-b-2" : ""}`}
              />
            ))}
            <div className="stickman-runner top-[22%]">
              <Stickman />
            </div>
            <div className="stickman-runner reverse top-[72%]">
              <Stickman />
            </div>
          </div>
          <p className="mt-3 text-center text-sm opacity-60">
            {generating}의 시점으로 그리고 있어요... (최대 1분 정도 걸려요)
          </p>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-center text-sm text-red-600">
          {error}
        </p>
      )}

      {result && (
        <section className="mt-8">
          {result.demo && (
            <p className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-center text-xs text-amber-700">
              지금은 데모 모드예요. <code>AI_GATEWAY_API_KEY</code>를 설정하면
              진짜 AI가 만화를 그려줘요.
            </p>
          )}
          <h2 className="text-center text-xl font-black">
            {result.script.title}
          </h2>
          <p className="mt-1 text-center text-xs opacity-50">
            주인공: {resultHero} · 다른 인물을 누르면 그 시점으로 다시 그려요
          </p>

          {imagePending ? (
            <PencilSheet hero={resultHero ?? "주인공"} />
          ) : result.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.image}
              alt={result.script.title}
              className="mt-4 w-full rounded-2xl border-2 border-line shadow-[4px_4px_0_0_var(--line)]"
            />
          ) : (
            <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border-2 border-line bg-panel shadow-[4px_4px_0_0_var(--line)]">
              {result.script.panels.map((panel, i) => (
                <div
                  key={i}
                  className={`flex aspect-square flex-col border-line p-3 ${
                    i % 2 === 0 ? "border-r-2" : ""
                  } ${i < result.script.panels.length - 2 ? "border-b-2" : ""}`}
                >
                  <span className="text-xs font-black opacity-40">{i + 1}컷</span>
                  <p className="mt-1 flex-1 text-xs leading-relaxed opacity-70">
                    {panel.scene}
                  </p>
                  <p className="rounded-lg bg-background px-2 py-1.5 text-sm font-bold">
                    “{panel.dialogue}”
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="mt-12 text-center text-xs opacity-40">
        하루네컷 — 누구의 시점으로 그려볼까요?
      </footer>
    </main>
  );
}
