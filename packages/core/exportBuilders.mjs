import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { time, date: dosDate };
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function makeZip(files) {
  const now = dosDateTime();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf-8");
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(String(file.content), "utf-8");
    const crc = crc32(content);

    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(now.time),
      u16(now.date),
      u32(crc),
      u32(content.length),
      u32(content.length),
      u16(name.length),
      u16(0),
      name
    ]);

    localParts.push(localHeader, content);

    centralParts.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(now.time),
        u16(now.date),
        u32(crc),
        u32(content.length),
        u32(content.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name
      ])
    );

    offset += localHeader.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDirectory.length),
    u32(offset),
    u16(0)
  ]);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let inList = false;

  function closeList() {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
      continue;
    }

    const list = trimmed.match(/^[-*]\s+(.+)$/);
    if (list) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escapeHtml(list[1])}</li>`);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      closeList();
      html.push(`<p>${escapeHtml(trimmed)}</p>`);
      continue;
    }

    closeList();
    html.push(`<p>${escapeHtml(trimmed)}</p>`);
  }

  closeList();
  return html.join("\n");
}

function markdownToPlainText(markdown) {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_`>#|]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wrapText(text, width = 86) {
  const output = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      output.push("");
      continue;
    }

    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      if ((line + " " + word).trim().length > width) {
        output.push(line);
        line = word;
      } else {
        line = (line + " " + word).trim();
      }
    }
    if (line) {
      output.push(line);
    }
  }
  return output;
}

function pdfEscape(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildPdf(markdown, title) {
  const text = markdownToPlainText(markdown);
  const lines = wrapText(`${title}\n\n${text}`, 90);
  const pages = [];
  const pageSize = 46;

  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(lines.slice(index, index + pageSize));
  }

  const objects = [];
  const add = (value) => {
    objects.push(value);
    return objects.length;
  };

  const catalogId = add("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];

  for (const pageLines of pages.length ? pages : [["BookForge export"]]) {
    const commands = [
      "BT",
      "/F1 10 Tf",
      "50 790 Td",
      "14 TL",
      ...pageLines.map((line) => `(${pdfEscape(line).slice(0, 900)}) Tj T*`),
      "ET"
    ].join("\n");
    const streamId = add(`<< /Length ${Buffer.byteLength(commands)} >>\nstream\n${commands}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(chunks.join("")));
    chunks.push(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""));
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index < offsets.length; index += 1) {
    chunks.push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.from(chunks.join(""), "utf-8");
}

function buildHtml(markdown, title) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { color: #222; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.72; margin: 4rem auto; max-width: 760px; }
    h1, h2, h3 { line-height: 1.25; }
    h1 { font-size: 2.4rem; }
    h2 { border-top: 1px solid #ddd; margin-top: 2.4rem; padding-top: 1.2rem; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>
</head>
<body>
${markdownToHtml(markdown)}
</body>
</html>
`;
}

function buildEpub(markdown, title) {
  const body = markdownToHtml(markdown);
  const files = [
    { name: "mimetype", content: "application/epub+zip" },
    {
      name: "META-INF/container.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    },
    {
      name: "OEBPS/content.opf",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookforge-id" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookforge-id">bookforge-${Date.now()}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:language>ko</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="book" href="book.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="book"/>
  </spine>
</package>`
    },
    {
      name: "OEBPS/nav.xhtml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="ko">
<head><title>${escapeHtml(title)}</title></head>
<body><nav epub:type="toc"><ol><li><a href="book.xhtml">${escapeHtml(title)}</a></li></ol></nav></body>
</html>`
    },
    {
      name: "OEBPS/book.xhtml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="ko">
<head><title>${escapeHtml(title)}</title></head>
<body>${body}</body>
</html>`
    }
  ];
  return makeZip(files);
}

function paragraphXml(text) {
  return `<w:p><w:r><w:t xml:space="preserve">${escapeHtml(text)}</w:t></w:r></w:p>`;
}

function buildDocx(markdown, title) {
  const paragraphs = markdownToPlainText(markdown)
    .split(/\r?\n/)
    .map((line) => paragraphXml(line));
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphXml(title)}
    ${paragraphs.join("\n")}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  return makeZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    },
    {
      name: "word/document.xml",
      content: documentXml
    }
  ]);
}

async function readOptional(filePath) {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

async function writeArtifact(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

export async function buildPublishingArtifacts({ projectDir, state, title, generatedAt = new Date().toISOString() }) {
  const chapters = state.chapters?.length ? state.chapters : [];
  const approvedChapters = [];

  for (const chapter of chapters) {
    const approved = await readOptional(path.join(projectDir, "manuscript", chapter.id, "approved.md"));
    if (approved.trim()) {
      approvedChapters.push({ ...chapter, markdown: approved.trim() });
    }
  }

  if (!approvedChapters.length) {
    throw new Error("No approved chapters found for export.");
  }

  const toc = approvedChapters
    .map((chapter, index) => `- Chapter ${index + 1}. ${chapter.title}`)
    .join("\n");
  const manuscript = `# ${title}

## Table Of Contents

${toc}

${approvedChapters.map((chapter) => chapter.markdown).join("\n\n")}
`;

  const exportsDir = path.join(projectDir, "exports");
  const html = buildHtml(manuscript, title);
  const pdf = buildPdf(manuscript, title);
  const epub = buildEpub(manuscript, title);
  const docx = buildDocx(manuscript, title);
  const metadata = `title: ${JSON.stringify(title)}
language: ko
format: markdown, html, pdf, epub, docx
generated_at: ${JSON.stringify(generatedAt)}
chapters: ${approvedChapters.length}
`;
  const report = {
    generated_at: generatedAt,
    title,
    chapters: approvedChapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      approved_version: chapter.approved_version || "approved"
    })),
    artifacts: {
      markdown: "exports/book.md",
      manuscript_full: "exports/manuscript_full.md",
      html: "exports/book.html",
      pdf: "exports/book.pdf",
      epub: "exports/book.epub",
      docx: "exports/book.docx",
      metadata: "exports/metadata.yaml"
    }
  };

  await writeArtifact(path.join(exportsDir, "book.md"), manuscript);
  await writeArtifact(path.join(exportsDir, "manuscript_full.md"), manuscript);
  await writeArtifact(path.join(exportsDir, "book.html"), html);
  await writeArtifact(path.join(exportsDir, "book.pdf"), pdf);
  await writeArtifact(path.join(exportsDir, "book.epub"), epub);
  await writeArtifact(path.join(exportsDir, "book.docx"), docx);
  await writeArtifact(path.join(exportsDir, "metadata.yaml"), metadata);
  await writeArtifact(path.join(exportsDir, "export_report.json"), `${JSON.stringify(report, null, 2)}\n`);

  return report;
}
