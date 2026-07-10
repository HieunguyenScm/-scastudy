import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.NODE_ENV = "test";
const { fetchDocument, learningWeek, searchDocuments } = await import("./server.mjs");

test("search returns canonical curriculum results", () => {
  const results = searchDocuments("forecasting baseline");
  assert.ok(results.length > 0);
  assert.equal(results[0].id, "week:9");
  assert.match(results[0].url, /\/week\/9$/);
});

test("fetch and get week return source-aware content", () => {
  const document = fetchDocument("term:Safety stock");
  assert.equal(document?.metadata.type, "glossary");
  const week = learningWeek(22);
  assert.equal(week?.week, 22);
  assert.ok(week?.sourceMap.length >= 2);
  assert.match(week?.title ?? "", /Supply Chain AI/);
});

test("submission artifact covers every safe read-only tool", () => {
  const submission = JSON.parse(readFileSync(new URL("./chatgpt-app-submission.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(submission.tools).sort(), ["fetch", "get_learning_week", "search"]);
  assert.equal(submission.test_cases.length, 5);
  assert.equal(submission.negative_test_cases.length, 3);
  for (const tool of Object.values(submission.tools)) {
    assert.deepEqual(tool.annotations, { readOnlyHint: true, openWorldHint: false, destructiveHint: false });
  }
});
