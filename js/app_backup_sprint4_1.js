document.addEventListener("DOMContentLoaded", async () => {
  const musicContainer = document.getElementById("music-container");
  const searchInput = document.getElementById("search-input");

  if (!musicContainer) {
    console.error("Container music-container não encontrado.");
    return;
  }

  console.log("AMMB Core iniciado.");

  let musicas = [];

  criarModal();

  try {
    const response = await fetch("data/musicas.json");

    if (!response.ok) {
      throw new Error("Não foi possível carregar data/musicas.json");
    }

    const data = await response.json();

    musicas = Array.isArray(data.musicas) ? data.musicas : [];

    console.log("Banco de dados carregado.");
    console.log(`${musicas.length} músicas encontradas.`);

    render(musicas);
  } catch (error) {
    console.error("Erro ao carregar musicas.json", error);
    musicContainer.textContent = "Não foi possível carregar o acervo musical.";
  }

  function render(lista) {
    musicContainer.innerHTML = "";

    const musicasAtivas = lista.filter((musica) => musica.ativo !== false);

    if (musicasAtivas.length === 0) {
      musicContainer.textContent = "Nenhuma música ativa encontrada no acervo.";
      return;
    }

    musicasAtivas.forEach((musica) => {
      const card = document.createElement("div");
      card.className = "music-card";

      const titulo = document.createElement("h3");
      titulo.className = "music-title";
      titulo.textContent = musica.titulo || "Título não informado";

      const categoria = document.createElement("p");
      categoria.className = "music-category";
      categoria.textContent = musica.categoria || "Categoria não informada";

      const audio = document.createElement("audio");
      audio.controls = true;

      const source = document.createElement("source");
      source.src = musica.audio || "";
      source.type = "audio/mpeg";

      audio.appendChild(source);

      const actions = document.createElement("div");
      actions.className = "music-actions";

      const podeExibirLetra =
        musica.letra &&
        musica.categoria !== "toques-de-corneta";

      if (podeExibirLetra) {
        const botaoLetra = document.createElement("button");
        botaoLetra.className = "btn";
        botaoLetra.type = "button";
        botaoLetra.textContent = "📖 Letra";
        botaoLetra.addEventListener("click", () => {
          abrirModal(musica.letra, `Letra - ${musica.titulo}`);
        });

        actions.appendChild(botaoLetra);
      }

      if (musica.partitura) {
        const botaoPartitura = document.createElement("button");
        botaoPartitura.className = "btn";
        botaoPartitura.type = "button";
        botaoPartitura.textContent = "🎼 Partitura";
        botaoPartitura.addEventListener("click", () => {
          abrirModal(musica.partitura, `Partitura - ${musica.titulo}`);
        });

        actions.appendChild(botaoPartitura);
      }

      card.appendChild(titulo);
      card.appendChild(categoria);
      card.appendChild(audio);

      if (actions.children.length > 0) {
        card.appendChild(actions);
      }

      musicContainer.appendChild(card);
    });
  }
});

function criarModal() {
  if (document.getElementById("ammb-modal")) {
    return;
  }

  const modal = document.createElement("div");
  modal.id = "ammb-modal";

  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.zIndex = "9999";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.background = "rgba(0, 0, 0, 0.85)";
  modal.style.padding = "20px";

  modal.innerHTML = `
    <div id="ammb-modal-content">
      <button id="ammb-modal-close" type="button" aria-label="Fechar modal">&times;</button>
      <div id="ammb-modal-body"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const modalContent = document.getElementById("ammb-modal-content");
  const closeButton = document.getElementById("ammb-modal-close");

  modalContent.style.position = "relative";
  modalContent.style.maxWidth = "95vw";
  modalContent.style.maxHeight = "90vh";
  modalContent.style.overflow = "auto";
  modalContent.style.background = "#ffffff";
  modalContent.style.borderRadius = "12px";
  modalContent.style.padding = "24px";
  modalContent.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.35)";

  closeButton.style.position = "absolute";
  closeButton.style.top = "8px";
  closeButton.style.right = "12px";
  closeButton.style.border = "none";
  closeButton.style.background = "transparent";
  closeButton.style.fontSize = "32px";
  closeButton.style.cursor = "pointer";
  closeButton.style.lineHeight = "1";

  closeButton.addEventListener("click", fecharModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      fecharModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      fecharModal();
    }
  });
}

async function abrirModal(caminho, titulo) {
  const modal = document.getElementById("ammb-modal");
  const modalBody = document.getElementById("ammb-modal-body");

  if (!modal || !modalBody) {
    console.error("Modal não encontrado.");
    return;
  }

  console.log("Abrindo:", caminho);

  modal.style.display = "flex";
  modalBody.innerHTML = "";

  const tituloModal = document.createElement("h2");
  tituloModal.textContent = titulo || "Arquivo do acervo";
  tituloModal.style.marginBottom = "16px";
  tituloModal.style.fontSize = "1.2rem";
  tituloModal.style.color = "#111827";

  modalBody.appendChild(tituloModal);

  if (ehImagem(caminho)) {
    const imagem = document.createElement("img");
    imagem.src = caminho;
    imagem.alt = titulo || "Partitura";
    imagem.loading = "lazy";

    imagem.style.display = "block";
    imagem.style.maxWidth = "100%";
    imagem.style.height = "auto";
    imagem.style.margin = "0 auto";

    imagem.onerror = () => {
      modalBody.innerHTML = "";
      modalBody.textContent = "Não foi possível carregar a imagem da partitura.";
    };

    modalBody.appendChild(imagem);
    return;
  }

  if (ehTexto(caminho)) {
    try {
      const response = await fetch(caminho);

      if (!response.ok) {
        throw new Error("Arquivo de texto não encontrado.");
      }

      const texto = await response.text();

      const pre = document.createElement("pre");
      pre.textContent = texto;
      pre.style.whiteSpace = "pre-wrap";
      pre.style.color = "#111827";
      pre.style.fontSize = "1rem";
      pre.style.lineHeight = "1.6";

      modalBody.appendChild(pre);
    } catch (error) {
      console.error("Erro ao carregar letra:", error);
      modalBody.innerHTML = "";
      modalBody.textContent = "Não foi possível carregar a letra.";
    }

    return;
  }

  modalBody.appendChild(document.createTextNode("Formato de arquivo não suportado."));
}

function fecharModal() {
  const modal = document.getElementById("ammb-modal");
  const modalBody = document.getElementById("ammb-modal-body");

  if (modal) {
    modal.style.display = "none";
  }

  if (modalBody) {
    modalBody.innerHTML = "";
  }
}

function ehImagem(caminho) {
  return /\.(png|jpg|jpeg|webp)$/i.test(caminho);
}

function ehTexto(caminho) {
  return /\.txt$/i.test(caminho);
}