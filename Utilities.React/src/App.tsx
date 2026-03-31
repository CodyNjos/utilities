import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Landing from "./features/landing/Landing";
import Base64Tool from "./features/base64-tool/Base64Tool";
import ImageConverter from "./features/image-converter/ImageConverter";
import DiffChecker from "./features/diff-checker/DiffChecker";
import MarkdownViewer from "./features/markdown-viewer/MarkdownViewer";

function BackNav() {
  const location = useLocation();
  if (location.pathname === "/") return null;

  return (
    <div
      style={{
        padding: "12px 24px",
        borderBottom: "1px solid #1e1e24",
        background: "#0a0a0b",
      }}
    >
      <Link
        to="/"
        style={{
          color: "#6a6a72",
          textDecoration: "none",
          fontSize: 13,
          fontFamily: "'Space Mono', monospace",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#e8e6e1")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#6a6a72")}
      >
        ← Back to Tools
      </Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <BackNav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/base64" element={<Base64Tool />} />
        <Route path="/image-converter" element={<ImageConverter />} />
        <Route path="/diff-checker" element={<DiffChecker />} />
        <Route path="/markdown" element={<MarkdownViewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
