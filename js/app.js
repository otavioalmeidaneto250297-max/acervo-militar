document.addEventListener("DOMContentLoaded", async () => {
  const musicContainer = document.getElementById("music-container");
  const searchInput = document.getElementById("search-input");
  const sortSelect = document.getElementById("sort-select");
  const resultsCounter = document.getElementById("results-counter");

  if (!musicContainer) return;

  let musicas = [];
  let categoriaAtiva = "todos";

  criarModal();

  try {
    const response = await fetch("data/musicas.json");
    if (!response.ok) throw new Error("Erro ao carregar musicas.json");

    const data = await response.json();
    musicas = Array.isArray(data.musicas) ? data.musicas : [];

    configurarPesquisa();
    configurarOrdenacao();
    await carregarCategorias();

    aplicarFiltrosEPesquisa();
  } catch (error) {
    console.error(error);
    musicContainer.textContent = "Não foi possível carregar o acervo musical.";
  }

  function configurarPesquisa() {
    if (!searchInput) return;
    searchInput.addEventListener("input", aplicarFiltrosEPesquisa);
  }

  function configurarOrdenacao() {
    if (!sortSelect) return;
    sortSelect.addEventListener("change", aplicarFiltrosEPesquisa);
  }

  async function carregarCategorias() {
    try {
      const response = await fetch("data/categorias.json");
      const data = await response.json();

      const categorias = Array.isArray(data.categorias)
        ? data.categorias
            .filter((cat) => cat.ativa !== false)
            .sort((a, b) => (a.ordem || 999) - (b.ordem || 999))
            .map((cat) => ({
              valor: cat.slug,
              nome: cat.nome
            }))
        : [];

      criarBarraDeFiltros(categorias);
    } catch {
      criarBarraDeFiltros([]);
    }
  }

  function criarBarraDeFiltros(categorias) {
    if (document.getElementById("category-filters")) return;

    const barra = document.createElement("div");
    barra.id = "category-filters";
    barra.className = "category-filters";

    const botaoTodos = criarBotaoFiltro("Todos", "todos");
    botaoTodos.classList.add("active");
    barra.appendChild(botaoTodos);

    categorias.forEach((categoria) => {
      barra.appendChild(criarBotaoFiltro(categoria.nome, categoria.valor));
    });

    musicContainer.parentNode.insertBefore(barra, musicContainer);
  }

  function criarBotaoFiltro(nome, valor) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "category-filter-btn";
    botao.textContent = nome;
    botao.dataset.category = valor;

    botao.addEventListener("click", () => {
      categoriaAtiva = valor;

      document.querySelectorAll(".category-filter-btn").forEach((btn) => {
        btn.classList.remove("active");
      });

      botao.classList.add("active");
      aplicarFiltrosEPesquisa();
    });

    return botao;
  }

  function aplicarFiltrosEPesquisa() {
    let resultado = [...musicas];

    if (categoriaAtiva !== "todos") {
      resultado = resultado.filter(
        (musica) => musica.categoria === categoriaAtiva
      );
    }

    const termo = searchInput ? normalizarTexto(searchInput.value) : "";

    if (termo) {
      resultado = resultado.filter((musica) => {
        const tags = Array.isArray(musica.tags) ? musica.tags.join(" ") : "";

        const texto = [
          musica.titulo,
          musica.titulo_en,
          musica.categoria,
          musica.descricao,
          musica.descricao_en,
          musica.slug,
          tags
        ].join(" ");

        return normalizarTexto(texto).includes(termo);
      });
    }

    resultado = ordenar(resultado);

    render(resultado);
  }

  function ordenar(lista) {
    const tipo = sortSelect ? sortSelect.value : "az";

    return [...lista].sort((a, b) => {
      const tituloA = normalizarTexto(a.titulo);
      const tituloB = normalizarTexto(b.titulo);

      return tipo === "za"
        ? tituloB.localeCompare(tituloA)
        : tituloA.localeCompare(tituloB);
    });
  }

  function render(lista) {
    musicContainer.innerHTML = "";

    const musicasAtivas = lista.filter((musica) => musica.ativo !== false);

    atualizarContador(musicasAtivas.length);

    if (!musicasAtivas.length) {
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
      categoria.textContent = formatarCategoria(musica.categoria);

      const descricao = document.createElement("p");
      descricao.className = "music-description";
      descricao.textContent = musica.descricao || "";

      const audio = document.createElement("audio");
      audio.controls = true;

      const source = document.createElement("source");
      source.src = musica.audio || "";
      source.type = "audio/mpeg";
      audio.appendChild(source);

      const actions = document.createElement("div");
      actions.className = "music-actions";

      if (musica.letra && musica.letra.trim() !== "" && musica.categoria !== "toques-de-corneta") {
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
        botaoPartitura.textContent =
          musica.categoria === "toques-de-corneta"
            ? "🎵 Visualizar toque"
            : "🎼 Partitura";

        botaoPartitura.addEventListener("click", () => {
          abrirModal(musica.partitura, `Partitura - ${musica.titulo}`);
        });

        actions.appendChild(botaoPartitura);
      }

      /*
      if (musica.pdf && musica.categoria !== "toques-de-corneta") {
        const botaoPdf = document.createElement("a");
        botaoPdf.className = "btn";
        botaoPdf.textContent = "📄 Visualizar/Baixar";
        botaoPdf.href = musica.pdf;
        botaoPdf.target = "_blank";
        botaoPdf.rel = "noopener";
        actions.appendChild(botaoPdf);
      }
      */

      card.appendChild(titulo);
      card.appendChild(categoria);

      if (descricao.textContent) {
        card.appendChild(descricao);
      }

      card.appendChild(audio);

      if (actions.children.length > 0) {
        card.appendChild(actions);
      }

      musicContainer.appendChild(card);
    });
  }

  function atualizarContador(total) {
    if (!resultsCounter) return;

    resultsCounter.textContent =
      total === 1 ? "1 obra encontrada" : `${total} obras encontradas`;
  }

  function normalizarTexto(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function formatarCategoria(categoria) {
    const categorias = {
      "toques-de-corneta": "Toques de Corneta",
      hinos: "Hinos",
      cancoes: "Canções",
      dobrados: "Dobrados"
    };

    return categorias[categoria] || categoria || "Categoria não informada";
  }
});

