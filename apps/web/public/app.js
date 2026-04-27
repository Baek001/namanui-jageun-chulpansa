const state = {
  projects: [],
  currentProject: null,
  activeTab: "book_intent",
  health: null,
  messages: JSON.parse(localStorage.getItem("bookforge.interview") || "[]"),
  dirty: false,
  busy: false
};

const elements = {
  projects: document.querySelector("#projects"),
  startInterview: document.querySelector("#startInterview"),
  resetConversation: document.querySelector("#resetConversation"),
  conversationForm: document.querySelector("#conversationForm"),
  conversationInput: document.querySelector("#conversationInput"),
  messageList: document.querySelector("#messageList"),
  directionTitle: document.querySelector("#directionTitle"),
  directionField: document.querySelector("#directionField"),
  directionReader: document.querySelector("#directionReader"),
  directionType: document.querySelector("#directionType"),
  directionDifficulty: document.querySelector("#directionDifficulty"),
  directionTone: document.querySelector("#directionTone"),
  projectTitle: document.querySelector("#projectTitle"),
  projectSubtitle: document.querySelector("#projectSubtitle"),
  phaseEyebrow: document.querySelector("#phaseEyebrow"),
  phaseValue: document.querySelector("#phaseValue"),
  sampleValue: document.querySelector("#sampleValue"),
  verifierValue: document.querySelector("#verifierValue"),
  nextActionTitle: document.querySelector("#nextActionTitle"),
  nextActionDescription: document.querySelector("#nextActionDescription"),
  nextActionButton: document.querySelector("#nextActionButton"),
  secondaryActionButton: document.querySelector("#secondaryActionButton"),
  runtimeSidebar: document.querySelector("#runtimeSidebar"),
  artifactTitle: document.querySelector("#artifactTitle"),
  artifactPath: document.querySelector("#artifactPath"),
  artifactContent: document.querySelector("#artifactContent"),
  saveArtifact: document.querySelector("#saveArtifact"),
  saveState: document.querySelector("#saveState"),
  flowPanel: document.querySelector("#flowPanel"),
  verifierPanel: document.querySelector("#verifierPanel"),
  approvalPanel: document.querySelector("#approvalPanel"),
  runPanel: document.querySelector("#runPanel"),
  filePanel: document.querySelector("#filePanel"),
  notice: document.querySelector("#notice"),
  commandBar: document.querySelector(".command-bar"),
  tabs: document.querySelectorAll(".tab")
};

const artifactTabs = {
  book_intent: {
    title: "인터뷰 요약",
    path: "book_intent.md",
    empty: "AI와 대화하면 책의 목적, 독자, 난이도, 문체 합의가 여기에 정리됩니다."
  },
  sample: {
    title: "3페이지 샘플",
    path: "samples/sample_01.md",
    empty: "아직 샘플이 없습니다. AI와 방향을 논의한 뒤 3페이지 샘플을 생성하세요."
  },
  harness_plan: {
    title: "제작 하네스",
    path: "harness_plan.md",
    empty: "샘플 방향을 승인하면 에이전트 구성, 검증 기준, 반복 규칙이 여기에 생성됩니다."
  },
  draft: {
    title: "챕터 원고",
    path: "manuscript/ch01/{version}.md",
    empty: "하네스와 목차 승인 후 첫 챕터 원고가 생성됩니다."
  },
  export_markdown: {
    title: "Markdown Export",
    path: "exports/book.md",
    empty: "승인된 원고가 생기면 Markdown export가 생성됩니다."
  }
};

const approvalOrder = [
  "book_spec",
  "sample_direction",
  "harness_plan",
  "final_outline",
  "sample_chapter",
  "final_manuscript",
  "export"
];

const approvalLabels = {
  book_spec: "책 방향",
  sample_direction: "3페이지 샘플 방향",
  harness_plan: "제작 하네스",
  final_outline: "최종 목차",
  sample_chapter: "샘플 챕터",
  final_manuscript: "최종 원고",
  export: "Export"
};

