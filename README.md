# BookForge

BookForge는 전문서적과 대학교재를 만들기 위한 로컬 우선 AI 출판 스튜디오입니다.

핵심은 단순한 글쓰기 앱이 아니라 다음 흐름을 파일 상태로 끝까지 관리하는 것입니다.

```text
책 종류 선택
  -> AI 편집자와 방향 상담
  -> book_spec.md
  -> 3쪽 샘플
  -> 사람 승인
  -> 서브에이전트 하네스 + 검증 기준 + 최종 목차
  -> 장별 지시서
  -> 초안
  -> 사실성/편집 검증
  -> 수정 루프
  -> 전체 원고
  -> Markdown / HTML / PDF / EPUB / DOCX / metadata export
```

## 현재 구현된 것

- Docker 로컬 웹 앱: `http://localhost:3100`
- 일반 로컬 웹 앱: `http://localhost:3000`
- 첫 화면에서 딱 두 가지 책만 선택: `전문서적`, `대학교재`
- 대화 기반 기획, 문서 편집, 승인 게이트, 실행 기록, 품질 리포트 UI
- 파일 기반 프로젝트 상태: `books/{project_id}/`
- 전체 책 생산 루프: `book_loop`
- 외부 AI 결과 수집: `collect_agent_results`
- 기본 mock 런타임
- 선택적 OpenAI API 런타임
- OpenClaw, Codex, Claude Code, Paperclip류 외부 워커를 위한 local-agent task bundle
- 기본 출판 파일 생성:
  - `book.md`
  - `manuscript_full.md`
  - `book.html`
  - `book.pdf`
  - `book.epub`
  - `book.docx`
  - `metadata.yaml`

## Docker 실행

```bash
docker compose up --build
```

브라우저:

```text
http://localhost:3100
```

프로젝트 파일은 호스트의 `./books`에 남습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저:

```text
http://localhost:3000
```

## CLI

```bash
npm run bookforge -- help
npm run bookforge -- init "운영체제 대학교재"
npm run bookforge -- spec
npm run bookforge -- sample
npm run bookforge -- approve book_spec
npm run bookforge -- approve sample_direction
npm run bookforge -- harness
npm run bookforge -- approve harness_plan
npm run bookforge -- approve final_outline
npm run bookforge -- chapter_loop
npm run bookforge -- approve sample_chapter
npm run bookforge -- book_loop
npm run bookforge -- approve final_manuscript
npm run bookforge -- export
```

외부 워커가 쓴 결과를 회수할 때:

```bash
npm run bookforge -- collect_agent_results
```

프로젝트를 지정하지 않으면 가장 최근 프로젝트를 사용합니다.

## 런타임 모드

기본 mock 모드:

```bash
BOOKFORGE_MODEL_PROVIDER=mock
```

외부 AI 워커 task bundle 모드:

```bash
BOOKFORGE_MODEL_PROVIDER=local_agent
BOOKFORGE_LOCAL_AGENT_NAME=openclaw-local
npm run dev
```

이 모드에서는 BookForge가 다음 위치에 작업 묶음을 만듭니다.

```text
books/{project_id}/agent_tasks/{run_id}__{agent_id}__{template}/
```

외부 어댑터는 `task.json`과 `input_artifacts/prompt.md`를 읽고 `output/result.md`를 쓰면 됩니다.

제공되는 어댑터 실행:

```bash
BOOKFORGE_ADAPTER_PRESET=codex npm exec -- bookforge-local-agent-adapter --once
```

계속 감시:

```bash
BOOKFORGE_ADAPTER_PRESET=codex npm exec -- bookforge-local-agent-adapter --watch
```

직접 명령을 지정할 수도 있습니다.

```bash
BOOKFORGE_ADAPTER_COMMAND="your-local-agent-command" npm exec -- bookforge-local-agent-adapter --once
```

사용 가능한 프리셋은 `config/adapters/presets.json`에 있습니다.

선택적 직접 API 모드:

```bash
BOOKFORGE_MODEL_PROVIDER=openai
OPENAI_API_KEY="..."
OPENAI_MODEL="gpt-5"
npm run dev
```

직접 API는 필수가 아닙니다. 기본 제품 방향은 이미 구독 중인 로컬 AI 도구를 붙여 쓰는 bring-your-own-agent 방식입니다.

## 검증

```bash
npm run build:web
npm test
docker compose config
docker compose up -d --build
```

헬스 체크:

```bash
curl http://localhost:3100/api/health
```

## 주요 문서

- `docs/PRODUCT_UX.md`
- `docs/ORCHESTRATION_ENGINE.md`
- `docs/AI_RUNTIME_STRATEGY.md`
- `docs/BOOK_TYPE_HARNESS.md`
- `docs/AGENT_ADAPTER_CONTRACT.md`
- `docs/DOCKER_DEPLOYMENT.md`
