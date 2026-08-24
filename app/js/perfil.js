/**
 * ============================================================================
 * ARQUIVO: perfil.js
 * OBJETIVO: Gerenciar a sessão, carregamento de dados, edição de perfil,
 *           upload e compressão de foto de perfil e fluxo seguro de troca de senha.
 * ARQUITETURA: 100% Front-end (Vanilla JavaScript + LocalStorage + API Web Crypto)
 * ============================================================================
 */

// Constante global com o caminho da tela de login para redirecionamento
const LOGIN_URL = "../public/login.html";

/**
 * 1. VERIFICAÇÃO DE SEGURANÇA DA SESSÃO
 * Se o usuário tentar acessar a página de perfil digitando a URL direto sem estar
 * logado (localStorage "logado" !== "true"), ele é chutado de volta para o login.
 */
if (localStorage.getItem("logado") !== "true") {
    window.location.replace(LOGIN_URL);
}

/**
 * ============================================================================
 * 2. FUNÇÕES AUXILIARES DE CRIPTOGRAFIA E VALIDAÇÃO DE SENHA
 * ============================================================================
 */

/**
 * Calcula a força da senha baseada em critérios de complexidade (tamanho, maiúsculas, números, símbolos).
 * @param {string} senha - A senha digitada pelo usuário.
 * @returns {number} Um número de 0 a 4 indicando o nível de força.
 */
function calcularForcaSenha(senha) {
    let forca = 0;
    if (senha.length === 0) return 0;
    if (senha.length >= 6) forca++;
    if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) forca++;
    if (/[0-9]/.test(senha)) forca++;
    if (/[^A-Za-z0-9]/.test(senha)) forca++;
    return forca;
}

/**
 * Gera um hash SHA-256 seguro utilizando a API nativa do navegador (Crypto Subtle).
 * Usado para nunca salvar senhas em texto puro no localStorage.
 * @param {string} senha - Senha em texto puro.
 * @returns {Promise<string>} O hash hexadecimal resultante.
 */
