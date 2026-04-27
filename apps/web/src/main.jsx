import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./app.css";

const BOOK_TYPES = [
  {
    id: "professional_book",
    label: "전문서적",
    tone: "전문가가 실제 판단에 사용할 수 있도록 정확하고 깊게 쓴다."
  },
  {
    id: "university_textbook",
    label: "대학교재",
    tone: "개념, 예제, 연습문제, 장별 학습 목표가 드러나도록 단계적으로 쓴다."
  }
];

const DOCUMENTS = [
  ["sample", "미리보기 원고", "samples/sample_01.md"],
  ["book_spec", "책 설계", "book_spec.md"],
  ["final_outline", "목차", "final_outline.md"],
  ["approved_draft", "첫 장", "manuscript/ch01/approved.md"],
  ["manuscript_full", "전체 원고", "exports/manuscript_full.md"],
  ["export_markdown", "출판 원고", "exports/book.md"],
  ["export_report", "출판 파일", "exports/export_report.json"]
];

const DOWNLOADS = [
  ["book.md", "Markdown"],
  ["manuscript_full.md", "전체 원고"],
  ["book.html", "HTML"],
  ["book.pdf", "PDF"],
  ["book.epub", "EPUB"],
  ["book.docx", "DOCX"],
  ["metadata.yaml", "메타데이터"]
];

const PHASE_LABELS = {
  created: "대화 중",
  spec: "책 설계",
  debate: "검토 중",
  sample: "미리보기",
  outline: "목차",
  briefing: "장 설계",
  drafting: "집필 중",
  review: "검토 중",
  revision: "수정 중",
  editing: "전체 원고",
  export: "출판 파일"
};

const INITIAL_MESSAGE = {
  role: "assistant",
  text: "어떤 전문서적이나 대학교재를 만들고 싶으세요? 주제, 독자, 난이도, 원하는 스타일을 편하게 말해주세요."
};

const EMPTY_DOCUMENT = "# 아직 생성된 원고가 없습니다\n\n왼쪽에서 AI와 책 방향을 정한 뒤 `책 만들기 시작`을 누르면 미리보기 원고가 생성됩니다.";

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });

  if (!response.ok) {
    const raw = await response.text();
    try {
      const body = JSON.parse(raw);
      throw new Error(body.message || body.error || raw);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(raw);
      throw error;
    }
  }

  return response.json();
}

function has(project, key) {
  return Boolean(project?.artifacts?.[key]?.trim());
}

function normalizeBookType(value) {
  return value === "professional_book" ? "professional_book" : "university_textbook";
}

function bookTypeLabel(value) {
  return BOOK_TYPES.find((type) => type.id === normalizeBookType(value))?.label || "대학교재";
}

function runtimeLabel(provider) {
  if (provider === "mock") return "데모 AI";
  if (provider === "local_agent" || provider === "task_bundle") return "외부 AI";
  if (provider === "openai") return "OpenAI API";
  return provider || "-";
}

function defaultTone(bookType) {
  return BOOK_TYPES.find((type) => type.id === normalizeBookType(bookType))?.tone || BOOK_TYPES[1].tone;
}

