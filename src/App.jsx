import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";

const ROUND_TIME_SECONDS = 10;

function App() {
  // Palavras
  const [allWords, setAllWords] = useState([]);
  const [availableWords, setAvailableWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Estado geral
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Histórico de palavras sorteadas
  const [history, setHistory] = useState([]);

  // Filtro de idioma
  const [languageFilter, setLanguageFilter] = useState("ALL");

  // Participantes
  const [participants, setParticipants] = useState([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [activeParticipantId, setActiveParticipantId] = useState(null);

  // Modal do vídeo YouTube
const [videoModalOpen, setVideoModalOpen] = useState(false);
const [currentVideoUrl, setCurrentVideoUrl] = useState("");

  // Admin palavras
  const [newWord, setNewWord] = useState("");
  const [newLanguage, setNewLanguage] = useState("PT");
  const [newTheme, setNewTheme] = useState("");
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");
  const [savingWord, setSavingWord] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const timerRef = useRef(null);

  // 1) Carrega palavras do Supabase quando idioma muda
  useEffect(() => {
    async function loadWords() {
      setLoading(true);
      setErrorMsg("");

      let query = supabase.from("karaoke_words").select("*");
      if (languageFilter === "PT") {
        query = query.eq("language", "PT");
      }
      query = query.order("word", { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao carregar palavras:", error);
        setErrorMsg("Erro ao carregar palavras. Verifique RLS/políticas.");
        setLoading(false);
        return;
      }

      setAllWords(data || []);
      setAvailableWords(data || []);
      setCurrentWord(null);
      setTimeLeft(0);
      setIsRunning(false);
      setHistory([]);
      setLoading(false);
    }

    loadWords();
  }, [languageFilter]);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 2) Timer
  function startTimer() {
    setIsRunning(true);
    setTimeLeft(ROUND_TIME_SECONDS);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsRunning(false);
  }

  // 3) Sorteio da palavra
  function handleSortWord() {
    setErrorMsg("");

    if (!availableWords.length) {
      setCurrentWord(null);
      setTimeLeft(0);
      setIsRunning(false);
      setErrorMsg("Acabaram as palavras disponíveis. Clique em Reiniciar roleta.");
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const chosen = availableWords[randomIndex];

    setCurrentWord(chosen);
    startTimer();

    const remaining = [...availableWords];
    remaining.splice(randomIndex, 1);
    setAvailableWords(remaining);

    setHistory((prev) => [
      {
        id: chosen.id,
        word: chosen.word,
        language: chosen.language,
        theme: chosen.theme,
        createdAt: new Date().toISOString(),
        validated: false,
      },
      ...prev,
    ]);
  }

  function handleSkipWord() {
    stopTimer();
    setCurrentWord(null);
    setTimeLeft(0);
  }

  // 4) Validar palavra: abre vídeo se existir + dá ponto
function handleValidateRound() {
  if (!currentWord) return;
  stopTimer();

  // Marca histórico como validado
  setHistory((prev) =>
    prev.map((item, index) =>
      index === 0 && item.word === currentWord.word
        ? { ...item, validated: true }
        : item
    )
  );

  // Dá ponto ao participante ativo (se tiver)
  if (activeParticipantId) {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === activeParticipantId ? { ...p, score: p.score + 1 } : p
      )
    );
  }

  // ✅ SE TEM VÍDEO, abre modal
  if (currentWord.youtube_url) {
    setCurrentVideoUrl(currentWord.youtube_url);
    setVideoModalOpen(true);
  }
}

  // Reinicia só a roleta (palavras da sessão)
  function handleResetRaffle() {
    setAvailableWords(allWords);
    setCurrentWord(null);
    setTimeLeft(0);
    setIsRunning(false);
    setErrorMsg("");
    setHistory([]);
  }

  // Zera TUDO: palavras da sessão, histórico, participantes, pontuação
  function handleResetGame() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    setCurrentWord(null);
    setTimeLeft(0);
    setIsRunning(false);
    setErrorMsg("");
    setHistory([]);
    setAvailableWords(allWords);
    setParticipants([]);
    setActiveParticipantId(null);
  }

  // 5) Inserir palavra no Supabase
  async function handleAddWord(e) {
    e.preventDefault();
    if (!newWord.trim()) return;

    setSavingWord(true);
    setErrorMsg("");

    const payload = {
      word: newWord.trim(),
      language: newLanguage || null,
      theme: newTheme || null,
      youtube_url: newYoutubeUrl || null,
    };

    const { data, error } = await supabase
      .from("karaoke_words")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao inserir palavra:", error);
      setErrorMsg("Erro ao inserir palavra. Confira políticas de insert/update.");
      setSavingWord(false);
      return;
    }

    const matchesFilter =
      languageFilter === "ALL" || data.language === languageFilter;

    if (matchesFilter) {
      setAllWords((prev) => [...prev, data]);
      setAvailableWords((prev) => [...prev, data]);
    }

    setNewWord("");
    setNewTheme("");
    setNewYoutubeUrl("");
    setSavingWord(false);
  }

  // 6) Participantes
  function handleAddParticipant(e) {
    e.preventDefault();
    if (!newParticipantName.trim()) return;

    const newP = {
      id: Date.now(),
      name: newParticipantName.trim(),
      score: 0,
    };

    setParticipants((prev) => [...prev, newP]);
    setNewParticipantName("");

    if (!activeParticipantId) {
      setActiveParticipantId(newP.id);
    }
  }

  function changeScore(id, delta) {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, score: p.score + delta } : p
      )
    );
  }

  function handleRemoveParticipant(id) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    if (activeParticipantId === id) {
      setActiveParticipantId(null);
    }
  }