const phaseLabels = {
  created: "인터뷰",
  spec: "방향 정리",
  sample: "샘플 논의",
  outline: "하네스/목차",
  briefing: "챕터 브리프",
  drafting: "원고 작성",
  review: "검증",
  revision: "수정 완료",
  export: "Export 완료"
};

const actionLabels = {
  spec: "책 방향 정리",
  sample: "3페이지 샘플 생성",
  harness: "제작 하네스 생성",
  briefs: "챕터 브리프 생성",
  draft: "첫 챕터 작성",
  review: "검증 에이전트 실행",
  revise: "수정본 생성",
  export: "Markdown export"
};

const flowSteps = [
  ["interview", "AI 편집자 인터뷰"],
  ["sample", "3페이지 샘플"],
  ["sample_direction", "샘플 방향 합의"],
  ["harness", "하네스와 목차"],
  ["chapter", "챕터 제작"],
  ["verify", "검증/수정 반복"],
  ["export", "완성본 export"]
];

const verifierAgents = [
  ["Fact", "근거 없는 주장과 출처 필요 지점을 검증"],
  ["Structure", "장 구조, 중복, 논리 흐름 검증"],
  ["Pedagogy", "난이도, 예제, 연습문제 적합성 검증"],
  ["Style", "합의된 문체와 밀도 유지 여부 검증"],
  ["Reader level", "독자 선수 지식과 설명 수준 검증"],
  ["Evidence", "전문서/전공책 기준의 인용 엄밀성 검증"]
];

const fileManifest = [
  ["book_intent", "book_intent.md"],
  ["reader_profile", "reader_profile.md"],
  ["style_direction", "style_direction.md"],
  ["rigor_profile", "rigor_profile.md"],
  ["book_spec", "book_spec.md"],
  ["sample", "samples/sample_01.md"],
  ["sample_review", "sample_review.md"],
  ["style_guide", "style_guide.md"],
  ["harness_plan", "harness_plan.md"],
  ["quality_rubric", "quality_rubric.md"],
  ["final_outline", "final_outline.md"],
  ["chapter_brief", "chapter_briefs/ch01.md"],
  ["draft", "manuscript/ch01/current.md"],
  ["quality_report", "quality_reports/ch01/current.json"],
  ["export_markdown", "exports/book.md"]
];

async function request(path, options = {}) {
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
      if (error instanceof SyntaxError) {
        throw new Error(raw);
      }
      throw error;
    }
  }

  return response.json();
}

function hasArtifact(project, key) {
  return typeof project?.artifacts?.[key] === "string" && project.artifacts[key].trim().length > 0;
}

function currentRuntime() {
  const runtime = state.currentProject?.state?.model_runtime;
  return {
    provider: runtime?.provider || state.health?.model_provider || "mock",
    model: runtime?.model || state.health?.model || "deterministic-mock"
  };
}

function titleFromProject(project = state.currentProject) {
  return project?.state?.title || "AI와 논의해서 전문서의 방향을 정하세요";
}

function directionPayload() {
  const field = elements.directionField.value.trim();
  const reader = elements.directionReader.value.trim();
  const type = elements.directionType.value;
  const difficulty = elements.directionDifficulty.value;
  const tone = elements.directionTone.value.trim();
  const title =
    elements.directionTitle.value.trim() ||
    (field ? `${field} 전문서 프로젝트` : "새 전문서 프로젝트");

  return {
    title,
    topic: field || latestUserMessage() || title,
    targetReader: reader || "해당 분야를 진지하게 공부하거나 실무에 적용하려는 독자",
    bookType: type,
    difficulty,
    tone: tone || "대학 전공책처럼 엄밀하되, 예시와 구조는 실무적으로 이해되게 작성",
    purpose: latestUserMessage() || "전문 지식을 체계적인 책과 강의 가능한 원고로 만든다.",
    referenceNotes: conversationText()
  };
}

function latestUserMessage() {
  return [...state.messages].reverse().find((message) => message.role === "user")?.text || "";
}

function conversationText() {
  return state.messages.map((message) => `${message.role}: ${message.text}`).join("\n");
}

