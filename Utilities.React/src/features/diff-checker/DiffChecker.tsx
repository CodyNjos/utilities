import React, { useState, useMemo } from "react";

interface DiffItem {
  type: "same" | "add" | "remove";
  oldLine?: number;
  newLine?: number;
  text: string;
}

interface CharDiffResult {
  commonOld: Set<number>;
  commonNew: Set<number>;
}

interface SplitLine {
  type: "same" | "add" | "remove" | "empty";
  oldLine?: number;
  newLine?: number;
  text?: string;
  side?: string;
  idx?: number;
}

function computeDiff(oldText: string, newText: string): DiffItem[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const m = oldLines.length;
  const n = newLines.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffItem[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: "same", oldLine: i, newLine: j, text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "add", newLine: j, text: newLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: "remove", oldLine: i, text: oldLines[i - 1] });
      i--;
    }
  }
  return result;
}

function highlightCharDiff(oldText: string, newText: string): CharDiffResult | null {
  const oldChars = [...oldText];
  const newChars = [...newText];
  const m = oldChars.length;
  const n = newChars.length;

  if (m * n > 50000) return null;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldChars[i - 1] === newChars[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const commonOld = new Set<number>();
  const commonNew = new Set<number>();
  let ci = m, cj = n;
  while (ci > 0 && cj > 0) {
    if (oldChars[ci - 1] === newChars[cj - 1]) {
      commonOld.add(ci - 1);
      commonNew.add(cj - 1);
      ci--; cj--;
    } else if (dp[ci][cj - 1] >= dp[ci - 1][cj]) {
      cj--;
    } else {
      ci--;
    }
  }

  return { commonOld, commonNew };
}

const SAMPLE_OLD = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}

