import React from 'react';
import { slotsDe } from './MuralCanvas.jsx';
import { idbSet, idbDel, idbAll, blobToDataURL } from './slidesStore.js';

const COR = { creme: "#f7f3e7", ouro: "#d7c48f", sagia: "#aeb98a" };
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SCRIPT = "'Parisienne', cursive";

const TIPOS = [
  { value: "frase", label: "Só texto" },
  { value: "frase-lado", label: "Texto + foto" },
  { value: "frase-fundo", label: "Texto sobre foto" },
  { value: "foto", label: "Só foto" },
  { value: "colagem", label: "Colagem" },
  { value: "video", label: "Só vídeo" },
];

function tipoKey(slide) {
  if (slide.tipo === "frase" && slide.foto === "lado") return "frase-lado";
  if (slide.tipo === "frase" && slide.foto === "fundo") return "frase-fundo";
  return slide.tipo;
}

function keyToSlide(key, prev = {}) {
  if (key === "frase-lado") return { tipo: "frase", foto: "lado", texto: prev.texto || "", nome: prev.nome || "" };
  if (key === "frase-fundo") return { tipo: "frase", foto: "fundo", texto: prev.texto || "", nome: prev.nome || "" };
  if (key === "frase") return { tipo: "frase", texto: prev.texto || "", nome: prev.nome || "" };
  if (key === "foto") return { tipo: "foto", legenda: prev.legenda || "" };
  if (key === "colagem") return { tipo: "colagem", fotos: prev.fotos || 3, titulo: prev.titulo || "" };
  if (key === "video") return { tipo: "video", legenda: prev.legenda || "" };
  return { tipo: key };
}