function inferBookDirection(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  const titleMatch =
    compact.match(/위한\s+(.+?)(?:을|를)\s*만들/) ||
    compact.match(/(.+?(?:전공책|전문서|교재|강의 자료|매뉴얼))(?:을|를|로|,|\.|$)/);
  const readerMatch =
    compact.match(/(.+?)을 위한/) ||
    compact.match(/대상(?:은| 독자는)?\s*(.+?)(?:이고|이며|,|\.|$)/);
  const fieldMatch = compact.match(/(?:분야는|주제는)\s*(.+?)(?:이고|이며|,|\.|$)/);

  let difficulty = "";
  if (compact.includes("대학원")) difficulty = "대학원";
  else if (compact.includes("고급")) difficulty = "고급";
  else if (compact.includes("입문")) difficulty = "입문";
  else if (compact.includes("중급")) difficulty = "중급";

  let bookType = "";
  if (compact.includes("전공책") || compact.includes("대학교재") || compact.includes("대학 교재")) {
    bookType = "university_textbook";
  } else if (compact.includes("강의")) {
    bookType = "graduate_coursepack";
  } else if (compact.includes("매뉴얼")) {
    bookType = "technical_manual";
  } else if (compact.includes("전문서")) {
    bookType = "professional_book";
  }

  const toneMatch = compact.match(/문체는\s*(.+?)(?:해줘|하면|로|,|\.|$)/);
  const topic =
    fieldMatch?.[1]?.trim() ||
    titleMatch?.[1]?.trim() ||
    compact.replace(/^(나는|저는)\s*/, "").slice(0, 80);
  const reader = readerMatch?.[1]?.trim() || "";
  const title = titleMatch?.[1]?.trim() || topic;

  return {
    title: title ? title.replace(/^(?:.+?을 위한)\s*/, "") : "",
    topic,
    reader,
    bookType,
    difficulty,
    tone: toneMatch?.[1]?.trim() || ""
  };
}

function applyInterviewInference(text) {
  const inferred = inferBookDirection(text);

  if (!elements.directionTitle.value.trim() && inferred.title) {
    elements.directionTitle.value = inferred.title;
  }
  if (!elements.directionField.value.trim() && inferred.topic) {
    elements.directionField.value = inferred.topic;
  }
  if (!elements.directionReader.value.trim() && inferred.reader) {
    elements.directionReader.value = inferred.reader;
  }
  if (inferred.bookType) {
    elements.directionType.value = inferred.bookType;
  }
  if (inferred.difficulty) {
    elements.directionDifficulty.value = inferred.difficulty;
  }
  if (!elements.directionTone.value.trim() && inferred.tone) {
    elements.directionTone.value = inferred.tone;
  }
}

function interviewReplyFor(text) {
  const inferred = inferBookDirection(text);
  const title = inferred.title || inferred.topic || "이 책";
  const reader = inferred.reader || "목표 독자";
  const difficulty = inferred.difficulty || elements.directionDifficulty.value || "중급";

  return `${title} 방향으로 잡아볼게요. 우선 ${reader} 독자를 기준으로 두고, 난이도는 ${difficulty} 수준에서 시작하겠습니다. 다음 단계에서는 3페이지 샘플로 설명 밀도, 예제 방식, 학술적 엄밀성을 먼저 확인한 뒤 하네스와 검증 에이전트를 붙이는 흐름이 좋습니다.`;
}

function saveMessages() {
  localStorage.setItem("bookforge.interview", JSON.stringify(state.messages.slice(-12)));
}

async function loadHealth() {
  try {
    state.health = await request("/api/health");
  } catch {
    state.health = null;
  }
}

async function loadProjects() {
  const data = await request("/api/projects");
  state.projects = data.projects;

  render();
}

async function loadProject(projectId, options = {}) {
  state.currentProject = await request(`/api/projects/${projectId}`);
  state.dirty = false;
  hydrateDirectionFromProject(state.currentProject);

  if (!options.skipProjectRefresh) {
    const data = await request("/api/projects");
    state.projects = data.projects;
  }

  render();
}

