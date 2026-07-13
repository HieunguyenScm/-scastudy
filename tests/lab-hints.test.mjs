import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const labs = JSON.parse(
  await readFile(new URL("../content/interactive-labs.json", import.meta.url), "utf8"),
);

function question(questionId) {
  for (const lab of labs) {
    const match = lab.questions.find(({ id }) => id === questionId);
    if (match) return match;
  }

  throw new Error(`Question not found: ${questionId}`);
}

test("comparison hints do not reveal answers from prerequisite questions", () => {
  const hint = question("w9-q3").hint;

  assert.doesNotMatch(hint, /(?:^|\D)(?:120|130)(?:\D|$)/);
  assert.match(hint, /sai số tuyệt đối/i);
});