function compact(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanPhrase(value) {
  return compact(value)
    .replace(/(?:이고|이며|입니다|이다|이에요|예요)$/u, "")
    .replace(/[,.!?]$/u, "")
    .trim();
}

function inferTopic(text, previousTopic) {
  const body = compact(text);
  const direct = body.match(/(?:주제|과목|분야)\s*(?:은|는|:)?\s*([^,.!?]+?)(?=\s*(?:이고|이며|독자|대상|수강생|난이도|문체|스타일|$)|[,.!?])/u);
  if (direct?.[1]) return cleanPhrase(direct[1]);

  const bookPhrase = body.match(/^(.{2,60}?)(?:\s*전문서적|\s*대학교재|\s*교재|\s*전공책|\s*책)(?:을|를|으로|로|\s|$)/u);
  if (bookPhrase?.[1]) return cleanPhrase(bookPhrase[1]);

  return previousTopic || cleanPhrase(body.slice(0, 70));
}

function inferReader(text, previousReader) {
  const reader = compact(text).match(/(?:독자|대상|수강생)\s*(?:은|는|:)?\s*([^,.!?]+?)(?=\s*(?:이고|이며|난이도|문체|스타일|$)|[,.!?])/u);
  return reader?.[1] ? cleanPhrase(reader[1]) : previousReader;
}

function inferDifficulty(text, previousDifficulty) {
  const body = compact(text);
  if (body.includes("대학원")) return "대학원";
  if (body.includes("고급")) return "고급";
  if (body.includes("입문") || body.includes("초급")) return "입문";
  return previousDifficulty || "중급";
}

function inferBookType(text, previousBookType) {
  const body = compact(text);
  if (body.includes("전문서") || body.includes("실무") || body.includes("전문가")) return "professional_book";
  if (body.includes("교재") || body.includes("대학교") || body.includes("수업") || body.includes("학습")) return "university_textbook";
  return normalizeBookType(previousBookType);
}

function inferDirection(text, previous) {
  const bookType = inferBookType(text, previous.bookType);
  const topic = inferTopic(text, previous.topic);

  return {
    bookType,
    topic,
    title: previous.title || (topic ? `${topic} ${bookTypeLabel(bookType)}` : ""),
    targetReader: inferReader(text, previous.targetReader),
    difficulty: inferDifficulty(text, previous.difficulty),
    tone: previous.tone || defaultTone(bookType),
    purpose: compact(text) || previous.purpose
  };
}

function assistantReply(direction) {
  const parts = [
    `${bookTypeLabel(direction.bookType)}로 이해했어요.`,
    direction.topic ? `주제는 "${direction.topic}"입니다.` : null,
    direction.targetReader ? `독자는 "${direction.targetReader}"입니다.` : "독자는 아직 더 정하면 좋겠어요.",
    `난이도는 ${direction.difficulty} 기준으로 잡겠습니다.`,
    "이 정도면 바로 미리보기 원고를 만들 수 있어요. 부족하면 이어서 더 말해도 됩니다."
  ];

  return parts.filter(Boolean).join(" ");
}

function phaseText(project) {
  if (!project) return "대화 중";
  if (has(project, "export_markdown")) return "출판 파일 준비됨";
  if (has(project, "manuscript_full")) return "전체 원고 완성";
  if (has(project, "approved_draft")) return "첫 장 완성";
  if (has(project, "sample")) return "미리보기 생성됨";
  if (has(project, "book_spec")) return "책 설계 생성됨";
  return "대화 중";
}

function primaryAction(project) {
  if (!project) return { id: "preview", label: "책 만들기 시작", hint: "책 설계와 미리보기 원고를 만듭니다." };
  if (!has(project, "sample")) return { id: "preview", label: "미리보기 원고 만들기", hint: "책의 톤과 깊이를 먼저 확인합니다." };
  if (!has(project, "approved_draft")) return { id: "first_chapter", label: "첫 장 만들기", hint: "미리보기 방향을 바탕으로 첫 장을 검토까지 진행합니다." };
  if (!has(project, "manuscript_full")) return { id: "full_book", label: "전체 책 만들기", hint: "남은 장을 생성하고 전체 원고로 묶습니다." };
  if (!has(project, "export_markdown")) return { id: "export", label: "출판 파일 만들기", hint: "Markdown, PDF, EPUB, DOCX를 만듭니다." };
  return { id: "done", label: "완료", hint: "출판 파일이 준비되었습니다." };
}

function documentList(project) {
  return DOCUMENTS.filter(([key]) => key === "sample" || has(project, key));
}

function pickActiveDocument(project) {
  if (has(project, "export_markdown")) return "export_markdown";
  if (has(project, "manuscript_full")) return "manuscript_full";
  if (has(project, "approved_draft")) return "approved_draft";
  if (has(project, "sample")) return "sample";
  if (has(project, "book_spec")) return "book_spec";
  return "sample";
}

function ChatComposer({ messages, input, setInput, submit, busy }) {
  return (
    <section className="chat-space">
      <div className="chat-scroll">
        {messages.map((message, index) => (
          <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
            <span>{message.role === "assistant" ? "AI 편집자" : "나"}</span>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      <form className="composer" onSubmit={submit}>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={5}
          placeholder="예: 운영체제 대학교재를 만들고 싶어. 독자는 컴퓨터공학 2학년이고, 난이도는 중급, 예제와 연습문제를 많이 넣고 싶어."
        />
        <button type="submit" disabled={busy || !input.trim()}>대화하기</button>
      </form>
    </section>
  );
}

function DirectionSummary({ direction, setDirection }) {
  return (
    <section className="direction-summary">
      <div>
        <span>책 종류</span>
        <div className="segment">
          {BOOK_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className={direction.bookType === type.id ? "active" : ""}
              onClick={() => setDirection({ ...direction, bookType: type.id, tone: direction.tone || type.tone })}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      <label>
        <span>제목</span>
        <input value={direction.title} onChange={(event) => setDirection({ ...direction, title: event.target.value })} />
      </label>
      <label>
        <span>주제</span>
        <input value={direction.topic} onChange={(event) => setDirection({ ...direction, topic: event.target.value })} />
      </label>
      <label>
        <span>독자</span>
        <input value={direction.targetReader} onChange={(event) => setDirection({ ...direction, targetReader: event.target.value })} />
      </label>
      <label>
        <span>난이도</span>
        <select value={direction.difficulty} onChange={(event) => setDirection({ ...direction, difficulty: event.target.value })}>
          <option value="입문">입문</option>
          <option value="중급">중급</option>
          <option value="고급">고급</option>
          <option value="대학원">대학원</option>
        </select>
      </label>
    </section>
  );
}

function ManuscriptView({ project, activeDoc, setActiveDoc, content, setContent, dirty, save, busy }) {
  const docs = documentList(project);
  const doc = DOCUMENTS.find(([key]) => key === activeDoc) || DOCUMENTS[0];

  return (
    <section className="manuscript">
      <header className="manuscript-toolbar">
        <nav>
          {docs.map(([key, label]) => (
            <button key={key} type="button" className={activeDoc === key ? "active" : ""} onClick={() => setActiveDoc(key)}>
              {label}
            </button>
          ))}
        </nav>
        <div>
          <span>{dirty ? "수정됨" : "저장됨"}</span>
          <button type="button" disabled={!project || !dirty || busy} onClick={save}>저장</button>
        </div>
      </header>
      <div className="manuscript-title">
        <h2>{doc[1]}</h2>
        <p>{doc[2]}</p>
      </div>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={!project || busy}
        spellCheck={false}
      />
    </section>
  );
}

function StatusPanel({ project, health, action, busy, runPrimary, collectResults }) {
  const report = project?.artifacts?.quality_report ? safeJson(project.artifacts.quality_report) : {};
  const runtime = project?.state?.model_runtime || {
    provider: health?.model_provider || "mock",
    model: health?.model || "deterministic-mock"
  };

  return (
    <aside className="status-panel">
      <section className="next-action">
        <span>현재 상태</span>
        <h2>{phaseText(project)}</h2>
        <p>{action.hint}</p>
        <button type="button" disabled={busy || action.id === "done"} onClick={runPrimary}>
          {busy ? "AI가 작업 중..." : action.label}
        </button>
      </section>

      <section className="quiet-section">
        <h3>AI 연결</h3>
        <dl>
          <div>
            <dt>방식</dt>
            <dd>{runtimeLabel(runtime.provider)}</dd>
          </div>
          <div>
            <dt>모델/워커</dt>
            <dd>{runtime.model}</dd>
          </div>
        </dl>
        {project ? (
          <button type="button" className="text-button" disabled={busy} onClick={collectResults}>
            외부 AI가 쓴 결과 가져오기
          </button>
        ) : null}
      </section>

      <section className="quiet-section">
        <h3>품질 확인</h3>
        <dl>
          <div>
            <dt>점수</dt>
            <dd>{report.average_score ?? project?.state?.chapters?.[0]?.quality_score ?? "-"}</dd>
          </div>
          <div>
            <dt>상태</dt>
            <dd>{report.decision || "대기"}</dd>
          </div>
        </dl>
        <p>책 제작 중 AI가 초안, 검토, 수정을 반복합니다. 사용자는 결과 원고만 확인하면 됩니다.</p>
      </section>

      {has(project, "export_report") ? (
        <section className="quiet-section downloads">
          <h3>출판 파일</h3>
          {DOWNLOADS.map(([filename, label]) => (
            <a key={filename} href={`/api/projects/${project.id}/exports/${encodeURIComponent(filename)}`}>
              {label}
              <span>{filename}</span>
            </a>
          ))}
        </section>
      ) : null}
    </aside>
  );
}

function safeJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function App() {
  const [health, setHealth] = useState(null);
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [direction, setDirection] = useState({
    bookType: "university_textbook",
    title: "",
    topic: "",
    targetReader: "",
    difficulty: "중급",
    tone: defaultTone("university_textbook"),
    purpose: ""
  });
  const [activeDoc, setActiveDoc] = useState("sample");
  const [content, setContent] = useState(EMPTY_DOCUMENT);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const action = useMemo(() => primaryAction(project), [project]);

  useEffect(() => {
    async function load() {
      try {
        const [healthResult, projectsResult] = await Promise.all([api("/api/health"), api("/api/projects")]);
        setHealth(healthResult);
        setProjects(projectsResult.projects);
        const projectId = new URLSearchParams(window.location.search).get("project");
        if (projectId) {
          applyProject(await api(`/api/projects/${projectId}`));
        }
      } catch (error) {
        showNotice(error.message);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!project) {
      setContent(EMPTY_DOCUMENT);
      setDirty(false);
      return;
    }

    setContent(project.artifacts?.[activeDoc] || EMPTY_DOCUMENT);
    setDirty(false);
  }, [project, activeDoc]);

  function showNotice(message) {
    setNotice(message);
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => setNotice(""), 4200);
  }

  async function refreshProjects() {
    const result = await api("/api/projects");
    setProjects(result.projects);
  }

  function applyProject(loaded) {
    const brief = loaded.state?.brief || {};
    const bookType = normalizeBookType(brief.book_type);
    setProject(loaded);
    setDirection({
      bookType,
      title: loaded.state?.title || "",
      topic: brief.topic || "",
      targetReader: brief.target_reader || "",
      difficulty: brief.difficulty || "중급",
      tone: brief.tone || defaultTone(bookType),
      purpose: brief.purpose || ""
    });
    setActiveDoc(pickActiveDocument(loaded));
  }

  async function loadProject(projectId) {
    try {
      const loaded = await api(`/api/projects/${projectId}`);
      applyProject(loaded);
      window.history.replaceState(null, "", `?project=${encodeURIComponent(projectId)}`);
    } catch (error) {
      showNotice(error.message);
    }
  }

  function submitChat(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    const nextDirection = inferDirection(text, direction);
    setDirection(nextDirection);
    setMessages([...messages, { role: "user", text }, { role: "assistant", text: assistantReply(nextDirection) }]);
    setInput("");
  }

  function projectPayload() {
    const topic = direction.topic || "새 책";
    return {
      title: direction.title || `${topic} ${bookTypeLabel(direction.bookType)}`,
      topic,
      targetReader:
        direction.targetReader ||
        (direction.bookType === "professional_book" ? "해당 분야의 실무자와 전문가" : "해당 과목을 배우는 대학생"),
      difficulty: direction.difficulty || "중급",
      purpose: direction.purpose || messages.map((message) => `${message.role}: ${message.text}`).join("\n"),
      tone: direction.tone || defaultTone(direction.bookType),
      bookType: direction.bookType,
      referenceNotes: messages.map((message) => `${message.role}: ${message.text}`).join("\n")
    };
  }

  async function ensureProject() {
    if (project) return project;
    const created = await api("/api/projects", {
      method: "POST",
      body: JSON.stringify(projectPayload())
    });
    setProject(created);
    window.history.replaceState(null, "", `?project=${encodeURIComponent(created.id)}`);
    await refreshProjects();
    return created;
  }

  async function runAction(actionName, baseProject = project) {
    const target = baseProject || await ensureProject();
    const updated = await api(`/api/projects/${target.id}/actions/${actionName}`, { method: "POST" });
    setProject(updated);
    await refreshProjects();
    return updated;
  }

  async function approve(artifact, baseProject = project) {
    const target = baseProject || await ensureProject();
    const updated = await api(`/api/projects/${target.id}/approvals/${artifact}`, {
      method: "POST",
      body: JSON.stringify({ notes: "Confirmed through the conversational workspace." })
    });
    setProject(updated);
    await refreshProjects();
    return updated;
  }

  async function runPrimary() {
    setBusy(true);
    try {
      let current = project || await ensureProject();

      if (action.id === "preview") {
        if (!has(current, "book_spec")) current = await runAction("spec", current);
        current = await runAction("sample", current);
        setActiveDoc("sample");
        showNotice("미리보기 원고를 만들었습니다.");
        return;
      }

      if (action.id === "first_chapter") {
        if (!current.state.approved?.book_spec) current = await approve("book_spec", current);
        if (!current.state.approved?.sample_direction) current = await approve("sample_direction", current);
        if (!has(current, "harness_plan")) current = await runAction("harness", current);
        if (!current.state.approved?.harness_plan) current = await approve("harness_plan", current);
        if (!current.state.approved?.final_outline) current = await approve("final_outline", current);
        current = await runAction("chapter_loop", current);
        setActiveDoc("approved_draft");
        showNotice("첫 장을 만들고 품질 확인까지 마쳤습니다.");
        return;
      }

      if (action.id === "full_book") {
        if (!current.state.approved?.sample_chapter) current = await approve("sample_chapter", current);
        current = await runAction("book_loop", current);
        setActiveDoc("manuscript_full");
        showNotice("전체 원고를 만들었습니다.");
        return;
      }

      if (action.id === "export") {
        if (!current.state.approved?.final_manuscript) current = await approve("final_manuscript", current);
        current = await runAction("export", current);
        setActiveDoc("export_markdown");
        showNotice("출판 파일을 만들었습니다.");
      }
    } catch (error) {
      showNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function collectResults() {
    if (!project) return;
    setBusy(true);
    try {
      const updated = await runAction("collect_agent_results", project);
      setProject(updated);
      setActiveDoc(pickActiveDocument(updated));
      showNotice("외부 AI 결과를 가져왔습니다.");
    } catch (error) {
      showNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveDocument() {
    if (!project) return;
    setBusy(true);
    try {
      const updated = await api(`/api/projects/${project.id}/artifacts/${activeDoc}`, {
        method: "PUT",
        body: JSON.stringify({ content })
      });
      setProject(updated);
      setDirty(false);
      showNotice("원고를 저장했습니다.");
    } catch (error) {
      showNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  function newBook() {
    setProject(null);
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setDirection({
      bookType: "university_textbook",
      title: "",
      topic: "",
      targetReader: "",
      difficulty: "중급",
      tone: defaultTone("university_textbook"),
      purpose: ""
    });
    setActiveDoc("sample");
    window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <div className="app">
      <aside className="library">
        <button className="brand" type="button" onClick={newBook}>
          <strong>BookForge</strong>
          <span>AI 책 제작실</span>
        </button>
        <button className="new-book" type="button" onClick={newBook}>새 책</button>
        <div className="project-list">
          {projects.map((item) => (
            <button key={item.id} type="button" className={project?.id === item.id ? "active" : ""} onClick={() => loadProject(item.id)}>
              <strong>{item.title}</strong>
              <span>{PHASE_LABELS[item.phase] || item.phase}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="studio">
        <header className="studio-header">
          <span>{phaseText(project)}</span>
          <h1>{direction.title || "AI와 대화해서 원하는 책을 만드세요"}</h1>
          <p>책 제작에 필요한 내부 검토와 반복 수정은 BookForge가 처리합니다. 사용자는 AI와 책 방향을 대화하고, 생성된 원고를 확인하면 됩니다.</p>
        </header>

        <section className="workbench">
          <div className="left-column">
            <ChatComposer messages={messages} input={input} setInput={setInput} submit={submitChat} busy={busy} />
            <DirectionSummary direction={direction} setDirection={setDirection} />
          </div>

          <ManuscriptView
            project={project}
            activeDoc={activeDoc}
            setActiveDoc={setActiveDoc}
            content={content}
            setContent={(value) => {
              setContent(value);
              setDirty(true);
            }}
            dirty={dirty}
            save={saveDocument}
            busy={busy}
          />
        </section>
      </main>

      <StatusPanel
        project={project}
        health={health}
        action={action}
        busy={busy}
        runPrimary={runPrimary}
        collectResults={collectResults}
      />

      {notice ? <div className="toast">{notice}</div> : null}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