// Extrai ID do YouTube e mantém timestamp (?t=XX)
function extractVideoId(url) {
  // Pega o ID do vídeo
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = (match && match[2].length === 11) ? match[2] : null;
  
  if (!videoId) return null;
  
  // Extrai timestamp da URL original (?t=81 ou &t=120s)
  const timeMatch = url.match(/[?&]t=([\d]+)/);
  const startTime = timeMatch ? `&start=${timeMatch[1]}` : '';
  
  return `${videoId}${startTime}`;
}


  // 7) Render
  if (loading) {
    return (
      <div className="page">
        <div className="main-overlay">
          <h1 className="app-title">Vitrola Mágica</h1>
          <p className="app-subtitle">carregando palavras...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="main-overlay">
        {/* Título + idioma */}
        <div className="header-row">
          <div>
            <h1 className="app-title">Vitrola Mágica</h1>
            <p className="app-subtitle">cante se lembrar</p>
          </div>

          <div className="language-switch">
            <button
              className={
                languageFilter === "PT" ? "lang-btn--active" : "lang-btn"
              }
              onClick={() => setLanguageFilter("PT")}
            >
              BR
            </button>
            <button
              className={
                languageFilter === "ALL" ? "lang-btn--active" : "lang-btn"
              }
              onClick={() => setLanguageFilter("ALL")}
            >
              ALL
            </button>
          </div>
        </div>

        {errorMsg && <p className="error-message">{errorMsg}</p>}

        {/* 3 colunas: participantes | roleta | histórico */}
        <div className="content-row">
          {/* Coluna 1: Participantes */}
          <div className="participants-column">
            <div className="participants">
              <h2 className="participants-title">Participantes</h2>

              <form
                className="participants-form"
                onSubmit={handleAddParticipant}
              >
                <input
                  className="participants-input"
                  placeholder="Nome do participante"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                />
                <button type="submit" className="btn-primary">
                  Adicionar
                </button>
              </form>

              <div className="participant-list">
                {participants.length === 0 ? (
                  <p className="history-empty">Nenhum participante ainda.</p>
                ) : (
                  participants.map((p) => (
                    <div
                      key={p.id}
                      className={
                        "participant-item" +
                        (p.id === activeParticipantId
                          ? " participant-item--active"
                          : "")
                      }
                      onClick={() => setActiveParticipantId(p.id)}
                    >
                      <span>{p.name}</span>
                      <div className="participant-score-buttons">
                        <button
                          type="button"
                          className="participant-score-btn participant-score-btn--minus"
                          onClick={(e) => {
                            e.stopPropagation();
                            changeScore(p.id, -1);
                          }}
                        >
                          −
                        </button>
                        <span className="participant-score-value">
                          {p.score}
                        </span>
                        <button
                          type="button"
                          className="participant-score-btn participant-score-btn--plus"
                          onClick={(e) => {
                            e.stopPropagation();
                            changeScore(p.id, +1);
                          }}
                        >
                          +
                        </button>
                        {/* Botão para remover participante */}
                        <button
                          type="button"
                          className="participant-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveParticipant(p.id);
                          }}
                        >
                          x
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Coluna 2: Roleta */}
          <div className="center-panel">
            {/* Botão sortear em cima da caixa */}
            <button
              className="btn-primary btn-sortear-top"
              onClick={handleSortWord}
              disabled={isRunning && !!currentWord}
            >
              Sortear palavra
            </button>

            <div className="current-box">
              <p className="current-label">Palavra sorteada:</p>
              <p className="current-word">
                {currentWord ? currentWord.word.toUpperCase() : "—"}
              </p>
              {currentWord && (
                <p className="current-meta">
                  {currentWord.language
                    ? `Idioma: ${currentWord.language}`
                    : ""}
                </p>
              )}
              <p className="current-timer">Tempo: {timeLeft}s</p>
            </div>

            {/* Botão parar grande, vermelho, embaixo da caixa */}
            <button
              className="btn-stop-big"
              onClick={stopTimer}
              disabled={!isRunning}
            >
              Parar tempo
            </button>

            {/* Botões auxiliares embaixo */}
            <div className="buttons-row">
              <button className="btn-secondary" onClick={handleSkipWord}>
                Pular palavra
              </button>
              <button
  className="btn-secondary"
  onClick={handleValidateRound}
  disabled={!currentWord}
>
  Validar Palavra  {/* ← MUDOU DE "música" pra "Palavra" */}
</button>
             <button className="btn-secondary" onClick={handleResetRaffle}>
                Reiniciar roleta
              </button>
              <button className="btn-secondary" onClick={handleResetGame}>
                Zerar jogo
              </button>
            </div>
          </div>

          {/* Coluna 3: Histórico */}
          <div className="right-panel">
            <h2 className="history-title">Palavras que já saíram</h2>
            {history.length === 0 ? (
              <p className="history-empty">Nenhuma palavra sorteada ainda.</p>
            ) : (
              <ul className="history-list">
                {history.map((item) => (
                  <li key={item.createdAt} className="history-item">
                    <span className="history-word">
                      {item.word.toUpperCase()}
                    </span>
                    {item.validated && (
                      <span className="history-meta">✓</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

                {/* Modal do vídeo YouTube */}
        {videoModalOpen && (
          <div 
            className="video-modal-overlay"
            onClick={() => setVideoModalOpen(false)}
          >
            <div 
              className="video-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="video-modal-close"
                onClick={() => setVideoModalOpen(false)}
              >
                ×
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${extractVideoId(currentVideoUrl)}?autoplay=1`}
                className="video-iframe"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Vídeo sugerido"
              />
            </div>
          </div>
        )}

        {/* Admin: adicionar palavra */}
        <div className="admin-container">
          <button
            className="admin-toggle"
            onClick={() => setAdminOpen((v) => !v)}
          >
            {adminOpen ? "Fechar admin" : "Abrir admin (adicionar palavra)"}
          </button>

          {adminOpen && (
            <form className="admin-form" onSubmit={handleAddWord}>
              <h2 style={{ marginBottom: "0.5rem" }}>Adicionar nova palavra</h2>

              <label className="field-label">
                Palavra*
                <input
                  className="field-input"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  required
                />
              </label>

              <label className="field-label">
                Idioma
                <select
                  className="field-input"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                >
                  <option value="PT">PT</option>
                  <option value="EN">EN</option>
                  <option value="">Outro / vazio</option>
                </select>
              </label>

              <label className="field-label">
                Tema (opcional)
                <input
                  className="field-input"
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                />
              </label>

              <label className="field-label">
                URL do YouTube (opcional)
                <input
                  className="field-input"
                  value={newYoutubeUrl}
                  onChange={(e) => setNewYoutubeUrl(e.target.value)}
                />
              </label>

              <button className="btn-primary" type="submit" disabled={savingWord}>
                {savingWord ? "Salvando..." : "Salvar palavra"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