function hydrateDirectionFromProject(project) {
  const brief = project?.state?.brief || {};
  elements.directionTitle.value = project?.state?.title || "";
  elements.directionField.value = brief.topic || "";
  elements.directionReader.value = brief.target_reader || "";
  elements.directionDifficulty.value = brief.difficulty || "중급";
  elements.directionTone.value = brief.tone || "";
  if (brief.book_type) {
    elements.directionType.value = normalizeBookType(brief.book_type);
  }
}

function normalizeBookType(value) {
  if (value === "textbook") {
    return "university_textbook";
  }
  if (value === "professional_book") {
    return "professional_book";
  }
  return value || "university_textbook";
}

async function ensureProject() {
  if (state.currentProject) {
    return state.currentProject;
  }

  const project = await request("/api/projects", {
    method: "POST",
    body: JSON.stringify(directionPayload())
  });
  state.currentProject = project;
  state.activeTab = "book_intent";
  return project;
}

async function refreshProject() {
  if (!state.currentProject) {
    return;
  }
  state.currentProject = await request(`/api/projects/${state.currentProject.id}`);
  const data = await request("/api/projects");
  state.projects = data.projects;
}

async function runAction(action) {
  await ensureProject();
  state.busy = true;
  render();

  try {
    state.currentProject = await request(`/api/projects/${state.currentProject.id}/actions/${action}`, {
      method: "POST"
    });
    if (action === "sample") {
      state.activeTab = "sample";
    }
    if (action === "harness") {
      state.activeTab = "harness_plan";
    }
    if (["draft", "review", "revise"].includes(action)) {
      state.activeTab = "draft";
    }
    if (action === "export") {
      state.activeTab = "export_markdown";
    }
    await refreshProject();
    showNotice(`${actionLabels[action] || action} 완료`);
  } catch (error) {
    showNotice(error.message);
  } finally {
    state.busy = false;
    render();
  }
}

async function buildThreePageSample() {
  state.busy = true;
  render();

  try {
    await ensureProject();
    if (!hasArtifact(state.currentProject, "book_spec")) {
      state.currentProject = await request(`/api/projects/${state.currentProject.id}/actions/spec`, {
        method: "POST"
      });
    }
    if (!state.currentProject.state.approved?.book_spec) {
      state.currentProject = await request(`/api/projects/${state.currentProject.id}/approvals/book_spec`, {
        method: "POST",
        body: JSON.stringify({ notes: "Approved after editorial interview." })
      });
    }
    state.currentProject = await request(`/api/projects/${state.currentProject.id}/actions/sample`, {
      method: "POST"
    });
    state.activeTab = "sample";
    await refreshProject();
    showNotice("3페이지 샘플을 만들었습니다. 이제 난이도와 문체를 조정하세요.");
  } catch (error) {
    showNotice(error.message);
  } finally {
    state.busy = false;
    render();
  }
}

async function approve(artifact) {
  if (!state.currentProject) {
    return;
  }

  state.busy = true;
  render();

  try {
    state.currentProject = await request(`/api/projects/${state.currentProject.id}/approvals/${artifact}`, {
      method: "POST",
      body: JSON.stringify({ notes: "Approved in conversational workspace." })
    });
    await refreshProject();
    showNotice(`${approvalLabels[artifact] || artifact} 승인 완료`);
  } catch (error) {
    showNotice(error.message);
  } finally {
    state.busy = false;
    render();
  }
}

async function saveActiveArtifact() {
  if (!state.currentProject || !artifactTabs[state.activeTab]) {
    return;
  }

  state.busy = true;
  render();

  try {
    state.currentProject = await request(`/api/projects/${state.currentProject.id}/artifacts/${state.activeTab}`, {
      method: "PUT",
      body: JSON.stringify({ content: elements.artifactContent.value })
    });
    state.dirty = false;
    showNotice("문서를 저장했습니다.");
  } catch (error) {
    showNotice(error.message);
  } finally {
    state.busy = false;
    render();
  }
}

