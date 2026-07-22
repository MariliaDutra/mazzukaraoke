import React from 'react';
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget, FileSystemWritableFileStreamTarget as Mp4FileSystemTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget, FileSystemWritableFileStreamTarget as WebmFileSystemTarget } from 'webm-muxer';
import { idbSet, idbAll, idbDel, blobToDataURL } from './slidesStore.js';

// Codecs to try, in order of preference. H.264/mp4 plays everywhere but needs an
// OpenH264 encoder component that isn't always present; VP9/VP8 (webm) always ship with Chromium.
const BITRATE = 8_000_000;
const EXPORT_CODECS = [
  { webCodec: "avc1.640034", muxCodec: "avc", ext: "mp4", mime: "video/mp4", formato: "mp4" },
  { webCodec: "avc1.42001f", muxCodec: "avc", ext: "mp4", mime: "video/mp4", formato: "mp4" },
  { webCodec: "vp09.00.10.08", muxCodec: "V_VP9", ext: "webm", mime: "video/webm", formato: "webm" },
  { webCodec: "vp8", muxCodec: "V_VP8", ext: "webm", mime: "video/webm", formato: "webm" },
];

// ── constants ────────────────────────────────────────────────────────────────
const W = 1920, H = 1080;
const COR = { creme: "#f7f3e7", ouro: "#d7c48f", sagia: "#aeb98a", oliva: "#6f7a4e" };
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SCRIPT = "'Parisienne', cursive";
const SEGUNDOS_ABERTURA = 7;
const SEGUNDOS_POR_TELA = 9;
// Tempo de leitura para slides de texto: cresce com o tamanho da mensagem
const LEITURA_BASE_SEG = 2;
const LEITURA_PALAVRAS_POR_SEG = 3;
const LEITURA_MIN_SEG = 5;
const LEITURA_MAX_SEG = 22;

function duracaoDeLeitura(texto) {
  const palavras = (texto || "").trim().split(/\s+/).filter(Boolean).length;
  if (!palavras) return SEGUNDOS_POR_TELA;
  const seg = LEITURA_BASE_SEG + palavras / LEITURA_PALAVRAS_POR_SEG;
  return Math.max(LEITURA_MIN_SEG, Math.min(LEITURA_MAX_SEG, seg));
}

