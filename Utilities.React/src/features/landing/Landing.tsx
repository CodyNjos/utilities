import { Link } from "react-router-dom";

interface Tool {
  path: string;
  name: string;
  tagline: string;
  accent: string;
  icon: string;
}

const tools: Tool[] = [
  {
    path: "/base64",
    name: "Base64 Tool",
    tagline: "Encode & decode text and files",
    accent: "#6cb4ee",
    icon: "◆",
  },
  {
    path: "/image-converter",
    name: "Image Converter",
    tagline: "PNG, JPEG, WebP, BMP, ICO",
    accent: "#f0c040",
    icon: "🖼",
  },
  {
    path: "/diff-checker",
    name: "Diff Checker",
    tagline: "Compare text side-by-side",
    accent: "#3fb950",
    icon: "±",
  },
  {
    path: "/markdown",
    name: "Mark It Down, Cowboy",
    tagline: "Render markdown files in style",
    accent: "#58a6ff",
    icon: "🤠",
  },
];

export default function Landing() {
  return (
    <div
      style={{
        background: "#0a0a0b",
        color: "#e8e6e1",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        padding: "48px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "linear-gradient(135deg, #1a1a1e, #222228)",
            border: "1px solid #2a2a30",
            borderRadius: 12,
            padding: "8px 16px",
            marginBottom: 16,
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "#7a7a82",
            textTransform: "uppercase",
          }}
        >
          Utilities
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            background: "linear-gradient(to right, #e8e6e1, #a0a098)",
            WebkitBackgroundClip: "text",
            margin: 0,
          }}
        >
          👁️👄👁️
        </h1>
        <p style={{ color: "#6a6a72", fontSize: 14, marginTop: 8 }}>
          Browser-based utilities — no backen, no tracking.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          maxWidth: 720,
          width: "100%",
        }}
      >
        {tools.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            style={{
              textDecoration: "none",
              color: "inherit",
              background: "#111114",
              border: "1px solid #1e1e24",
              borderRadius: 14,
              padding: "24px 20px",
              transition: "all 0.25s",
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tool.accent;
              e.currentTarget.style.background = "#16161a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1e1e24";
              e.currentTarget.style.background = "#111114";
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: `${tool.accent}15`,
                border: `1px solid ${tool.accent}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
                color: tool.accent,
              }}
            >
              {tool.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                {tool.name}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6a6a72",
                  fontFamily: "'Space Mono', monospace",
                }}
              >
                {tool.tagline}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