function rgba(h, a) { h = h.replace("#", ""); const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

export default function EditorTab({ slides, setSlides, mediaMap, setMediaMap }) {
  const [expandido, setExpandido] = React.useState(null);
  const [drag, setDrag] = React.useState(null); // index being dragged
  const [dragOver, setDragOver] = React.useState(null);

  // media que está salva no navegador mas nenhum slide atual referencia (ex: slides resetados)
  const usedIds = React.useMemo(() => {
    const s = new Set();
    slides.forEach((sl, i) => slotsDe(sl, i).forEach(sl2 => s.add(sl2.id)));
    return s;
  }, [slides]);
  const orphanIds = Object.keys(mediaMap).filter(id => !usedIds.has(id));

  async function moveOrphan(orphanId, targetId) {
    const { keys, vals } = await idbAll();
    const k = keys.indexOf(orphanId);
    if (k < 0) return;
    try { await idbSet(targetId, vals[k]); await idbDel(orphanId); } catch {}
    setMediaMap(p => { const n = { ...p }; n[targetId] = n[orphanId]; delete n[orphanId]; return n; });
  }

  function update(i, patch) {
    setSlides(prev => { const s = [...prev]; s[i] = { ...s[i], ...patch }; return s; });
  }

  function addSlide() {
    setSlides(prev => [...prev, { tipo: "frase", texto: "", nome: "" }]);
    setExpandido(slides.length);
  }

  function removeSlide(i) {
    setSlides(prev => prev.filter((_, k) => k !== i));
    setExpandido(null);
  }

  function moveUp(i) {
    if (i === 0) return;
    setSlides(prev => { const s = [...prev]; [s[i - 1], s[i]] = [s[i], s[i - 1]]; return s; });
  }

  function moveDown(i) {
    if (i === slides.length - 1) return;
    setSlides(prev => { const s = [...prev]; [s[i], s[i + 1]] = [s[i + 1], s[i]]; return s; });
  }

  // drag to reorder
  function onDragStart(i) { setDrag(i); }
  function onDragEnter(i) { setDragOver(i); }
  function onDragEnd() {
    if (drag !== null && dragOver !== null && drag !== dragOver) {
      setSlides(prev => {
        const s = [...prev];
        const [item] = s.splice(drag, 1);
        s.splice(dragOver, 0, item);
        return s;
      });
    }
    setDrag(null); setDragOver(null);
  }

  return (
    <div style={{ display: "flex", height: "100%", background: "#0e120b", color: COR.creme, fontFamily: SERIF, overflow: "hidden" }}>
      {/* slide list */}
      <div style={{ width: 420, flexShrink: 0, borderRight: `1px solid ${rgba(COR.ouro, 0.2)}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "22px 20px 14px", borderBottom: `1px solid ${rgba(COR.ouro, 0.15)}` }}>
          <div style={{ fontSize: 26, fontFamily: SCRIPT, color: COR.ouro, marginBottom: 4 }}>Slides</div>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.65, lineHeight: 1.4 }}>Arraste para reordenar. Clique para editar.</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 80px" }}>
          {slides.map((slide, i) => (
            <SlideCard
              key={i}
              slide={slide}
              i={i}
              total={slides.length}
              aberto={expandido === i}
              onToggle={() => setExpandido(expandido === i ? null : i)}
              onMoveUp={() => moveUp(i)}
              onMoveDown={() => moveDown(i)}
              onRemove={() => removeSlide(i)}
              onDragStart={() => onDragStart(i)}
              onDragEnter={() => onDragEnter(i)}
              onDragEnd={onDragEnd}
              dragOver={dragOver === i}
            />
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 20, left: 20 }}>
          <button onClick={addSlide} style={{ background: COR.ouro, color: "#2b2f1d", border: "none", padding: "10px 22px", borderRadius: 999, cursor: "pointer", fontSize: 16, fontWeight: 600, fontFamily: SERIF }}>+ Adicionar slide</button>
        </div>
      </div>

      {/* detail panel */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <OrphanGallery mediaMap={mediaMap} orphanIds={orphanIds} />
        {expandido !== null && expandido < slides.length ? (
          <>
            <button
              onClick={() => setExpandido(null)}
              style={{ background: "none", border: "none", color: rgba(COR.ouro, 0.75), cursor: "pointer", fontSize: 15, fontFamily: SERIF, marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6 }}
            >
              ← Voltar
            </button>
            <SlideDetail
              slide={slides[expandido]}
              idx={expandido}
              mediaMap={mediaMap}
              setMediaMap={setMediaMap}
              onAssignOrphan={moveOrphan}
              onChange={(patch) => update(expandido, patch)}
              onChangeTipo={(key) => {
                setSlides(prev => { const s = [...prev]; s[expandido] = keyToSlide(key, s[expandido]); return s; });
              }}
            />
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.4, fontSize: 22, fontFamily: SCRIPT, color: COR.ouro }}>
            Selecione um slide para editar
          </div>
        )}
      </div>
    </div>
  );
}

function SlideCard({ slide, i, total, aberto, onToggle, onMoveUp, onMoveDown, onRemove, onDragStart, onDragEnter, onDragEnd, dragOver }) {
  const label = slide.tipo === "frase" ? (slide.texto ? slide.texto.slice(0, 55) + (slide.texto.length > 55 ? "…" : "") : "(sem texto)") :
    slide.tipo === "colagem" ? (slide.titulo || "Colagem") :
    slide.tipo === "foto" ? (slide.legenda || "Foto") :
    slide.tipo === "video" ? (slide.legenda || "Vídeo") : slide.tipo;
  const sub = TIPOS.find(t => t.value === tipoKey(slide))?.label || slide.tipo;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onClick={onToggle}
      style={{
        border: `1px solid ${dragOver ? COR.ouro : rgba(COR.ouro, aberto ? 0.6 : 0.22)}`,
        borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
        background: aberto ? rgba(COR.ouro, 0.07) : dragOver ? rgba(COR.ouro, 0.05) : "rgba(255,255,255,0.02)",
        transition: "border-color 120ms, background 120ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontFamily: SCRIPT, color: COR.ouro, fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{i + 1}</span>
        <span style={{ flex: 1, fontSize: 15, lineHeight: 1.35, opacity: 0.9 }}>{label}</span>
        <span style={{ fontSize: 12, opacity: 0.5, whiteSpace: "nowrap" }}>{sub}</span>
      </div>
      {aberto && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <SmBtn onClick={onMoveUp} disabled={i === 0}>↑</SmBtn>
          <SmBtn onClick={onMoveDown} disabled={i === total - 1}>↓</SmBtn>
          <SmBtn onClick={onRemove} danger>Remover</SmBtn>
        </div>
      )}
    </div>
  );
}

function SmBtn({ onClick, disabled, danger, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: danger ? rgba("#ff4444", 0.15) : "rgba(255,255,255,0.08)", border: `1px solid ${danger ? rgba("#ff4444", 0.4) : "rgba(255,255,255,0.15)"}`, color: danger ? "#ff8888" : "#f7f3e7", padding: "4px 12px", borderRadius: 6, cursor: disabled ? "default" : "pointer", fontSize: 13, opacity: disabled ? 0.35 : 1 }}>{children}</button>
  );
}

function OrphanGallery({ mediaMap, orphanIds }) {
  if (!orphanIds.length) return null;
  return (
    <div style={{ marginBottom: 26, padding: "14px 16px", borderRadius: 10, border: `1px dashed ${rgba(COR.ouro, 0.5)}`, background: rgba(COR.ouro, 0.06) }}>
      <div style={{ fontSize: 16, marginBottom: 4, color: COR.ouro, fontFamily: SERIF }}>Fotos recuperadas ({orphanIds.length})</div>
      <p style={{ margin: "0 0 10px", fontSize: 13, opacity: 0.75, lineHeight: 1.4 }}>Estas mídias continuam salvas neste navegador, mas nenhum slide aponta mais para elas. Arraste cada uma para o quadro do slide onde ela deve entrar.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {orphanIds.map(id => {
          const m = mediaMap[id];
          if (!m) return null;
          return (
            <div key={id} draggable onDragStart={e => e.dataTransfer.setData("text/plain", "orphan:" + id)}
              title="Arraste para um slide"
              style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", cursor: "grab", border: `1px solid ${rgba(COR.ouro, 0.35)}`, flexShrink: 0 }}>
              {m.tipo === "foto"
                ? <img src={m.url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <video src={m.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlideDetail({ slide, idx, mediaMap, setMediaMap, onAssignOrphan, onChange, onChangeTipo }) {
  const tipoAtual = tipoKey(slide);
  const slots = slotsDe(slide, idx);

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 22 }}>
        <Label>Tipo de tela</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {TIPOS.map(t => (
            <button key={t.value} onClick={() => onChangeTipo(t.value)}
              style={{ padding: "7px 16px", borderRadius: 999, border: `1px solid ${tipoAtual === t.value ? COR.ouro : rgba(COR.ouro, 0.3)}`, background: tipoAtual === t.value ? rgba(COR.ouro, 0.18) : "transparent", color: COR.creme, cursor: "pointer", fontSize: 15, fontFamily: SERIF }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {(slide.tipo === "frase") && (
        <>
          <Field label="Texto" value={slide.texto || ""} onChange={v => onChange({ texto: v })} multiline />
          <Field label="Nome / assinatura" value={slide.nome || ""} onChange={v => onChange({ nome: v })} />
        </>
      )}
      {slide.tipo === "foto" && <Field label="Legenda (opcional)" value={slide.legenda || ""} onChange={v => onChange({ legenda: v })} />}
      {slide.tipo === "video" && <Field label="Legenda (opcional)" value={slide.legenda || ""} onChange={v => onChange({ legenda: v })} />}
      {slide.tipo === "colagem" && (
        <>
          <Field label="Título (opcional)" value={slide.titulo || ""} onChange={v => onChange({ titulo: v })} />
          <div style={{ marginBottom: 18 }}>
            <Label>Número de fotos</Label>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {[2, 3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => onChange({ fotos: n })}
                  style={{ width: 44, height: 36, borderRadius: 8, border: `1px solid ${slide.fotos === n ? COR.ouro : rgba(COR.ouro, 0.3)}`, background: slide.fotos === n ? rgba(COR.ouro, 0.18) : "transparent", color: COR.creme, cursor: "pointer", fontSize: 16, fontFamily: SERIF }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <Label>Orientação das fotos</Label>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {[{ v: "paisagem", l: "Paisagem (horizontal)" }, { v: "retrato", l: "Retrato (vertical)" }].map(o => (
                <button key={o.v} onClick={() => onChange({ orientacao: o.v })}
                  style={{ padding: "7px 16px", borderRadius: 999, border: `1px solid ${(slide.orientacao || "paisagem") === o.v ? COR.ouro : rgba(COR.ouro, 0.3)}`, background: (slide.orientacao || "paisagem") === o.v ? rgba(COR.ouro, 0.18) : "transparent", color: COR.creme, cursor: "pointer", fontSize: 14, fontFamily: SERIF }}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {slots.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Label>Fotos / vídeo</Label>
          <div style={{ display: "grid", gridTemplateColumns: slots.length > 2 ? "1fr 1fr" : "1fr 1fr", gap: 12, marginTop: 10 }}>
            {slots.map(sl => (
              <MediaSlot key={sl.id} sl={sl} media={mediaMap[sl.id]} setMediaMap={setMediaMap} onAssignOrphan={onAssignOrphan} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, multiline }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Label>{label}</Label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={4}
          style={{ width: "100%", marginTop: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${rgba("#d7c48f", 0.35)}`, borderRadius: 8, padding: "10px 12px", color: "#f7f3e7", fontSize: 16, fontFamily: "'Cormorant Garamond', Georgia, serif", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          style={{ width: "100%", marginTop: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${rgba("#d7c48f", 0.35)}`, borderRadius: 8, padding: "10px 12px", color: "#f7f3e7", fontSize: 16, fontFamily: "'Cormorant Garamond', Georgia, serif", outline: "none", boxSizing: "border-box" }} />
      )}
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 13, opacity: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>{children}</div>;
}

function MediaSlot({ sl, media, setMediaMap, onAssignOrphan }) {
  const boxRef = React.useRef(null);
  const dragPan = React.useRef(null);
  const inputRef = React.useRef(null);
  const [over, setOver] = React.useState(false);

  async function pickFile(file) {
    if (!file) return;
    const tipo = file.type.startsWith("video") ? "video" : "foto";
    const t = { scale: 1, px: 50, py: 50 };
    try { await idbSet(sl.id, { blob: file, tipo, t }); } catch {}
    const url = tipo === "foto" ? await blobToDataURL(file) : URL.createObjectURL(file);
    setMediaMap(p => ({ ...p, [sl.id]: { tipo, url, t } }));
  }

  async function remove() {
    try { await idbDel(sl.id); } catch {}
    setMediaMap(p => { const n = { ...p }; delete n[sl.id]; return n; });
  }

  function updateEnquadre(patch) {
    setMediaMap(p => {
      const m = p[sl.id]; if (!m) return p;
      const t = { ...m.t, ...patch };
      idbAll().then(({ keys, vals }) => { const k = keys.indexOf(sl.id); if (k >= 0) idbSet(sl.id, { ...vals[k], t }); }).catch(() => {});
      return { ...p, [sl.id]: { ...m, t } };
    });
  }

  const onMouseDown = (e) => {
    if (!media) return;
    dragPan.current = { x: e.clientX, y: e.clientY, px: media.t.px, py: media.t.py };
    e.preventDefault();
  };

  React.useEffect(() => {
    if (!media) return;
    const move = (e) => {
      if (!dragPan.current || !boxRef.current) return;
      const r = boxRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragPan.current.x) / r.width * 100;
      const dy = (e.clientY - dragPan.current.y) / r.height * 100;
      updateEnquadre({ px: Math.max(0, Math.min(100, dragPan.current.px - dx)), py: Math.max(0, Math.min(100, dragPan.current.py - dy)) });
    };
    const up = () => { dragPan.current = null; };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [media, sl.id]);

  const objPos = media ? `${media.t.px}% ${media.t.py}%` : "50% 50%";

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => pickFile(e.target.files[0])} />
      <div ref={boxRef} onClick={() => !media && inputRef.current.click()} onMouseDown={onMouseDown}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => {
          e.preventDefault(); setOver(false);
          const data = e.dataTransfer.getData("text/plain");
          if (data.startsWith("orphan:")) { onAssignOrphan(data.slice(7), sl.id); return; }
          pickFile(e.dataTransfer.files[0]);
        }}
        style={{ height: 120, borderRadius: 10, overflow: "hidden", position: "relative", cursor: media ? "grab" : "pointer",
          border: `1.5px dashed ${over ? COR.ouro : rgba(COR.ouro, 0.45)}`, background: over ? rgba(COR.ouro, 0.1) : "rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
        {!media && <span style={{ fontSize: 13, opacity: 0.6, textAlign: "center", padding: 8, lineHeight: 1.4 }}>{sl.kind === "video" ? "Arraste um vídeo" : "Arraste ou clique"}</span>}
        {media?.tipo === "foto" && <img src={media.url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: objPos, transform: `scale(${media.t.scale})` }} />}
        {media?.tipo === "video" && <video src={media.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {media && <span style={{ position: "absolute", left: 6, bottom: 5, fontSize: 11, color: COR.creme, background: "rgba(0,0,0,0.55)", padding: "2px 6px", borderRadius: 5 }}>arraste p/ enquadrar</span>}
        {media && <button onClick={e => { e.stopPropagation(); remove(); }} style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.6)", color: COR.creme, border: "none", borderRadius: 6, padding: "2px 7px", fontSize: 11, cursor: "pointer" }}>×</button>}
      </div>
      {media && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 13, opacity: 0.75 }}>
          <span style={{ whiteSpace: "nowrap" }}>Zoom</span>
          <input type="range" min="1" max="3" step="0.05" value={media.t.scale} onChange={e => updateEnquadre({ scale: parseFloat(e.target.value) })} style={{ flex: 1, accentColor: COR.ouro }} />
          <button onClick={() => inputRef.current.click()} style={{ background: "transparent", border: `1px solid ${rgba(COR.ouro, 0.4)}`, color: COR.creme, borderRadius: 6, padding: "3px 8px", fontSize: 12, cursor: "pointer" }}>Trocar</button>
        </div>
      )}
    </div>
  );
}
