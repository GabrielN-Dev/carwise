// ===================================================
// consultor-ia.js (VERSÃO COM IA REAL — API do Gemini, gratuita)
// Conecta o chat com a API do Gemini (Google). Prompt curto e fixo,
// resposta limitada só pra demonstrar o conceito funcionando.
// ===================================================

// ---------- CONFIGURAÇÃO ----------

// Cole aqui sua chave gerada no Google AI Studio (aistudio.google.com/apikey).
// É gratuita, não precisa de cartão de crédito.

const CHAVE_API = "CHAVE_API";

// Modelo usado — o "flash" é o mais rápido e o que tem mais cota gratuita.
const MODELO = "gemini-3.6-flash";

// Prompt fixo: define quem é a IA e o que ela sabe sobre o carro do usuário.
// const PROMPT_FIXO = `Você é o Consultor IA do CarWise. Responda em no máximo 3 frases, direto e simpático, como um mecânico de confiança.
// Dados do usuário: Rafael Moraes, plano Premium, VW Polo Highline 2023 Flex, 15.230 km rodados, próxima revisão aos 20.000 km.
// Nunca dê certeza absoluta de diagnóstico. Quando fizer sentido, sugira agendar na rede de oficinas parceiras do Clube.`;
const PROMPT_FIXO = `imagina que você é um cowboy caipira que fala tudo errado e não entende nada de carro`;

// Chave usada pra salvar o histórico no navegador
const CHAVE_HISTORICO = "carwise_historico_chat";

// ---------- ELEMENTOS DA PÁGINA ----------

const areaMensagens = document.querySelector(".area-mensagens");
const campoMensagem = document.querySelector(".campo-mensagem");
const botaoEnviar = document.querySelector(".botao-enviar");

// ---------- HISTÓRICO (localStorage) ----------

function carregarHistorico() {
  const salvo = localStorage.getItem(CHAVE_HISTORICO);
  return salvo ? JSON.parse(salvo) : [];
}

function salvarHistorico(historico) {
  localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
}

// ---------- CRIAÇÃO DOS BALÕES NA TELA ----------

function criarBalaoUsuario(texto) {
  const linha = document.createElement("div");
  linha.className = "linha-mensagem-usuario";
  linha.innerHTML = `
        <div class="balao-usuario cartao-interativo-leve">
            <p></p>
        </div>
    `;
  linha.querySelector("p").textContent = texto;
  return linha;
}

function criarBalaoIA(texto) {
  const linha = document.createElement("div");
  linha.className = "linha-mensagem-ia";
  linha.innerHTML = `
        <div class="container-resposta-ia">
            <div class="icone-avatar-ia-pequeno">
                <span class="material-symbols-outlined">smart_toy</span>
            </div>
            <div class="conteudo-resposta-ia">
                <div class="balao-ia cartao-interativo-leve">
                    <p></p>
                </div>
            </div>
        </div>
    `;
  linha.querySelector(".balao-ia p").textContent = texto;
  return linha;
}

function mostrarIndicadorDigitando() {
  const linha = document.createElement("div");
  linha.className = "linha-mensagem-ia";
  linha.id = "indicador-digitando";
  linha.innerHTML = `
        <div class="container-resposta-ia">
            <div class="icone-avatar-ia-pequeno">
                <span class="material-symbols-outlined">smart_toy</span>
            </div>
            <div class="conteudo-resposta-ia">
                <div class="balao-ia cartao-interativo-leve">
                    <p>Digitando...</p>
                </div>
            </div>
        </div>
    `;
  areaMensagens.appendChild(linha);
  areaMensagens.scrollTop = areaMensagens.scrollHeight;
}

function removerIndicadorDigitando() {
  const indicador = document.getElementById("indicador-digitando");
  if (indicador) indicador.remove();
}

// ---------- RENDERIZAR HISTÓRICO AO ABRIR A PÁGINA ----------

function renderizarHistorico() {
  const historico = carregarHistorico();
  areaMensagens.innerHTML = "";

  if (historico.length === 0) {
    areaMensagens.appendChild(
      criarBalaoIA(
        "Olá, Rafael! Sou o Consultor IA do CarWise. Pode me contar o que está acontecendo com o seu Polo Highline.",
      ),
    );
    return;
  }

  historico.forEach((mensagem) => {
    const balao =
      mensagem.role === "user"
        ? criarBalaoUsuario(mensagem.texto)
        : criarBalaoIA(mensagem.texto);
    areaMensagens.appendChild(balao);
  });

  areaMensagens.scrollTop = areaMensagens.scrollHeight;
}

