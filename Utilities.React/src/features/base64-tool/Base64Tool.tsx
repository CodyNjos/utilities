import { useState, useCallback } from "react";

const STYLE: Record<string, React.CSSProperties> = {
  body: {
    background: "#0a0a0b",
    color: "#e8e6e1",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    padding: "32px 24px",
    boxSizing: "border-box",
  },
  mono: { fontFamily: "'Space Mono', monospace" },
  wrap: { maxWidth: 720, margin: "0 auto" },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 10,
    background: "linear-gradient(135deg, #1a1a1e, #222228)",
    border: "1px solid #2a2a30", borderRadius: 12,
    padding: "8px 16px", marginBottom: 16,
    fontFamily: "'Space Mono', monospace",
    fontSize: 11, letterSpacing: "0.08em",
    color: "#7a7a82", textTransform: "uppercase",
  },
  h1: {
    fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em",
    background: "linear-gradient(to right, #e8e6e1, #a0a098)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    margin: 0,
  },
  subtitle: { color: "#6a6a72", fontSize: 14, marginTop: 8 },
  panel: {
    background: "#111114", border: "1px solid #1e1e24",
    borderRadius: 14, overflow: "hidden", marginBottom: 16,
  },
  panelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 16px", borderBottom: "1px solid #1e1e24",
  },
  panelLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#5a5a62",
  },
  panelMeta: { fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#4a4a52" },
  textarea: {
    width: "100%", minHeight: 160, padding: 16, border: "none",
    background: "transparent", color: "#e8e6e1",
    fontFamily: "'Space Mono', monospace", fontSize: 13,
    lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box",
  },
};

