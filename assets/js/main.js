
const formLogin = document.getElementById("form_login")
const formCadas = document.getElementById("form_cadas")




formCadas.addEventListener("submit", function (event) { // ele iriei verficar o formulario 
  event.preventDefault(); // não deixa carregar a página
  const nome =  document.getElementById("cadas_nome").value
  const email =  document.getElementById("cadas_email").value
  const senha =  document.getElementById("cadas_senha").value
    
  localStorage.setItem("nome", nome);
  localStorage.setItem("email", email);
  localStorage.setItem("senha", senha); 

  alert("Cadastro realizado com sucesso!");
  formCadas.reset(); // Limpa os campos do formulário de cadastro
})

formLogin.addEventListener("submit", function (event) { 

// Pego as informas salvas no "banco de dados local"
const nome_cadastrado =  localStorage.getItem("nome");
const email_cadastrado =  localStorage.getItem("email");
const senha_cadastrada =  localStorage.getItem("senha");

//capturo o que o usuario digitou
const email_digitado =  document.getElementById("login_email").value
const senha_digitada =  document.getElementById("login_senha").value
    
if (email_cadastrado == email_digitado && senha_cadastrada == senha_digitada) {
    alert("Voce logou")
}

})