// ---------- MONTAR HISTÓRICO NO FORMATO QUE O GEMINI ENTENDE ----------
// O Gemini espera: [{ role: "user"/"model", parts: [{ text: "..." }] }]
// A gente guarda simples ({ role, texto }) e converte na hora de enviar.
function converterHistoricoParaGemini(historico) {
  return historico.map((mensagem) => ({
    role: mensagem.role === "user" ? "user" : "model",
    parts: [{ text: mensagem.texto }],
  }));
}

// ---------- ENVIAR MENSAGEM PRA IA (API GEMINI) ----------

async function enviarMensagem() {
  const texto = campoMensagem.value.trim();
  if (!texto) return;

  // 1. Mostra a mensagem do usuário
  areaMensagens.appendChild(criarBalaoUsuario(texto));
  campoMensagem.value = "";
  areaMensagens.scrollTop = areaMensagens.scrollHeight;

  // 2. Monta o histórico que vai pra API, mas ainda NÃO salva no navegador.
  //    Só salvamos depois que a IA responder de verdade — assim, se der erro,
  //    não fica uma mensagem "órfã" (sem resposta) quebrando a alternância
  //    usuário/IA que o Gemini exige na conversa.
  const historicoAtual = carregarHistorico();
  const historicoParaEnviar = [
    ...historicoAtual,
    { role: "user", texto: texto },
  ];

  // 3. Mostra "digitando..." enquanto espera
  mostrarIndicadorDigitando();

  try {
    // 4. Chama a API do Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${CHAVE_API}`;

    const resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: PROMPT_FIXO }],
        },
        contents: converterHistoricoParaGemini(historicoParaEnviar),
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: "LOW",
          },
        },
      }),
    });

    const dados = await resposta.json();
    removerIndicadorDigitando();

    if (!resposta.ok) {
      throw new Error(dados.error?.message || "Erro na API");
    }

    const partes = dados.candidates[0].content.parts;
    const textoResposta = partes
      .filter((parte) => !parte.thought) // ignora qualquer parte marcada como "pensamento"
      .map((parte) => parte.text)
      .join("");

    // 5. Mostra a resposta da IA
    areaMensagens.appendChild(criarBalaoIA(textoResposta));
    console.log(textoResposta);
    areaMensagens.scrollTop = areaMensagens.scrollHeight;

    // 6. Só agora salva os DOIS turnos juntos (usuário + IA)
    salvarHistorico([
      ...historicoParaEnviar,
      { role: "model", texto: textoResposta },
    ]);
  } catch (erro) {
    removerIndicadorDigitando();
    areaMensagens.appendChild(
      criarBalaoIA("Ops, não consegui responder agora. Erro: " + erro.message),
    );
    console.error("Erro ao chamar a IA:", erro);
    // Não salva nada aqui de propósito — assim a próxima tentativa
    // não herda uma conversa quebrada.
  }
}

// ---------- LIMPAR CONVERSA ----------
// Botão simples pra resetar o histórico salvo — útil pra limpar uma
// conversa que ficou "quebrada" por causa de algum erro anterior.
function limparConversa() {
  localStorage.removeItem(CHAVE_HISTORICO);
  renderizarHistorico();
}

function adicionarBotaoLimpar() {
  const cabecalhoChat = document.querySelector(".cabecalho-chat");
  if (!cabecalhoChat) return;

  const botao = document.createElement("button");
  botao.textContent = "Limpar conversa";
  botao.style.cssText =
    "margin-left:auto; font-size:12px; color:#86868B; background:none; border:1px solid #D2D2D7; border-radius:9999px; padding:4px 12px; cursor:pointer;";
  botao.addEventListener("click", limparConversa);
  cabecalhoChat.appendChild(botao);
}

// ---------- EVENTOS ----------

botaoEnviar.addEventListener("click", enviarMensagem);

campoMensagem.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    enviarMensagem();
  }
});

// ---------- INICIALIZAÇÃO ----------

adicionarBotaoLimpar();
renderizarHistorico();
