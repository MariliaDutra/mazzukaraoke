import { useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";

const ROUND_TIME_SECONDS = 7; // tempo padrão de cada rodada

function App() {
  const [allWords, setAllWords] = useState([]);
  const [availableWords, setAvailableWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // histórico simples das rodadas
  const [history, setHistory] = useState([]);

  // área "admin" para inserir palavra
  const [newWord, setNewWord] = useState("");
  const [newLanguage, setNewLanguage] = useState("PT");
  const [newTheme, setNewTheme] = useState("");
  const [newYoutubeUrl, setNewYoutubeUrl] = useState("");
  const [savingWord, setSavingWord] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  const timerRef = useRef(null);

  // Carrega todas as palavras do Supabase
  useEffect(() => {
    async function loadWords() {
      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("karaoke_words")
        .select("*")
        .order("word", { ascending: true });

      if (error) {
        console.error("Erro ao carregar palavras:", error);
        setErrorMsg("Erro ao carregar palavras. Verifique RLS/políticas.");
        setLoading(false);
        return;
      }

      setAllWords(data || []);
      setAvailableWords(data || []);
      setLoading(false);
    }

    loadWords();
  }, []);

  // limpa timer ao desmontar o componente
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }

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

    // remove a palavra sorteada da lista disponível
    const remaining = [...availableWords];
    remaining.splice(randomIndex, 1);
    setAvailableWords(remaining);
  }

  function handleSkipWord() {
    // pula sem contar como rodada válida
    stopTimer();
    setCurrentWord(null);
    setTimeLeft(0);
  }

  function handleValidateRound() {
    if (!currentWord) return;

    stopTimer();

    setHistory((prev) => [
      { word: currentWord.word, language: currentWord.language, theme: currentWord.theme, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }

  function handleResetRaffle() {
    setAvailableWords(allWords);
    setCurrentWord(null);
    setTimeLeft(0);
    setIsRunning(false);
    setErrorMsg("");
  }

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

    // adiciona palavra nova nas listas
    setAllWords((prev) => [...prev, data]);
    setAvailableWords((prev) => [...prev, data]);

    // limpa formulário
    setNewWord("");
    setNewTheme("");
    setNewYoutubeUrl("");

    setSavingWord(false);
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Carregando palavras...</h1>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Roleta Karaoke</h1>

      {errorMsg && <p style={{ color: "#f87171", marginBottom: "1rem" }}>{errorMsg}</p>}

      {/* Palavra atual + timer */}
      <div style={styles.currentBox}>
        <p style={styles.label}>Palavra sorteada:</p>
        <p style={styles.word}>{currentWord ? currentWord.word : "—"}</p>
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
        <button style={styles.primaryButton} onClick={handleSortWord} disabled={isRunning && !!currentWord}>
          Sortear palavra
        </button>
        <button style={styles.secondaryButton} onClick={stopTimer} disabled={!isRunning}>
          Parar tempo
        </button>
        <button style={styles.secondaryButton} onClick={handleSkipWord}>
          Pular palavra
        </button>
        <button style={styles.secondaryButton} onClick={handleValidateRound} disabled={!currentWord}>
          Validar música
        </button>
      </div>

      <button style={styles.linkButton} onClick={handleResetRaffle}>
        Reiniciar roleta (recarregar todas as palavras)
      </button>

      {/* Histórico simples */}
      {history.length > 0 && (
        <div style={styles.historyBox}>
          <h2 style={{ marginBottom: "0.5rem" }}>Rodadas anteriores</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {history.map((item, idx) => (
              <li key={idx} style={{ marginBottom: "0.25rem", fontSize: "0.9rem" }}>
                <strong>{item.word}</strong>
                {item.theme ? ` · ${item.theme}` : ""}{" "}
                {item.language ? ` · ${item.language}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Admin: adicionar palavra */}
      <div style={styles.adminContainer}>
        <button style={styles.adminToggle} onClick={() => setAdminOpen((v) => !v)}>
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

            <button style={styles.primaryButton} type="submit" disabled={savingWord}>
              {savingWord ? "Salvando..." : "Salvar palavra"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#020617",
    color: "#e5e7eb",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "2rem 1rem 4rem",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "1.5rem",
  },
  currentBox: {
    background: "#020617",
    border: "1px solid #334155",
    borderRadius: "1rem",
    padding: "1.5rem 2rem",
    textAlign: "center",
    marginBottom: "1.5rem",
    maxWidth: "480px",
    width: "100%",
  },
  label: {
    fontSize: "0.9rem",
    color: "#9ca3af",
    marginBottom: "0.25rem",
  },
  word: {
    fontSize: "3rem",
    fontWeight: "bold",
    letterSpacing: "0.08em",
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
    padding: "0.75rem 1.5rem",
    borderRadius: "999px",
    border: "none",
    background: "#22c55e",
    color: "#0b1120",
    fontWeight: "bold",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "0.75rem 1.4rem",
    borderRadius: "999px",
    border: "none",
    background: "#1d4ed8",
    color: "#e5e7eb",
    fontWeight: "500",
    cursor: "pointer",
  },
  linkButton: {
    marginTop: "0.25rem",
    marginBottom: "1rem",
    background: "transparent",
    color: "#93c5fd",
    border: "none",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "0.9rem",
  },
  historyBox: {
    marginTop: "0.5rem",
    padding: "1rem 1.25rem",
    background: "#020617",
    borderRadius: "0.75rem",
    border: "1px solid #1e293b",
    maxWidth: "480px",
    width: "100%",
  },
  adminContainer: {
    marginTop: "2rem",
    maxWidth: "480px",
    width: "100%",
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
