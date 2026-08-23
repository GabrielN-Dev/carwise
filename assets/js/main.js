// ==================== SELETORES DO DOM ====================

const formLogin = document.getElementById("form-login")
const formCadas = document.getElementById("form-cadastro")
const cadSenha = document.getElementById("cad-senha")
const strengthBar = document.getElementById("strength-bar")
const strengthText = document.getElementById("strength-text")

// ==================== LÓGICA DO OLHO DA SENHA ====================
document.querySelectorAll('.toggle-password').forEach(botaoOlho => {
  botaoOlho.addEventListener('click', function() {
    // Descobre qual input esse olho específico deve controlar usando o atributo data-target
    const inputId = this.getAttribute('data-target');
    const inputSenha = document.getElementById(inputId);

    // Alterna o tipo do input
    if (inputSenha.type === 'password') {
      inputSenha.type = 'text';
      this.textContent = '🙈'; // Ícone de ocultar
    } else {
      inputSenha.type = 'password';
      this.textContent = '👁️'; // Ícone de mostrar
    }
  });
});

// ======================== Validar Nome ===============
function validarNome(input) {
// \p{L} = Qualquer letra com ou sem acento
    // \s   = Qualquer tipo de espaço em branco
    // u    = Bandeira obrigatória no final para ativar o suporte a Unicode
    let n = input.value.replace(/[^\p{L}\s]+/gu, "");     // Atualiza o valor do campo
    input.value = n;
}
//======================= MASCARA TELL =====================
function mascaraTelefone(input,event) {
      if (event && event.inputType === "deleteContentBackward") {
        return; 
    }
    let v = input.value.replace(/\D/g, "");
    
    if (v.length > 11) {
        v = v.slice(0, 11);
    }

    if (v.length > 6) {
        if (v.length === 11) {
            v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
        } else {
            v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
        }
    } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,5})$/, "($1) $2");
    }  else if (v.length === 2) { // <-- Mudado de "> 0" para "=== 2"
        v = v.replace(/^(\d{2})$/, "($1)"); // Coloca o parêntese assim que digita o DDD completo
    }
    
    input.value = v;
}

// ==================== LÓGICA DO TERMÔMETRO DE SENHA ====================
cadSenha.addEventListener("input", function() {
  const senha = cadSenha.value;
  let forca = 0;

  if (senha.length === 0) {
    strengthBar.style.width = "0%";
    strengthText.textContent = "";
    return;
  }

  // Regra 1: Tamanho mínimo de 6 caracteres
  if (senha.length >= 6) forca++;
  
  // Regra 2: Conter letras maiúsculas e minúsculas
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) forca++;

  // Regra 3: Conter números
  if (/[0-9]/.test(senha)) forca++;
  // Regra 4: Conter caracteres especiais (ex: @, #, $, !)
  if (/[^A-Za-z0-9]/.test(senha)) forca++;

  // Atualização Visual baseada na pontuação da força
  if (forca <= 1) {
    strengthBar.style.width = "33%";
    strengthBar.style.backgroundColor = "#ff4d4d"; // Vermelho
    strengthText.textContent = "Senha Fraca";
    strengthText.style.color = "#ff4d4d";
  } else if (forca === 2 || forca === 3) {
    strengthBar.style.width = "66%";
    strengthBar.style.backgroundColor = "#ffcc00"; // Amarelo
    strengthText.textContent = "Senha Média";
    strengthText.style.color = "#ffcc00";
  } else if (forca === 4) {
    strengthBar.style.width = "100%";
    strengthBar.style.backgroundColor = "#2db34a"; // Verde
    strengthText.textContent = "Senha Forte";
    strengthText.style.color = "#2db34a";
  }
});


// ==================== OUTRAS FUNÇÕES DE VALIDAÇÃO ====================


// Retorna 'true' se o e-mail for válido (.com, .com.br, .edu.br, etc.)
function verificarFormatoEmail(email) {
    // Regex que aceita letras, números, pontos, hífens e exige o @ e extensões válidas
    const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?$/;
    return regexEmail.test(email);
}

function verificarIdade(data_nasc) {
  if (!data_nasc) return false;

  const hoje = new Date();
  const nascimento = new Date(data_nasc);

  // O input type="date" trabalha com fusos horários que podem atrasar a data em 1 dia. 
  // Adicionar o fuso garante o cálculo exato do dia escolhido.
  nascimento.setMinutes(nascimento.getMinutes() + nascimento.getTimezoneOffset());

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const diferencaMes = hoje.getMonth() - nascimento.getMonth();

  // Se o mês atual for menor que o de nascimento, ou se for o mesmo mês mas o dia atual for menor, não fez aniversário ainda
  if (diferencaMes < 0 || (diferencaMes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }

  return idade >= 18;
}



// ==================== PROCESSAMENTO DO CADASTRO ====================
formCadas.addEventListener("submit", function (event) { 
  event.preventDefault(); 
  
  const nome = document.getElementById("cad-nome").value;
  const data_nasc = document.getElementById("cad-data").value;
  const email = document.getElementById("cad-email").value;
  const senha = document.getElementById("cad-senha").value;
  const confSenha = document.getElementById("confSenha").value;

  // 1º Passo: Validar o formato do e-mail brasileiro/internacional
  if (!verificarFormatoEmail(email)) {
    alert("Por favor, insira um e-mail válido! Exemplo: nome@provedor.com ou nome@provedor.com.br");
    return; // Interrompe o envio
  }

    if (!verificarIdade(data_nasc)) {
    alert("O site so permite usuarios acima de 18 anos....");
     return; // Interrompe o envio
  }

  // 2º Passo: Validar igualdade das senhas
  if (senha !== confSenha) {
    alert("As senhas não são iguais!");
    return; // Interrompe o envio
  }

  // Se passou em todas as validações, salva os dados
  localStorage.setItem("nome", nome);
  localStorage.setItem("email", email);
  localStorage.setItem("senha", senha); 

  alert("Cadastro realizado com sucesso!");
  formCadas.reset(); 
  
  // Reseta o termômetro visual
  strengthBar.style.width = "0%";
  strengthText.textContent = "";
});

// ==================== PROCESSAMENTO DO LOGIN ====================
formLogin.addEventListener("submit", function (event) { 
  event.preventDefault(); 

  const email_cadastrado = localStorage.getItem("email");
  const senha_cadastrada = localStorage.getItem("senha");

  const email_digitado = document.getElementById("login-email").value
  const senha_digitada = document.getElementById("login-senha").value
    
  if (email_cadastrado === email_digitado && senha_cadastrada === senha_digitada) {
      alert("Você logou com sucesso!");
      formLogin.reset();
  } else {
      alert("E-mail ou senha incorretos, ou usuário não existe!");
  }
});