// ── color helpers ─────────────────────────────────────────────────────────────
function hexRgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function darken(h, f) { const c = hexRgb(h); return `rgb(${c.map(v => Math.max(0, Math.min(255, Math.round(v * f)))).join(",")})`; }
function rgba(h, a) { const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function darkRgba(h, f, a) { const c = hexRgb(h); return `rgba(${c.map(v => Math.max(0, Math.min(255, Math.round(v * f)))).join(",")},${a})`; }

// ── which media slots a slide needs ──────────────────────────────────────────
export function slotsDe(slide, i) {
  if (slide.tipo === "foto") return [{ id: i + "_0", kind: "foto" }];
  if (slide.tipo === "video") return [{ id: i + "_0", kind: "video" }];
  if (slide.tipo === "colagem") return Array.from({ length: slide.fotos || 3 }, (_, k) => ({ id: i + "_" + k, kind: "foto" }));
  if (slide.tipo === "frase" && slide.foto) return [{ id: i + "_0", kind: "foto" }];
  return [];
}

const ehVideo = f => (f.type || "").startsWith("video");

// ── MuralCanvas ───────────────────────────────────────────────────────────────
export default function MuralCanvas({ slides, mediaMap, setMediaMap, onRequestEditor }) {
  const fundo = "#5e7153";
  const seg = SEGUNDOS_POR_TELA;

  const segmentos = React.useMemo(() => {
    const segs = [{ tipo: "abertura", start: 0, end: SEGUNDOS_ABERTURA }];
    let t = SEGUNDOS_ABERTURA;
    slides.forEach((s, i) => { const auto = s.tipo === "frase" ? duracaoDeLeitura(s.texto) : seg; const d = s.seg || auto; segs.push({ slide: s, idx: i, start: t, end: t + d }); t += d; });
    return segs;
  }, [slides, seg]);
  const total = segmentos[segmentos.length - 1].end;

  const [uiTime, setUiTime] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);
  const [expPct, setExpPct] = React.useState(0);

  const canvasRef = React.useRef(null);
  const wrapRef = React.useRef(null);
  const drawRef = React.useRef(() => {});
  const timeRef = React.useRef(0);
  const playingRef = React.useRef(true);
  const exportingRef = React.useRef(false);
  const stopExportRef = React.useRef(null);
  const imgCache = React.useRef({});
  const videoRefs = React.useRef({});

  React.useEffect(() => { playingRef.current = playing; }, [playing]);

  // load saved media from IndexedDB
  React.useEffect(() => {
    (async () => {
      try {
        const { keys, vals } = await idbAll();
        const map = {};
        for (let i = 0; i < keys.length; i++) {
          const v = vals[i];
          map[keys[i]] = { tipo: v.tipo, url: v.tipo === "foto" ? await blobToDataURL(v.blob) : URL.createObjectURL(v.blob), t: v.t || { scale: 1, px: 50, py: 50 } };
        }
        setMediaMap(map);
      } catch {}
    })();
  }, []);

  const setMedia = React.useCallback(async (id, file) => {
    const tipo = ehVideo(file) ? "video" : "foto";
    const t = { scale: 1, px: 50, py: 50 };
    try { await idbSet(id, { blob: file, tipo, t }); } catch {}
    const url = tipo === "foto" ? await blobToDataURL(file) : URL.createObjectURL(file);
    setMediaMap(p => ({ ...p, [id]: { tipo, url, t } }));
  }, [setMediaMap]);

  const setEnquadre = React.useCallback(async (id, t) => {
    setMediaMap(p => { const m = p[id]; if (!m) return p; return { ...p, [id]: { ...m, t } }; });
    try { const { keys, vals } = await idbAll(); const k = keys.indexOf(id); if (k >= 0) await idbSet(id, { ...vals[k], t }); } catch {}
  }, [setMediaMap]);

  const removerMedia = React.useCallback(async (id) => {
    try { await idbDel(id); } catch {}
    setMediaMap(p => { const n = { ...p }; delete n[id]; return n; });
  }, [setMediaMap]);

  // canvas helpers
  function getImg(url) {
    if (!url) return null;
    let im = imgCache.current[url];
    if (!im) { im = new Image(); im.src = url; imgCache.current[url] = im; }
    return im.complete && im.naturalWidth ? im : null;
  }

  function roundRect(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function drawMidia(ctx, src, dx, dy, dw, dh, t, radius) {
    if (!src) return false;
    const iw = src.width || src.videoWidth, ih = src.height || src.videoHeight;
    if (!iw || !ih) return false;
    const scale = (t && t.scale) || 1;
    const s = Math.max(dw / iw, dh / ih) * scale;
    const rw = dw / s, rh = dh / s;
    const px = (t ? t.px : 50) / 100, py = (t ? t.py : 50) / 100;
    let sx = (iw - rw) * px, sy = (ih - rh) * py;
    sx = Math.max(0, Math.min(iw - rw, sx)); sy = Math.max(0, Math.min(ih - rh, sy));
    ctx.save(); roundRect(ctx, dx, dy, dw, dh, radius || 0); ctx.clip();
    ctx.drawImage(src, sx, sy, rw, rh, dx, dy, dw, dh);
    ctx.restore(); return true;
  }

  function elemDe(id) {
    const m = mediaMap[id]; if (!m) return null;
    if (m.tipo === "video") { const v = videoRefs.current[id]; return v && v.readyState >= 2 ? v : null; }
    return getImg(m.url);
  }

  function wrap(ctx, text, maxW) {
    const words = text.split(" "); const lines = []; let line = "";
    for (const w of words) { const test = line ? line + " " + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
    if (line) lines.push(line); return lines;
  }

  function molduraVazia(ctx, dx, dy, dw, dh, label) {
    ctx.save(); roundRect(ctx, dx, dy, dw, dh, 18); ctx.fillStyle = rgba("#000000", 0.18); ctx.fill();
    ctx.setLineDash([10, 9]); ctx.lineWidth = 2; ctx.strokeStyle = rgba(COR.ouro, 0.55); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = rgba(COR.creme, 0.62); ctx.font = `500 26px ${SERIF}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, dx + dw / 2, dy + dh / 2); ctx.restore();
  }

  function molduraFoto(ctx, dx, dy, dw, dh, r) {
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    roundRect(ctx, dx, dy, dw, dh, r); ctx.fillStyle = "#1a1f16"; ctx.fill(); ctx.restore();
    ctx.save(); roundRect(ctx, dx + 1, dy + 1, dw - 2, dh - 2, r - 1); ctx.lineWidth = 2; ctx.strokeStyle = rgba(COR.ouro, 0.7); ctx.stroke(); ctx.restore();
  }

  function fade(local, dur, fin = 1.1, fout = 1.1) {
    const eo = t => 1 - Math.pow(1 - t, 3), ei = t => t * t * t;
    if (local < fin) { const t = eo(Math.min(1, local / fin)); return { a: t, y: (1 - t) * 34 }; }
    if (local > dur - fout) { const t = ei(Math.min(1, (local - (dur - fout)) / fout)); return { a: 1 - t, y: -t * 22 }; }
    return { a: 1, y: 0 };
  }

  function galho(ctx, x, y, rot, len, sc, cor, alpha, t, fase) {
    const sway = Math.sin(t * 0.45 + fase) * 0.035;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot + sway); ctx.scale(sc, sc); ctx.globalAlpha = alpha;
    ctx.strokeStyle = cor; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.12, -len * 0.5, 0, -len); ctx.stroke();
    const n = 9;
    for (let i = 1; i <= n; i++) {
      const p = i / (n + 1), ly = -len * p, lx = len * 0.12 * 4 * p * (1 - p);
      for (const dir of [-1, 1]) {
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(dir * 0.7 - (1 - p) * 0.3);
        ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(dir * 16 * (1 - p * 0.4), 0, 19 * (1 - p * 0.35), 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
    ctx.beginPath(); ctx.ellipse(0, -len - 8, 7, 14, 0, 0, Math.PI * 2); ctx.fillStyle = cor; ctx.fill(); ctx.restore();
  }

  function spaced(ctx, text, cx, cy, ls) {
    ctx.save(); ctx.textBaseline = "middle";
    const widths = [...text].map(c => ctx.measureText(c).width + ls);
    const totalW = widths.reduce((s, w) => s + w, 0) - ls;
    let x = cx - totalW / 2; ctx.textAlign = "left";
    [...text].forEach((c, i) => { ctx.fillText(c, x, cy); x += widths[i]; }); ctx.restore();
  }

  // Auto-fits text vertically within available canvas space
  function blocoTexto(ctx, slide, cx, areaTop, areaBottom, alpha, sombraForte) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = "center";
    if (sombraForte) { ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 3; }
    else { ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 2; }

    const maxW = 1280;
    const nameH = 90; // separator gap + script name line
    const availH = areaBottom - areaTop - nameH - 30;

    // Try font sizes from 66 down until lines fit
    let fs = 66, lines;
    for (fs = 66; fs >= 30; fs -= 4) {
      ctx.font = `500 ${fs}px ${SERIF}`;
      lines = wrap(ctx, slide.texto || "", maxW);
      if (lines.length * fs * 1.45 <= availH) break;
    }
    const lh = fs * 1.45;
    const blockH = lines.length * lh;
    // center the text block in the available area
    let yy = areaTop + Math.max(0, (availH - blockH) / 2) + fs;

    ctx.fillStyle = COR.creme; ctx.font = `500 ${fs}px ${SERIF}`; ctx.textBaseline = "alphabetic";
    lines.forEach(l => { ctx.fillText(l, cx, yy); yy += lh; });

    ctx.shadowColor = "transparent"; ctx.strokeStyle = rgba(COR.ouro, 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - 46, yy + 8); ctx.lineTo(cx + 46, yy + 8); ctx.stroke();

    if (sombraForte) { ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 18; }
    ctx.fillStyle = COR.ouro; ctx.font = `66px ${SCRIPT}`; ctx.textBaseline = "alphabetic";
    ctx.fillText(slide.nome || "", cx, yy + nameH);
    ctx.restore(); return yy + nameH;
  }

  function legenda(ctx, txt, cx, yy, alpha) {
    if (!txt) return; ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = COR.ouro; ctx.font = `52px ${SCRIPT}`; ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 16; ctx.fillText(txt, cx, yy); ctx.restore();
  }

  function drawAbertura(ctx, local, dur) {
    const { a, y } = fade(local, dur, 1.3, 1.2);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, y); ctx.textAlign = "center";
    ctx.fillStyle = COR.creme; ctx.font = `500 28px ${SERIF}`;
    spaced(ctx, "COM MUITO CARINHO", W / 2, H / 2 - 170, 12);
    ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 4;
    ctx.fillStyle = COR.ouro; ctx.font = `170px ${SCRIPT}`; ctx.textBaseline = "middle";
    ctx.fillText("Débora & Marília", W / 2, H / 2 - 10);
    ctx.shadowColor = "transparent"; ctx.strokeStyle = rgba(COR.ouro, 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - 230, H / 2 + 120); ctx.lineTo(W / 2 - 110, H / 2 + 120); ctx.moveTo(W / 2 + 110, H / 2 + 120); ctx.lineTo(W / 2 + 230, H / 2 + 120); ctx.stroke();
    ctx.fillStyle = COR.creme; ctx.font = `500 32px ${SERIF}`;
    spaced(ctx, "26 · 07 · 2026", W / 2, H / 2 + 122, 10);
    ctx.fillStyle = COR.sagia; ctx.font = `500 22px ${SERIF}`;
    spaced(ctx, "MURAL DE CARINHO", W / 2, H / 2 + 185, 9);
    ctx.restore();
  }

  function drawFrase(ctx, slide, idx, local, dur, a, y) {
    if (slide.foto === "fundo") {
      const el = elemDe(idx + "_0");
      ctx.save(); ctx.globalAlpha = a;
      if (el) {
        drawMidia(ctx, el, 46, 46, W - 92, H - 92, mediaMap[idx + "_0"].t, 10);
        const sc = ctx.createLinearGradient(0, 0, 0, H); sc.addColorStop(0, "rgba(0,0,0,0.35)"); sc.addColorStop(0.5, "rgba(0,0,0,0.55)"); sc.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.fillStyle = sc; ctx.fillRect(46, 46, W - 92, H - 92);
      } else molduraVazia(ctx, W / 2 - 360, H / 2 - 150, 720, 300, "arraste uma foto de fundo");
      ctx.restore();
      ctx.save(); ctx.translate(0, y); blocoTexto(ctx, slide, W / 2, 100, H - 100, a, true); ctx.restore();
      return;
    }
    if (slide.foto === "lado") {
      const el = elemDe(idx + "_0"), fw = 560, fh = 360, fx = W / 2 - fw / 2, fy = 130;
      ctx.save(); ctx.translate(0, y); ctx.globalAlpha = a;
      if (el) { molduraFoto(ctx, fx, fy, fw, fh, 16); drawMidia(ctx, el, fx, fy, fw, fh, mediaMap[idx + "_0"].t, 16); }
      else molduraVazia(ctx, fx, fy, fw, fh, "arraste uma foto");
      ctx.globalAlpha = 1; blocoTexto(ctx, slide, W / 2, fy + fh + 60, H - 60, a, false); ctx.restore();
      return;
    }
    // Só texto — full vertical area
    ctx.save(); ctx.translate(0, y); blocoTexto(ctx, slide, W / 2, 100, H - 80, a, false); ctx.restore();
  }

  function drawFoto(ctx, slide, idx, a, y) {
    const fw = 1040, fh = 660, fx = W / 2 - fw / 2, fy = (H - fh) / 2 - 30;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, y);
    const el = elemDe(idx + "_0");
    if (el) { molduraFoto(ctx, fx, fy, fw, fh, 18); drawMidia(ctx, el, fx, fy, fw, fh, mediaMap[idx + "_0"].t, 18); }
    else molduraVazia(ctx, fx, fy, fw, fh, "arraste uma foto");
    ctx.restore(); legenda(ctx, slide.legenda, W / 2, fy + fh + 64, a);
  }

  function drawVideoOnly(ctx, slide, idx, a, y) {
    const el = elemDe(idx + "_0");
    // Contain the video within available area, preserving its aspect ratio
    const vw = el ? (el.videoWidth || 1920) : 1920;
    const vh = el ? (el.videoHeight || 1080) : 1080;
    const maxW = 1200, maxH = 900;
    const s = Math.min(maxW / vw, maxH / vh);
    const fw = Math.round(vw * s), fh = Math.round(vh * s);
    const fx = W / 2 - fw / 2, fy = Math.round((H - fh) / 2) - 20;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, y);
    if (el) {
      molduraFoto(ctx, fx, fy, fw, fh, 18);
      ctx.save(); roundRect(ctx, fx, fy, fw, fh, 18); ctx.clip();
      ctx.drawImage(el, fx, fy, fw, fh);
      ctx.restore();
    } else {
      molduraVazia(ctx, W / 2 - 560, (H - 630) / 2 - 30, 1120, 630, "arraste um vídeo");
    }
    ctx.restore(); legenda(ctx, slide.legenda, W / 2, fy + fh + 64, a);
  }

  function layoutRects(n, retrato, ax, top, areaW, areaH, gap) {
    if (retrato) {
      // Portrait (vertical) photo layouts — tall slots
      if (n <= 2) { const w = (areaW - gap) / 2; return [[ax, top, w, areaH], [ax + w + gap, top, w, areaH]]; }
      if (n === 3) { const w = (areaW - 2 * gap) / 3; return Array.from({ length: 3 }, (_, k) => [ax + k * (w + gap), top, w, areaH]); }
      if (n === 4) { const w = (areaW - 3 * gap) / 4; return Array.from({ length: 4 }, (_, k) => [ax + k * (w + gap), top, w, areaH]); }
      if (n === 5) {
        const h2 = (areaH - gap) / 2, w3 = (areaW - 2 * gap) / 3, w2 = (areaW - gap) / 2;
        return [
          [ax, top, w3, h2], [ax + w3 + gap, top, w3, h2], [ax + 2 * (w3 + gap), top, w3, h2],
          [ax, top + h2 + gap, w2, h2], [ax + w2 + gap, top + h2 + gap, w2, h2],
        ];
      }
      // 6: 3×2
      const w6 = (areaW - 2 * gap) / 3, h6 = (areaH - gap) / 2;
      return Array.from({ length: 6 }, (_, k) => [ax + (k % 3) * (w6 + gap), top + Math.floor(k / 3) * (h6 + gap), w6, h6]);
    } else {
      // Landscape layouts
      if (n <= 1) return [[ax, top, areaW, areaH]];
      if (n === 2) { const w = (areaW - gap) / 2; return [[ax, top, w, areaH], [ax + w + gap, top, w, areaH]]; }
      if (n === 3) { const bw = areaW * 0.56, sw = areaW - bw - gap, sh = (areaH - gap) / 2; return [[ax, top, bw, areaH], [ax + bw + gap, top, sw, sh], [ax + bw + gap, top + sh + gap, sw, sh]]; }
      if (n === 4) { const w = (areaW - gap) / 2, h = (areaH - gap) / 2; return [[ax, top, w, h], [ax + w + gap, top, w, h], [ax, top + h + gap, w, h], [ax + w + gap, top + h + gap, w, h]]; }
      if (n === 5) {
        const h2 = (areaH - gap) / 2, wt = (areaW - gap) / 2, wb = (areaW - 2 * gap) / 3;
        return [
          [ax, top, wt, h2], [ax + wt + gap, top, wt, h2],
          [ax, top + h2 + gap, wb, h2], [ax + wb + gap, top + h2 + gap, wb, h2], [ax + 2 * (wb + gap), top + h2 + gap, wb, h2],
        ];
      }
      // 6: 3×2
      const w6 = (areaW - 2 * gap) / 3, h6 = (areaH - gap) / 2;
      return Array.from({ length: 6 }, (_, k) => [ax + (k % 3) * (w6 + gap), top + Math.floor(k / 3) * (h6 + gap), w6, h6]);
    }
  }

  function drawColagem(ctx, slide, idx, a, y) {
    const n = slide.fotos || 3, gap = 22, retrato = slide.orientacao === "retrato";
    ctx.save(); ctx.globalAlpha = a; ctx.translate(0, y);
    if (slide.titulo) {
      ctx.fillStyle = COR.ouro; ctx.font = `64px ${SCRIPT}`; ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 14;
      ctx.fillText(slide.titulo, W / 2, 130); ctx.shadowColor = "transparent";
    }
    const top = slide.titulo ? 180 : 100, areaW = 1400, areaH = H - top - 90, ax = (W - areaW) / 2;
    const rects = layoutRects(n, retrato, ax, top, areaW, areaH, gap).slice(0, n);
    rects.forEach(([rx, ry, rw, rh], k) => {
      const el = elemDe(idx + "_" + k);
      if (el) { molduraFoto(ctx, rx, ry, rw, rh, 12); drawMidia(ctx, el, rx, ry, rw, rh, mediaMap[idx + "_" + k]?.t, 12); }
      else molduraVazia(ctx, rx, ry, rw, rh, `foto ${k + 1}`);
    });
    ctx.restore();
  }

  function drawSlide(ctx, slide, idx, local, dur) {
    const { a, y } = fade(local, dur);
    if (slide.tipo === "frase") return drawFrase(ctx, slide, idx, local, dur, a, y);
    if (slide.tipo === "foto") return drawFoto(ctx, slide, idx, a, y);
    if (slide.tipo === "video") return drawVideoOnly(ctx, slide, idx, a, y);
    if (slide.tipo === "colagem") return drawColagem(ctx, slide, idx, a, y);
  }

  // keep drawRef current
  drawRef.current = (time) => {
    const ctx = canvasRef.current && canvasRef.current.getContext("2d");
    if (!ctx) return;
    try {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, darken(fundo, 1.08)); g.addColorStop(0.5, darken(fundo, 0.9)); g.addColorStop(1, darken(fundo, 0.6));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const blob = (cx, cy, rad, col, a) => { const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad); rg.addColorStop(0, rgba(col, a)); rg.addColorStop(1, rgba(col, 0)); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); };
      blob(W * 0.3 + Math.sin(time * 0.1) * 30, H * 0.32, 520, COR.sagia, 0.07);
      blob(W * 0.72, H * 0.7 + Math.cos(time * 0.12) * 30, 560, COR.creme, 0.05);
      const breathe = 1 + Math.sin(time * 0.35) * 0.05;
      blob(W / 2, H / 2, 760 * breathe, COR.creme, 0.06);
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.86);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, darkRgba(fundo, 0.35, 0.85));
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      galho(ctx, -10, 70, Math.PI * 0.72, 360, 1, COR.sagia, 0.5, time, 0);
      galho(ctx, W + 10, 90, -Math.PI * 0.72, 380, 1, COR.ouro, 0.4, time, 1.1);
      galho(ctx, 30, H - 40, Math.PI * 0.18, 320, 1, COR.sagia, 0.42, time, 2.2);
      galho(ctx, W - 30, H - 40, -Math.PI * 0.18, 340, 1, COR.ouro, 0.4, time, 3.3);
      ctx.save(); ctx.globalAlpha = 0.22; ctx.strokeStyle = COR.ouro; ctx.lineWidth = 1.5;
      roundRect(ctx, 46, 46, W - 92, H - 92, 10); ctx.stroke(); ctx.restore();
      const segActiva = segmentos.find(s => time >= s.start && time < s.end) || segmentos[segmentos.length - 1];
      const local = time - segActiva.start, dur = segActiva.end - segActiva.start;
      if (segActiva.tipo === "abertura") drawAbertura(ctx, local, dur);
      else drawSlide(ctx, segActiva.slide, segActiva.idx, local, dur);
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = COR.ouro; ctx.font = `40px ${SCRIPT}`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText("D & M", W / 2, H - 52); ctx.restore();
    } catch {}
  };

  // animation loop
  React.useEffect(() => {
    let raf, lastUi = 0;
    const loop = (ts) => {
      if (playingRef.current && !exportingRef.current) {
        timeRef.current = (timeRef.current + (ts - (loop._last || ts)) / 1000) % total;
      }
      loop._last = ts;
      if (!exportingRef.current) drawRef.current(timeRef.current);
      if (ts - lastUi > 80 && !exportingRef.current) { lastUi = ts; setUiTime(timeRef.current); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  // canvas scale
  const [scale, setScale] = React.useState(0.5);
  React.useEffect(() => {
    const measure = () => { const el = wrapRef.current; if (!el) return; setScale(Math.max(0.05, Math.min(el.clientWidth / W, (el.clientHeight) / H))); };
    measure(); const ro = new ResizeObserver(measure); if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", measure); return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);

  // export MP4 — renders frame by frame (not in real time) via WebCodecs
  const exportar = React.useCallback(async () => {
    if (exportingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || typeof VideoEncoder === "undefined") {
      alert("Seu navegador não suporta essa exportação. Use uma versão recente do Chrome.");
      return;
    }

    const FPS = 30;
    const totalFrames = Math.max(1, Math.round(total * FPS));
    let cancelado = false;
    stopExportRef.current = () => { cancelado = true; };

    let escolha = null;
    for (const cand of EXPORT_CODECS) {
      try {
        const r = await VideoEncoder.isConfigSupported({ codec: cand.webCodec, width: W, height: H, bitrate: BITRATE, framerate: FPS });
        if (r.supported) { escolha = cand; break; }
      } catch {}
    }
    if (!escolha) { alert("Seu navegador não suporta essa exportação. Use uma versão recente do Chrome."); return; }

    // Vídeos longos (a montagem inteira pode passar de vários minutos) não cabem
    // inteiros na memória — sempre que possível, grava direto no disco em vez de
    // acumular tudo num buffer só, que é o que travava no final ao gerar o arquivo.
    let fileHandle = null;
    if (window.showSaveFilePicker) {
      try {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: `mural-debora-marilia.${escolha.ext}`,
          types: [{ description: escolha.formato === "mp4" ? "Vídeo MP4" : "Vídeo WebM", accept: { [escolha.mime]: [`.${escolha.ext}`] } }],
        });
      } catch (err) {
        if (err && err.name === "AbortError") return; // usuário cancelou o diálogo de salvar
        fileHandle = null;
      }
    }

    exportingRef.current = true; setExporting(true); setExpPct(0);

    const videos = Object.values(videoRefs.current).filter(Boolean);
    videos.forEach(v => { try { v.pause(); } catch {} });

    let writable = null;
    if (fileHandle) { try { writable = await fileHandle.createWritable(); } catch { writable = null; } }

    const muxer = escolha.formato === "mp4"
      ? new Mp4Muxer({
          target: writable ? new Mp4FileSystemTarget(writable) : new Mp4ArrayBufferTarget(),
          video: { codec: escolha.muxCodec, width: W, height: H },
          fastStart: writable ? false : "in-memory",
        })
      : new WebmMuxer({
          target: writable ? new WebmFileSystemTarget(writable) : new WebmArrayBufferTarget(),
          video: { codec: escolha.muxCodec, width: W, height: H, frameRate: FPS },
          streaming: !!writable,
        });
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error("Erro ao codificar vídeo:", e),
    });
    encoder.configure({ codec: escolha.webCodec, width: W, height: H, bitrate: BITRATE, framerate: FPS });

    const seekVideo = (video, t) => new Promise((resolve) => {
      if (!video || !isFinite(video.duration) || video.duration <= 0) return resolve();
      const dur = video.duration;
      const alvo = ((t % dur) + dur) % dur;
      if (Math.abs(video.currentTime - alvo) < 1 / FPS / 2) return resolve();
      const onSeeked = () => { video.removeEventListener("seeked", onSeeked); resolve(); };
      video.addEventListener("seeked", onSeeked);
      video.currentTime = alvo;
    });

    try {
      for (let i = 0; i < totalFrames; i++) {
        if (cancelado) throw new Error("cancelado");
        const time = i / FPS;
        const segActiva = segmentos.find(s => time >= s.start && time < s.end) || segmentos[segmentos.length - 1];
        if (segActiva.slide && segActiva.slide.tipo === "video") {
          await seekVideo(videoRefs.current[segActiva.idx + "_0"], time - segActiva.start);
        }
        drawRef.current(time);

        while (encoder.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 0));
        const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
        encoder.encode(frame, { keyFrame: i % (FPS * 2) === 0 });
        frame.close();

        if (i % 3 === 0) { setExpPct(i / totalFrames); await new Promise(r => setTimeout(r, 0)); }
      }
      await encoder.flush();
      muxer.finalize();
      if (writable) {
        await writable.close();
      } else {
        const blob = new Blob([muxer.target.buffer], { type: escolha.mime });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = `mural-debora-marilia.${escolha.ext}`;
        document.body.appendChild(a); a.click(); a.remove();
      }
    } catch (err) {
      if (err?.message !== "cancelado") { console.error(err); alert("Não foi possível gerar o vídeo."); }
      if (writable) { try { await writable.abort(); } catch {} }
    } finally {
      try { encoder.close(); } catch {}
      videos.forEach(v => { try { v.play(); } catch {} });
      exportingRef.current = false; setExporting(false); setExpPct(0);
      stopExportRef.current = null;
    }
  }, [total, segmentos]);

  const videoSlots = [];
  segmentos.forEach(s => { if (s.slide) slotsDe(s.slide, s.idx).forEach(sl => { if (mediaMap[sl.id]?.tipo === "video") videoSlots.push(sl.id); }); });

  const fmt = t => { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, "0")}`; };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0c0e0a" }}>
      {videoSlots.map(id => (
        <video key={id} ref={el => { videoRefs.current[id] = el; }} src={mediaMap[id].url} muted loop autoPlay playsInline
          style={{ position: "absolute", width: 2, height: 2, opacity: 0, pointerEvents: "none", left: -10, top: -10 }} />
      ))}

      <div ref={wrapRef} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <canvas ref={canvasRef} width={W} height={H}
          style={{ width: W * scale, height: H * scale, boxShadow: "0 24px 70px rgba(0,0,0,0.5)", display: "block" }} />
      </div>

      {/* playback bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 20px", background: "rgba(16,19,13,0.97)", borderTop: `1px solid ${rgba(COR.ouro, 0.2)}`, color: COR.creme, fontFamily: SERIF, flexShrink: 0 }}>
        <BtnIco onClick={() => { timeRef.current = 0; setUiTime(0); }} title="Início">⏮</BtnIco>
        <BtnIco onClick={() => setPlaying(p => { playingRef.current = !p; return !p; })}>{playing ? "❚❚" : "▶"}</BtnIco>
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 15, width: 46, textAlign: "right", opacity: 0.85 }}>{fmt(uiTime)}</span>
        <div onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); timeRef.current = f * total; setUiTime(timeRef.current); }}
          style={{ flex: 1, height: 22, display: "flex", alignItems: "center", cursor: "pointer", position: "relative" }}>
          <div style={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: 2, background: rgba(COR.creme, 0.16) }} />
          <div style={{ position: "absolute", left: 0, width: `${uiTime / total * 100}%`, height: 4, borderRadius: 2, background: COR.ouro }} />
          <div style={{ position: "absolute", left: `calc(${uiTime / total * 100}% - 6px)`, width: 12, height: 12, borderRadius: 6, background: COR.creme }} />
        </div>
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 15, width: 46, opacity: 0.55 }}>{fmt(total)}</span>
        <BtnGhost onClick={onRequestEditor}>Fotos &amp; vídeos</BtnGhost>
        <BtnGold onClick={exportar} disabled={exporting} style={{ opacity: exporting ? 0.6 : 1 }}>
          {exporting ? `Gerando ${Math.round(expPct * 100)}%` : "⬇ Exportar MP4"}
        </BtnGold>
      </div>

      {exporting && (
        <div style={{ position: "fixed", left: "50%", bottom: 86, transform: "translateX(-50%)", zIndex: 12000, background: "rgba(16,19,13,0.96)", color: COR.creme, padding: "14px 22px", borderRadius: 12, border: `1px solid ${rgba(COR.ouro, 0.4)}`, textAlign: "center", maxWidth: 520 }}>
          <div style={{ fontSize: 19, marginBottom: 4 }}>Gerando o vídeo… {Math.round(expPct * 100)}%</div>
          <div style={{ fontSize: 15, opacity: 0.75 }}>Deixe esta aba aberta até terminar. O download começa sozinho.</div>
          <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: rgba(COR.creme, 0.15) }}><div style={{ height: 6, borderRadius: 3, width: `${expPct * 100}%`, background: COR.ouro }} /></div>
          <button onClick={() => { stopExportRef.current?.(); }} style={{ marginTop: 10, background: "transparent", border: `1px solid ${rgba(COR.creme, 0.3)}`, color: COR.creme, padding: "4px 14px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

function BtnIco({ onClick, title, children }) {
  return <button onClick={onClick} title={title} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f7f3e7", width: 38, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 14 }}>{children}</button>;
}
function BtnGhost({ onClick, children }) {
  return <button onClick={onClick} style={{ background: "transparent", border: "1px solid rgba(215,196,143,0.5)", color: "#f7f3e7", padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontSize: 16, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{children}</button>;
}
function BtnGold({ onClick, disabled, style, children }) {
  return <button onClick={onClick} disabled={disabled} style={{ background: "#d7c48f", border: "none", color: "#2b2f1d", padding: "9px 20px", borderRadius: 999, cursor: "pointer", fontSize: 16, fontWeight: 600, fontFamily: "'Cormorant Garamond', Georgia, serif", ...style }}>{children}</button>;
}
