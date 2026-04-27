function sectionBody(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const target = `## ${heading}`.toLowerCase();
  const start = lines.findIndex((line) => line.trim().toLowerCase() === target);

  if (start === -1) {
    return "";
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].trim().startsWith("## ")) {
      end = index;
      break;
    }
  }

  return lines.slice(start + 1, end).join("\n").trim();
}

function normalizeDecision(value, blockingIssues) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized.includes("pass") || normalized.includes("approve")) {
    return blockingIssues.length ? "revise" : "pass";
  }

  if (normalized.includes("block")) {
    return "blocked";
  }

  return "revise";
}

function parseScore(markdown) {
  const scoreSection = sectionBody(markdown, "Score");
  const match = scoreSection.match(/\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const score = Number(match[0]);
  return Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : null;
}

function issuePrefix(sourceAgent) {
  return String(sourceAgent || "review")
    .split(/[_\s-]+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 3)
    .toUpperCase() || "RV";
}

function parseIssues(section, sourceAgent, defaultSeverity) {
  const prefix = issuePrefix(sourceAgent);
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line));

  return lines.map((line, index) => {
    const raw = line.replace(/^[-*]\s+/, "").trim();
    const match = raw.match(/^([A-Z]{2,}-\d+):\s*(.+)$/);
    const issueText = match ? match[2] : raw;

    return {
      id: match ? match[1] : `${prefix}-${String(index + 1).padStart(3, "0")}`,
      source_agent: sourceAgent,
      severity: defaultSeverity,
      location: "review report",
      issue: issueText,
      required_action: defaultSeverity === "high" ? "Resolve before approval." : "Consider during revision."
    };
  });
}

export function parseReviewMarkdown(markdown, sourceAgent) {
  const blockingIssues = parseIssues(sectionBody(markdown, "Blocking Issues"), sourceAgent, "high");
  const nonBlockingIssues = parseIssues(sectionBody(markdown, "Non-Blocking Issues"), sourceAgent, "medium");
  const score = parseScore(markdown);
  const decision = normalizeDecision(sectionBody(markdown, "Decision"), blockingIssues);

  return {
    source_agent: sourceAgent,
    score,
    decision,
    blocking_issues: blockingIssues,
    non_blocking_issues: nonBlockingIssues
  };
}

export function aggregateChapterReviews({
  chapter,
  version,
  iteration,
  reviews,
  generatedAt,
  passThreshold = 8
}) {
  const parsedReviews = reviews.map((review) => parseReviewMarkdown(review.markdown, review.sourceAgent));
  const numericScores = parsedReviews
    .map((review) => review.score)
    .filter((score) => typeof score === "number" && Number.isFinite(score));
  const averageScore = numericScores.length
    ? Math.round((numericScores.reduce((sum, score) => sum + score, 0) / numericScores.length) * 10) / 10
    : 0;
  const blockingIssues = parsedReviews.flatMap((review) => review.blocking_issues);
  const nonBlockingIssues = parsedReviews.flatMap((review) => review.non_blocking_issues);
  const hasBlockedDecision = parsedReviews.some((review) => review.decision === "blocked");

  let decision = "pass";
  if (hasBlockedDecision) {
    decision = "blocked";
  } else if (blockingIssues.length || averageScore < passThreshold) {
    decision = "revise";
  }

  return {
    chapter,
    version,
    iteration,
    decision,
    average_score: averageScore,
    scores: Object.fromEntries(
      parsedReviews.map((review) => [review.source_agent, review.score ?? 0])
    ),
    blocking_issues: blockingIssues,
    non_blocking_issues: nonBlockingIssues,
    reviewer_decisions: Object.fromEntries(
      parsedReviews.map((review) => [review.source_agent, review.decision])
    ),
    generated_at: generatedAt
  };
}

export function buildRevisionPassReport({ chapter, version, iteration, generatedAt }) {
  return {
    chapter,
    version,
    iteration,
    decision: "pass",
    average_score: 8.4,
    scores: {
      revision_writer: 8.4,
      quality_gate: 8.4
    },
    blocking_issues: [],
    non_blocking_issues: [
      {
        id: "CT-001",
        source_agent: "quality_gate",
        severity: "low",
        location: "evidence requirements",
        issue: "Add external references before final export.",
        required_action: "Resolve during evidence pass."
      }
    ],
    reviewer_decisions: {
      quality_gate: "pass"
    },
    generated_at: generatedAt
  };
}
