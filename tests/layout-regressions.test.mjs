import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the open references panel stays in one column without negative-margin overlap", async () => {
  const [css, weekLesson] = await Promise.all([
    read("../app/globals.css"),
    read("../app/week/[week]/week-lesson.tsx"),
  ]);

  assert.match(weekLesson, /<details className="content-panel refs-panel">/);
  assert.match(css, /details\.refs-panel\s*\{[^}]*display:\s*block/);
  assert.match(css, /\.refs-body\s*>\s*\.panel-intro\s*\{[^}]*margin:\s*\.75rem 0 1\.4rem/);
});
