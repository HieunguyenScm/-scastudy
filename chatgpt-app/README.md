# ctnascm ChatGPT companion

Private, tool-only MCP app for searching and fetching the same 24-week curriculum used by the ctnascm website.

## Tools

- `search`: standard read-only knowledge search.
- `fetch`: standard read-only document fetch.
- `get_learning_week`: structured lesson, practice and source map for weeks 1-24.

All tools explicitly set `readOnlyHint: true`, `openWorldHint: false`, and `destructiveHint: false`, and declare `outputSchema`.

## Local development

```bash
npm install
npm test
npm start
```

The MCP endpoint is `http://localhost:8787/mcp`. For private ChatGPT Developer Mode testing, expose it temporarily through an HTTPS tunnel and refresh the app after tool metadata changes. Do not publish the tunnel URL.

Set `CTNASCM_SITE_URL` to the private production website URL so search citations open the correct week pages.