function getNextStep(project = state.currentProject) {
  if (!project || !hasArtifact(project, "sample")) {
    return {
      kind: "build_sample",
      label: "3페이지 샘플 만들기",
      title: "먼저 3페이지 샘플을 만드세요",
      description: "AI와 주제, 독자 수준, 난이도, 문체를 논의한 뒤 샘플을 생성합니다."
    };
  }
  if (!project.state.approved?.sample_direction) {
    return {
      kind: "approval",
      artifact: "sample_direction",
      label: "샘플 방향 승인",
      title: "샘플을 보고 방향을 승인하세요",
      description: "수준, 문체, 예시 밀도, 학술성을 조정한 뒤 제작 하네스로 넘어갑니다.",
      tab: "sample"
    };
  }
  if (!hasArtifact(project, "harness_plan")) {
    return {
      kind: "action",
      action: "harness",
      label: "하네스 만들기",
      title: "제작 하네스를 만드세요",
      description: "서브에이전트, 검증 기준, 반복 규칙, 목차를 생성합니다.",
      tab: "harness_plan"
    };
  }
  if (!project.state.approved?.harness_plan) {
    return {
      kind: "approval",
      artifact: "harness_plan",
      label: "하네스 승인",
      title: "검증 루프와 제작 기준을 승인하세요",
      description: "완성까지 반복할 기준이므로 하네스와 품질 루브릭을 확인합니다.",
      tab: "harness_plan"
    };
  }
  if (!project.state.approved?.final_outline) {
    return {
      kind: "approval",
      artifact: "final_outline",
      label: "목차 승인",
      title: "최종 목차를 승인하세요",
      description: "목차 승인 후 챕터 브리프와 원고 제작이 시작됩니다.",
      tab: "harness_plan"
    };
  }
  if (!hasArtifact(project, "chapter_brief")) {
    return {
      kind: "action",
      action: "briefs",
      label: "챕터 브리프 만들기",
      title: "첫 챕터 브리프를 만드세요",
      description: "각 장의 목표, 예시, 증거 기준을 하네스에 맞춰 고정합니다."
    };
  }
  if (!hasArtifact(project, "draft")) {
    return {
      kind: "action",
      action: "draft",
      label: "첫 챕터 작성",
      title: "첫 챕터를 작성하세요",
      description: "샘플 방향과 하네스 기준을 적용해 첫 생산 원고를 만듭니다.",
      tab: "draft"
    };
  }
  if (!hasArtifact(project, "quality_report")) {
    return {
      kind: "action",
      action: "review",
      label: "검증 실행",
      title: "검증 에이전트를 실행하세요",
      description: "기준에 맞지 않으면 수정 계획을 만들고 다시 돌아갑니다.",
      tab: "draft"
    };
  }
  const report = parseQualityReport(project);
  if ((report?.blocking_issues?.length || 0) > 0 && !hasArtifact(project, "approved_draft")) {
    return {
      kind: "action",
      action: "revise",
      label: "수정본 만들기",
      title: "검증 기준에 맞게 수정하세요",
      description: "차단 이슈를 반영해 새 버전을 만들고 다시 검증합니다.",
      tab: "draft"
    };
  }
  if (!project.state.approved?.sample_chapter) {
    return {
      kind: "approval",
      artifact: "sample_chapter",
      label: "챕터 승인",
      title: "검증을 통과한 챕터를 승인하세요",
      description: "승인 후 다음 챕터나 export 단계로 넘어갈 수 있습니다.",
      tab: "draft"
    };
  }
  if (!hasArtifact(project, "export_markdown")) {
    return {
      kind: "action",
      action: "export",
      label: "Export 만들기",
      title: "Markdown export를 생성하세요",
      description: "승인된 원고를 출판 산출물로 묶습니다.",
      tab: "export_markdown"
    };
  }
  return {
    kind: "done",
    label: "완료",
    title: "현재 샘플 제작 루프가 완료되었습니다",
    description: "다음 구현에서는 전체 챕터 반복 생산을 확장하면 됩니다.",
    tab: "export_markdown"
  };
}

