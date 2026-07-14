document.addEventListener("DOMContentLoaded", iniciarQts);

async function iniciarQts() {
  const semanaElement = document.getElementById("semana");
  const programacaoElement = document.getElementById("programacao");
  const repertorioElement = document.getElementById("repertorio");

  try {
    const [configLinhas, programacaoLinhas, repertorioLinhas] =
      await Promise.all([
        carregarCsv(SHEETS.config),
        carregarCsv(SHEETS.programacao),
        carregarCsv(SHEETS.repertorio)
      ]);

    const config = transformarConfig(configLinhas);

    atualizarCabecalho(config);
    renderizarSemana(config, semanaElement);
    renderizarProgramacao(programacaoLinhas, programacaoElement);
    renderizarRepertorio(repertorioLinhas, repertorioElement);
  } catch (erro) {
    console.error("Erro ao carregar QTS:", erro);

    semanaElement.textContent = "Não foi possível carregar a semana.";
    programacaoElement.innerHTML =
      '<p class="mensagem-erro">Não foi possível carregar a programação.</p>';
    repertorioElement.innerHTML =
      '<p class="mensagem-erro">Não foi possível carregar o repertório.</p>';
  }
}

function transformarConfig(linhas) {
  return linhas.reduce((config, linha) => {
    const campo = String(linha.campo || "").trim();
    const valor = String(linha.valor || "").trim();

    if (campo) {
      config[campo] = valor;
    }

    return config;
  }, {});
}

function atualizarCabecalho(config) {
  const titulo = document.querySelector("header h1");
  const subtitulo = document.querySelector("header p");

  if (titulo && config.titulo) {
    titulo.textContent = config.titulo;
  }

  if (subtitulo && config.organizacao) {
    subtitulo.textContent = config.organizacao;
  }

  if (config.titulo) {
    document.title = `${config.titulo} | ${config.organizacao || "BMU"}`;
  }
}

function renderizarSemana(config, elemento) {
  const semana = config.semana || "Semana não informada";
  const ultimaAtualizacao =
    config.ultima_atualizacao || "Não informada";
  const aviso = config.aviso || "";

  elemento.innerHTML = `
    <strong>${escaparHtml(semana)}</strong>

    <span class="ultima-atualizacao">
      Última atualização: ${escaparHtml(ultimaAtualizacao)}
    </span>

    ${
      aviso
        ? `<span class="aviso-programacao">${escaparHtml(aviso)}</span>`
        : ""
    }
  `;
}

function renderizarProgramacao(linhas, elemento) {
  const itensPublicados = linhas.filter(
    (linha) => normalizarSimNao(linha.mostrar)
  );

  if (itensPublicados.length === 0) {
    elemento.innerHTML =
      "<p>Nenhuma programação publicada para esta semana.</p>";
    return;
  }

  const programacaoPorDia = agruparPorDia(itensPublicados);

  elemento.innerHTML = Object.entries(programacaoPorDia)
    .map(([chaveDia, itens]) => {
      const primeiroItem = itens[0];

      return `
        <article class="dia-card">
          <header class="dia-card-header">
            <h3>${escaparHtml(primeiroItem.dia || chaveDia)}</h3>
            <span>${escaparHtml(primeiroItem.data || "")}</span>
          </header>

          <div class="atividades-lista">
            ${itens
              .map(
                (item) => `
                  <div class="atividade-item">
                    <time>${escaparHtml(item.horario || "--:--")}</time>

                    <div class="atividade-conteudo">
                      <strong>${escaparHtml(
                        item.atividade || "Atividade"
                      )}</strong>

                      ${
                        item.local && item.local !== "—"
                          ? `<span>Local: ${escaparHtml(item.local)}</span>`
                          : ""
                      }

                      ${
                        item.observacao && item.observacao !== "—"
                          ? `<small>${escaparHtml(item.observacao)}</small>`
                          : ""
                      }
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderizarRepertorio(linhas, elemento) {
  const itensPublicados = linhas
    .filter((linha) => normalizarSimNao(linha.mostrar))
    .sort(
      (a, b) =>
        Number(a["nº"] || a.n || 9999) -
        Number(b["nº"] || b.n || 9999)
    );

  if (itensPublicados.length === 0) {
    elemento.innerHTML =
      "<p>Nenhuma obra publicada no repertório atual.</p>";
    return;
  }

  elemento.innerHTML = `
    <div class="repertorio-grid">
      ${itensPublicados
        .map((item) => {
          const numero = item["nº"] || item.n || "";
          const titulo = item.musica || "Obra sem título";
          const status = item.status || "";
          const categoria = item.categoria || "";
          const observacao = item.observacao || "";
          const pdf = item.pdf || "";

          return `
            <article class="obra-card">
              <div class="obra-numero">
                ${escaparHtml(numero)}
              </div>

              <div class="obra-conteudo">
                <h3>${escaparHtml(titulo)}</h3>

                <div class="obra-metadados">
                  ${
                    categoria
                      ? `<span>${escaparHtml(categoria)}</span>`
                      : ""
                  }

                  ${
                    status
                      ? `<span class="status">${escaparHtml(status)}</span>`
                      : ""
                  }
                </div>

                ${
                  observacao && observacao !== "—"
                    ? `<p>${escaparHtml(observacao)}</p>`
                    : ""
                }

                ${
                  pdf
                    ? `
                      <a
                        class="botao-pdf"
                        href="${escaparAtributo(pdf)}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir partitura
                      </a>
                    `
                    : `
                      <span class="pdf-indisponivel">
                        Partitura ainda não disponível
                      </span>
                    `
                }
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function agruparPorDia(linhas) {
  return linhas.reduce((grupos, item) => {
    const chave = `${item.dia || "Dia"}-${item.data || ""}`;

    if (!grupos[chave]) {
      grupos[chave] = [];
    }

    grupos[chave].push(item);

    return grupos;
  }, {});
}

function normalizarSimNao(valor) {
  const texto = String(valor || "")
    .trim()
    .toLowerCase();

  return ["sim", "s", "true", "1", "yes"].includes(texto);
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escaparAtributo(valor) {
  return escaparHtml(valor);
}