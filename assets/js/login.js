// ==================== SELETORES DO DOM ====================
const formLogin = document.getElementById("formulario-login");
const formCadas = document.getElementById("formulario-cadastro");
const cadSenha = document.getElementById("senha");
const strengthBar = document.getElementById("strength-bar");
const strengthText = document.getElementById("strength-text");

// ======================== MÁSCARAS E VALIDAÇÕES DINÂMICAS ====================

const inputNome = document.getElementById("nome");
if (inputNome) {
  inputNome.addEventListener("input", function () {
    this.value = this.value.replace(/[^\p{L}\s]+/gu, "");
  });
}

const inputTelefone = document.getElementById("telefone");
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

const inputDataNasc = document.getElementById("data_nascimento");
if (inputDataNasc) {
  inputDataNasc.max = "9999-12-31";
  inputDataNasc.addEventListener("input", function () {
    if (!this.value) return;
    const partes = this.value.split("-");
    if (partes[0] && partes[0].length > 4) {
      partes[0] = partes[0].slice(0, 4);
      this.value = partes.join("-");
    }
  });
}

// ==================== LÓGICA DO TERMÔMETRO DE SENHA ====================
if (cadSenha && strengthBar && strengthText) {
  cadSenha.addEventListener("input", function () {
    const senha = cadSenha.value;

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

// ==================== OUTRAS FUNÇÕES DE VALIDAÇÃO ====================
function verificarFormatoEmail(email) {
  const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (email.includes("..") || email.includes("@.") || email.includes(".@")) {
    return false;
  }
  return regexEmail.test(email);
}

function verificarIdade(data_nasc) {
  if (!data_nasc) return false;
  const hoje = new Date();
  const nascimento = new Date(data_nasc);
  nascimento.setMinutes(nascimento.getMinutes() + nascimento.getTimezoneOffset());

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const diferencaMes = hoje.getMonth() - nascimento.getMonth();

  if (diferencaMes < 0 || (diferencaMes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade >= 18;
}

function calcularForcaSenha(senha) {
  let forca = 0;
  if (senha.length === 0) return 0;
  if (senha.length >= 6) forca++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) forca++;
  if (/[0-9]/.test(senha)) forca++;
  if (/[^A-Za-z0-9]/.test(senha)) forca++;
  return forca;
}

async function gerarHashSenha(senha) {
  const encoder = new TextEncoder();
  const data = encoder.encode(senha);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ==================== PROCESSAMENTO DO CADASTRO ====================
if (formCadas) {
  formCadas.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const data_nasc = document.getElementById("data_nascimento").value;
    const senha = document.getElementById("senha").value;
    const confSenha = document.getElementById("confirmar_senha").value;
    const forcaSenha = calcularForcaSenha(senha);

    const inputTelElement = document.getElementById("telefone");
    const telefoneNumeros = inputTelElement ? inputTelElement.value.replace(/\D/g, "") : "";

    // Validação de campos vazios
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      alert("Todos os campos obrigatórios devem ser preenchidos!");
      return;
    }

    if (telefoneNumeros.length < 10) {
      alert("Por favor, insira um telefone válido com DDD (mínimo 10 dígitos numéricos).");
      return;
    }

    if (!verificarFormatoEmail(email)) {
      alert("Por favor, insira um e-mail válido! Exemplo: nome@provedor.com");
      return;
    }

    if (!verificarIdade(data_nasc)) {
      alert("O site só permite usuários acima de 18 anos.");
      return;
    }

    if (senha !== confSenha) {
      alert("As senhas não são iguais!");
      return;
    }
    
    if (forcaSenha <= 1) {
      alert("Por favor, digite uma senha mais forte.");
      return;
    }

    const senhaCriptografada = await gerarHashSenha(senha);
    let usuariosCadastrados = JSON.parse(localStorage.getItem("usuarios")) || [];

    // Busca ignorando maiúsculas/minúsculas
    const emailExiste = usuariosCadastrados.some(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (emailExiste) {
      alert("Este e-mail já está cadastrado!");
      return;
    }

    const novoUsuario = {
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      telefone: telefoneNumeros,
      senha: senhaCriptografada
    };

    usuariosCadastrados.push(novoUsuario);
    localStorage.setItem("usuarios", JSON.stringify(usuariosCadastrados));

    alert("Cadastro realizado com sucesso!");
    formCadas.reset();

    if (strengthBar && strengthText) {
      strengthBar.style.width = "0%";
      strengthText.textContent = "";
    }
  });
}

// ==================== PROCESSAMENTO DO LOGIN ====================
if (formLogin) {
  formLogin.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email_digitado = document.getElementById("email-login").value.toLowerCase().trim();
    const senha_digitada = document.getElementById("senha-login").value;

    const chaveTentativas = `tentativas_${email_digitado}`;
    const chaveBloqueio = `bloqueio_${email_digitado}`;

    // 1. VERIFICA SE O USUÁRIO ESTÁ BLOQUEADO NO MOMENTO
    const horarioBloqueio = localStorage.getItem(chaveBloqueio);
    if (horarioBloqueio) {
      const agora = Date.now();
      
      if (agora < Number(horarioBloqueio)) {
        const segundosRestantes = Math.ceil((Number(horarioBloqueio) - agora) / 1000);
        
        if (segundosRestantes > 60) {
          const minutosRestantes = Math.ceil(segundosRestantes / 60);
          alert(`Esta conta está bloqueada! Tente novamente em ${minutosRestantes} minutos.`);
        } else {
          alert(`Esta conta está bloqueada! Tente novamente em ${segundosRestantes} segundos.`);
        }
        return;
      } else {
        // O tempo acabou, reseta o histórico para o usuário tentar de novo
        localStorage.removeItem(chaveBloqueio);
        localStorage.removeItem(chaveTentativas);
      }
    }

    const usuariosCadastrados = JSON.parse(localStorage.getItem("usuarios")) || [];
    const hashSenhaDigitada = await gerarHashSenha(senha_digitada);


    const emailEncontrado = usuariosCadastrados.find(u => u.email.toLowerCase() === email_digitado)
    const usuarioEncontrado = usuariosCadastrados.find(u => 
      u.email.toLowerCase() === email_digitado && u.senha === hashSenhaDigitada
    );

    // 2. SE O LOGIN FOR BEM SUCEDIDO
    if (usuarioEncontrado) {
      alert(`Você logou com sucesso! Bem-vindo(a), ${usuarioEncontrado.nome}!`);
      localStorage.setItem("logado", true); 
      localStorage.removeItem(chaveTentativas);
      localStorage.removeItem(chaveBloqueio);
      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioEncontrado));
      formLogin.reset();
       window.location.href = "../../app/perfil.html"; 

    } 
    // 3. SE O LOGIN FALHAR
    else if (emailEncontrado)  {
      let errosAtuais = Number(localStorage.getItem(chaveTentativas)) || 0;
      errosAtuais++;

      if (errosAtuais >= 3) {
        // Altere o tempo aqui se quiser ( 60 * 1000 =  1 minuto ) se quiser 5 minutos:
        // ( 5* 60 * 1000 =  5 minuto )
        const tempoBloqueio = Date.now() + (60 * 1000); 
        localStorage.setItem(chaveBloqueio, tempoBloqueio);
        alert("Limite de 3 tentativas atingido! Esta conta foi bloqueada por 1 minuto.");
      } else {
        localStorage.setItem(chaveTentativas, errosAtuais);
        // MOSTRA AS TENTATIVAS RESTANTES DE FORMA CLARA
        alert(`E-mail ou senha incorretos! Tentativas restantes: ${3 - errosAtuais}`);
      }
    }
    else{
      alert("Usuário não encontrado")
    }
  });
}


// Log visual no console para testes rápidos
const listaDeTeste = JSON.parse(localStorage.getItem("usuarios")) || [];
console.log("=== USUÁRIOS CADASTRADOS NO SISTEMA ===");
console.table(listaDeTeste);
