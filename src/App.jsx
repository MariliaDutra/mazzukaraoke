// App.jsx
// -------------------------------------------------------
// IMPORTS BÁSICOS
// -------------------------------------------------------
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

function App() {
  // -----------------------------------------------------
  // ESTADOS GERAIS DO FLUXO
  // phase controla qual "tela" está visível
  //   - teams      => formação dos times / placar
  //   - categories => escolha de categoria
  //   - numbers    => escolha do número da pergunta
  //   - question   => pergunta na tela
  // showRules controla o modal inicial de regras
  // -----------------------------------------------------
  const [phase, setPhase] = useState("teams"); // começa na tela de times
  const [showRules, setShowRules] = useState(true);

  // -----------------------------------------------------
  // ESTADOS DE CATEGORIAS / PERGUNTAS
  // -----------------------------------------------------
  const [categories, setCategories] = useState([]);
  const [raffleCategories, setRaffleCategories] = useState([]); // para sortear categoria
  const [currentCategory, setCurrentCategory] = useState(null);
  const [questions, setQuestions] = useState([]); // lista dos números (1–30)
  const [currentQuestion, setCurrentQuestion] = useState(null); // pergunta aberta

  // controle da resposta da pergunta atual
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [correctAnswered, setCorrectAnswered] = useState(false);

  // loading global (usado em várias chamadas Supabase)
  const [loading, setLoading] = useState(false);

  // -----------------------------------------------------
  // ESTADOS DE TIMES / PLACAR
  //   - teams: array com { id, name, members, score }
  //   - teamsLoaded: indica se já carregou os times
  // -----------------------------------------------------
  const [teams, setTeams] = useState([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);

  // -----------------------------------------------------
  // ESTADOS DE RODADA / LIGHTNING
  //   - currentRound: 1 a 4
  //   - isLightning: se a rodada atual está em desempate
  // -----------------------------------------------------
  const [currentRound, setCurrentRound] = useState(1);
  const [isLightning, setIsLightning] = useState(false);

  // -----------------------------------------------------
  // EFEITO INICIAL: CARREGA CATEGORIAS AO MONTAR O APP
  // -----------------------------------------------------
  useEffect(() => {
    loadCategories();
  }, []);

  // -----------------------------------------------------
  // FUNÇÕES: TIMES (usa tabela players)
  // -----------------------------------------------------
  async function loadTeams() {
    setLoading(true);

    const { data, error } = await supabase
      .from("players") // tabela de jogadores
      .select("id, player, team_name") // colunas: id, nome do jogador, nome do time
      .order("team_name");

    if (error) {
      console.error("Erro ao carregar jogadores:", error);
      setLoading(false);
      return;
    }

    // Agrupa jogadores por nome de time
    const map = {};
    (data || []).forEach((row) => {
      const team = row.team_name || "Sem time";
      if (!map[team]) map[team] = [];
      map[team].push(row.player);
    });

    // Monta o array de teams com membros concatenados
    const grouped = Object.entries(map).map(([teamName, members], index) => ({
      id: index + 1,
      name: teamName,
      members: members.join("\n"),
      score: 0, // score local (placar) - pode ser ligado ao Supabase depois
    }));

    setTeams(grouped);
    setTeamsLoaded(true);
    setLoading(false);
  }

  // Ajusta o score de um time no placar local
  function changeScore(teamId, delta) {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId ? { ...t, score: (t.score || 0) + delta } : t
      )
    );
  }

  // -----------------------------------------------------
  // FUNÇÕES: CATEGORIAS / PERGUNTAS (usa tabela questions_dd)
  // -----------------------------------------------------
  async function loadCategories() {
    const { data, error } = await supabase
      .from("questions_dd")
      .select("theme")
      .order("theme");

    if (error) {
      console.error("Erro ao carregar categorias:", error);
      return;
    }

    if (data) {
      const unique = [...new Set(data.map((q) => q.theme))];

      // Mantém "Kids e Disney" sempre por último
      const kidsLabel = "Kids e Disney";
      const other = unique.filter((c) => c !== kidsLabel);
      const ordered = [...other, kidsLabel];

      setCategories(ordered);

      // Lista de categorias que podem ser sorteadas
      const raffle = ordered.filter((c) => c && c !== kidsLabel);
      setRaffleCategories(raffle);
    }
  }

  // Carrega a lista de perguntas (só os números) da categoria escolhida
  async function loadQuestions(theme) {
    setLoading(true);

    const { data, error } = await supabase
      .from("questions_dd")
      .select("id, question_number, used")
      .eq("theme", theme)
      .order("question_number");

    if (error) {
      console.error("Erro ao carregar perguntas:", error);
    }

    if (data) {
      setQuestions(data);
      setCurrentCategory(theme);
      setPhase("numbers"); // vai para tela de números (1–30)
    }

    setLoading(false);
  }

  // Carrega os dados completos de uma pergunta específica
  async function loadQuestion(id) {
    setLoading(true);
    setSelectedAnswers([]);
    setShowCorrectAnswer(false);
    setCorrectAnswered(false);

    const { data, error } = await supabase
      .from("questions_dd")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Erro ao carregar pergunta:", error);
    }

    if (data) {
      setCurrentQuestion(data);
      setPhase("question"); // vai para tela de pergunta
    }

    setLoading(false);
  }

  // Marca a pergunta como usada (used = true) e volta para os números
  async function markAsUsed(id) {
    await supabase.from("questions_dd").update({ used: true }).eq("id", id);
    await loadQuestions(currentCategory); // recarrega lista marcando como usada
    setPhase("numbers");
  }

  // -----------------------------------------------------
  // FUNÇÕES: LÓGICA DE RESPOSTA DA PERGUNTA
  // -----------------------------------------------------
  function handleAnswerClick(option) {
    // se já acertou ou já clicou nessa opção, não faz nada
    if (correctAnswered || selectedAnswers.includes(option)) return;

    const correctAnswer = currentQuestion.correct_option.toUpperCase().trim();
    const optionUpper = option.toUpperCase().trim();

    // adiciona opção clicada ao array de selecionadas
    setSelectedAnswers((prev) => [...prev, option]);

    // se for a correta, marca como acertada
    if (optionUpper === correctAnswer) {
      setCorrectAnswered(true);
    }
  }

  // Define o estilo visual de cada botão de alternativa
  function getButtonStyle(option) {
    const correctAnswer = currentQuestion.correct_option
      .toUpperCase()
      .trim();
    const optionUpper = option.toUpperCase().trim();

    // Verde para a correta (quando já acertou ou escolheu mostrar resposta)
    if ((correctAnswered || showCorrectAnswer) && optionUpper === correctAnswer) {
      return { background: "#4ade80", color: "white" };
    }

    // Vermelho para a opção errada que foi clicada
    if (selectedAnswers.includes(option) && optionUpper !== correctAnswer) {
      return { background: "#ef4444", color: "white" };
    }

    // Cinza desabilitado para opções já clicadas
    if (selectedAnswers.includes(option)) {
      return { background: "#333", opacity: 0.5, cursor: "not-allowed" };
    }

    // Padrão azul
    return { background: "#646cff" };
  }

  // Sorteia uma categoria dentre raffleCategories e carrega as perguntas
  function handleRaffleCategory() {
    if (!raffleCategories.length) return;
    const randomIndex = Math.floor(Math.random() * raffleCategories.length);
    const chosen = raffleCategories[randomIndex];
    loadQuestions(chosen);
  }

  // -----------------------------------------------------
  // TELAS (RENDER CONDICIONAL POR phase)
  // -----------------------------------------------------

  // Tela de loading global
  if (loading) {
    return (
      <div>
        <h1>Carregando...</h1>
      </div>
    );
  }

  // -----------------------------------------------------
  // TELA 0: REGRAS (modal inicial)
  // aparece enquanto showRules === true
  // -----------------------------------------------------
  if (showRules) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "rgba(0,0,0,0.7)",
          color: "white",
          textAlign: "left",
          padding: "2rem",
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.9)",
            padding: "2.5rem 3rem",
            borderRadius: "16px",
            maxWidth: "800px",
          }}
        >
          <h1 style={{ marginBottom: "1rem", textAlign: "center" }}>
            Regras do Jogo
          </h1>

          <ol style={{ marginTop: "1rem", lineHeight: 1.6 }}>
            <li>A ordem dos participantes é definida por sorteio.</li>
            <li>
              Na sua vez, você pode pegar um presente novo da pilha ou desafiar
              o presente de outra pessoa respondendo uma pergunta.
            </li>
            <li>
              Se acertar a pergunta, fica com o presente escolhido. Se errar,
              não ganha presente nessa rodada.
            </li>
            <li>
              Presentes podem ser roubados várias vezes ao longo do jogo, sempre
              por quem acerta a pergunta.
            </li>
            <li>
              Se alguém soprar a resposta fora da sua vez, pode perder o
              presente ou ir para o fim da fila.
            </li>
            <li>
              O jogo termina quando todos tiverem pelo menos um presente ou
              quando acabarem os presentes da pilha.
            </li>
          </ol>

          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => {
                setShowRules(false);
                setPhase("teams"); // vai para formação dos times/placar
              }}
              style={{
                marginTop: "2rem",
                padding: "1rem 2.5rem",
                fontSize: "1.1rem",
                borderRadius: "999px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Começar o jogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // TELA 1: TIMES / PLACAR (phase === "teams")
  //  - Sorteia times a partir da tabela players
  //  - Mostra membros e placar com +1 / -1
  //  - Botões para ir para categorias ou próxima rodada
  // -----------------------------------------------------
  // TELA 1: TIMES / PLACAR (phase === "teams")
if (phase === "teams") {
  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        padding: "2rem",
        color: "white",
        textAlign: "center",
      }}
    >
      {/* TÍTULO PRINCIPAL */}
      <h1
        style={{
          fontSize: "3rem",
          marginTop: "1rem",
          padding: "0.5rem 1.5rem",
          background: "rgba(0,0,0,0.6)",
          borderRadius: "999px",
          display: "inline-block",
        }}
      >
        Times e Rodadas
      </h1>

      {/* RODADA ATUAL EM DESTAQUE */}
      <p
  style={{
    marginTop: "1rem",
    display: "inline-block",
    padding: "0.3rem 1.2rem",
    fontSize: "1.2rem",
    fontWeight: "bold",
    color: "#fff",
    background: "rgba(0,0,0,0.7)",
    borderRadius: "999px",
    textDecoration: "none",
    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
  }}
>
  Rodada atual: {currentRound}
  {isLightning ? " – DESEMPATE" : ""}
</p>
      {/* COLUNA ESQUERDA: CONTROLES DE RODADA */}
      <div
        style={{
          marginTop: "2rem",
          display: "grid",
          gridTemplateColumns: "1fr 2fr 2fr", // esquerda = botões, meio e direita = times
          gap: "1.5rem",
          alignItems: "flex-start",
        }}
      >
        {/* COLUNA DE BOTÕES DE RODADA / DESEMPATE */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {/* Botão de DESEMPATE da rodada atual */}
          <button
            onClick={() => {
              // se já está em desempate, desligar; se não está, ligar e ir para categorias
              const nextIsLightning = !isLightning;
              setIsLightning(nextIsLightning);
              if (nextIsLightning) {
                setPhase("categories"); // vai escolher pergunta de desempate
              }
            }}
            style={{
              padding: "1rem 1.5rem",
              fontSize: "1rem",
              borderRadius: "8px",
              background: isLightning ? "#b91c1c" : "#1f2937",
              color: "#fff",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            {isLightning ? "Encerrar DESEMPATE" : "DESEMPATE da rodada"}
          </button>

          {/* Botão para iniciar próxima rodada */}
          <button
            onClick={() => {
              setCurrentRound((prev) => (prev < 4 ? prev + 1 : 4));
              setIsLightning(false);
              setPhase("categories"); // já entra nas categorias da nova rodada
            }}
            style={{
              padding: "1rem 1.5rem",
              fontSize: "1rem",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Iniciar próxima rodada
          </button>
        </div>

        {/* COLUNAS DE TIMES (PLACAR) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1.5rem",
            gridColumn: "span 2",
          }}
        >
          {!teamsLoaded && (
            <div
              style={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                onClick={loadTeams}
                style={{
                  padding: "1.5rem 4rem",
                  fontSize: "1.8rem",
                  borderRadius: "999px",
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                }}
              >
                Sortear times
              </button>
            </div>
          )}

          {teamsLoaded &&
            teams.map((team) => (
              <div
                key={team.id}
                style={{
                  background: "rgba(0,0,0,0.7)",
                  padding: "1rem",
                  borderRadius: "12px",
                  textAlign: "left",
                  minHeight: "180px",
                }}
              >
                <h2 style={{ marginBottom: "0.5rem" }}>{team.name}</h2>
                <p
                  style={{
                    whiteSpace: "pre-line",
                    marginBottom: "0.5rem",
                    fontSize: "0.95rem",
                  }}
                >
                  {team.members}
                </p>

                {/* PLACAR DO TIME */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginTop: "0.75rem",
                  }}
                >
                  <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                    Pontos: {team.score ?? 0}
                  </span>

                  <button
                    onClick={() => changeScore(team.id, 10)}
                    style={{
                      padding: "0.4rem 1rem",
                      borderRadius: "999px",
                      border: "none",
                      background: "#22c55e",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                  >
                    +10
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* BOTÃO CENTRAL PARA IR PARA AS CATEGORIAS DA RODADA ATUAL */}
      {teamsLoaded && (
        <div style={{ marginTop: "1.5rem" }}>
          <button
            onClick={() => setPhase("categories")}
            style={{
              padding: "1rem 3rem",
              fontSize: "1.2rem",
              borderRadius: "12px",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Ir para categorias
          </button>
        </div>
      )}
    </div>
  );
}

  // -----------------------------------------------------
  // TELA 2: CATEGORIAS (phase === "categories")
  //  - Escolha ou sorteio de categoria
  //  - Botão "Ver placar" para voltar à tela de times
  // -----------------------------------------------------
  if (phase === "categories") {
    return (
      <>
        {/* Barra de topo: botão Ver placar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <button
            onClick={() => setPhase("teams")}
            style={{
              padding: "0.8rem 1.6rem",
              borderRadius: "999px",
              background: "#111827",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Ver placar
          </button>
        </div>
        {/* Subtítulo com rodada atual */}
      <h2 style={{ textAlign: "center", marginTop: "0.5rem" }}>
        Rodada {currentRound} {isLightning ? "– DESEMPATE" : ""}
      </h2>

        {/* Coluna de categorias à direita */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            width: "100vw",
          }}
        >
          <div
            style={{
              width: "30vw",
              marginRight: "8vw",
              marginTop: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              alignItems: "stretch",
            }}
          >
            <h1 style={{ textAlign: "center" }}>Escolha uma Categoria</h1>

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => loadQuestions(cat)}
                style={{
                  width: "100%",
                  textAlign: "center",
                  ...(cat === "Kids e Disney"
                    ? {
                        background: "#ffcc00",
                        color: "#000",
                        fontWeight: "bold",
                      }
                    : {}),
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Botão grande de sortear categoria, no meio da tela */}
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "25%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <button
            onClick={handleRaffleCategory}
            style={{
              padding: "1.5rem 4rem",
              fontSize: "1.6rem",
              borderRadius: "12px",
              background: "#dc2626",
              color: "#ffffff",
              fontWeight: "bold",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              border: "none",
              cursor: "pointer",
            }}
          >
            SORTEAR CATEGORIA
          </button>
        </div>
      </>
    );
  }

  // -----------------------------------------------------
  // TELA 3: NÚMEROS (phase === "numbers")
  //  - Mostra grade de 1–30 da categoria atual
  //  - Botões Ver placar / Voltar para categorias
  // -----------------------------------------------------
  if (phase === "numbers") {
    return (
      <div>
        {/* Barra de topo: Ver placar + Voltar para categorias */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <button
            onClick={() => setPhase("teams")}
            style={{
              padding: "0.8rem 1.6rem",
              borderRadius: "999px",
              background: "#111827",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Ver placar
          </button>

          <button
            onClick={() => setPhase("categories")}
            style={{
              padding: "0.8rem 1.6rem",
              borderRadius: "999px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Voltar para Categorias
          </button>
        </div>

       <h2 style={{ marginTop: "0.5rem" }}>
  Rodada {currentRound} {isLightning ? "– DESEMPATE" : ""}
</h2>
<h1 style={{ marginTop: "0.5rem" }}>{currentCategory}</h1>

        {/* Grade de 1–30 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "1rem",
            marginTop: "2rem",
          }}
        >
          {questions.map((q) => (
            <button
              key={q.id}
              onClick={() => loadQuestion(q.id)}
              disabled={q.used}
              style={{
                background: q.used ? "#333" : "#646cff",
                textDecoration: q.used ? "line-through" : "none",
              }}
            >
              {q.question_number}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // TELA 4: PERGUNTA (phase === "question")
  //  - Mostra pergunta e alternativas A/B/C/D
  //  - Botões de navegação e controle de resposta
  // -----------------------------------------------------
 if (phase === "question" && currentQuestion) {
  return (
    <div>
      {/* Barra de topo: Ver placar + Voltar para números */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <button
          onClick={() => setPhase("teams")}
          style={{
            padding: "0.8rem 1.6rem",
            borderRadius: "999px",
            background: "#111827",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Ver placar
        </button>

        <button
          onClick={() => setPhase("numbers")}
          style={{
            padding: "0.8rem 1.6rem",
            borderRadius: "999px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Voltar para Números
        </button>
      </div>

      {/* Rodada + número da pergunta */}
      <h3 style={{ marginTop: "0.5rem", textAlign: "center" }}>
        Rodada {currentRound} {isLightning ? "– DESEMPATE" : ""}
      </h3>

      <h2 style={{ marginTop: "1.5rem", textAlign: "center" }}>
        Pergunta {currentQuestion.question_number}
      </h2>

      {/* Texto da pergunta */}
      <div style={{ marginTop: "2rem" }}>
        <h3>{currentQuestion.question}</h3>

        {/* Alternativas A/B/C/D como botões */}
        <div
          style={{
            marginTop: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <button
            onClick={() => handleAnswerClick("A")}
            style={getButtonStyle("A")}
          >
            <strong>A:</strong> {currentQuestion.option_a}
          </button>
          <button
            onClick={() => handleAnswerClick("B")}
            style={getButtonStyle("B")}
          >
            <strong>B:</strong> {currentQuestion.option_b}
          </button>
          <button
            onClick={() => handleAnswerClick("C")}
            style={getButtonStyle("C")}
          >
            <strong>C:</strong> {currentQuestion.option_c}
          </button>
          <button
            onClick={() => handleAnswerClick("D")}
            style={getButtonStyle("D")}
          >
            <strong>D:</strong> {currentQuestion.option_d}
          </button>
        </div>

        {/* Botão para marcar a pergunta como usada (quando acertou) */}
        {correctAnswered && (
          <button
            onClick={() => markAsUsed(currentQuestion.id)}
            style={{ marginTop: "2rem", background: "#4ade80" }}
          >
            Marcar como Usada
          </button>
        )}

        {/* Botão para mostrar a resposta correta (se errou) */}
        {selectedAnswers.length > 0 &&
          !correctAnswered &&
          !showCorrectAnswer && (
            <button
              onClick={() => setShowCorrectAnswer(true)}
              style={{
                marginTop: "2rem",
                background: "#fbbf24",
                color: "#000",
              }}
            >
              Mostrar Resposta
            </button>
          )}

        {/* Depois de mostrar a resposta, também pode marcar como usada */}
        {showCorrectAnswer && (
          <button
            onClick={() => markAsUsed(currentQuestion.id)}
            style={{ marginTop: "2rem", background: "#4ade80" }}
          >
            Marcar como Usada
          </button>
        )}
      </div>
    </div>
  );
}

  // Se nenhuma fase bater, não renderiza nada (fallback)
  return null;
}

export default App;
