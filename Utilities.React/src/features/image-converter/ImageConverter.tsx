import { useState, useRef, useCallback } from "react";

interface Format {
  id: string;
  label: string;
  mime: string;
  desc: string;
}

interface Dimensions {
  w: number;
  h: number;
}

const FORMATS: Format[] = [
  { id: "png", label: "PNG", mime: "image/png", desc: "Lossless, transparency" },
  { id: "jpeg", label: "JPEG", mime: "image/jpeg", desc: "Compressed, photos" },
  { id: "webp", label: "WebP", mime: "image/webp", desc: "Modern, small size" },
  { id: "bmp", label: "BMP", mime: "image/bmp", desc: "Uncompressed, legacy" },
  { id: "ico", label: "ICO", mime: "image/x-icon", desc: "Favicon, 256×256 max" },
];

const QUALITY_FORMATS = ["jpeg", "webp"];

export default function ImageConverter() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [sourceFormat, setSourceFormat] = useState("");
  const [targetFormat, setTargetFormat] = useState("png");
  const [quality, setQuality] = useState(92);
  const [dragging, setDragging] = useState(false);
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState<string | null>(null);
  const [convertedSize, setConvertedSize] = useState<number | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const reset = () => {
    setImage(null);
    setFileName("");
    setSourceFormat("");
    setConverted(null);
    setConvertedSize(null);
    setOriginalSize(null);
    setDimensions(null);
  };

  const handleFile = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setConverted(null);
    setConvertedSize(null);
    setOriginalSize(file.size);
    setFileName(file.name);
    const ext = file.name.split(".").pop()!.toLowerCase();
    setSourceFormat(ext === "jpg" ? "jpeg" : ext);

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const img = new Image();
      img.onload = () => {
        setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
        setImage(e.target!.result as string);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const convert = useCallback(() => {
    if (!image) return;
    setConverting(true);
    setConverted(null);

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement("canvas");
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (targetFormat === "ico" && (w > 256 || h > 256)) {
        const scale = Math.min(256 / w, 256 / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (targetFormat === "jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
      }

      ctx.drawImage(img, 0, 0, w, h);

      const fmt = FORMATS.find((f) => f.id === targetFormat);
      const q = QUALITY_FORMATS.includes(targetFormat) ? quality / 100 : undefined;
      const dataUrl = canvas.toDataURL(fmt!.mime, q);

      const byteString = atob(dataUrl.split(",")[1]);
      setConvertedSize(byteString.length);
      setConverted(dataUrl);
      setConverting(false);
    };
    img.src = image;
  }, [image, targetFormat, quality]);

  const download = () => {
    if (!converted) return;
    const a = document.createElement("a");
    a.href = converted;
    const base = fileName.replace(/\.[^.]+$/, "");
    a.download = `${base}.${targetFormat}`;
    a.click();
  };

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return "\u2014";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  const sizeChange = originalSize && convertedSize
    ? (((convertedSize - originalSize) / originalSize) * 100).toFixed(1)
    : null;

  return (
    <div style={{
      background: "#0a0a0b",
      color: "#e8e6e1",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      padding: "32px 24px",
      boxSizing: "border-box",
    }}>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "linear-gradient(135deg, #1a1a1e 0%, #222228 100%)",
            border: "1px solid #2a2a30",
            borderRadius: 12,
            padding: "8px 16px",
            marginBottom: 16,
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "#7a7a82",
            textTransform: "uppercase",
          }}>
            <span style={{ color: "#f0c040", fontSize: 14 }}>&#9670;</span>
            Image Converter
          </div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.02em",
            background: "linear-gradient(to right, #e8e6e1, #a0a098)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Drop. Pick. Convert.
          </h1>
          <p style={{ color: "#6a6a72", fontSize: 14, marginTop: 8 }}>
            PNG &middot; JPEG &middot; WebP &middot; BMP &middot; ICO
          </p>
        </div>

        {/* Drop zone or preview */}
        {!image ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "#f0c040" : "#2a2a30"}`,
              borderRadius: 16,
              padding: "64px 32px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              background: dragging
                ? "rgba(240,192,64,0.04)"
                : "rgba(255,255,255,0.015)",
            }}
          >
            <div style={{
              fontSize: 48,
              marginBottom: 16,
              filter: dragging ? "none" : "grayscale(1)",
              transition: "filter 0.3s",
            }}>
              &#128444;
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px", color: dragging ? "#f0c040" : "#e8e6e1" }}>
              {dragging ? "Release to upload" : "Drop an image here"}
            </p>
            <p style={{ fontSize: 13, color: "#5a5a62", margin: 0 }}>
              or click to browse &middot; PNG, JPEG, WebP, GIF, BMP, SVG, etc.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div style={{
            background: "#111114",
            border: "1px solid #1e1e24",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            {/* Image preview */}
            <div style={{
              position: "relative",
              background: `repeating-conic-gradient(#1a1a1e 0% 25%, #14141a 0% 50%) 0 0 / 20px 20px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              minHeight: 200,
              maxHeight: 320,
            }}>
              <img
                src={image}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: 280,
                  borderRadius: 6,
                  objectFit: "contain",
                }}
              />
              <button
                onClick={reset}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid #333",
                  borderRadius: 8,
                  color: "#aaa",
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Remove"
              >
                &#10005;
              </button>
            </div>

            {/* File info bar */}
            <div style={{
              display: "flex",
              gap: 16,
              padding: "12px 20px",
              borderTop: "1px solid #1e1e24",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              color: "#6a6a72",
              flexWrap: "wrap",
            }}>
              <span title={fileName} style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fileName}
              </span>
              <span>{sourceFormat.toUpperCase()}</span>
              {dimensions && <span>{dimensions.w}&times;{dimensions.h}</span>}
              <span>{fmtSize(originalSize)}</span>
            </div>
          </div>
        )}

        {/* Controls */}
        {image && (
          <div style={{ marginTop: 24 }}>
            {/* Format selector */}
            <label style={{
              display: "block",
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#5a5a62",
              marginBottom: 10,
            }}>
              Convert to
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {FORMATS.map((f) => {
                const active = targetFormat === f.id;
                const isSame = f.id === sourceFormat;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setTargetFormat(f.id); setConverted(null); setConvertedSize(null); }}
                    style={{
                      flex: "1 1 0",
                      minWidth: 90,
                      padding: "12px 8px",
                      border: active ? "1.5px solid #f0c040" : "1px solid #222228",
                      borderRadius: 10,
                      background: active ? "rgba(240,192,64,0.08)" : "#14141a",
                      color: active ? "#f0c040" : isSame ? "#4a4a52" : "#c0c0b8",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 10, color: active ? "#c0a040" : "#5a5a62", fontFamily: "'Space Mono', monospace" }}>
                      {f.desc}
                    </div>
                    {isSame && (
                      <div style={{ fontSize: 9, color: "#f0c040", marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
                        (same)
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quality slider */}
            {QUALITY_FORMATS.includes(targetFormat) && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}>
                  <label style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#5a5a62",
                  }}>
                    Quality
                  </label>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    color: "#f0c040",
                    fontWeight: 700,
                  }}>
                    {quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setQuality(Number(e.target.value)); setConverted(null); setConvertedSize(null); }}
                  style={{
                    width: "100%",
                    accentColor: "#f0c040",
                    height: 6,
                  }}
                />
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  color: "#4a4a52",
                  marginTop: 4,
                }}>
                  <span>Smaller file</span>
                  <span>Higher quality</span>
                </div>
              </div>
            )}

            {/* Convert button */}
            <button
              onClick={convert}
              disabled={converting}
              style={{
                width: "100%",
                padding: "16px",
                border: "none",
                borderRadius: 12,
                background: converting
                  ? "#2a2a30"
                  : "linear-gradient(135deg, #f0c040 0%, #e0a020 100%)",
                color: converting ? "#6a6a72" : "#0a0a0b",
                fontSize: 15,
                fontWeight: 700,
                cursor: converting ? "not-allowed" : "pointer",
                transition: "all 0.3s",
                letterSpacing: "0.02em",
              }}
            >
              {converting ? "Converting\u2026" : `Convert to ${targetFormat.toUpperCase()}`}
            </button>

            {/* Result */}
            {converted && (
              <div style={{
                marginTop: 20,
                background: "#111114",
                border: "1px solid #1e1e24",
                borderRadius: 14,
                padding: 20,
                animation: "fadeIn 0.4s ease",
              }}>
                <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}>
                  <div>
                    <span style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#5a5a62",
                    }}>
                      Output
                    </span>
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 14,
                      color: "#e8e6e1",
                      marginTop: 4,
                    }}>
                      {fmtSize(convertedSize)}
                      {sizeChange && (
                        <span style={{
                          marginLeft: 10,
                          fontSize: 12,
                          color: Number(sizeChange) < 0 ? "#50c878" : "#e06050",
                          fontWeight: 600,
                        }}>
                          {Number(sizeChange) > 0 ? "+" : ""}{sizeChange}%
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={download}
                    style={{
                      padding: "10px 24px",
                      border: "1.5px solid #f0c040",
                      borderRadius: 10,
                      background: "transparent",
                      color: "#f0c040",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      letterSpacing: "0.02em",
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(240,192,64,0.12)"; }}
                    onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    &darr; Download
                  </button>
                </div>

                {/* Comparison strip */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "#0e0e12",
                  borderRadius: 10,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#5a5a62", marginBottom: 2 }}>{sourceFormat.toUpperCase()}</div>
                    <div style={{ color: "#aaa" }}>{fmtSize(originalSize)}</div>
                  </div>
                  <div style={{ color: "#f0c040", fontSize: 18, fontWeight: 700 }}>&rarr;</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "#5a5a62", marginBottom: 2 }}>{targetFormat.toUpperCase()}</div>
                    <div style={{ color: "#e8e6e1", fontWeight: 600 }}>{fmtSize(convertedSize)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
