import assert from "node:assert/strict";
import test from "node:test";
import { parseNumericAnswer } from "../lib/numeric-answer.mjs";

test("numeric answers accept decimal commas and natural unit suffixes", () => {
  assert.equal(parseNumericAnswer("13.3 units"), 13.3);
  assert.equal(parseNumericAnswer("13,3 units"), 13.3);
  assert.equal(parseNumericAnswer("216 units"), 216);
  assert.equal(parseNumericAnswer("55.6%"), 55.6);
});

test("numeric answers preserve signed values and normalize Unicode minus", () => {
  assert.equal(parseNumericAnswer("-8 units"), -8);
  assert.equal(parseNumericAnswer("−8 units"), -8);
  assert.equal(parseNumericAnswer("–8"), -8);
});

test("numeric answers reject missing or non-leading numbers", () => {
  assert.equal(parseNumericAnswer(""), null);
  assert.equal(parseNumericAnswer("units 13.3"), null);
  assert.equal(parseNumericAnswer("not a number"), null);
  assert.equal(parseNumericAnswer(Number.POSITIVE_INFINITY), null);
});