function criarModal() {
  if (document.getElementById("ammb-modal")) return;

  const modal = document.createElement("div");
  modal.id = "ammb-modal";
  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.zIndex = "9999";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.background = "rgba(0,0,0,.85)";
  modal.style.padding = "20px";

  modal.innerHTML = `
    <div id="ammb-modal-content">
      <button id="ammb-modal-close" type="button">&times;</button>
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

  closeButton.style.position = "absolute";
  closeButton.style.top = "8px";
  closeButton.style.right = "12px";
  closeButton.style.border = "none";
  closeButton.style.background = "transparent";
  closeButton.style.fontSize = "32px";
  closeButton.style.cursor = "pointer";

  closeButton.addEventListener("click", fecharModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) fecharModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fecharModal();
  });
}

async function abrirModal(caminho, titulo) {
  const modal = document.getElementById("ammb-modal");
  const modalBody = document.getElementById("ammb-modal-body");

  if (!modal || !modalBody) return;

  modal.style.display = "flex";
  modalBody.innerHTML = "";

  const tituloModal = document.createElement("h2");
  tituloModal.textContent = titulo || "Arquivo do acervo";
  tituloModal.style.color = "#111827";
  tituloModal.style.marginBottom = "16px";

  modalBody.appendChild(tituloModal);

  if (/\.(png|jpg|jpeg|webp)$/i.test(caminho)) {
    const imagem = document.createElement("img");
    imagem.src = caminho;
    imagem.alt = titulo || "Arquivo";
    imagem.style.maxWidth = "100%";
    imagem.style.height = "auto";
    imagem.style.display = "block";
    imagem.style.margin = "0 auto";

    imagem.onerror = () => {
      modalBody.textContent = "Não foi possível carregar o arquivo.";
    };

    modalBody.appendChild(imagem);
    return;
  }

  if (/\.txt$/i.test(caminho)) {
    try {
      const response = await fetch(caminho);
      const texto = await response.text();

      const pre = document.createElement("pre");
      pre.textContent = texto;
      pre.style.whiteSpace = "pre-wrap";
      pre.style.color = "#111827";
      pre.style.lineHeight = "1.6";

      modalBody.appendChild(pre);
    } catch {
      modalBody.textContent = "Não foi possível carregar a letra.";
    }

    return;
  }

  modalBody.textContent = "Formato de arquivo não suportado.";
}

function fecharModal() {
  const modal = document.getElementById("ammb-modal");
  const modalBody = document.getElementById("ammb-modal-body");

  if (modal) modal.style.display = "none";
  if (modalBody) modalBody.innerHTML = "";
}

/* ===========================
   CONVITE PARA AVALIAÇÃO
=========================== */

document.addEventListener("DOMContentLoaded", () => {
  const banner = document.getElementById("evaluation-banner");
  const dismissButton = document.getElementById("evaluation-dismiss");
  const evaluationLink = document.getElementById("evaluation-link");

  if (!banner || !dismissButton || !evaluationLink) {
    return;
  }

  const storageKey = "acervoMilitarAvaliacaoAdiadaAte";
  const sevenDaysInMilliseconds = 7 * 24 * 60 * 60 * 1000;

  const postponedUntil = Number(localStorage.getItem(storageKey) || 0);

  if (postponedUntil > Date.now()) {
    banner.classList.add("is-hidden");
  }

  dismissButton.addEventListener("click", () => {
    const nextDisplayDate = Date.now() + sevenDaysInMilliseconds;

    localStorage.setItem(storageKey, String(nextDisplayDate));
    banner.classList.add("is-hidden");
  });

  evaluationLink.addEventListener("click", () => {
    banner.classList.add("is-hidden");
  });
});