function parseQualityReport(project = state.currentProject) {
  try {
    return JSON.parse(project?.artifacts?.quality_report || "{}");
  } catch {
    return null;
  }
}

function canApprove(project, artifact) {
  if (!project) {
    return false;
  }
  if (artifact === "book_spec") {
    return hasArtifact(project, "book_spec");
  }
  if (artifact === "sample_direction") {
    return project.state.approved?.book_spec && hasArtifact(project, "sample");
  }
  if (artifact === "harness_plan") {
    return project.state.approved?.sample_direction && hasArtifact(project, "harness_plan");
  }
  if (artifact === "final_outline") {
    return project.state.approved?.harness_plan && hasArtifact(project, "final_outline");
  }
  if (artifact === "sample_chapter") {
    return project.state.approved?.final_outline && hasArtifact(project, "approved_draft");
  }
  if (artifact === "final_manuscript") {
    return project.state.approved?.sample_chapter;
  }
  if (artifact === "export") {
    return hasArtifact(project, "export_markdown");
  }
  return false;
}

function approvalStatusText(project, artifact) {
  if (project?.state?.approved?.[artifact]) {
    return "승인됨";
  }
  if (canApprove(project, artifact)) {
    return "승인 가능";
  }
  return "대기";
}

function activeFlowKey(project = state.currentProject) {
  if (!project) return "interview";
  if (!hasArtifact(project, "sample")) return "interview";
  if (!project.state.approved?.sample_direction) return "sample";
  if (!hasArtifact(project, "harness_plan")) return "sample_direction";
  if (!project.state.approved?.final_outline) return "harness";
  if (!hasArtifact(project, "draft")) return "chapter";
  if (!project.state.approved?.sample_chapter) return "verify";
  return "export";
}

function renderMessages() {
  elements.messageList.innerHTML = "";
  const messages = state.messages.length
    ? state.messages
    : [
        {
          role: "assistant",
          text:
            "어떤 전문서적이나 대학 전공책을 만들고 싶나요? 분야, 독자 수준, 원하는 난이도, 문체를 말해주면 제가 먼저 방향을 정리하고 3페이지 샘플을 만들 준비를 하겠습니다."
        }
      ];

  for (const message of messages) {
    const item = document.createElement("article");
    item.className = `message ${message.role}`;
    const label = document.createElement("strong");
    label.textContent = message.role === "user" ? "사용자" : "AI 편집자";
    const body = document.createElement("p");
    body.textContent = message.text;
    item.append(label, body);
    elements.messageList.append(item);
  }

  elements.messageList.scrollTop = elements.messageList.scrollHeight;
}

function renderProjects() {
  elements.projects.innerHTML = "";
  if (!state.projects.length) {
    appendEmpty(elements.projects, "아직 프로젝트가 없습니다.");
    return;
  }

  for (const project of state.projects) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `project-item ${state.currentProject?.id === project.id ? "active" : ""}`;
    const title = document.createElement("strong");
    title.textContent = project.title;
    const meta = document.createElement("span");
    meta.textContent = phaseLabels[project.phase] || project.phase;
    button.append(title, meta);
    button.addEventListener("click", () => loadProject(project.id));
    elements.projects.append(button);
  }
}

function renderHeader() {
  const project = state.currentProject;
  const runtime = currentRuntime();
  const phase = project?.state?.phase || "created";

  elements.projectTitle.textContent = titleFromProject(project);
  elements.phaseEyebrow.textContent = project ? "현재 프로젝트" : "AI editorial interview";
  elements.projectSubtitle.textContent = project
    ? "샘플을 기준으로 문체와 난이도를 합의하고, 하네스가 검증/수정 루프를 반복합니다."
    : "주제, 독자 수준, 난이도, 문체를 먼저 합의한 뒤 3페이지 샘플을 만듭니다.";
  elements.phaseValue.textContent = phaseLabels[phase] || "인터뷰";
  elements.sampleValue.textContent = hasArtifact(project, "sample") ? "생성됨" : "대기";
  elements.verifierValue.textContent = hasArtifact(project, "quality_report") ? "실행됨" : "대기";
  elements.runtimeSidebar.querySelector("strong").textContent = runtime.provider;
  elements.runtimeSidebar.querySelector("span").textContent = runtime.model;
}