function fmtSize(b: number | null | undefined): string {
  if (!b && b !== 0) return "\u2014";
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

interface Stats {
  inSize: number;
  outSize: number;
}

export default function Base64Tool() {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [inputType, setInputType] = useState<"text" | "file">("text");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [outputMeta, setOutputMeta] = useState("");
  const [error, setError] = useState("");
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileMime, setFileMime] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState("");

  const openFilePicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  const clearError = () => setError("");

  const clearAll = () => {
    setInputText(""); setOutputText(""); setOutputMeta("");
    setFileData(null); setFileName(""); setFileMime(""); setFileSize(0);
    setError(""); setStats(null); setImgPreview(null); setCopied("");
  };

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    setFileMime(file.type || "application/octet-stream");
    setFileName(file.name);
    setFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (e) => setFileData((e.target as FileReader).result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
  }, []);

  const clearFile = () => {
    setFileData(null); setFileName(""); setFileMime(""); setFileSize(0);
  };

  const switchMode = (m: "encode" | "decode") => {
    setMode(m);
    if (m === "decode") setInputType("text");
    clearError(); setImgPreview(null);
  };

  const execute = () => {
    clearError(); setImgPreview(null); setCopied("");

    if (mode === "encode") {
      let result: string, inputSize: number;
      if (inputType === "file" && fileData) {
        result = arrayBufferToBase64(fileData);
        inputSize = fileData.byteLength;
      } else {
        if (!inputText) { setError("Nothing to encode \u2014 type or paste some text."); return; }
        try {
          result = btoa(unescape(encodeURIComponent(inputText)));
          inputSize = new Blob([inputText]).size;
        } catch (e) { setError("Encoding failed: " + (e as Error).message); return; }
      }
      setOutputText(result);
      setOutputMeta(fmtSize(result.length));
      setStats({ inSize: inputSize, outSize: result.length });
    } else {
      const text = inputText.trim();
      if (!text) { setError("Nothing to decode \u2014 paste a Base64 string."); return; }

      let b64 = text, detectedMime = "";
      const match = text.match(/^data:([^;]+);base64,(.+)$/s);
      if (match) { detectedMime = match[1]; b64 = match[2]; }
      b64 = b64.replace(/\s/g, "");

      try {
        const decoded = atob(b64);
        let isText = true;
        for (let i = 0; i < Math.min(decoded.length, 512); i++) {
          const c = decoded.charCodeAt(i);
          if (c === 0 || (c < 8 && c !== 0)) { isText = false; break; }
        }

        if (detectedMime.startsWith("image/")) {
          setOutputText("[Binary image data \u2014 " + fmtSize(decoded.length) + "]");
          setImgPreview("data:" + detectedMime + ";base64," + b64);
        } else if (isText) {
          try { setOutputText(decodeURIComponent(escape(decoded))); }
          catch (_e) { setOutputText(decoded); }
        } else {
          setOutputText("[Binary data \u2014 " + fmtSize(decoded.length) + "]\nUse the Download button to save the file.");
        }
        setOutputMeta(fmtSize(decoded.length));
        setStats({ inSize: text.length, outSize: decoded.length });
      } catch (_e) {
        setError("Invalid Base64 string. Check the input and try again.");
      }
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied("output");
      setTimeout(() => setCopied(""), 1500);
    });
  };

  const copyAsDataUri = () => {
    const uri = "data:" + fileMime + ";base64," + outputText;
    navigator.clipboard.writeText(uri).then(() => {
      setCopied("datauri");
      setTimeout(() => setCopied(""), 1500);
    });
  };

  const downloadOutput = () => {
    let blob: Blob, ext: string;
    if (mode === "encode") {
      blob = new Blob([outputText], { type: "text/plain" });
      ext = ".b64.txt";
    } else {
      const decoded = atob(inputText.trim().replace(/^data:[^;]+;base64,/, "").replace(/\s/g, ""));
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
      blob = new Blob([bytes]);
      ext = ".bin";
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "output" + ext;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const swapFields = () => {
    if (!outputText) return;
    const prev = outputText;
    switchMode(mode === "encode" ? "decode" : "encode");
    setInputType("text");
    setInputText(prev);
    setOutputText(""); setOutputMeta(""); setStats(null);
  };

  const modeBtn = (m: "encode" | "decode"): React.CSSProperties => ({
    flex: 1, padding: "10px 16px", border: "none", borderRadius: 9,
    background: mode === m ? "rgba(108,180,238,0.1)" : "transparent",
    color: mode === m ? "#6cb4ee" : "#6a6a72",
    boxShadow: mode === m ? "0 0 0 1px rgba(108,180,238,0.25)" : "none",
    fontSize: 14, fontWeight: 600, cursor: "pointer",
    transition: "all 0.25s", fontFamily: "inherit",
  });

  const tabBtn = (t: "text" | "file"): React.CSSProperties => ({
    padding: "8px 18px",
    border: inputType === t ? "1px solid rgba(108,180,238,0.3)" : "1px solid #1e1e24",
    background: inputType === t ? "rgba(108,180,238,0.08)" : "#111114",
    color: inputType === t ? "#6cb4ee" : "#6a6a72",
    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.2s",
    borderRadius: t === "text" ? "8px 0 0 8px" : "0 8px 8px 0",
    ...(t === "file" ? { borderLeft: inputType === "file" ? "1px solid rgba(108,180,238,0.3)" : "none" } : {}),
  });

  const smBtn = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px", border: "1px solid " + (active ? "#50c878" : "#2a2a30"),
    borderRadius: 8, background: "transparent",
    color: active ? "#50c878" : "#6a6a72",
    fontSize: 11, fontWeight: 600, cursor: "pointer",
    fontFamily: "inherit", transition: "all 0.2s",
  });

  const hasOutput = outputText.length > 0;
  const showDataUri = mode === "encode" && inputType === "file" && fileData && fileMime.startsWith("image/") && hasOutput;

  return (
    <div style={STYLE.body}>
      <div style={STYLE.wrap}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={STYLE.badge}><span style={{ color: "#6cb4ee", fontSize: 14 }}>&#9670;</span> Base64 Tool</div>
          <h1 style={STYLE.h1}>Encode. Decode.</h1>
          <p style={STYLE.subtitle}>Text &amp; files — all in the browser</p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 4, padding: 4, background: "#111114", border: "1px solid #1e1e24", borderRadius: 12, marginBottom: 24 }}>
          <button style={modeBtn("encode")} onClick={() => switchMode("encode")}>Encode</button>
          <button style={modeBtn("decode")} onClick={() => switchMode("decode")}>Decode</button>
        </div>

        {/* Input tabs */}
        {mode === "encode" && (
          <div style={{ display: "flex", marginBottom: 16 }}>
            <button style={tabBtn("text")} onClick={() => setInputType("text")}>Text</button>
            <button style={tabBtn("file")} onClick={() => setInputType("file")}>File</button>
          </div>
        )}

        {/* Input panel */}
        <div style={STYLE.panel}>
          <div style={STYLE.panelHeader}>
            <span style={STYLE.panelLabel}>Input</span>
            <span style={STYLE.panelMeta}>
              {inputType === "text" ? (inputText.length ? inputText.length + " chars" : "") : (fileData ? fmtSize(fileSize) : "")}
            </span>
          </div>

          {inputType === "text" ? (
            <textarea
              style={STYLE.textarea}
              value={inputText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
              placeholder={mode === "decode" ? "Paste Base64 string here\u2026" : "Type or paste text here\u2026"}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); execute(); } }}
            />
          ) : (
            <>
              {!fileData ? (
                <div
                  onClick={() => openFilePicker()}
                  onDragOver={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                  style={{
                    padding: "40px 24px", textAlign: "center", cursor: "pointer",
                    transition: "all 0.3s",
                    background: dragging ? "rgba(108,180,238,0.04)" : "transparent",
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 12, filter: dragging ? "none" : "grayscale(1)", transition: "filter 0.3s" }}>📎</div>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: dragging ? "#6cb4ee" : "#e8e6e1" }}>Drop a file here</p>
                  <p style={{ fontSize: 12, color: "#4a4a52" }}>or click to browse — any file type</p>
                </div>
              ) : (
                <div style={{ display: "flex", padding: 16, gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 28 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, wordBreak: "break-all" }}>{fileName}</div>
                    <div style={{ ...STYLE.mono, fontSize: 11, color: "#5a5a62" }}>{fmtSize(fileSize)} · {fileMime}</div>
                  </div>
                  <button onClick={clearFile} style={{
                    padding: "6px 12px", border: "1px solid #2a2a30", borderRadius: 8,
                    background: "transparent", color: "#6a6a72", fontSize: 12,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>Remove</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "12px 16px", marginBottom: 16,
            background: "rgba(224,96,80,0.08)", border: "1px solid rgba(224,96,80,0.2)",
            borderRadius: 10, color: "#e06050", fontSize: 13,
          }}>{error}</div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={execute} style={{
            flex: 1, padding: 14, border: "none", borderRadius: 12,
            background: "linear-gradient(135deg, #6cb4ee, #4a90d9)",
            color: "#0a0a0b", fontSize: 14, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.02em",
          }}>
            {mode === "encode" ? "Encode" : "Decode"}
          </button>
          <button onClick={swapFields} style={{
            padding: "14px 20px", border: "1.5px solid #2a2a30", borderRadius: 12,
            background: "transparent", color: "#8a8a92", fontSize: 13,
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>↕ Swap</button>
          <button onClick={clearAll} style={{
            padding: "14px 20px", border: "1.5px solid #2a2a30", borderRadius: 12,
            background: "transparent", color: "#8a8a92", fontSize: 13,
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Clear</button>
        </div>

        {/* Output */}
        <div style={STYLE.panel}>
          <div style={STYLE.panelHeader}>
            <span style={STYLE.panelLabel}>Output</span>
            <span style={STYLE.panelMeta}>{outputMeta}</span>
          </div>
          <textarea style={STYLE.textarea} value={outputText} readOnly placeholder="Result will appear here\u2026" />
          {hasOutput && (
            <div style={{ display: "flex", gap: 8, padding: "0 16px 14px", flexWrap: "wrap" }}>
              <button style={smBtn(copied === "output")} onClick={copyOutput}>
                {copied === "output" ? "Copied!" : "Copy"}
              </button>
              <button style={smBtn(false)} onClick={downloadOutput}>Download</button>
              {showDataUri && (
                <button style={smBtn(copied === "datauri")} onClick={copyAsDataUri}>
                  {copied === "datauri" ? "Copied!" : "Copy as Data URI"}
                </button>
              )}
            </div>
          )}
          {imgPreview && (
            <div style={{
              padding: 16, textAlign: "center", borderTop: "1px solid #1e1e24",
              background: "repeating-conic-gradient(#1a1a1e 0% 25%, #14141a 0% 50%) 0 0 / 16px 16px",
            }}>
              <img src={imgPreview} alt="Preview" style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 6 }} />
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div style={{
            display: "flex", gap: 20, padding: "14px 16px",
            background: "#0e0e12", borderRadius: 10, marginTop: 8,
            ...STYLE.mono, fontSize: 11, flexWrap: "wrap", justifyContent: "center",
          }}>
            {[
              { label: "Input", val: fmtSize(stats.inSize) },
              { label: "Output", val: fmtSize(stats.outSize) },
              { label: "Ratio", val: stats.inSize > 0 ? (stats.outSize / stats.inSize).toFixed(2) + "\u00d7" : "\u2014" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ color: "#4a4a52", marginBottom: 2 }}>{s.label}</div>
                <div style={{ color: "#6cb4ee", fontWeight: 700 }}>{s.val}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
