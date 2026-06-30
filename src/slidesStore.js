// Persistent slide list — localStorage for text data, IndexedDB for media

export const DEFAULT_SLIDES = [
  { tipo: "frase", texto: "Que a vida de vocês seja sempre assim — cheia de amor, leveza e flores no caminho. Amamos vocês!", nome: "Tia Cláudia & Tio Ricardo", foto: "lado" },
  { tipo: "frase", texto: "Ver vocês construindo essa história é a prova mais linda de que o amor vence tudo. Felizes para sempre!", nome: "Bruna e Letícia" },
  { tipo: "colagem", fotos: 3, titulo: "Nossos momentos" },
  { tipo: "frase", texto: "Amor que respeita, acolhe e celebra a verdade de cada uma. É isso que vocês são. Viva o amor de vocês!", nome: "Marina", foto: "fundo" },
  { tipo: "frase", texto: "Guardamos no coração cada risada de vocês juntas. Que venham muitos anos de cumplicidade e axé!", nome: "Os amigos de São Paulo" },
  { tipo: "video" },
  { tipo: "frase", texto: "Hoje começa o capítulo mais bonito. Que ele seja tão doce quanto o jeito que vocês se olham.", nome: "Vó Diná", foto: "lado" },
  { tipo: "foto", legenda: "26 de julho de 2026" },
  { tipo: "frase", texto: "Obrigada por nos ensinarem todo dia que amar é um ato de coragem e de luz. Sejam imensamente felizes.", nome: "Pedro & João" },
];

const LS_KEY = "mural-slides-v1";

export function loadSlides() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SLIDES;
}

export function saveSlides(slides) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(slides)); } catch {}
}

// ── IndexedDB for media blobs ──────────────────────────────────────────────
const DB_NAME = "mural-casamento", STORE = "media";

export function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 2);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function idbSet(k, v) {
  const db = await idbOpen();
  return new Promise((res, rej) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
export async function idbAll() {
  const db = await idbOpen();
  return new Promise((res, rej) => { const tx = db.transaction(STORE, "readonly"); const s = tx.objectStore(STORE), k = s.getAllKeys(), v = s.getAll(); tx.oncomplete = () => res({ keys: k.result, vals: v.result }); tx.onerror = () => rej(tx.error); });
}
export async function idbDel(k) {
  const db = await idbOpen();
  return new Promise((res, rej) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
export function blobToDataURL(b) {
  return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
}