async function gerarHashSenha(senha) {
    const encoder = new TextEncoder();
    const data = encoder.encode(senha);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * ============================================================================
 * 3. INICIALIZAÇÃO DA PÁGINA (Disparado quando o HTML termina de carregar)
 * ============================================================================
 */
document.addEventListener("DOMContentLoaded", () => {

    // --- MAPEAMENTO DOS ELEMENTOS DO DOM (TEXTOS E DADOS) ---
    const spanNomeMenu = document.getElementById("nome-usuario-menu");
    const spanPlanoMenu = document.getElementById("plano-usuario-menu");
    const h3NomePerfil = document.getElementById("nome-destaque-perfil");
    const pDataMembro = document.getElementById("texto-membro-perfil");

    // Inputs do formulário de Dados Pessoais
    const inputNome = document.getElementById("input-nome");
    const inputEmail = document.getElementById("input-email");
    const inputTelefone = document.getElementById("input-telefone");
    const inputCpf = document.getElementById("input-cpf");
    const inputCep = document.getElementById("input-cep");
    const inputRua = document.getElementById("input-rua");
    const inputNumero = document.getElementById("input-numero");
    const inputComplemento = document.getElementById("input-complemento");

    // Botões de ação do Perfil
    const btnEditar = document.getElementById("btn-editar");
    const btnCancelar = document.getElementById("btn-cancelar");
    const btnSalvar = document.getElementById("btn-salvar");
    const inputsEditaveis = [inputNome, inputEmail, inputTelefone, inputCep, inputRua, inputNumero, inputComplemento];

    // --- MAPEAMENTO DOS ELEMENTOS DE FOTO DE PERFIL ---
    const inputFoto = document.getElementById("input-foto-perfil");
    const btnAlterarFoto = document.getElementById("btn-alterar-foto");
    const containerAvatar = document.getElementById("container-avatar");
    const imgAvatarPerfil = document.getElementById("imagem-avatar-perfil");
    const imgAvatarMenu = document.getElementById("avatar-menu-lateral");

    // --- MAPEAMENTO DOS ELEMENTOS DE SEGURANÇA (SENHA) ---
    const blocoInfoSenha = document.getElementById("bloco-info-senha");
    const formTrocaSenha = document.getElementById("formulario-troca-senha");
    const passo1Senha = document.getElementById("passo-1-senha");
    const passo2Senha = document.getElementById("passo-2-senha");
    
    const btnAbrirTrocaSenha = document.getElementById("btn-abrir-troca-senha");
    const btnVerificarSenha = document.getElementById("btn-verificar-senha");
    const btnCancelarPasso1 = document.getElementById("btn-cancelar-passo1");
    const btnCancelarPasso2 = document.getElementById("btn-cancelar-passo2");
    const btnSalvarSenha = document.getElementById("btn-salvar-senha");

    const inputSenhaAtual = document.getElementById("senha-atual");
    const inputSenhaNova = document.getElementById("senha-nova");
    const inputConfSenhaNova = document.getElementById("confirmar-senha-nova");
    
    const strengthBar = document.getElementById("strength-bar-perfil");
    const strengthText = document.getElementById("strength-text-perfil");


    /**
     * ========================================================================
     * 4. LÓGICA DE CARREGAMENTO E EDIÇÃO DE DADOS PESSOAIS
     * ========================================================================
     */

    /**
     * Lê o usuário logado atualmente no localStorage e popula todos os campos da tela.
     */
    function carregarDadosNaTela() {
        const usuarioSalvo = localStorage.getItem("usuarioLogado");
        if (usuarioSalvo) {
            const usuario = JSON.parse(usuarioSalvo);

            // Desenho SVG padrão (bonequinho cinza neutro) caso o usuário não tenha foto
            const FOTO_PADRAO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a0aabf'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

            // Preenche textos do menu e cabeçalho
            if (spanNomeMenu && usuario.nome) spanNomeMenu.textContent = usuario.nome;
            if (h3NomePerfil && usuario.nome) h3NomePerfil.textContent = usuario.nome;
            if (spanPlanoMenu && usuario.plano) spanPlanoMenu.textContent = usuario.plano;
            if (pDataMembro && usuario.dataCriacao) pDataMembro.textContent = `Membro desde ${usuario.dataCriacao}`;

            // Define a foto de perfil (se houver salva, usa ela; senão, usa o bonequinho padrão)
            if (imgAvatarPerfil) imgAvatarPerfil.src = usuario.foto ? usuario.foto : FOTO_PADRAO;
            if (imgAvatarMenu) imgAvatarMenu.src = usuario.foto ? usuario.foto : FOTO_PADRAO;

            // Preenche os campos do formulário
            if (inputNome) inputNome.value = usuario.nome || "";
            if (inputEmail) inputEmail.value = usuario.email || "";
            if (inputTelefone) inputTelefone.value = usuario.telefone || "";
            if (inputCpf) inputCpf.value = usuario.cpf || "";
            if (inputCep) inputCep.value = usuario.cep || "";
            if (inputRua) inputRua.value = usuario.rua || "";
            if (inputNumero) inputNumero.value = usuario.numero || "";
            if (inputComplemento) inputComplemento.value = usuario.complemento || "";
        }
    }

    // Executa a carga dos dados assim que a página abre
    carregarDadosNaTela();

    /**
     * Alterna os inputs entre modo leitura (readonly) e modo edição.
     * @param {boolean} editando - True para destravar os inputs, False para travar.
     */
    function alternarModoEdicao(editando) {
        inputsEditaveis.forEach(input => {
            if (input) {
                if (editando) {
                    input.removeAttribute("readonly");
                } else {
                    input.setAttribute("readonly", "true");
                }
            }
        });

        if (editando) {
            btnEditar.style.display = "none";
            btnCancelar.style.display = "block";
            btnSalvar.style.display = "block";
            inputNome.focus();
        } else {
            btnEditar.style.display = "block";
            btnCancelar.style.display = "none";
            btnSalvar.style.display = "none";
        }
    }

    // Eventos dos botões de edição de perfil
    if (btnEditar) btnEditar.addEventListener("click", () => alternarModoEdicao(true));
    if (btnCancelar) {
        btnCancelar.addEventListener("click", () => {
            alternarModoEdicao(false);
            carregarDadosNaTela(); // Descarta as alterações e volta o dado original
        });
    }

    // Salva as alterações feitas nos dados pessoais no localStorage
    if (btnSalvar) {
        btnSalvar.addEventListener("click", () => {
            const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
            const emailAntigo = usuarioLogado.email; 

            // Atualiza os dados no objeto da sessão
            usuarioLogado.nome = inputNome.value;
            usuarioLogado.email = inputEmail.value;
            usuarioLogado.telefone = inputTelefone.value;
            usuarioLogado.cep = inputCep.value;
            usuarioLogado.rua = inputRua.value;
            usuarioLogado.numero = inputNumero.value;
            usuarioLogado.complemento = inputComplemento.value;

            // Salva na sessão atual
            localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

            // Atualiza também no banco de dados geral (array "usuarios")
            let usuariosCadastrados = JSON.parse(localStorage.getItem("usuarios")) || [];
            const index = usuariosCadastrados.findIndex(u => u.email === emailAntigo);
            
            if (index !== -1) {
                usuariosCadastrados[index] = { ...usuariosCadastrados[index], ...usuarioLogado };
                localStorage.setItem("usuarios", JSON.stringify(usuariosCadastrados));
            }

            alternarModoEdicao(false);
            carregarDadosNaTela();
            alert("Perfil atualizado com sucesso!");
        });
    }


    /**
     * ========================================================================
     * 5. LÓGICA DE UPLOAD E COMPRESSÃO DA FOTO DE PERFIL (Base64 + Canvas)
     * ========================================================================
     */

    // Faz os botões visíveis acionarem o input de arquivo invisível
    if (btnAlterarFoto && inputFoto) btnAlterarFoto.addEventListener("click", () => inputFoto.click());
    if (containerAvatar && inputFoto) containerAvatar.addEventListener("click", () => inputFoto.click());

    // Escuta quando o usuário escolhe uma nova imagem na janela do computador
    if (inputFoto) {
        inputFoto.addEventListener("change", (event) => {
            const arquivo = event.target.files[0];
            
            if (arquivo && arquivo.type.startsWith("image/")) {
                const leitor = new FileReader();

                leitor.onload = function (e) {
                    const img = new Image();
                    img.src = e.target.result;

                    img.onload = function () {
                        // Utiliza um Canvas invisível para redimensionar a imagem (máximo 300x300px)
                        // Isso evita que fotos pesadas de celular estourem o limite de 5MB do localStorage.
                        const canvas = document.createElement("canvas");
                        const tamanhoMax = 300;
                        let largura = img.width;
                        let altura = img.height;

                        if (largura > altura) {
                            if (largura > tamanhoMax) {
                                altura *= tamanhoMax / largura;
                                largura = tamanhoMax;
                            }
                        } else {
                            if (altura > tamanhoMax) {
                                largura *= tamanhoMax / altura;
                                altura = tamanhoMax;
                            }
                        }

                        canvas.width = largura;
                        canvas.height = altura;
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0, largura, altura);

                        // Converte a imagem comprimida em uma string de texto Base64 (qualidade 70%)
                        const fotoBase64 = canvas.toDataURL("image/jpeg", 0.7);

                        // 1. Atualiza a imagem na tela imediatamente
                        if (imgAvatarPerfil) imgAvatarPerfil.src = fotoBase64;
                        if (imgAvatarMenu) imgAvatarMenu.src = fotoBase64;

                        // 2. Salva a foto dentro da sessão do usuário logado
                        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
                        usuarioLogado.foto = fotoBase64;
                        localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

                        // 3. Atualiza a foto dentro do array geral de cadastros
                        let usuariosCadastrados = JSON.parse(localStorage.getItem("usuarios")) || [];
                        const index = usuariosCadastrados.findIndex(u => u.email === usuarioLogado.email);
                        if (index !== -1) {
                            usuariosCadastrados[index].foto = fotoBase64;
                            localStorage.setItem("usuarios", JSON.stringify(usuariosCadastrados));
                        }
                    };
                };
                leitor.readAsDataURL(arquivo);
            } else {
                alert("Por favor, selecione um arquivo de imagem válido.");
            }
        });
    }


    /**
     * ========================================================================
     * 6. LÓGICA DE ALTERAÇÃO DE SENHA (Fluxo Seguro em 2 Passos)
     * ========================================================================
     */

    /**
     * Reseta os campos de senha e fecha o formulário, voltando ao estado inicial.
     */
    function resetarFormularioSenha() {
        inputSenhaAtual.value = "";
        inputSenhaNova.value = "";
        inputConfSenhaNova.value = "";
        if (strengthBar) strengthBar.style.width = "0%";
        if (strengthText) strengthText.textContent = "";

        formTrocaSenha.style.display = "none";
        passo1Senha.style.display = "block"; 
        passo2Senha.style.display = "none";  
        blocoInfoSenha.style.display = "flex";
    }

    // Abre o formulário de alteração de senha ao clicar no botão
    if (btnAbrirTrocaSenha) {
        btnAbrirTrocaSenha.addEventListener("click", () => {
            blocoInfoSenha.style.display = "none";
            formTrocaSenha.style.display = "block";
            inputSenhaAtual.focus();
        });
    }

    // Botões de cancelar fecham o formulário de senha
    if (btnCancelarPasso1) btnCancelarPasso1.addEventListener("click", resetarFormularioSenha);
    if (btnCancelarPasso2) btnCancelarPasso2.addEventListener("click", resetarFormularioSenha);

    /**
     * PASSO 1: O usuário digita a senha atual. O sistema faz o hash dela
     * e compara com o hash salvo no localStorage para provar que é ele mesmo.
     */
    if (btnVerificarSenha) {
        btnVerificarSenha.addEventListener("click", async () => {
            const atual = inputSenhaAtual.value;
            if (!atual) {
                alert("Digite sua senha atual para continuar.");
                return;
            }

            const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
            const hashSenhaAtualDigitada = await gerarHashSenha(atual);

            // Se a senha atual estiver incorreta, bloqueia o fluxo
            if (hashSenhaAtualDigitada !== usuarioLogado.senha) {
                alert("A senha atual informada está incorreta.");
                return;
            }

            // Se estiver correta, esconde o Passo 1 e abre o Passo 2 (Nova Senha)
            passo1Senha.style.display = "none";
            passo2Senha.style.display = "block";
            inputSenhaNova.focus();
        });
    }

    /**
     * Lógica do botão "olhinho" para alternar entre mostrar e esconder a senha digitada.
     */
    const botoesMostrarSenha = document.querySelectorAll('.botao-mostrar-senha');
    botoesMostrarSenha.forEach(botao => {
        botao.addEventListener('click', function () {
            const input = this.previousElementSibling; 
            const icone = this.querySelector('.material-symbols-outlined');

            if (input.type === 'password') {
                input.type = 'text';
                icone.textContent = 'visibility_off';
            } else {
                input.type = 'password';
                icone.textContent = 'visibility';
            }
        });
    });

    /**
     * Termômetro visual dinâmico de força da senha nova.
     */
    if (inputSenhaNova && strengthBar && strengthText) {
        inputSenhaNova.addEventListener("input", function () {
            const senha = this.value;
            if (senha.length === 0) {
                strengthBar.style.width = "0%";
                strengthText.textContent = "";
                return;
            }
            const forca = calcularForcaSenha(senha);
            if (forca <= 1) {
                strengthBar.style.width = "33%";
                strengthBar.style.backgroundColor = "#ff4d4d";
                strengthText.textContent = "Senha Fraca";
                strengthText.style.color = "#ff4d4d";
            } else if (forca === 2 || forca === 3) {
                strengthBar.style.width = "66%";
                strengthBar.style.backgroundColor = "#ffcc00";
                strengthText.textContent = "Senha Média";
                strengthText.style.color = "#ffcc00";
            } else if (forca === 4) {
                strengthBar.style.width = "100%";
                strengthBar.style.backgroundColor = "#2db34a";
                strengthText.textContent = "Senha Forte";
                strengthText.style.color = "#2db34a";
            }
        });
    }

    /**
     * PASSO 2: Valida a nova senha, checa se é diferente da atual,
     * criptografa em SHA-256 e atualiza no localStorage e no array geral.
     */
    if (btnSalvarSenha) {
        btnSalvarSenha.addEventListener("click", async () => {
            const atual = inputSenhaAtual.value;
            const nova = inputSenhaNova.value;
            const confNova = inputConfSenhaNova.value;

            if (!nova || !confNova) {
                alert("Por favor, preencha a nova senha e a confirmação.");
                return;
            }

            if (nova !== confNova) {
                alert("A nova senha e a confirmação não são iguais.");
                return;
            }

            // Impede o usuário de reutilizar exatamente a mesma senha anterior
            if (nova === atual) {
                alert("A nova senha não pode ser igual à senha atual. Escolha uma senha diferente.");
                return;
            }

            if (calcularForcaSenha(nova) <= 1) {
                alert("Por favor, escolha uma senha mais forte.");
                return;
            }

            // Gera o novo hash da senha
            const hashNovaSenha = await gerarHashSenha(nova);
            const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
            
            // Atualiza na sessão
            usuarioLogado.senha = hashNovaSenha;
            localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

            // Atualiza no banco geral de usuários cadastrados
            let usuariosCadastrados = JSON.parse(localStorage.getItem("usuarios")) || [];
            const index = usuariosCadastrados.findIndex(u => u.email === usuarioLogado.email);
            if (index !== -1) {
                usuariosCadastrados[index].senha = hashNovaSenha;
                localStorage.setItem("usuarios", JSON.stringify(usuariosCadastrados));
            }

            alert("Senha alterada com sucesso!");
            resetarFormularioSenha(); // Limpa tudo e fecha o bloco
        });
    }


    /**
     * ========================================================================
     * 7. LÓGICA DE LOGOUT (Sair da conta)
     * ========================================================================
     */
    const btnSair = document.getElementById("btn-sair");
    if (btnSair) {
        btnSair.addEventListener("click", () => {
            localStorage.removeItem("logado");
            localStorage.removeItem("usuarioLogado"); 
            window.location.replace(LOGIN_URL); 
        });
    }
});