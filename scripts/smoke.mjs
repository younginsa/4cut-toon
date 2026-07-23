// 로컬 데브 서버 전용 스모크 테스트 (localhost만 호출)
import fs from "node:fs";

const BASE = "http://localhost:3457";
const h = { "Content-Type": "application/json" };
const line = process.argv[2] ?? "오늘도 귀여운 우리아들";
const protagonist = process.argv[3] ?? "나";

const warm = await fetch(BASE + "/");
console.log("[page]", warm.status);

let t0 = Date.now();
const r1 = await fetch(BASE + "/api/comic/script", {
  method: "POST",
  headers: h,
  body: JSON.stringify({ line, protagonist }),
});
const j1 = await r1.json();
console.log(
  "[script]",
  r1.status,
  ((Date.now() - t0) / 1000).toFixed(1) + "s |",
  j1.script?.title,
  "| povPanel:",
  j1.script?.povPanel,
);
j1.script?.panels.forEach((p, i) =>
  console.log(`${i + 1}컷:`, p.scene.slice(0, 70)),
);
if (!j1.script) process.exit(1);

t0 = Date.now();
const r2 = await fetch(BASE + "/api/comic/image", {
  method: "POST",
  headers: h,
  body: JSON.stringify({ script: j1.script }),
});
const j2 = await r2.json();
console.log(
  "[image]",
  r2.status,
  ((Date.now() - t0) / 1000).toFixed(1) + "s |",
  j2.image ? Math.round(j2.image.length / 1024) + "KB" : "null",
);
if (j2.image) {
  fs.writeFileSync(
    "/tmp/haru-grounded.jpg",
    Buffer.from(j2.image.split(",")[1], "base64"),
  );
  console.log("saved /tmp/haru-grounded.jpg");
}
