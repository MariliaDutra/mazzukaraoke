// Persistent slide list — localStorage for text data, IndexedDB for media

export const DEFAULT_SLIDES = [
  { tipo: "frase", texto: "AMORES. QUE FELIZ que vocês vão fazer essa união, mesmo <3 . Desejo todo o amor e felicidade do MUNDO. Vocês merecem, mesmo.", nome: "Bruno Boer" },
  { tipo: "frase", texto: "Ma e Dé, Que vocês possam seguir apreciando a companhia uma da outra, do café ao jantar, e não esqueçam de convidar as amigas, de vez em quando, pra compartilhar uma fatia de bolo e um café fresquinho, rsrsrs, temperados com uma generosa porção de amor fraterno, uma boa dose de risada, um punhado de conversas, uma pitada de fofocas e diversão a gosto! Um beijo e um abraço carinhoso! Consu", nome: "Consuelo" },
  { tipo: "frase", texto: "Olá, Desejo a vocês um lindo casamento, muito amor e muitas felicidades. Diego", nome: "Diego Bueno" },
  { tipo: "frase", texto: "Que esté mergulho seja o início dessa nova e profunda jornada! Que venham muitos peixinhos, águas claras e, claro, muito amor pra contar depois.", nome: "Leonna" },
  { tipo: "frase", texto: "Que este casamento seja apenas o início de um capítulo recheado de respeito, parceria e muitas alegrias. O amor venceu e merece ser comemorado todos os dias!", nome: "Dayane e Filipe" },
  { tipo: "frase", texto: "Desejamos um lindo e duradouro casamento para o casal. Vocês merecem tudo de maravilhoso que a vida tem a oferecer. São pessoas lindas e incríveis que terão a família ainda mais incrível exatamente pela forma que veem o mundo. Sejam muito felizes!", nome: "Jess e Bia" },
  { tipo: "frase", texto: "Que a felicidade seja obrigatória, que as dificuldades sejam compartilhadas e que o amor vença todo os dias! Um grande beijo nosso e que seja tudo lindo!", nome: "Com carinho, Merjily e Luciano" },
  { tipo: "frase", texto: "Prima e Debora, Estamos muito felizes em celebrar essa nova etapa da vida de vocês! Será um dia muito especial e que ficará para sempre gravado na memória! Felicidades!!!!", nome: "Lia e Julia" },
  { tipo: "frase", texto: "Débora e Marília, estamos honrados em fazer parte de um momento tão especial da vida de vocês! Desejamos muitas felicidades e que o amor de vocês cresça cada vez mais! Claro que um café fresquinho sempre vai ajudar hahahah Beijos, família Beraldi", nome: "Ariane, Cecília e Felipe Beraldi" },
  { tipo: "frase", texto: "Queridas, que seja um novo ciclo de muito amor, realizações e cumplicidade!", nome: "Rafa e Leo Dirickson" },
  { tipo: "frase", texto: "Marília e Débora, Que legal poder celebrar com vocês esse dia tão importante. Que vocês sejam sempre muito felizes!!!", nome: "Helena, Pedro, Val e Ro" },
  { tipo: "frase", texto: "Ma e Dé, que vocês nunca deixem de ser uma para a outra a parceira que sempre sonharam! Felicidades eternas para as duas!", nome: "Ste Carvalho" },
  { tipo: "frase", texto: "Marília e Débora, que a caminhada a dois seja leve, cheia de risos sinceros e momentos que fiquem guardados para sempre. Que o amor seja sempre o guia dessa história. Felicidades ao casal!", nome: "Jeh e Pah" },
  { tipo: "frase", texto: "Queridas noivas, Marília e Débora, este presente vai com meu carinho para que vocês possam cozinhar lindas refeiçoes juntas! Muitas Felicidades. Gostaria de fazer um pix direto para auxiliar no sonho de vocês de serem mães porém num outro valor apresentado. Bjos", nome: "Tancha" },
  { tipo: "frase", texto: "Queridas, que vocês sejam muito, muito felizes nessa nova fase. Curtam-se muito, aproveitem e providenciem logo primos para o Pedro e Lucas. Amamos vocês, Família Concistré-Dias", nome: "Kika, Ste, Pedro e Lucas" },
  { tipo: "frase", texto: "Desejamos toda a felicidade do mundo e muito amor!", nome: "Dayane e Filipe" },
  { tipo: "frase", texto: "Desejo toda a felicidade do mundo pra vocês e que esse casamento seja repleto de axé! Gosto demais de vocês e me sinto honrado por poder compartilhar esse momento tão importante das suas vidas <3", nome: "Nico Vicentin" },
  { tipo: "frase", texto: "Má e Dê, aproveitem cada segundo da celebração do amor de vocês. Que vocês sejam companheiras sempre. Beijos e amamos vocês.", nome: "Biba, Alê e Tomás" },
  { tipo: "frase", texto: "Esperamos que você luxem muuuuuuito com os Drinks mais gostoso na piscina! Que os orixás tragam muita luz para o caminho dessa nova família. Má, te amo pra sempre! Dé, vai ser um prazer te conhecer e cuida bem dessa mulher incrível!", nome: "Jeh e Bah" },
  { tipo: "frase", texto: "Marília e Débora, que o amor seja sempre o guia dessa história. Felicidades ao casal", nome: "Rodrigo Almeida e Guilherme Moraes" },
  { tipo: "frase", texto: "Que esta união seja firme como os sonhos que vocês compartilham. Parabéns, Marília e Débora!", nome: "Cleide & valter" },
  { tipo: "frase", texto: "Marília e Débora, que o amor seja sempre a base da vida a dois.", nome: "Thays e Alicia" },
  { tipo: "frase", texto: "Queridas Marília e Débora, Estamos muito felizes por ver a chegada desse dia tão especial para celebrar o amor de vocês! Desejamos muita felicidade nos novos capítulos dessa linda história e esperamos vê-las novamente em breve. Estamos de coração partido por não poder estar presentes nesse dia especial, mas mandamos como presente uma contribuição para a vinda de um/a amiguinha/o para a Loulou.", nome: "Aninha, Anne e Louisa" },
  { tipo: "frase", texto: "Parabéns pelo casamento , desejamos muitas felicidades, paz e amor !!!", nome: "Renata , Ricardo e Davi" },
  { tipo: "frase", texto: "Suas maravilhosas sejam felizes, felizes e cuidem uma da outra. Desejo tudo de bomm.", nome: "Rafaela" },
  { tipo: "frase", texto: "Que a vida de vocês seja cheia de amor e alegrias. E que vocês saibam ser apoio uma pra outra. Muito muito amor pra vocês.", nome: "Cats, Fla, Vivi e Rosa" },
  { tipo: "frase", texto: "Que o casamento seja sinônimo de paz, parceria e alegria. Felicidades, Marília e Débora!", nome: "Sueli e Milton" },
  { tipo: "frase", texto: "Débora e Marília, que este novo capítulo seja repleto de amor, cumplicidade e respeito! Desejamos uma vida repleta de momentos especiais e muita felicidade. Parabéns pelo casamento!", nome: "Cris, Léo e Bianca" },
  { tipo: "frase", texto: "Marília e Débora, que a vida a dois seja uma enorme aventura com a doçura de estar sempre no aconchego do lar. Axé", nome: "Bia e Ale" },
  { tipo: "frase", texto: "Queridas, tenho certeza de que o casamento de vocês será apenas o dia que vai marcar o início de uma trajetória linda que vocês terão daqui por diante. Desejamos a vocês todo o amor, compreensão, calma e realizações cada vez maiores. Estamos muito felizes de fazer parte de um momento tão especial. Felicidades!", nome: "Felipe e Samuel" },
  { tipo: "frase", texto: "Que o amor e a felicidade reinem nessa união!", nome: "Paula Britto" },
  { tipo: "frase", texto: "Que vocês sejam muito felizes.", nome: "Pedro Jhonathan" },
  { tipo: "frase", texto: "Que honra acompanhar e participar desta linda União! Que o Amor de vocês continue encantando e iluminando sempre. Com carinho, Lucas, Priscila, Sarah e Paulo", nome: "Lucas, Priscila, Sarah e Paulo" },
  { tipo: "frase", texto: "Que esse casamento seja só o começo de uma vida cheia de cumplicidade e alegria. Com todo carinho, Camis", nome: "Camila Brito" },
  { tipo: "frase", texto: "Dé e Ma, Felicidades por esse momento tão especial! Que o amor, a cumplicidade e o respeito estejam sempre presentes na vida de vcs! Com carinho, Jé e Bi", nome: "Bianca e Jessica" },
  { tipo: "frase", texto: "Felicidades ao casal", nome: "Pedro Carvalho" },
  { tipo: "frase", texto: "Que felicidade e honra poder fazer parte desse momento. Desejamos que a união de vcs seja leve, harmônica, cheia de amor e cumplicidade, muita luz e prosperidade. Que Deus abençoe a vida e a união de vcs.", nome: "Milena e Wanderson" },
  { tipo: "frase", texto: "Marília e Débora, que a caminhada a dois seja leve, cheia de risos sinceros e momentos que fiquem guardados para sempre. Que o amor seja sempre o guia dessa história. Felicidades ao casal!", nome: "Jeh e Pah" },
  { tipo: "frase", texto: "Que alegria a nossa em poder fazer parte deste lindo momento de vcs! Desejamos a vcs todas felicidade do mundo na vida de casadas... Certeza que se depender desse amor lindo, serão felizes para sempre....Eu e o Vado desejamos a vcs o que desejamos a nossos filhos,, sejam felizes e que Deus as abençoe sempre....", nome: "Zilda Izidoro" },
  { tipo: "frase", texto: "Eu sempre tive dificuldades em entender como as pessoas conseguem se apegar as outras, até conhecer vocês, entendi que amizade é conforto, segurança, companheirismo, as vezes é rotina também, é saber que se eu não conseguir estar com vocês hoje e conseguir só em um mês, ainda seremos nós, com nossas risadas extravagantes, nosso jeito estranho de ver a vida, meu humor ácido, o jeito doce da Débora, o jeito paciente até certo ponto da Marília, seremos nós. Amo vocês imensamente, serei grata todos os dias por encontrar vocês nessa minha passagem na terra.", nome: "Bianca Letta" },
  { tipo: "frase", texto: "Nossa vida se torna preciosa qdo encontramos a parceira ideal. Que todos os seus sonhos se realizem e que vcs sejam sempre abençoadas e iluminadas. Re, Dri, Ro e Gu", nome: "" },
  { tipo: "frase", texto: "Que felicidade fazer parte desse momento🥰 Que vocês sejam imensamente felizes, que Deus abençoe vocês sempre 🥰🙏🏾✨", nome: "Kátia Oliveira" },
  { tipo: "frase", texto: "Que alegria poder compartilhar este lindo momento. Desejamos felicidades ao casal. 😘", nome: "Alice e Thomaz" },
  { tipo: "frase", texto: "Que este novo ciclo seja cheio de amor e cumplicidade! Estamos muito felizes de poder fazer parte desse momento lindo de celebração do amor!", nome: "Dayane e Filipe" },
  { tipo: "frase", texto: "Débora e Marilia! Desejo toda felicidade do mundo, muita luz, prosperidade, felicidade , união Estou super feliz por vocês .", nome: "GIsele e Jonildo" },
  { tipo: "frase", texto: "Meninas Espero que a vida de casadas de vocês sempre tenha amor, paz, união e reciprocidade.... Sejam muitooo felizes . Vocês merecem!", nome: "Vic Donadio" },
];

const LS_KEY = "mural-slides-v2";

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

// ── backup / restore (para levar slides + fotos/vídeos de um navegador pro outro) ──
const BACKUP_VERSION = 1;

function base64ToBlob(b64, mime) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

export async function exportBackup(slides) {
  const { keys, vals } = await idbAll();
  const media = {};
  for (let i = 0; i < keys.length; i++) {
    const v = vals[i];
    const dataUrl = await blobToDataURL(v.blob);
    media[keys[i]] = { tipo: v.tipo, mime: v.blob.type, t: v.t, data: dataUrl.split(",")[1] || "" };
  }
  return { version: BACKUP_VERSION, slides, media };
}

export async function importBackup(backup) {
  if (!backup || backup.version !== BACKUP_VERSION || !Array.isArray(backup.slides)) {
    throw new Error("Arquivo de backup inválido");
  }
  saveSlides(backup.slides);
  for (const [key, m] of Object.entries(backup.media || {})) {
    const mime = m.mime || (m.tipo === "video" ? "video/mp4" : "image/jpeg");
    await idbSet(key, { blob: base64ToBlob(m.data, mime), tipo: m.tipo, t: m.t });
  }
}
