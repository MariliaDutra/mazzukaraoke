import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";

// Tempo padrão de cada rodada (segundos)
const ROUND_TIME_SECONDS = 7;

function App() {
  // Todas as palavras carregadas do Supabase (respeitando filtro de idioma)
  const [allWords, setAllWords] = useState([]);
  // Palavras ainda disponíveis para sortear na sessão atual
  const [availableWords, setAvailableWords] = useState([]);
  // Palavra atualmente sorteada
  const [currentWord, setCurrentWord] = useState(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Estados de carregamento / erro
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Histórico de palavras já sorteadas (para exibir no painel da direita)
  const [history, setHistory] = useState([]);

  // Filtro de idioma: "PT" ou "ALL"
  const [languageFilter, setLanguageFilter] = useState("ALL");

  // Área "admin" para inserir palavra
  const [newWord, setNewWord] = useState("");
  const [newLanguage, setNewLanguage] = useState("PT");
  const [newTheme, setNewTheme] = useState("");
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");
  const [savingWord, setSavingWord] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Referência para o intervalo do timer
  const timerRef = useRef(null);

  // Carrega palavras sempre que o filtro de idioma muda
  useEffect(() => {
    async function loadWords() {
      setLoading(true);
      setErrorMsg("");

      // Monta query base
      let query = supabase.from("karaoke_words").select("*");

      // Se filtro BR estiver ativo, traz só linguagem PT
      if (languageFilter === "PT") {
        query = query.eq("language", "PT");
      }

      // Ordena só para ficar consistente
      query = query.order("word", { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao carregar palavras:", error);
        setErrorMsg("Erro ao carregar palavras. Verifique RLS/políticas.");
        setLoading(false);
        return;
      }

      // Quando troca o filtro, zera estado da roleta
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

  // Limpa timer ao desmontar componente
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Inicia o timer de contagem regressiva
  function startTimer() {
    setIsRunning(true);
    setTimeLeft(ROUND_TIME_SECONDS);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

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

  // Para o timer
  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }

  // Sorteia uma palavra da lista disponível
  function handleSortWord() {
    setErrorMsg("");

    if (!availableWords.length) {
      // Se não houver palavras disponíveis, avisa para reiniciar roleta
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

    // Remove a palavra escolhida da lista disponível, para não repetir
    const remaining = [...availableWords];
    remaining.splice(randomIndex, 1);
    setAvailableWords(remaining);

    // Atualiza histórico (mais recente no topo)
    setHistory((prev) => [
      {
        id: chosen.id,
        word: chosen.word,
        language: chosen.language,
        theme: chosen.theme,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  // Pula a palavra atual (não volta para a lista, continua como "usada" na sessão)
  function handleSkipWord() {
    stopTimer();
    setCurrentWord(null);
    setTimeLeft(0);
  }

  // Validar música só para efeito de fluxo (aqui não altera nada extra)
  function handleValidateRound() {
    if (!currentWord) return;
    stopTimer();
    // Se algum dia quiser registrar mais info da música, pode ser aqui
  }

  // Recarrega todas as palavras na sessão (não mexe no banco)
  function handleResetRaffle() {
    setAvailableWords(allWords);
    setCurrentWord(null);
    setTimeLeft(0);
    setIsRunning(false);
    setErrorMsg("");
    setHistory([]);
  }

  // Insere nova palavra via Supabase (modo admin)
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

    // Atualiza listas locais (respeitando filtro atual)
    const matchesFilter =
      languageFilter === "ALL" || data.language === languageFilter;

    if (matchesFilter) {
      setAllWords((prev) => [...prev, data]);
      setAvailableWords((prev) => [...prev, data]);
    }

    // Limpa formulário
    setNewWord("");
    setNewTheme("");
    setNewYoutubeUrl("");

    setSavingWord(false);
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.mainOverlay}>
          <h1 style={styles.title}>Vitrola Mágica</h1>
          <p style={styles.subtitle}>carregando palavras...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Container com fundo semi-transparente sobre o background */}
      <div style={styles.mainOverlay}>
        {/* Topo: título à esquerda, filtro de idioma à direita */}
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Vitrola Mágica</h1>
            <p style={styles.subtitle}>cante se lembrar</p>
          </div>

          <div style={styles.languageSwitch}>
            {/* Botão BR (PT apenas) */}
            <button
              style={
                languageFilter === "PT"
                  ? styles.langButtonActive
                  : styles.langButton
              }
              onClick={() => setLanguageFilter("PT")}
            >
              🇧🇷
            </button>

            {/* Botão ALL (todas as línguas) */}
            <button
              style={
                languageFilter === "ALL"
                  ? styles.langButtonActive
                  : styles.langButton
              }
              onClick={() => setLanguageFilter("ALL")}
            >
              ALL
            </button>
          </div>
        </div>

        {errorMsg && (
          <p style={{ color: "#fecaca", marginBottom: "0.75rem" }}>
            {errorMsg}
          </p>
        )}

        {/* Layout 3/4 (roleta) + 1/4 (histórico) */}
        <div style={styles.contentRow}>
          {/* Área da roleta (75%) */}
          <div style={styles.leftPanel}>
            {/* Caixa central com palavra e timer */}
            <div style={styles.currentBox}>
              <p style={styles.label}>Palavra sorteada:</p>
              <p style={styles.word}>
                {currentWord ? currentWord.word.toUpperCase() : "—"}
              </p>
              {currentWord && (
                <p style={styles.meta}>
                  {currentWord.theme ? `Tema: ${currentWord.theme} · ` : ""}
                  {currentWord.language ? `Idioma: ${currentWord.language}` : ""}
                </p>
              )}
              <p style={styles.timer}>Tempo: {timeLeft}s</p>
            </div>

            {/* Botões principais */}
            <div style={styles.buttonsRow}>
              <button
                style={styles.primaryButton}
                onClick={handleSortWord}
                disabled={isRunning && !!currentWord}
              >
                Sortear palavra
              </button>
              <button
                style={styles.secondaryButton}
                onClick={stopTimer}
                disabled={!isRunning}
              >
                Parar tempo
              </button>
              <button
                style={styles.secondaryButton}
                onClick={handleSkipWord}
              >
                Pular palavra
              </button>
              <button
                style={styles.secondaryButton}
                onClick={handleValidateRound}
                disabled={!currentWord}
              >
                Validar música
              </button>
            </div>

            <button style={styles.linkButton} onClick={handleResetRaffle}>
              Reiniciar roleta (recarregar todas as palavras)
            </button>
          </div>

          {/* Painel direito (25%) com palavras já sorteadas */}
          <div style={styles.rightPanel}>
            <h2 style={styles.historyTitle}>Palavras que já saíram</h2>
            {history.length === 0 ? (
              <p style={styles.historyEmpty}>Nenhuma palavra sorteada ainda.</p>
            ) : (
              <ul style={styles.historyList}>
                {history.map((item) => (
                  <li key={item.createdAt} style={styles.historyItem}>
                    <span style={styles.historyWord}>
                      {item.word.toUpperCase()}
                    </span>
                    {item.theme && (
                      <span style={styles.historyMeta}>{item.theme}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Admin: adicionar palavra (fica embaixo) */}
        <div style={styles.adminContainer}>
          <button
            style={styles.adminToggle}
            onClick={() => setAdminOpen((v) => !v)}
          >
            {adminOpen ? "Fechar admin" : "Abrir admin (adicionar palavra)"}
          </button>

          {adminOpen && (
            <form style={styles.adminForm} onSubmit={handleAddWord}>
              <h2 style={{ marginBottom: "0.5rem" }}>Adicionar nova palavra</h2>
              <label style={styles.fieldLabel}>
                Palavra*
                <input
                  style={styles.input}
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  required
                />
              </label>

              <label style={styles.fieldLabel}>
                Idioma
                <select
                  style={styles.input}
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                >
                  <option value="PT">PT</option>
                  <option value="EN">EN</option>
                  <option value="">Outro / vazio</option>
                </select>
              </label>

              <label style={styles.fieldLabel}>
                Tema (opcional)
                <input
                  style={styles.input}
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                />
              </label>

              <label style={styles.fieldLabel}>
                URL do YouTube (opcional)
                <input
                  style={styles.input}
                  value={newYoutubeUrl}
                  onChange={(e) => setNewYoutubeUrl(e.target.value)}
                />
              </label>

              <button
                style={styles.primaryButton}
                type="submit"
                disabled={savingWord}
              >
                {savingWord ? "Salvando..." : "Salvar palavra"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Estilos inline simples para manter num único arquivo
const styles = {
  // Página inteira: só garante altura e fonte
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "2rem 1rem 4rem",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    // IMPORTANTE: o background de imagem está no CSS global (index.css)
    // aqui deixamos transparente para a imagem aparecer
    background: "transparent",
  },

  // Caixa principal semi-transparente sobre o background
  mainOverlay: {
    width: "100%",
    maxWidth: "1200px",
    background: "rgba(3, 7, 18, 0.82)", // preto com transparência
    borderRadius: "1rem",
    border: "1px solid rgba(148, 163, 184, 0.4)",
    padding: "1.5rem 1.75rem 2rem",
    color: "#e5e7eb",
    boxShadow: "0 25px 50px rgba(15, 23, 42, 0.7)",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.25rem",
    gap: "1rem",
  },

  title: {
    fontSize: "2.4rem",
    margin: 0,
    padding: "0.2rem 1rem",
    background: "#b91c1c",
    borderRadius: "0.75rem",
  },

  subtitle: {
    marginTop: "0.3rem",
    marginLeft: "0.5rem",
    fontSize: "0.95rem",
    fontStyle: "italic",
    color: "#e5e7eb",
  },

  languageSwitch: {
    display: "flex",
    gap: "0.5rem",
  },

  langButton: {
    padding: "0.4rem 0.8rem",
    borderRadius: "999px",
    border: "1px solid #4b5563",
    background: "rgba(15,23,42,0.8)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontSize: "0.9rem",
  },

  langButtonActive: {
    padding: "0.4rem 0.8rem",
    borderRadius: "999px",
    border: "1px solid #facc15",
    background: "#facc15",
    color: "#111827",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "bold",
  },

  contentRow: {
    display: "flex",
    gap: "1.25rem",
    alignItems: "stretch",
  },

  // Painel da esquerda (3/4)
  leftPanel: {
    flex: 3,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  // Painel da direita (1/4)
  rightPanel: {
    flex: 1,
    background: "rgba(15, 23, 42, 0.9)",
    borderRadius: "0.75rem",
    padding: "0.75rem 0.9rem",
    border: "1px solid rgba(55, 65, 81, 0.8)",
    maxHeight: "420px",
    overflowY: "auto",
  },

  historyTitle: {
    fontSize: "1.1rem",
    margin: "0 0 0.5rem 0",
  },

  historyEmpty: {
    fontSize: "0.9rem",
    color: "#9ca3af",
  },

  historyList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },

  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.9rem",
    padding: "0.25rem 0",
    borderBottom: "1px dashed rgba(55, 65, 81, 0.6)",
  },

  historyWord: {
    fontWeight: "bold",
  },

  historyMeta: {
    fontSize: "0.78rem",
    color: "#9ca3af",
    marginLeft: "0.5rem",
  },

  currentBox: {
    background: "rgba(3, 7, 18, 0.95)",
    border: "1px solid #4b5563",
    borderRadius: "1rem",
    padding: "1.5rem 2rem",
    textAlign: "center",
    marginBottom: "1.5rem",
    maxWidth: "540px",
    width: "100%",
  },

  label: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    marginBottom: "0.25rem",
  },

  word: {
    fontSize: "3.2rem",
    fontWeight: "bold",
    letterSpacing: "0.12em",
    margin: "0.25rem 0",
  },

  meta: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    marginTop: "0.5rem",
  },

  timer: {
    marginTop: "0.75rem",
    fontSize: "1.4rem",
    fontWeight: "bold",
    color: "#fbbf24",
  },

  buttonsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    justifyContent: "center",
    marginBottom: "0.75rem",
  },

  primaryButton: {
    padding: "0.75rem 1.7rem",
    borderRadius: "999px",
    border: "none",
    background: "#22c55e",
    color: "#0b1120",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "1rem",
  },

  secondaryButton: {
    padding: "0.75rem 1.4rem",
    borderRadius: "999px",
    border: "none",
    background: "#1d4ed8",
    color: "#e5e7eb",
    fontWeight: "500",
    cursor: "pointer",
    fontSize: "0.95rem",
  },

  linkButton: {
    marginTop: "0.25rem",
    marginBottom: "0.5rem",
    background: "transparent",
    color: "#93c5fd",
    border: "none",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "0.9rem",
  },

  adminContainer: {
    marginTop: "1.5rem",
  },

  adminToggle: {
    padding: "0.5rem 1rem",
    borderRadius: "999px",
    border: "1px solid #4b5563",
    background: "transparent",
    color: "#e5e7eb",
    cursor: "pointer",
    fontSize: "0.9rem",
  },

  adminForm: {
    marginTop: "1rem",
    padding: "1rem 1.25rem",
    borderRadius: "0.75rem",
    border: "1px solid #1f2937",
    background: "#020617",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },

  fieldLabel: {
    fontSize: "0.85rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },

  input: {
    padding: "0.5rem 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid #4b5563",
    background: "#020617",
    color: "#e5e7eb",
  },
};

export default App;
