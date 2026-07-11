#!/usr/bin/env node
// W118 — Deploy verification guard (build-asset half).
// Proves the production bundle in dist/spa still carries a working PDF
// pipeline BEFORE it ships: the pdf.js worker asset exists, is referenced by
// the chunk that wires GlobalWorkerOptions, and carries the current cache key.
// The deployed-build half (console, download, avatar/ATS) lives in the manual
// prod smoke checklist — this script only guards what a build can prove.
//
// Usage: node scripts/verify-build.mjs   (run AFTER `npm run build`)

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIST = join(process.cwd(), "dist", "spa");
const ASSETS = join(DIST, "assets");

let failed = false;
const pass = (msg) => console.log(`  PASS  ${msg}`);
const fail = (msg) => {
  failed = true;
  console.error(`  FAIL  ${msg}`);
};

console.log("W118 build verification — dist/spa\n");

// 1. Build output exists at all.
if (!existsSync(DIST) || !existsSync(join(DIST, "index.html"))) {
  fail("dist/spa/index.html missing — run `npm run build` first");
  process.exit(1);
}
const indexHtml = readFileSync(join(DIST, "index.html"), "utf8");
if (/\/assets\/[\w.-]+\.js/.test(indexHtml)) {
  pass("index.html references a hashed entry chunk");
} else {
  fail("index.html has no /assets/*.js reference — broken entry");
}

// 2. Exactly one pdf.js worker asset, with a sane size (the worker is ~1MB;
//    a tiny file means the emit broke and preview/download will blank out).
const assetFiles = readdirSync(ASSETS);
const workers = assetFiles.filter((f) => /^pdf\.worker\.min-.*\.mjs$/.test(f));
if (workers.length === 1) {
  const size = statSync(join(ASSETS, workers[0])).size;
  if (size > 500_000) {
    pass(`worker asset ${workers[0]} (${(size / 1024 / 1024).toFixed(1)} MB)`);
  } else {
    fail(`worker asset ${workers[0]} is only ${size} bytes — truncated emit`);
  }
} else {
  fail(`expected exactly 1 pdf.worker.min-*.mjs asset, found ${workers.length}`);
}

// 3. Some chunk must reference the emitted worker filename — this is the
//    GlobalWorkerOptions.workerSrc wiring; if the URL rewrite breaks, preview
//    dies at runtime with a worker 404 (the recurring outage this guards).
if (workers.length === 1) {
  const referenced = assetFiles
    .filter((f) => f.endsWith(".js"))
    .some((f) => readFileSync(join(ASSETS, f), "utf8").includes(workers[0]));
  if (referenced) {
    pass(`a chunk references ${workers[0]} (workerSrc wiring intact)`);
  } else {
    fail(`no chunk references ${workers[0]} — workerSrc wiring broken`);
  }
}

// 4. The cache-busting key in source must appear in the built chunks, so a
//    key bump can never ship with a stale bundle (mjs-MIME outage class).
const workerSource = readFileSync(
  join(process.cwd(), "src", "lib", "resume-engine", "preview", "pdf-worker.ts"),
  "utf8",
);
const keyMatch = workerSource.match(/PDF_WORKER_CACHE_KEY\s*=\s*"([^"]+)"/);
if (!keyMatch) {
  fail("cannot read PDF_WORKER_CACHE_KEY from src (constant renamed?)");
} else {
  const inDist = assetFiles
    .filter((f) => f.endsWith(".js"))
    .some((f) => readFileSync(join(ASSETS, f), "utf8").includes(keyMatch[1]));
  if (inDist) {
    pass(`cache key "${keyMatch[1]}" present in built chunks`);
  } else {
    fail(`cache key "${keyMatch[1]}" not found in dist — stale build vs source`);
  }
}

// 5. Info only: the /dev/resume-smoke harness chunk should exist — it is the
//    one-page deployed smoke that exercises blob + worker + canvas together.
const smokeChunk = assetFiles.find((f) => f.startsWith("ResumeSmoke-"));
console.log(
  smokeChunk
    ? `  INFO  smoke harness chunk present (${smokeChunk}) — open /dev/resume-smoke on the deployed build`
    : "  INFO  no ResumeSmoke chunk found (route removed?) — update the prod checklist if intentional",
);

console.log("");
if (failed) {
  console.error("W118 build verification FAILED — do not deploy this bundle.");
  process.exit(1);
}
console.log("W118 build verification passed.");
