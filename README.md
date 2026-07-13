# ctnascm — Supply Chain AI Learning OS

Nền tảng học Supply Chain / Demand Planning **24 tuần** bằng tiếng Việt, riêng tư
(auth-gated), chạy trên [vinext](https://github.com/cloudflare/vinext) (Next.js +
Cloudflare Workers + D1). Đây không phải một khung syllabus rỗng: mỗi tuần có bài
giảng đầy đủ, ví dụ FMCG có số liệu thật, tự kiểm tra, guided lab, nộp bằng chứng
và AI tutor bám sát nguồn.

## Triết lý: học bằng bằng chứng, không phải bằng click

Một tuần chỉ được tính **hoàn thành** khi người học đọc hết lesson blocks, làm đủ
practice, nộp evidence được AI mentor chấm đạt, và **mastered** khi vượt được
retrieval practice (gồm cả câu transfer). Tiến độ được suy ra từ hành vi học thật,
không phải từ việc bấm nút — xem `db/learning-state.ts`.

## Chương trình 24 tuần (6 module)

| Module | Chủ đề | Tuần |
|--------|--------|------|
| 1 | Nền tảng Supply Chain | 1–4 |
| 2 | Data & BI | 5–8 |
| 3 | Demand Planning & Forecasting | 9–12 |
| 4 | Planning & Inventory | 13–16 |
| 5 | Optimization & Simulation | 17–20 |
| 6 | AI, Systems & Career | 21–24 |

Mỗi tuần trong `content/curriculum.json` có một object `lesson` gồm: `coreIdea`,
3–4 `sections` (bài giảng ~120–220 từ mỗi mục), `workedExample` (ví dụ FMCG kèm
tính toán thật — EOQ, reorder point, safety stock, MAE/MAPE/WAPE, bias,
cash-to-cash, LP, network design…), và 5 câu `selfCheck` kèm đáp án mẫu.

## Nội dung & nguồn

- `content/curriculum.json` — 24 tuần, mỗi tuần có `lesson` + `sourceRefs` trỏ tới chương/trang sách thật.
- `content/sources.json` — 13 giáo trình nguồn, mỗi cuốn có `sha256` để `npm run verify:sources` xác minh checksum (chống trích dẫn "ảo").
- `content/source-excerpts.json` — trích đoạn thật từ các trang được dẫn, dùng để ground AI tutor.
- `content/teaching-notes.ts`, `content/boss-challenges.ts` — ghi chú giảng dạy và thử thách cuối module.
- `content/quizzes.json` (6 quiz × 5 câu), `content/glossary.json` (56 thuật ngữ), `content/assignments.json` (6 capstone brief có rubric).
- Thư viện PDF nguồn (`SC marterial/`) **không** được commit (nằm trong `.gitignore`); `verify:sources` đọc chúng từ thư mục thư viện trên máy.

## Các surface chính (`app/`)

- `/` dashboard: roadmap 24 tuần, tiến độ mastery, AI tutor.
- `/course`: Course Home theo mô hình professional certificate, gồm next action, lịch học cá nhân, syllabus 6 module, deadline 24 tuần, gradebook và điều kiện cấp chứng nhận.
- `/week/[week]`: bài giảng theo block (`lesson-reader.tsx`), mini-lab chấm điểm trực tiếp trên web (`interactive-lab.tsx`), applied work + submission (`submission-workspace.tsx`), retrieval practice và quiz cuối module.
- `/case-study`: workspace case kiểu tư vấn (problem → hypothesis → evidence → recommendation), chấm rubric, lưu revision.
- `/boss/[module]`: thử thách tổng hợp cuối mỗi module.
- `/portfolio`: evidence portfolio đã đạt.
- `/glossary`: tra cứu thuật ngữ.
- `app/api/*`: progress, lesson-progress, retrieval, quiz, submissions, mentor-review, tutor, portfolio, uploads, cases, learning-stats.

## Prerequisites

- Node.js `>=22.13.0`

## Chạy dự án

```bash
npm install
npm run dev     # chạy local (vinext + workerd runtime) tại http://localhost:3000
npm run build   # build production (Cloudflare Workers bundle)
```

Lưu ý: `npm run start` chạy bundle Cloudflare bằng Node thuần sẽ lỗi
`cloudflare:` ESM scheme — dùng `npm run dev` để chạy local.

## Kiểm thử

```bash
npm run typecheck        # tsc --noEmit
npm test                 # build + kiểm tra tính đầy đủ & nối dây của nội dung/route
npm run verify:sources   # xác minh checksum các PDF nguồn
npm run lint
npm run check            # chạy tất cả các bước trên + test của chatgpt-app
```

`tests/rendered-html.test.mjs` khẳng định: đủ 24 tuần / 6 module, mỗi tuần có
`lesson` với `coreIdea`, `sections` (body ≥ 80 ký tự), `workedExample` và
`selfCheck` (≥ 4 câu, đáp án ≥ 20 ký tự); các route riêng tư được gate bằng
`requireChatGPTUser`; migrations tạo đúng bảng.

## Bảo mật & xác thực (SIWC / Sign in with ChatGPT)

Các trang riêng tư gọi `requireChatGPTUser` từ `app/chatgpt-auth.ts` và đọc email
người dùng từ header `oai-authenticated-user-email`. `layout.tsx` đặt
`robots: { index: false, follow: false }` — đây là site học riêng tư, không nhắm
SEO công khai. Dispatch sở hữu các route `/signin-with-chatgpt`,
`/signout-with-chatgpt`, `/callback`; không tự cài route cho các path này.

## Cơ sở dữ liệu

Drizzle + Cloudflare D1. Schema (`db/schema.ts`) gồm: `progress` (mastery +
spaced-repetition), `lesson_block_progress`, `retrieval_attempts`, `quiz_attempts`,
`submissions` + `submission_versions`, `mentor_reviews`, `case_studies` +
`case_revisions` (immutable qua trigger), `ai_daily_usage` + `ai_executions`
(telemetry), `lab_attempts` + `lab_attempt_history` (best score và lịch sử lượt
chấm), và `course_settings` (ngày bắt đầu, cường độ học). `db/ensure.ts` dựng lại
schema idempotent khi D1 local bị degraded.

```bash
npm run db:generate      # sinh migration Drizzle sau khi đổi schema
```

## ChatGPT App companion

`chatgpt-app/` là một MCP server riêng (Hono) expose `search`, `fetch`,
`get_learning_week` để tra cứu cùng bộ curriculum 24 tuần từ trong ChatGPT.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