function renderNextAction() {
  const next = getNextStep();
  elements.nextActionTitle.textContent = next.title;
  elements.nextActionDescription.textContent = next.description;
  elements.nextActionButton.textContent = state.busy ? "진행 중..." : next.label;
  elements.nextActionButton.disabled = state.busy || next.kind === "done";
  elements.nextActionButton.dataset.kind = next.kind;
  elements.nextActionButton.dataset.action = next.action || "";
  elements.nextActionButton.dataset.artifact = next.artifact || "";

  if (next.tab) {
    elements.secondaryActionButton.hidden = false;
    elements.secondaryActionButton.dataset.tab = next.tab;
    elements.secondaryActionButton.textContent = `${artifactTabs[next.tab]?.title || "문서"} 보기`;
  } else {
    elements.secondaryActionButton.hidden = true;
  }
}

function renderArtifact() {
  const project = state.currentProject;
  const tab = artifactTabs[state.activeTab] || artifactTabs.book_intent;
  const currentVersion = project?.state?.chapters?.[0]?.current_version || "v1";
  const content = project?.artifacts?.[state.activeTab] || tab.empty;

  elements.tabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.activeTab);
  });
  elements.artifactTitle.textContent = tab.title;
  elements.artifactPath.textContent = tab.path.replace("{version}", currentVersion);

  if (!state.dirty) {
    elements.artifactContent.value = content;
  }

  elements.artifactContent.disabled = !project || state.busy;
  elements.saveArtifact.disabled = !project || state.busy || !state.dirty;
  elements.saveState.textContent = state.dirty ? "미저장 변경" : "저장됨";
}

function renderFlow() {
  const active = activeFlowKey();
  elements.flowPanel.innerHTML = "";
  for (const [key, label] of flowSteps) {
    const row = document.createElement("div");
    row.className = `flow-step ${key === active ? "active" : ""}`;
    const dot = document.createElement("span");
    const text = document.createElement("strong");
    text.textContent = label;
    row.append(dot, text);
    elements.flowPanel.append(row);
  }
}

function renderVerifiers() {
  elements.verifierPanel.innerHTML = "";
  for (const [name, body] of verifierAgents) {
    const item = document.createElement("article");
    item.className = "verifier-item";
    const title = document.createElement("strong");
    title.textContent = name;
    const desc = document.createElement("span");
    desc.textContent = body;
    item.append(title, desc);
    elements.verifierPanel.append(item);
  }
}

function renderApprovals() {
  const project = state.currentProject;
  elements.approvalPanel.innerHTML = "";
  if (!project) {
    appendEmpty(elements.approvalPanel, "3페이지 샘플을 만들면 승인 게이트가 열립니다.");
    return;
  }

  for (const artifact of approvalOrder) {
    const row = document.createElement("div");
    row.className = "approval-row";
    const label = document.createElement("span");
    label.textContent = approvalLabels[artifact] || artifact;
    if (project.state.approved?.[artifact]) {
      const done = document.createElement("strong");
      done.className = "state-pill done";
      done.textContent = "승인됨";
      row.append(label, done);
    } else if (canApprove(project, artifact)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "approval-button";
      button.textContent = "승인";
      button.addEventListener("click", () => approve(artifact));
      row.append(label, button);
    } else {
      const locked = document.createElement("strong");
      locked.className = "state-pill locked";
      locked.textContent = approvalStatusText(project, artifact);
      row.append(label, locked);
    }
    elements.approvalPanel.append(row);
  }
}

