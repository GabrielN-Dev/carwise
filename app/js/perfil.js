/**
 * ============================================================================
 * ARQUIVO: perfil.js
 * OBJETIVO: Gerenciar a sessão, carregamento de dados, edição de perfil,
 *           upload e compressão de foto de perfil, busca automática de
 *           endereço por CEP (API ViaCEP) e fluxo seguro de troca de senha.
 * ARQUITETURA: 100% Front-end (Vanilla JavaScript + LocalStorage + API Web Crypto)
 * ============================================================================
 */

// Constante global com o caminho da tela de login para redirecionamento
const LOGIN_URL = "../public/login.html";

// Endpoint da API pública ViaCEP (gratuita, sem chave, requisição GET)
const VIACEP_URL = "https://viacep.com.br/ws";

/**
 * 1. VERIFICAÇÃO DE SEGURANÇA DA SESSÃO
 */
if (localStorage.getItem("logado") !== "true") {
    window.location.replace(LOGIN_URL);
}

/**
 * ============================================================================
 * 2. FUNÇÕES AUXILIARES DE CRIPTOGRAFIA E VALIDAÇÃO
 * ============================================================================
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

function verificarFormatoEmail(email) {
    const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (email.includes("..") || email.includes("@.") || email.includes(".@")) {
        return false;
    }
    return regexEmail.test(email);
}

async function gerarHashSenha(senha) {
    const encoder = new TextEncoder();
    const data = encoder.encode(senha);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * ============================================================================
 * 3. INICIALIZAÇÃO DA PÁGINA
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

    // Inputs do formulário de Endereço
    const inputCep = document.getElementById("input-cep");
    const inputRua = document.getElementById("input-rua");
    const inputBairro = document.getElementById("input-bairro");
    const inputNumero = document.getElementById("input-numero");
    const inputComplemento = document.getElementById("input-complemento");
    const inputCidade = document.getElementById("input-cidade");
    const inputEstado = document.getElementById("input-estado");
    const btnBuscarCep = document.getElementById("btn-buscar-cep");

    // Máscara para aceitar apenas letras no Nome
    if (inputNome) {
        inputNome.addEventListener("input", function () {
            this.value = this.value.replace(/[^\p{L}\s]+/gu, "");
        });
    }

    // Máscara dinâmica para o Telefone
    if (inputTelefone) {
        inputTelefone.addEventListener("input", function () {
            let v = this.value.replace(/\D/g, "");
            if (v.length > 11) v = v.slice(0, 11);

            if (v.length > 10) {
                this.value = v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
            } else if (v.length > 6) {
                this.value = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
            } else if (v.length > 2) {
                this.value = v.replace(/^(\d{2})(\d{0,4})$/, "($1) $2");
            } else {
                this.value = v;
            }
        });
    }

    // Máscara dinâmica para o CEP (00000-000)
    if (inputCep) {
        inputCep.addEventListener("input", function () {
            let v = this.value.replace(/\D/g, "");
            if (v.length > 8) v = v.slice(0, 8);
            if (v.length > 5) {
                this.value = v.replace(/^(\d{5})(\d{0,3})$/, "$1-$2");
            } else {
                this.value = v;
            }
        });
    }

    // Botões de ação do Perfil
    const btnEditar = document.getElementById("btn-editar");
    const btnCancelar = document.getElementById("btn-cancelar");
    const btnSalvar = document.getElementById("btn-salvar");
    const inputsEditaveis = [
        inputNome, inputEmail, inputTelefone,
        inputCep, inputRua, inputBairro, inputNumero, inputComplemento, inputCidade, inputEstado
    ];

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
    function carregarDadosNaTela() {
        const usuarioSalvo = localStorage.getItem("usuarioLogado");
        if (usuarioSalvo) {
            const usuario = JSON.parse(usuarioSalvo);

            const FOTO_PADRAO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a0aabf'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";

            if (spanNomeMenu && usuario.nome) spanNomeMenu.textContent = usuario.nome;
            if (h3NomePerfil && usuario.nome) h3NomePerfil.textContent = usuario.nome;
            if (spanPlanoMenu && usuario.plano) spanPlanoMenu.textContent = usuario.plano;
            if (pDataMembro && usuario.dataCriacao) pDataMembro.textContent = `Membro desde ${usuario.dataCriacao}`;

            if (imgAvatarPerfil) imgAvatarPerfil.src = usuario.foto ? usuario.foto : FOTO_PADRAO;
            if (imgAvatarMenu) imgAvatarMenu.src = usuario.foto ? usuario.foto : FOTO_PADRAO;

            if (inputNome) inputNome.value = usuario.nome || "";
            if (inputEmail) inputEmail.value = usuario.email || "";
            if (inputTelefone) inputTelefone.value = usuario.telefone || "";
            if (inputCpf) inputCpf.value = usuario.cpf || "";
            if (inputCep) inputCep.value = usuario.cep || "";
            if (inputRua) inputRua.value = usuario.rua || "";
            if (inputBairro) inputBairro.value = usuario.bairro || "";
            if (inputNumero) inputNumero.value = usuario.numero || "";
            if (inputComplemento) inputComplemento.value = usuario.complemento || "";
            if (inputCidade) inputCidade.value = usuario.cidade || "";
            if (inputEstado) inputEstado.value = usuario.estado || "";
        }
    }

    carregarDadosNaTela();

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

    if (btnEditar) btnEditar.addEventListener("click", () => alternarModoEdicao(true));
    if (btnCancelar) {
        btnCancelar.addEventListener("click", () => {
            alternarModoEdicao(false);
            carregarDadosNaTela();
        });
    }

    /**
     * ÚNICO handler de salvamento dos Dados Pessoais + Endereço.
     */
    if (btnSalvar) {
        btnSalvar.addEventListener("click", () => {
            const nome = inputNome.value.trim();
            const email = inputEmail.value.toLowerCase().trim();
            const telefone = inputTelefone.value;
            const cep = inputCep.value;
            const rua = inputRua.value;
            const bairro = inputBairro.value;
            const numero = inputNumero.value;
            const complemento = inputComplemento.value;
            const cidade = inputCidade.value;
            const estado = inputEstado.value;

            const telefoneNumeros = telefone.replace(/\D/g, "");

            // 1. Validação de campos vazios
            if (!nome || !email || !telefone) {
                alert("Nome, E-mail e Telefone são obrigatórios!");
                return;
            }

            // 2. Validação de formato de E-mail
            if (!verificarFormatoEmail(email)) {
                alert("Por favor, insira um e-mail válido!");
                return;
            }

            // 3. Validação de tamanho do Telefone
            if (telefoneNumeros.length < 10) {
                alert("Por favor, insira um telefone válido com DDD.");
                return;
            }

            const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
            const emailAntigo = usuarioLogado.email;
            let usuariosCadastrados = JSON.parse(localStorage.getItem("usuarios")) || [];

            // 4. Verifica se o novo e-mail já está sendo usado por OUTRO usuário
            if (email !== emailAntigo) {
                const emailExiste = usuariosCadastrados.some(u => u.email === email);
                if (emailExiste) {
                    alert("Este e-mail já está vinculado a outra conta!");
                    return;
                }
            }

            usuarioLogado.nome = nome;
            usuarioLogado.email = email;
            usuarioLogado.telefone = telefone;
            usuarioLogado.cep = cep;
            usuarioLogado.rua = rua;
            usuarioLogado.bairro = bairro;
            usuarioLogado.numero = numero;
            usuarioLogado.complemento = complemento;
            usuarioLogado.cidade = cidade;
            usuarioLogado.estado = estado;

            localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

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
     * 5. BUSCA DE ENDEREÇO POR CEP (API ViaCEP)
     * ========================================================================
     */

    /**
     * Consulta a API ViaCEP (GET) e preenche automaticamente rua, bairro,
     * cidade e estado. Só funciona com o formulário em modo de edição,
     * já que os campos de endereço ficam readonly fora dele.
     */
    async function buscarEnderecoPorCep() {
        if (!inputCep || inputCep.hasAttribute("readonly")) {
            alert("Clique em 'Editar Perfil' antes de buscar o CEP.");
            return;
        }

        const cepLimpo = inputCep.value.replace(/\D/g, "");

        if (cepLimpo.length !== 8) {
            alert("Digite um CEP válido com 8 dígitos.");
            return;
        }

        const iconeOriginal = btnBuscarCep.innerHTML;
        btnBuscarCep.disabled = true;
        btnBuscarCep.innerHTML = '<span class="material-symbols-outlined girando">progress_activity</span>';

        try {
            const resposta = await fetch(`${VIACEP_URL}/${cepLimpo}/json/`);

            if (!resposta.ok) {
                throw new Error("Falha na comunicação com o serviço de CEP.");
            }

            const dados = await resposta.json();

            // A ViaCEP retorna { erro: true } quando o CEP não existe
            if (dados.erro) {
                alert("CEP não encontrado. Verifique o número digitado.");
                return;
            }

            if (inputRua) inputRua.value = dados.logradouro || "";
            if (inputBairro) inputBairro.value = dados.bairro || "";
            if (inputCidade) inputCidade.value = dados.localidade || "";
            if (inputEstado) inputEstado.value = dados.uf || "";

            // Leva o foco para o número, já que a ViaCEP não retorna isso
            if (inputNumero) inputNumero.focus();

        } catch (erro) {
            console.error("Erro ao buscar CEP:", erro);
            alert("Não foi possível buscar o CEP agora. Verifique sua conexão e tente novamente.");
        } finally {
            btnBuscarCep.disabled = false;
            btnBuscarCep.innerHTML = iconeOriginal;
        }
    }

    if (btnBuscarCep) {
        btnBuscarCep.addEventListener("click", buscarEnderecoPorCep);
    }

    // Busca automática ao sair do campo, assim que o CEP tiver 8 dígitos
    if (inputCep) {
        inputCep.addEventListener("blur", () => {
            const cepLimpo = inputCep.value.replace(/\D/g, "");
            if (cepLimpo.length === 8 && !inputCep.hasAttribute("readonly")) {
                buscarEnderecoPorCep();
            }
        });
    }

    /**
     * ========================================================================
     * 6. LÓGICA DE UPLOAD E COMPRESSÃO DA FOTO DE PERFIL (Base64 + Canvas)
     * ========================================================================
     */
    if (btnAlterarFoto && inputFoto) btnAlterarFoto.addEventListener("click", () => inputFoto.click());
    if (containerAvatar && inputFoto) containerAvatar.addEventListener("click", () => inputFoto.click());

    if (inputFoto) {
        inputFoto.addEventListener("change", (event) => {
            const arquivo = event.target.files[0];

            if (arquivo && arquivo.type.startsWith("image/")) {
                const leitor = new FileReader();

                leitor.onload = function (e) {
                    const img = new Image();
                    img.src = e.target.result;

                    img.onload = function () {
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

                        const fotoBase64 = canvas.toDataURL("image/jpeg", 0.7);

                        if (imgAvatarPerfil) imgAvatarPerfil.src = fotoBase64;
                        if (imgAvatarMenu) imgAvatarMenu.src = fotoBase64;

                        const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
                        usuarioLogado.foto = fotoBase64;
                        localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

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
     * 7. LÓGICA DE ALTERAÇÃO DE SENHA (Fluxo Seguro em 2 Passos)
     * ========================================================================
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

    if (btnAbrirTrocaSenha) {
        btnAbrirTrocaSenha.addEventListener("click", () => {
            blocoInfoSenha.style.display = "none";
            formTrocaSenha.style.display = "block";
            inputSenhaAtual.focus();
        });
    }

    if (btnCancelarPasso1) btnCancelarPasso1.addEventListener("click", resetarFormularioSenha);
    if (btnCancelarPasso2) btnCancelarPasso2.addEventListener("click", resetarFormularioSenha);

    if (btnVerificarSenha) {
        btnVerificarSenha.addEventListener("click", async () => {
            const atual = inputSenhaAtual.value;
            if (!atual) {
                alert("Digite sua senha atual para continuar.");
                return;
            }

            const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
            const hashSenhaAtualDigitada = await gerarHashSenha(atual);

            if (hashSenhaAtualDigitada !== usuarioLogado.senha) {
                alert("A senha atual informada está incorreta.");
                return;
            }

            passo1Senha.style.display = "none";
            passo2Senha.style.display = "block";
            inputSenhaNova.focus();
        });
    }

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

    if (btnSalvarSenha) {
        btnSalvarSenha.addEventListener("click", async () => {
            const senhaAtual = inputSenhaAtual.value;
            const senhaNova = inputSenhaNova.value;
            const confirmacao = inputConfSenhaNova.value;

            if (!senhaNova || !confirmacao) {
                alert("Preencha a nova senha e a confirmação.");
                return;
            }

            if (senhaNova !== confirmacao) {
                alert("A confirmação não coincide com a nova senha.");
                return;
            }

            if (calcularForcaSenha(senhaNova) < 2) {
                alert("A nova senha é muito fraca. Use letras maiúsculas, minúsculas, números ou símbolos.");
                return;
            }

            if (senhaNova === senhaAtual) {
                alert("A nova senha deve ser diferente da senha atual.");
                return;
            }

            const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
            const hashSenhaNova = await gerarHashSenha(senhaNova);

            usuarioLogado.senha = hashSenhaNova;
            localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

            let usuariosCadastrados = JSON.parse(localStorage.getItem("usuarios")) || [];
            const index = usuariosCadastrados.findIndex(u => u.email === usuarioLogado.email);
            if (index !== -1) {
                usuariosCadastrados[index].senha = hashSenhaNova;
                localStorage.setItem("usuarios", JSON.stringify(usuariosCadastrados));
            }

            resetarFormularioSenha();
            alert("Senha alterada com sucesso!");
        });
    }

    /**
     * ========================================================================
     * 8. LÓGICA DE LOGOUT (Sair da conta)
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