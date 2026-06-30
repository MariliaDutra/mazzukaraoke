import React from 'react';
import MuralCanvas from './MuralCanvas.jsx';
import EditorTab from './EditorTab.jsx';
import { loadSlides, saveSlides } from './slidesStore.js';

const COR = { creme: "#f7f3e7", ouro: "#d7c48f" };
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SCRIPT = "'Parisienne', cursive";
function rgba(h, a) { h = h.replace("#", ""); const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

export default function App() {
  const [aba, setAba] = React.useState("preview");
  const [slides, setSlides] = React.useState(loadSlides);
  const [mediaMap, setMediaMap] = React.useState({});

  React.useEffect(() => { saveSlides(slides); }, [slides]);

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#0c0e0a", fontFamily: SERIF }}>
      <div style={{ display: "flex", alignItems: "center", padding: "0 24px", background: "rgba(16,19,13,0.98)", borderBottom: `1px solid ${rgba(COR.ouro, 0.2)}`, flexShrink: 0, height: 52 }}>
        <span style={{ fontFamily: SCRIPT, color: COR.ouro, fontSize: 26, marginRight: 28 }}>D &amp; M · 26.07.2026</span>
        <Tab label="Prévia" active={aba === "preview"} onClick={() => setAba("preview")} />
        <Tab label="Editor" active={aba === "editor"} onClick={() => setAba("editor")} />
      </div>

      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, display: aba === "preview" ? "flex" : "none", flexDirection: "column" }}>
          <MuralCanvas
            slides={slides}
            mediaMap={mediaMap}
            setMediaMap={setMediaMap}
            onRequestEditor={() => setAba("editor")}
          />
        </div>
        <div style={{ position: "absolute", inset: 0, display: aba === "editor" ? "flex" : "none", flexDirection: "column" }}>
          <EditorTab
            slides={slides}
            setSlides={setSlides}
            mediaMap={mediaMap}
            setMediaMap={setMediaMap}
          />
        </div>
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "none", color: active ? COR.ouro : rgba(COR.creme, 0.5),
      borderBottom: active ? `2px solid ${COR.ouro}` : "2px solid transparent",
      padding: "0 20px", height: "100%", cursor: "pointer", fontSize: 16, fontFamily: SERIF,
      transition: "color 120ms",
    }}>{label}</button>
  );
}
