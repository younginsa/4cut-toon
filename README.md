# 하루네컷

오늘 하루를 **한 줄**로 적으면 **네컷만화**가 되는 웹서비스.

핵심 기능: 한 줄을 적으면 **등장 인물을 자동으로 추출**하고, 그중 주인공을 고르면
그 인물의 시점으로 하루를 재해석해 그려줍니다. 같은 한 줄이라도 주인공이 바뀌면
전혀 다른 만화가 나옵니다.

## 실행

```bash
npm install
npm run dev
```

API 키가 없으면 **데모 모드**로 동작합니다 (고정 대본, 이미지 없음).

## AI 활성화

`.env.local` 파일을 만들고 [Vercel AI Gateway 키](https://vercel.com/~/ai-gateway/api-keys)를 넣으세요.
키 하나로 대본 작성(LLM)과 만화 그리기(이미지 생성)가 모두 동작합니다.

```env
AI_GATEWAY_API_KEY=your_key_here

# (선택) 모델 오버라이드
# HARU_TEXT_MODEL=anthropic/claude-sonnet-4.5
# HARU_IMAGE_MODEL=google/gemini-2.5-flash-image
```

## 구조

- `app/page.tsx` — 입력 → 인물 선택 → 결과 렌더링 흐름
- `app/api/characters/route.ts` — 한 줄에서 등장 인물 추출 (데모 모드는 사전 기반)
- `app/api/comic/route.ts` — 2단계 생성 파이프라인
  1. LLM이 선택된 시점으로 4컷 대본 작성 (`generateObject`)
  2. 이미지 모델이 2x2 네컷만화 한 장 생성 (`generateImage`)
  - 이미지 생성 실패 시 대본 카드로 폴백, 키 없으면 데모 모드

## 알려진 이슈

- 한글 디렉토리 경로에서 Turbopack이 크래시하는 버그가 있어
  `dev`/`build` 스크립트가 `--webpack`을 사용합니다.