function renderRuns() {
  const runs = state.currentProject?.runs || [];
  elements.runPanel.innerHTML = "";
  if (!runs.length) {
    appendEmpty(elements.runPanel, "아직 실행 기록이 없습니다.");
    return;
  }

  for (const run of runs.slice(0, 8)) {
    const item = document.createElement("article");
    item.className = "run-item";
    const title = document.createElement("strong");
    title.textContent = actionLabels[run.action] || run.action;
    const meta = document.createElement("span");
    meta.textContent = `${run.provider || "mock"} / ${run.model || "-"} · ${formatDate(run.completed_at || run.started_at)}`;
    item.append(title, meta);
    elements.runPanel.append(item);
  }
}

function renderFiles() {
  const project = state.currentProject;
  elements.filePanel.innerHTML = "";
  if (!project) {
    appendEmpty(elements.filePanel, "아직 생성된 파일이 없습니다.");
    return;
  }

  const files = fileManifest.filter(([key]) => hasArtifact(project, key));
  if (!files.length) {
    appendEmpty(elements.filePanel, "아직 생성된 파일이 없습니다.");
    return;
  }

  for (const [key, label] of files) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "file-row";
    const title = document.createElement("strong");
    title.textContent = label;
    const meta = document.createElement("span");
    meta.textContent = key;
    row.append(title, meta);
    row.addEventListener("click", () => {
      if (artifactTabs[key]) {
        state.activeTab = key;
        state.dirty = false;
        render();
      }
    });
    elements.filePanel.append(row);
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function appendEmpty(parent, text) {
  const empty = document.createElement("p");
  empty.className = "empty-text";
  empty.textContent = text;
  parent.append(empty);
}

function showNotice(message) {
  elements.notice.hidden = false;
  elements.notice.textContent = message;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => {
    elements.notice.hidden = true;
  }, 4200);
}

function render() {
  renderMessages();
  renderProjects();
  renderHeader();
  renderNextAction();
  renderArtifact();
  renderFlow();
  renderVerifiers();
  renderApprovals();
  renderRuns();
  renderFiles();
}

elements.conversationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.conversationInput.value.trim();
  if (!text) return;

  state.messages.push({ role: "user", text });
  state.messages.push({
    role: "assistant",
    text: interviewReplyFor(text)
  });
  elements.conversationInput.value = "";
  saveMessages();
  applyInterviewInference(text);
  render();
});

document.querySelectorAll("[data-starter]").forEach((button) => {
  button.addEventListener("click", () => {
    elements.conversationInput.value = button.dataset.starter || "";
    elements.conversationInput.focus();
  });
});

elements.startInterview.addEventListener("click", () => {
  state.currentProject = null;
  state.messages = [];
  saveMessages();
  elements.directionTitle.value = "";
  elements.directionField.value = "";
  elements.directionReader.value = "";
  elements.directionType.value = "university_textbook";
  elements.directionDifficulty.value = "중급";
  elements.directionTone.value = "";
  state.activeTab = "book_intent";
  state.dirty = false;
  render();
});

elements.resetConversation.addEventListener("click", () => {
  state.messages = [];
  saveMessages();
  render();
});

elements.nextActionButton.addEventListener("click", () => {
  const next = getNextStep();
  if (next.kind === "build_sample") {
    buildThreePageSample();
    return;
  }
  if (next.kind === "action") {
    runAction(next.action);
    return;
  }
  if (next.kind === "approval") {
    approve(next.artifact);
  }
});

elements.secondaryActionButton.addEventListener("click", () => {
  const tab = elements.secondaryActionButton.dataset.tab;
  if (tab) {
    state.activeTab = tab;
    state.dirty = false;
    render();
  }
});

elements.commandBar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (button) {
    runAction(button.dataset.action);
  }
});

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeTab = tab.dataset.tab;
    state.dirty = false;
    render();
  });
});

elements.artifactContent.addEventListener("input", () => {
  if (!state.currentProject) return;
  state.dirty = true;
  elements.saveState.textContent = "미저장 변경";
  elements.saveArtifact.disabled = false;
});

elements.saveArtifact.addEventListener("click", saveActiveArtifact);

Promise.all([loadHealth(), loadProjects()])
  .then(render)
  .catch((error) => showNotice(error.message));
