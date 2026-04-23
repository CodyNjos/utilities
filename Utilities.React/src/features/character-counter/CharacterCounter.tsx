import { useState, useMemo } from "react";

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
    width: "100%", minHeight: 200, padding: 16, border: "none",
    background: "transparent", color: "#e8e6e1",
    fontFamily: "'Space Mono', monospace", fontSize: 13,
    lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box",
  },
};

interface Stats {
  label: string;
  value: string | number;
  accent?: string;
}

export default function CharacterCounter() {
  const [text, setText] = useState("");

  const stats = useMemo((): Stats[] => {
    const characters = text.length;
    const charactersNoSpaces = text.replace(/ /g, "").length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const sentences = text.trim() === "" ? 0 : text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
    const paragraphs = text.trim() === "" ? 0 : text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
    const lines = text === "" ? 0 : text.split("\n").length;
    const bytes = new Blob([text]).size;

    return [
      { label: "Characters", value: characters, accent: "#c084fc" },
      { label: "No Spaces", value: charactersNoSpaces },
      { label: "Words", value: words, accent: "#6cb4ee" },
      { label: "Sentences", value: sentences },
      { label: "Paragraphs", value: paragraphs },
      { label: "Lines", value: lines },
      { label: "Bytes", value: bytes, accent: "#50c878" },
    ];
  }, [text]);

  return (
    <div style={STYLE.body}>
      <div style={STYLE.wrap}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={STYLE.badge}><span style={{ color: "#c084fc", fontSize: 14 }}>¶</span> Character Counter</div>
          <h1 style={STYLE.h1}>Count Everything.</h1>
          <p style={STYLE.subtitle}>Characters, words, sentences &amp; more</p>
        </div>

        {/* Stats grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
          gap: 8,
          marginBottom: 16,
        }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              background: "#111114",
              border: "1px solid #1e1e24",
              borderRadius: 10,
              padding: "14px 12px",
              textAlign: "center",
            }}>
              <div style={{
                ...STYLE.mono,
                fontSize: 22,
                fontWeight: 700,
                color: s.accent ?? "#e8e6e1",
                marginBottom: 4,
              }}>
                {s.value}
              </div>
              <div style={{
                ...STYLE.mono,
                fontSize: 9,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#5a5a62",
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Input panel */}
        <div style={STYLE.panel}>
          <div style={STYLE.panelHeader}>
            <span style={STYLE.panelLabel}>Input</span>
            <span style={STYLE.panelMeta}>
              {text.length > 0 ? `${text.length} chars` : ""}
            </span>
          </div>
          <textarea
            style={STYLE.textarea}
            value={text}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
            placeholder="Start typing or paste text here…"
          />
        </div>

        {/* Clear */}
        {text.length > 0 && (
          <button
            onClick={() => setText("")}
            style={{
              width: "100%",
              padding: 14,
              border: "1.5px solid #2a2a30",
              borderRadius: 12,
              background: "transparent",
              color: "#8a8a92",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
