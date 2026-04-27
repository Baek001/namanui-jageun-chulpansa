import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  approveArtifact,
  createProject,
  getProject,
  listProjects,
  runWorkflowAction,
  updateArtifact
} from "../../packages/core/bookProject.mjs";
import {
  loadRuntimeConfig,
  publicRuntimeConfig,
  runtimeEnvFromConfig,
  testRuntimeConnection,
  saveRuntimeConfig
} from "../../packages/core/runtimeConfig.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const publicDir = path.join(__dirname, "public");
const booksRoot = process.env.BOOKFORGE_BOOKS_ROOT || path.join(repoRoot, "books");
const configRoot = process.env.BOOKFORGE_CONFIG_ROOT || path.join(repoRoot, "config");
const port = Number(process.env.PORT || 3000);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"]
]);

const exportMimeTypes = new Map([
  [".md", "text/markdown; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".yaml", "text/yaml; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".epub", "application/epub+zip"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
]);

const allowedExports = new Set([
  "book.md",
  "manuscript_full.md",
  "metadata.yaml",
  "book.html",
  "book.pdf",
  "book.epub",
  "book.docx",
  "export_report.json"
]);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body, null, 2));
}

function sendText(res, status, body) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
}

function assertProjectId(projectId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error(`Invalid project id: ${projectId}`);
  }
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

async function coreOptionsForRequest() {
  const runtimeConfig = await loadRuntimeConfig(configRoot, process.env);
  return {
    configRoot,
    env: runtimeEnvFromConfig(runtimeConfig, process.env),
    runtimeConfig
  };
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = decodeURIComponent(url.pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
  const targetPath = path.resolve(publicDir, relativePath);
  const publicRelativePath = path.relative(publicDir, targetPath);

  if (publicRelativePath.startsWith("..") || path.isAbsolute(publicRelativePath)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const content = await readFile(targetPath);
    const ext = path.extname(targetPath);
    res.writeHead(200, {
      "content-type": mimeTypes.get(ext) || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(content);
  } catch {
    sendText(res, 404, "Not found");
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.split("/").filter(Boolean);

  if (req.method === "GET" && url.pathname === "/api/health") {
    const runtime = await publicRuntimeConfig(configRoot, process.env);
    sendJson(res, 200, {
      ok: true,
      service: "bookforge",
      mode: "local-scaffold",
      model_provider: runtime.active_runtime.provider,
      model: runtime.active_runtime.model,
      source_provider: runtime.active_runtime.source_provider
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/runtimes") {
    sendJson(res, 200, await publicRuntimeConfig(configRoot, process.env));
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/runtimes") {
    const body = await parseBody(req);
    await saveRuntimeConfig(configRoot, body, process.env);
    sendJson(res, 200, await publicRuntimeConfig(configRoot, process.env));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/runtimes/test") {
    const body = await parseBody(req);
    const result = await testRuntimeConnection({
      configRoot,
      providerId: body.provider_id || body.provider || body.default_provider,
      live: Boolean(body.live),
      env: process.env
    });
    sendJson(res, result.ok ? 200 : 409, result);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/projects") {
    sendJson(res, 200, { projects: await listProjects(booksRoot) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/projects") {
    const body = await parseBody(req);
    const project = await createProject(booksRoot, body, await coreOptionsForRequest());
    sendJson(res, 201, project);
    return;
  }

  if (segments[0] === "api" && segments[1] === "projects" && segments[2]) {
    const projectId = segments[2];
    assertProjectId(projectId);

    if (req.method === "GET" && segments.length === 3) {
      sendJson(res, 200, await getProject(booksRoot, projectId, await coreOptionsForRequest()));
      return;
    }

    if (req.method === "GET" && segments[3] === "exports" && segments[4]) {
      const filename = decodeURIComponent(segments[4]);
      if (!allowedExports.has(filename)) {
        sendJson(res, 404, { error: "Export not found" });
        return;
      }

      const filePath = path.join(booksRoot, projectId, "exports", filename);
      const content = await readFile(filePath);
      res.writeHead(200, {
        "content-type": exportMimeTypes.get(path.extname(filename)) || "application/octet-stream",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store"
      });
      res.end(content);
      return;
    }

    if (req.method === "POST" && segments[3] === "actions" && segments[4]) {
      const result = await runWorkflowAction(booksRoot, projectId, segments[4], await coreOptionsForRequest());
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && segments[3] === "approvals" && segments[4]) {
      const body = await parseBody(req);
      const result = await approveArtifact(booksRoot, projectId, segments[4], body, await coreOptionsForRequest());
      sendJson(res, 200, result);
      return;
    }

    if (req.method === "PUT" && segments[3] === "artifacts" && segments[4]) {
      const body = await parseBody(req);
      const result = await updateArtifact(booksRoot, projectId, segments[4], body, await coreOptionsForRequest());
      sendJson(res, 200, result);
      return;
    }
  }

  sendJson(res, 404, { error: "API route not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isWorkflowError =
      message.includes("Approve ") ||
      message.includes(" before ") ||
      message.includes("Unknown action") ||
      message.includes("Unknown approval");

    sendJson(res, isWorkflowError ? 409 : 500, {
      error: isWorkflowError ? "Workflow blocked" : "Internal server error",
      message
    });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`BookForge local app running at http://localhost:${port}`);
});
