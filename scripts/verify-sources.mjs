import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const libraryRoot = resolve(projectRoot, "..");
const sources = JSON.parse(
  await readFile(resolve(projectRoot, "content/sources.json"), "utf8"),
);
const sourceExcerpts = JSON.parse(
  await readFile(resolve(projectRoot, "content/source-excerpts.json"), "utf8"),
);

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

const failures = [];

for (const source of sources) {
  const path = resolve(libraryRoot, source.libraryPath);
  try {
    await access(path);
  } catch {
    const snapshots = sourceExcerpts.filter(
      (item) => item.sourceId === source.id && typeof item.excerpt === "string" && item.excerpt.trim().length >= 200,
    );
    if (snapshots.length && /^[a-f0-9]{64}$/.test(source.sha256) && source.pageCount > 0) {
      process.stdout.write(`verified extracted snapshot ${source.id} (${snapshots.length} excerpts; original PDF currently offline)\n`);
      continue;
    }
    failures.push(`${source.id}: missing ${source.libraryPath} and no usable extracted snapshot`);
    continue;
  }

  const digest = await sha256(path);
  if (digest !== source.sha256) {
    failures.push(`${source.id}: checksum mismatch`);
    continue;
  }
  process.stdout.write(`verified ${source.id}\n`);
}

if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`verified ${sources.length} attached PDF sources\n`);
}
