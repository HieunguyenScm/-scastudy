import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const readJson = (relativePath) => JSON.parse(readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8"));
const curriculum = readJson("../content/curriculum.json");
const glossary = readJson("../content/glossary.json");
const assignments = readJson("../content/assignments.json");
const sources = readJson("../content/sources.json");
const siteUrl = (process.env.CTNASCM_SITE_URL ?? "https://chuoi-hoc-supply-chain.smartlog-8786.chatgpt.site").replace(/\/$/, "");

const documents = [
  ...curriculum.map((week) => ({
    id: `week:${week.week}`,
    title: `Tuần ${String(week.week).padStart(2, "0")} - ${week.title}`,
    url: `${siteUrl}/week/${week.week}`,
    text: [week.moduleName, week.title, week.titleEn, week.summary, week.summaryEn, week.objectives.join("; "), week.concepts.join("; "), week.practice.join("; "), week.deliverable, week.portfolio, week.sourceRefs.map((ref) => `${ref.chapter} ${ref.pages} ${ref.note}`).join("; ")].join("\n"),
    metadata: { type: "week", module: String(week.module), tools: week.tools.join(", ") },
  })),
  ...glossary.map((term) => ({
    id: `term:${term.term}`,
    title: `${term.term} - ${term.vi}`,
    url: `${siteUrl}/glossary`,
    text: `${term.term}\n${term.vi}\n${term.meaning}\nVí dụ: ${term.example}`,
    metadata: { type: "glossary", category: term.category },
  })),
  ...assignments.map((assignment) => ({
    id: `assignment:${assignment.module}`,
    title: `Module ${assignment.module} - ${assignment.title}`,
    url: `${siteUrl}/case-study`,
    text: `${assignment.brief}\nOutputs: ${assignment.outputs.join("; ")}\nRubric: ${assignment.rubric.map((item) => `${item.criterion} ${item.weight}%`).join("; ")}`,
    metadata: { type: "assignment", module: String(assignment.module), weeks: assignment.weeks },
  })),
];

const searchOutputSchema = {
  results: z.array(z.object({ id: z.string(), title: z.string(), url: z.string() })),
};
const fetchOutputSchema = {
  id: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
};
const weekOutputSchema = {
  week: z.number(),
  module: z.number(),
  moduleName: z.string(),
  title: z.string(),
  summary: z.string(),
  objectives: z.array(z.string()),
  concepts: z.array(z.string()),
  practice: z.array(z.string()),
  deliverable: z.string(),
  sourceMap: z.array(z.object({ title: z.string(), chapter: z.string(), pages: z.string(), note: z.string() })),
  url: z.string(),
};
const readOnlyAnnotations = { readOnlyHint: true, openWorldHint: false, destructiveHint: false };

export function searchDocuments(query) {
  const terms = query.toLocaleLowerCase("vi").split(/\s+/).filter(Boolean);
  return documents
    .map((document) => ({ document, score: terms.reduce((score, term) => score + (document.title.toLocaleLowerCase("vi").includes(term) ? 4 : 0) + (document.text.toLocaleLowerCase("vi").includes(term) ? 1 : 0), 0) }))
    .filter((item) => !terms.length || item.score > 0)
    .sort((a, b) => b.score - a.score || a.document.title.localeCompare(b.document.title, "vi"))
    .slice(0, 12)
    .map(({ document }) => ({ id: document.id, title: document.title, url: document.url }));
}

export function fetchDocument(id) {
  return documents.find((document) => document.id === id) ?? null;
}

export function learningWeek(weekNumber) {
  const week = curriculum.find((item) => item.week === weekNumber);
  if (!week) return null;
  return {
    week: week.week,
    module: week.module,
    moduleName: week.moduleName,
    title: week.title,
    summary: week.summary,
    objectives: week.objectives,
    concepts: week.concepts,
    practice: week.practice,
    deliverable: week.deliverable,
    sourceMap: week.sourceRefs.map((reference) => ({
      title: sources.find((source) => source.id === reference.sourceId)?.title ?? reference.sourceId,
      chapter: reference.chapter,
      pages: reference.pages,
      note: reference.note,
    })),
    url: `${siteUrl}/week/${week.week}`,
  };
}

function createCtnascmServer() {
  const server = new McpServer(
    { name: "ctnascm", version: "0.1.0" },
    { instructions: "Use search to find relevant Supply Chain curriculum, glossary or assignment items. Use fetch with an exact result id for full content. Use get_learning_week when the user names a week number. Answer in Vietnamese and retain English only for professional Supply Chain terms." },
  );

  server.registerTool("search", {
    title: "Search CTN ASCM knowledge",
    description: "Use this when the learner wants to find a Supply Chain lesson, glossary term, assignment, tool or concept in the CTN ASCM curriculum.",
    inputSchema: { query: z.string() },
    outputSchema: searchOutputSchema,
    annotations: readOnlyAnnotations,
  }, async ({ query }) => {
    const structuredContent = { results: searchDocuments(query) };
    return { structuredContent, content: [{ type: "text", text: JSON.stringify(structuredContent) }] };
  });

  server.registerTool("fetch", {
    title: "Fetch CTN ASCM item",
    description: "Use this when search returned an exact CTN ASCM item id and the learner needs its full lesson, glossary or assignment content.",
    inputSchema: { id: z.string() },
    outputSchema: fetchOutputSchema,
    annotations: readOnlyAnnotations,
  }, async ({ id }) => {
    const document = fetchDocument(id);
    const structuredContent = document ?? { id, title: "Không tìm thấy", text: `Không có tài liệu với id ${id}.`, url: "", metadata: { type: "not_found" } };
    return { structuredContent, content: [{ type: "text", text: JSON.stringify(structuredContent) }] };
  });

  server.registerTool("get_learning_week", {
    title: "Get a learning week",
    description: "Use this when the learner asks for the objectives, concepts, practice, deliverable or source map of one specific week from 1 to 24.",
    inputSchema: { week: z.number().int().min(1).max(24) },
    outputSchema: weekOutputSchema,
    annotations: readOnlyAnnotations,
  }, async ({ week }) => {
    const structuredContent = learningWeek(week);
    if (!structuredContent) throw new Error(`Week ${week} not found`);
    return { structuredContent, content: [{ type: "text", text: JSON.stringify(structuredContent) }] };
  });
  return server;
}

const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";
const httpServer = createServer(async (req, res) => {
  if (!req.url) return res.writeHead(400).end("Missing URL");
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS", "Access-Control-Allow-Headers": "content-type, mcp-session-id", "Access-Control-Expose-Headers": "Mcp-Session-Id" }).end();
    return;
  }
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ name: "ctnascm", status: "ok", tools: ["search", "fetch", "get_learning_week"] }));
    return;
  }
  if (url.pathname === MCP_PATH && req.method && new Set(["POST", "GET", "DELETE"]).has(req.method)) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    const server = createCtnascmServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close(); server.close(); });
    try { await server.connect(transport); await transport.handleRequest(req, res); }
    catch (error) { console.error("MCP request failed", error); if (!res.headersSent) res.writeHead(500).end("Internal server error"); }
    return;
  }
  res.writeHead(404).end("Not Found");
});

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(port, () => console.log(`ctnascm MCP server listening on http://localhost:${port}${MCP_PATH}`));
}
