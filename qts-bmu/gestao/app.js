document.addEventListener("DOMContentLoaded", iniciarGestao);

function iniciarGestao() {
  const form = document.getElementById("access-form");
  const pinInput = document.getElementById("management-pin");
  const message = document.getElementById("access-message");
  const preview = document.getElementById("management-preview");

  if (!form || !pinInput || !message || !preview) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const pin = pinInput.value.trim();

    message.className = "access-message";

    if (!pin) {
      message.textContent = "Digite o código de gestão.";
      message.classList.add("error");
      return;
    }

    message.textContent =
      "Interface criada com sucesso. A validação real será adicionada na próxima Sprint.";

    message.classList.add("success");
    preview.classList.remove("is-hidden");
  });
}