import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("redactUnearnedResults hides the answer key for wrong questions, keeps it for correct ones", async () => {
  const { redactUnearnedResults } = await import("../lib/redact-results.mjs");
  const out = redactUnearnedResults([
    { id: "a", correct: true, earned: 40, points: 40, expectedLabel: "7 ngày", explanation: "4+2+1=7" },
    { id: "b", correct: false, earned: 0, points: 30, expectedLabel: "Supplier", explanation: "dài nhất" },
  ]);
  assert.equal(out[0].expectedLabel, "7 ngày");
  assert.equal(out[0].explanation, "4+2+1=7");
  assert.equal(out[1].expectedLabel, "");
  assert.equal(out[1].explanation, "");
  // original correctness/points preserved so the learner still sees pass/fail + score
  assert.equal(out[1].correct, false);
  assert.equal(out[1].points, 30);
});

test("labs route never returns raw answer keys — redaction applied on GET and POST", async () => {
  const route = await read("../app/api/labs/route.ts");
  // GET attempt.results must be redacted.
  assert.match(route, /redactUnearnedResults\(attempt\.results\)/);
  // POST grade + saved results must be redacted before responding.
  assert.match(route, /redactUnearnedResults\(grade\.results\)/);
  assert.match(route, /redactUnearnedResults\(saved\.results\)/);
  // The raw grade/attempt must not be returned directly anymore.
  assert.doesNotMatch(route, /jsonResponse\(\{ attempt: saved, grade, progress/);
});

test("retrieval route withholds the model answer on a first failed attempt", async () => {
  const route = await read("../app/api/retrieval/route.ts");
  // Reveal only when passed or a prior attempt for this prompt exists.
  assert.match(route, /const revealModelAnswer = grade\.passed \|\| priorForPrompt\.length >= 1/);
  assert.match(route, /modelAnswer: revealModelAnswer \? item\.modelAnswer : null/);
  // Must not unconditionally return the model answer anymore.
  assert.doesNotMatch(route, /modelAnswer: item\.modelAnswer,/);
});
