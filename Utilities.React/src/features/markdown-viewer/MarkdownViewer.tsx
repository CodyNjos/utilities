import { useState, useCallback } from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

marked.setOptions({
  gfm: true,
  breaks: true,
});

const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  if (lang && hljs.getLanguage(lang)) {
    const highlighted = hljs.highlight(text, { language: lang }).value;
    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
  }
  const auto = hljs.highlightAuto(text).value;
  return `<pre><code class="hljs">${auto}</code></pre>`;
};

marked.use({ renderer });

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: "#0d1117",
    color: "#e6edf3",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
    lineHeight: 1.6,
    padding: "32px 24px",
  },
  landing: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    textAlign: "center",
  },
  title: {
    fontSize: "1.8rem",
    marginBottom: "0.5rem",
    fontWeight: 700,
  },
  subtitle: {
    color: "#8b949e",
    marginBottom: "1.5rem",
  },
  dropZone: {
    width: "100%",
    maxWidth: 500,
    padding: "3rem 2rem",
    border: "2px dashed #30363d",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: "#8b949e",
    fontSize: "1rem",
    background: "transparent",
  },
  dropZoneActive: {
    borderColor: "#58a6ff",
    background: "#0c2d6b",
    color: "#58a6ff",
  },
  icon: {
    fontSize: "2.5rem",
    marginBottom: "0.75rem",
    display: "block",
  },
  contentWrapper: {
    maxWidth: 860,
    margin: "0 auto",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #30363d",
    flexWrap: "wrap" as const,
  },
  filename: {
    fontWeight: 600,
    fontSize: "1.1rem",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  toolbarBtn: {
    padding: "0.4rem 0.9rem",
    border: "1px solid #30363d",
    borderRadius: 6,
    background: "#0d1117",
    color: "#e6edf3",
    cursor: "pointer",
    fontSize: "0.85rem",
    whiteSpace: "nowrap" as const,
    transition: "border-color 0.15s",
    fontFamily: "inherit",
  },
  rawView: {
    whiteSpace: "pre-wrap" as const,
    color: "#e6edf3",
    fontSize: "0.85em",
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    margin: 0,
    padding: 0,
  },
};

const markdownStyles = `
  .md-rendered h1, .md-rendered h2, .md-rendered h3,
  .md-rendered h4, .md-rendered h5, .md-rendered h6 {
    margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; line-height: 1.25;
  }
  .md-rendered h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #30363d; }
  .md-rendered h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #30363d; }
  .md-rendered h3 { font-size: 1.25em; }
  .md-rendered p { margin: 0.5em 0 1em; }
  .md-rendered a { color: #58a6ff; text-decoration: none; }
  .md-rendered a:hover { text-decoration: underline; }
  .md-rendered img { max-width: 100%; border-radius: 6px; }
  .md-rendered blockquote {
    margin: 1em 0; padding: 0.25em 1em; border-left: 4px solid #30363d; color: #8b949e;
  }
  .md-rendered code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    font-size: 0.875em; background: #161b22; padding: 0.2em 0.4em; border-radius: 4px;
  }
  .md-rendered pre {
    margin: 1em 0; padding: 1em; background: #161b22; border-radius: 8px; overflow-x: auto;
  }
  .md-rendered pre code { background: none; padding: 0; font-size: 0.85em; line-height: 1.5; }
  .md-rendered table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .md-rendered th, .md-rendered td {
    border: 1px solid #30363d; padding: 0.5em 0.75em; text-align: left;
  }
  .md-rendered th { background: #161b22; font-weight: 600; }
  .md-rendered ul, .md-rendered ol { margin: 0.5em 0 1em; padding-left: 2em; }
  .md-rendered li { margin: 0.25em 0; }
  .md-rendered hr { border: none; border-top: 2px solid #30363d; margin: 1.5em 0; }
`;

export default function MarkdownViewer() {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [dragging, setDragging] = useState(false);

  const openFilePicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.mdown,.mkd,.txt";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setMarkdown(text);
      setFileName(file.name);
      setShowRaw(false);
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && /\.(md|markdown|mdown|mkd|txt)$/i.test(file.name)) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const goBack = () => {
    setMarkdown(null);
    setFileName("");
    setShowRaw(false);
  };

  const rendered = markdown ? (marked.parse(markdown) as string) : "";

  if (markdown === null) {
    return (
      <div style={styles.wrapper}>
        <style>{markdownStyles}</style>
        <div style={styles.landing}>
          <h1 style={styles.title}>Mark It Down, Cowboy</h1>
          <p style={styles.subtitle}>Wrangle your markdown into something purdy</p>
          <div
            style={{ ...styles.dropZone, ...(dragging ? styles.dropZoneActive : {}) }}
            onClick={() => openFilePicker()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openFilePicker(); }}
          >
            <span style={styles.icon}>&#128196;</span>
            Toss your .md file in the corral<br />or click to rustle one up
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <style>{markdownStyles}</style>
      <div style={styles.contentWrapper}>
        <div style={styles.toolbar}>
          <span style={styles.filename}>{fileName}</span>
          <button style={styles.toolbarBtn} onClick={() => setShowRaw(!showRaw)}>
            {showRaw ? "Rendered" : "Raw"}
          </button>
          <button style={styles.toolbarBtn} onClick={() => openFilePicker()}>
            Open
          </button>
          <button style={styles.toolbarBtn} onClick={goBack}>
            Back
          </button>
        </div>

        {showRaw ? (
          <pre style={styles.rawView}>{markdown}</pre>
        ) : (
          <div
            className="md-rendered"
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        )}
      </div>
    </div>
  );
}
