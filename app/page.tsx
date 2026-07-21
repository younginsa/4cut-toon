"use client";

import { useState } from "react";

type Character = { name: string; hint: string };
type Panel = { scene: string; dialogue: string };
type ComicResult = {
  demo: boolean;
  script: { title: string; panels: Panel[] };
  image: string | null;
};

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
  const [placeholder] = useState(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
  );

  const busy = extracting || generating !== null;

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
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: line.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "인물 추출에 실패했어요.");
      setCharacters(data.characters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "인물 추출에 실패했어요.");
    } finally {
      setExtracting(false);
    }
  }

  async function generateComic(hero: string) {
    if (busy) return;
    setGenerating(hero);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/comic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: line.trim(), protagonist: hero }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성에 실패했어요.");
      setResult(data);
      setResultHero(hero);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성에 실패했어요.");
    } finally {
      setGenerating(null);
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
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs opacity-50">
            딱 한 줄이면 충분해요. 등장 인물은 자동으로 찾아드려요.{" "}
            <span className="tabular-nums">({line.length}/200)</span>
          </p>
          <button
            type="submit"
            disabled={!line.trim() || busy}
            className="rounded-full border-2 border-line bg-line px-5 py-1.5 text-sm font-bold text-white transition enabled:hover:bg-accent enabled:hover:border-accent disabled:opacity-40"
          >
            {extracting ? "인물 찾는 중..." : "인물 찾기"}
          </button>
        </div>
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

          {result.image ? (
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
