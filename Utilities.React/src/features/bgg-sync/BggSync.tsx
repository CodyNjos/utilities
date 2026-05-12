import { useState, useCallback } from "react";

interface BoardGame {
  objectId: string;
  name: string;
  yearPublished: string;
  image: string;
  thumbnail: string;
  owned: boolean;
  wishlist: boolean;
  numPlays: number;
  players: string;
  playTime: string;
  onLoan: boolean;
  loanNote?: string;
}

interface DiffEntry {
  type: "added" | "updated" | "removed";
  name: string;
  details: string;
}

const ACCENT = "#e2a83e";

const S: Record<string, React.CSSProperties> = {
  body: {
    background: "#0a0a0b",
    color: "#e8e6e1",
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    padding: "32px 24px",
    boxSizing: "border-box",
    minHeight: "100vh",
  },
  mono: { fontFamily: "'Space Mono', monospace" },
  wrap: { maxWidth: 800, margin: "0 auto" },
  badge: {
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
  },
  h1: {
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    background: "linear-gradient(to right, #e8e6e1, #a0a098)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: 0,
  },
  subtitle: { color: "#6a6a72", fontSize: 14, marginTop: 8 },
  panel: {
    background: "#111114",
    border: "1px solid #1e1e24",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 16,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #1e1e24",
  },
  panelLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#5a5a62",
  },
  panelMeta: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    color: "#4a4a52",
  },
  textarea: {
    width: "100%",
    minHeight: 140,
    padding: 16,
    border: "none",
    background: "transparent",
    color: "#e8e6e1",
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    lineHeight: 1.6,
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  btn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  row: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
    marginBottom: 16,
  },
};

