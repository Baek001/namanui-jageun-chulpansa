# WSL Development

BookForge development should use WSL Ubuntu as the primary runtime.

The repository can remain in the shared Windows folder:

```text
D:\작업물\나만의 작은 출판사
```

WSL path:

```bash
/mnt/d/작업물/나만의 작은 출판사
```

## Standard Commands

```bash
cd "/mnt/d/작업물/나만의 작은 출판사"
npm test
npm run dev
```

## CLI Commands

```bash
npm run bookforge -- help
npm run bookforge -- list
npm run bookforge -- status
```

Example full flow:

```bash
npm run bookforge -- init "AI 시대의 1인 출판"
npm run bookforge -- spec
npm run bookforge -- approve book_spec
npm run bookforge -- debate
npm run bookforge -- outline
npm run bookforge -- approve final_outline
npm run bookforge -- briefs
npm run bookforge -- draft
npm run bookforge -- review
npm run bookforge -- revise
npm run bookforge -- approve sample_chapter
npm run bookforge -- export
```

## Runtime Choice

Use WSL for:

- Node scripts.
- Web server.
- Tests.
- Future Python/FastAPI work.
- Future LangGraph/LiteLLM work.

Use Windows/Codex Desktop for:

- Editing files.
- Reviewing browser UI.
- Coordinating work.

## Docker

Docker is not required yet.

When Docker Desktop WSL integration is available, the project can add:

```bash
docker compose up
```

Until then, keep the dev path Node-only.