greet("World");`;

const SAMPLE_NEW = `function greet(name, greeting = "Hello") {
  const message = \`\${greeting}, \${name}!\`;
  console.log(message);
  return message;
}

greet("World", "Hey");`;

export default function DiffChecker() {
  const [oldText, setOldText] = useState(SAMPLE_OLD);
  const [newText, setNewText] = useState(SAMPLE_NEW);
  const [viewMode, setViewMode] = useState<"split" | "unified">("split");

  const diff = useMemo(() => computeDiff(oldText, newText), [oldText, newText]);

  const stats = useMemo(() => {
    let added = 0, removed = 0, unchanged = 0;
    diff.forEach(d => {
      if (d.type === "add") added++;
      else if (d.type === "remove") removed++;
      else unchanged++;
    });
    return { added, removed, unchanged };
  }, [diff]);

  const inlineCharDiffs = useMemo(() => {
    const map = new Map<number, Set<number>>();
    let i = 0;
    while (i < diff.length) {
      if (diff[i].type === "remove") {
        let removes: number[] = [];
        let j = i;
        while (j < diff.length && diff[j].type === "remove") { removes.push(j); j++; }
        let adds: number[] = [];
        while (j < diff.length && diff[j].type === "add") { adds.push(j); j++; }
        for (let k = 0; k < Math.min(removes.length, adds.length); k++) {
          const cd = highlightCharDiff(diff[removes[k]].text, diff[adds[k]].text);
          if (cd) {
            map.set(removes[k], cd.commonOld);
            map.set(adds[k], cd.commonNew);
          }
        }
        i = j;
      } else {
        i++;
      }
    }
    return map;
  }, [diff]);

  const renderCharHighlighted = (text: string, commonSet: Set<number>, type: string) => {
    if (!commonSet) return <span>{text || " "}</span>;
    const chars = [...text];
    const spans: React.ReactElement[] = [];
    let buf = "";
    let bufHighlight = false;

    for (let i = 0; i <= chars.length; i++) {
      const isCommon = commonSet.has(i);
      const ch = chars[i] || "";
      if (i === chars.length || isCommon !== !bufHighlight) {
        if (buf) {
          spans.push(
            <span
              key={i}
              style={
                bufHighlight
                  ? {
                      background: type === "remove" ? "rgba(248,81,73,0.35)" : "rgba(63,185,80,0.35)",
                      borderRadius: "2px",
                    }
                  : {}
              }
            >
              {buf}
            </span>
          );
        }
        buf = ch;
        bufHighlight = !isCommon;
      } else {
        buf += ch;
      }
    }
    return <>{spans}</>;
  };

  const renderSplitView = () => {
    const leftLines: SplitLine[] = [];
    const rightLines: SplitLine[] = [];
    let di = 0;

    while (di < diff.length) {
      const d = diff[di];
      if (d.type === "same") {
        leftLines.push({ ...d, side: "left" });
        rightLines.push({ ...d, side: "right" });
        di++;
      } else if (d.type === "remove") {
        let removes: DiffItem[] = [];
        let j = di;
        while (j < diff.length && diff[j].type === "remove") { removes.push(diff[j]); j++; }
        let adds: DiffItem[] = [];
        while (j < diff.length && diff[j].type === "add") { adds.push(diff[j]); j++; }

        const maxLen = Math.max(removes.length, adds.length);
        for (let k = 0; k < maxLen; k++) {
          leftLines.push(k < removes.length ? { ...removes[k], idx: di + k } : { type: "empty" });
          rightLines.push(k < removes.length + adds.length - maxLen + (k >= removes.length ? k - removes.length : 0)
            ? (() => {
              const addIdx = k < removes.length ? k : k - removes.length;
              return addIdx < adds.length ? { ...adds[addIdx], idx: di + removes.length + addIdx } : { type: "empty" };
            })()
            : { type: "empty" });
        }
        leftLines.splice(leftLines.length - maxLen, maxLen);
        rightLines.splice(rightLines.length - maxLen, maxLen);

        for (let k = 0; k < Math.max(removes.length, adds.length); k++) {
          leftLines.push(k < removes.length ? { ...removes[k], idx: di + k } : { type: "empty" });
          rightLines.push(k < adds.length ? { ...adds[k], idx: di + removes.length + k } : { type: "empty" });
        }
        di = j;
      } else {
        rightLines.push({ ...d, idx: di });
        leftLines.push({ type: "empty" });
        di++;
      }
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px" }}>
        <div style={{ overflow: "auto" }}>
          {leftLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                minHeight: "26px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "13px",
                lineHeight: "26px",
                background:
                  line.type === "remove" ? "rgba(248,81,73,0.12)"
                  : line.type === "empty" ? "rgba(130,130,140,0.06)"
                  : "transparent",
                borderLeft: line.type === "remove" ? "3px solid #f85149" : "3px solid transparent",
              }}
            >
              <span style={{
                width: "48px", minWidth: "48px", textAlign: "right", paddingRight: "12px",
                color: "rgba(130,130,140,0.5)", userSelect: "none", fontSize: "12px"
              }}>
                {line.oldLine || ""}
              </span>
              <span style={{ flex: 1, paddingRight: "8px", whiteSpace: "pre" }}>
                {line.type === "empty" ? "" :
                  line.type === "remove" && line.idx !== undefined && inlineCharDiffs.has(line.idx)
                    ? renderCharHighlighted(line.text!, inlineCharDiffs.get(line.idx)!, "remove")
                    : (line.text || " ")}
              </span>
            </div>
          ))}
        </div>
        <div style={{ overflow: "auto", borderLeft: "1px solid rgba(130,130,140,0.15)" }}>
          {rightLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                minHeight: "26px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "13px",
                lineHeight: "26px",
                background:
                  line.type === "add" ? "rgba(63,185,80,0.12)"
                  : line.type === "empty" ? "rgba(130,130,140,0.06)"
                  : "transparent",
                borderLeft: line.type === "add" ? "3px solid #3fb950" : "3px solid transparent",
              }}
            >
              <span style={{
                width: "48px", minWidth: "48px", textAlign: "right", paddingRight: "12px",
                color: "rgba(130,130,140,0.5)", userSelect: "none", fontSize: "12px"
              }}>
                {line.newLine || ""}
              </span>
              <span style={{ flex: 1, paddingRight: "8px", whiteSpace: "pre" }}>
                {line.type === "empty" ? "" :
                  line.type === "add" && line.idx !== undefined && inlineCharDiffs.has(line.idx)
                    ? renderCharHighlighted(line.text!, inlineCharDiffs.get(line.idx)!, "add")
                    : (line.text || " ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUnifiedView = () => (
    <div>
      {diff.map((d, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            minHeight: "26px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            lineHeight: "26px",
            background:
              d.type === "add" ? "rgba(63,185,80,0.12)"
              : d.type === "remove" ? "rgba(248,81,73,0.12)"
              : "transparent",
            borderLeft:
              d.type === "add" ? "3px solid #3fb950"
              : d.type === "remove" ? "3px solid #f85149"
              : "3px solid transparent",
          }}
        >
          <span style={{
            width: "44px", minWidth: "44px", textAlign: "right", paddingRight: "6px",
            color: "rgba(130,130,140,0.4)", userSelect: "none", fontSize: "12px",
          }}>
            {d.oldLine || ""}
          </span>
          <span style={{
            width: "44px", minWidth: "44px", textAlign: "right", paddingRight: "12px",
            color: "rgba(130,130,140,0.4)", userSelect: "none", fontSize: "12px",
          }}>
            {d.newLine || ""}
          </span>
          <span style={{
            width: "18px", minWidth: "18px", textAlign: "center",
            color: d.type === "add" ? "#3fb950" : d.type === "remove" ? "#f85149" : "rgba(130,130,140,0.3)",
            fontWeight: 600, userSelect: "none",
          }}>
            {d.type === "add" ? "+" : d.type === "remove" ? "−" : " "}
          </span>
          <span style={{ flex: 1, paddingRight: "8px", whiteSpace: "pre" }}>
            {inlineCharDiffs.has(i)
              ? renderCharHighlighted(d.text, inlineCharDiffs.get(i)!, d.type)
              : (d.text || " ")}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      background: "#0e1117",
      color: "#c9d1d9",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px",
        borderBottom: "1px solid rgba(130,130,140,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "linear-gradient(135deg, #f85149, #3fb950)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", fontWeight: 700, color: "#fff",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            ±
          </div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Diff Checker
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          {/* Stats */}
          <div style={{ display: "flex", gap: "12px", fontSize: "13px", fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: "#3fb950" }}>+{stats.added}</span>
            <span style={{ color: "#f85149" }}>−{stats.removed}</span>
            <span style={{ color: "rgba(130,130,140,0.5)" }}>{stats.unchanged} unchanged</span>
          </div>

          {/* View toggle */}
          <div style={{
            display: "flex",
            background: "rgba(130,130,140,0.1)",
            borderRadius: "8px",
            padding: "3px",
          }}>
            {(["split", "unified"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "5px 14px",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer",
                  background: viewMode === mode ? "rgba(130,130,140,0.2)" : "transparent",
                  color: viewMode === mode ? "#fff" : "rgba(130,130,140,0.6)",
                  transition: "all 0.15s ease",
                  textTransform: "capitalize",
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Areas */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1px",
        background: "rgba(130,130,140,0.15)",
        borderBottom: "1px solid rgba(130,130,140,0.15)",
      }}>
        {[
          { label: "Original", value: oldText, setter: setOldText, color: "#f85149" },
          { label: "Modified", value: newText, setter: setNewText, color: "#3fb950" },
        ].map(({ label, value, setter, color }) => (
          <div key={label} style={{ background: "#0e1117" }}>
            <div style={{
              padding: "10px 16px",
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(130,130,140,0.6)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              borderBottom: `2px solid ${color}`,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: color, opacity: 0.7,
              }} />
              {label}
            </div>
            <textarea
              value={value}
              onChange={(e) => setter(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: "140px",
                padding: "12px 16px",
                border: "none",
                background: "rgba(130,130,140,0.04)",
                color: "#c9d1d9",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "13px",
                lineHeight: "1.6",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder={`Paste ${label.toLowerCase()} text here...`}
            />
          </div>
        ))}
      </div>

      {/* Diff Output */}
      <div style={{
        padding: "0",
        overflow: "auto",
      }}>
        {diff.length === 0 ? (
          <div style={{
            padding: "48px",
            textAlign: "center",
            color: "rgba(130,130,140,0.4)",
            fontSize: "14px",
          }}>
            Paste text above to see the diff
          </div>
        ) : oldText === newText ? (
          <div style={{
            padding: "48px",
            textAlign: "center",
            color: "rgba(63,185,80,0.6)",
            fontSize: "14px",
            fontWeight: 500,
          }}>
            ✓ Files are identical
          </div>
        ) : viewMode === "split" ? renderSplitView() : renderUnifiedView()}
      </div>
    </div>
  );
}