function parseXml(xml: string): BoardGame[] {
  const items: BoardGame[] = [];
  const itemRegex =
    /<item[^>]*objectid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const [, objectId, body] = match;
    const get = (tag: string) =>
      body.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] || "";
    const getAttr = (tag: string, attr: string) =>
      body.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`))?.[1] || "";

    const own = getAttr("status", "own") === "1";
    const wishlist = getAttr("status", "wishlist") === "1";
    const comment = get("comment");

    const playersMatch = comment.match(/^([\d–\-]+)\s*Players?/i);
    const timeMatch = comment.match(/Play Time\s*([\d–\-]+)\s*Min/i);
    const players = playersMatch
      ? playersMatch[1].replace(/–/g, "-")
      : "";
    const playTime = timeMatch ? timeMatch[1].replace(/–/g, "-") : "";

    items.push({
      objectId,
      name: get("name"),
      yearPublished: get("yearpublished"),
      image: get("image"),
      thumbnail: get("thumbnail"),
      owned: own,
      wishlist,
      numPlays: parseInt(get("numplays")) || 0,
      players,
      playTime,
      onLoan: false,
    });
  }
  return items;
}

function runSync(
  bggItems: BoardGame[],
  collection: BoardGame[]
): { result: BoardGame[]; diff: DiffEntry[] } {
  const existing = new Map(collection.map((g) => [g.objectId, g]));
  const diff: DiffEntry[] = [];
  const result: BoardGame[] = [];

  for (const bgg of bggItems) {
    const cur = existing.get(bgg.objectId);

    if (!cur) {
      diff.push({
        type: "added",
        name: bgg.name,
        details: bgg.owned ? "owned" : "wishlist",
      });
      result.push({ ...bgg, onLoan: false });
    } else {
      const merged = { ...cur };
      const changes: string[] = [];

      if (cur.owned !== bgg.owned || cur.wishlist !== bgg.wishlist) {
        const from = cur.owned
          ? "owned"
          : cur.wishlist
          ? "wishlist"
          : "neither";
        const to = bgg.owned
          ? "owned"
          : bgg.wishlist
          ? "wishlist"
          : "neither";
        changes.push(`status: ${from} → ${to}`);
        merged.owned = bgg.owned;
        merged.wishlist = bgg.wishlist;
        if (bgg.owned && !cur.owned) {
          if (!cur.players && bgg.players) merged.players = bgg.players;
          if (!cur.playTime && bgg.playTime) merged.playTime = bgg.playTime;
        }
      }

      if (cur.numPlays !== bgg.numPlays) {
        changes.push(`plays: ${cur.numPlays} → ${bgg.numPlays}`);
        merged.numPlays = bgg.numPlays;
      }

      if (!cur.players && bgg.players) merged.players = bgg.players;
      if (!cur.playTime && bgg.playTime) merged.playTime = bgg.playTime;

      if (changes.length > 0) {
        diff.push({
          type: "updated",
          name: bgg.name,
          details: changes.join(", "),
        });
      }

      result.push(merged);
      existing.delete(bgg.objectId);
    }
  }

  for (const g of existing.values()) {
    diff.push({
      type: "removed",
      name: g.name,
      details: "in JSON but not in BGG (kept)",
    });
    result.push(g);
  }

  return { result, diff };
}

export default function BggSync() {
  const [xmlText, setXmlText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [diff, setDiff] = useState<DiffEntry[] | null>(null);
  const [output, setOutput] = useState<BoardGame[] | null>(null);
  const [bggCount, setBggCount] = useState(0);
  const [jsonCount, setJsonCount] = useState(0);

  const handleFile = useCallback(
    (setter: (v: string) => void) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setter(reader.result as string);
        reader.readAsText(file);
      },
    []
  );

  const handleSync = () => {
    if (!xmlText.trim() || !jsonText.trim()) return;

    const bggItems = parseXml(xmlText);
    let collection: BoardGame[];
    try {
      collection = JSON.parse(jsonText);
    } catch {
      alert("Invalid JSON in collection input.");
      return;
    }

    setBggCount(bggItems.length);
    setJsonCount(collection.length);

    const { result, diff: d } = runSync(bggItems, collection);
    setDiff(d);
    setOutput(result);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([JSON.stringify(output, null, 2) + "\n"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "collection.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(JSON.stringify(output, null, 2) + "\n");
  };

  const colors = { added: "#3fb950", updated: "#d29922", removed: "#f85149" };
  const icons = { added: "+", updated: "~", removed: "-" };

  return (
    <div style={S.body}>
      <div style={S.wrap}>
        <div style={S.badge}>BGG Sync</div>
        <h1 style={S.h1}>Board Game Collection Sync</h1>
        <p style={S.subtitle}>
          Paste BGG XML and your collection.json to diff and merge.
        </p>

        <div style={{ marginTop: 32 }}>
          {/* XML Input */}
          <div style={S.panel}>
            <div style={S.panelHeader}>
              <span style={S.panelLabel}>BGG XML</span>
              <label
                style={{
                  ...S.panelMeta,
                  cursor: "pointer",
                  color: ACCENT,
                }}
              >
                Upload file
                <input
                  type="file"
                  accept=".xml,.txt"
                  style={{ display: "none" }}
                  onChange={handleFile(setXmlText)}
                />
              </label>
            </div>
            <textarea
              style={S.textarea}
              placeholder="Paste BGG collection XML here..."
              value={xmlText}
              onChange={(e) => setXmlText(e.target.value)}
            />
          </div>

          {/* JSON Input */}
          <div style={S.panel}>
            <div style={S.panelHeader}>
              <span style={S.panelLabel}>collection.json</span>
              <label
                style={{
                  ...S.panelMeta,
                  cursor: "pointer",
                  color: ACCENT,
                }}
              >
                Upload file
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={handleFile(setJsonText)}
                />
              </label>
            </div>
            <textarea
              style={S.textarea}
              placeholder="Paste collection.json contents here..."
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </div>

          {/* Sync Button */}
          <button
            style={{
              ...S.btn,
              background: ACCENT,
              color: "#0a0a0b",
              fontWeight: 600,
              width: "100%",
              padding: "14px 20px",
              fontSize: 14,
              opacity: xmlText.trim() && jsonText.trim() ? 1 : 0.4,
            }}
            disabled={!xmlText.trim() || !jsonText.trim()}
            onClick={handleSync}
          >
            Sync
          </button>
        </div>

        {/* Results */}
        {diff !== null && (
          <div style={{ marginTop: 32 }}>
            <div style={S.panel}>
              <div style={S.panelHeader}>
                <span style={S.panelLabel}>Results</span>
                <span style={S.panelMeta}>
                  BGG: {bggCount} | JSON: {jsonCount} | Output:{" "}
                  {output?.length}
                </span>
              </div>

              {diff.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "#3fb950",
                    ...S.mono,
                    fontSize: 14,
                  }}
                >
                  Everything in sync!
                </div>
              ) : (
                <div style={{ padding: "8px 0" }}>
                  {diff.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 10,
                        padding: "8px 16px",
                        borderBottom:
                          i < diff.length - 1
                            ? "1px solid #1a1a1e"
                            : "none",
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          ...S.mono,
                          color: colors[d.type],
                          fontWeight: 700,
                          fontSize: 14,
                          width: 14,
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {icons[d.type]}
                      </span>
                      <span style={{ fontWeight: 500 }}>{d.name}</span>
                      <span style={{ ...S.mono, color: "#5a5a62", fontSize: 11 }}>
                        {d.details}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Download / Copy */}
            {output && output.length > 0 && (
              <div style={S.row}>
                <button
                  style={{
                    ...S.btn,
                    background: "#1e1e24",
                    color: "#e8e6e1",
                    flex: 1,
                  }}
                  onClick={handleDownload}
                >
                  Download collection.json
                </button>
                <button
                  style={{
                    ...S.btn,
                    background: "#1e1e24",
                    color: "#e8e6e1",
                    flex: 1,
                  }}
                  onClick={handleCopy}
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
