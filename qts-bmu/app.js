document.addEventListener("DOMContentLoaded", iniciarQts);

const INTERVALO_ATUALIZACAO = 5000;

let atualizacaoAutomatica = null;

async function iniciarQts() {
  const semanaElement =
    document.getElementById("semana");

  const programacaoElement =
    document.getElementById("programacao");

  const repertorioElement =
    document.getElementById("repertorio");

  try {
    const resposta = await fetch(
      `${API_QTS}?acao=carregarQts&t=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!resposta.ok) {
      throw new Error(
        `Erro HTTP ${resposta.status}`
      );
    }

    const json =
      await resposta.json();

    if (!json.sucesso || !json.dados) {
      throw new Error(
        json.mensagem ||
        "Falha ao carregar dados da API."
      );
    }

    const {
      config: configLinhas,
      programacao: programacaoLinhas,
      repertorio: repertorioLinhas,
      catalogo: catalogoLinhas,
      partituras: partiturasLinhas
    } = json.dados;

    const config =
      transformarConfig(configLinhas);

    atualizarCabecalho(config);

    renderizarSemana(
      config,
      semanaElement
    );

    renderizarProgramacao(
      programacaoLinhas,
      programacaoElement
    );

    renderizarRepertorio(
      repertorioLinhas,
      catalogoLinhas,
      partiturasLinhas,
      repertorioElement
    );

    atualizarStatusSincronizacao(true);
    iniciarAtualizacaoAutomatica();

  } catch (erro) {
    console.error(
      "Erro ao carregar QTS:",
      erro
    );

    atualizarStatusSincronizacao(false);

    semanaElement.textContent =
      "Não foi possível carregar a semana.";

    programacaoElement.innerHTML = `
      <p class="mensagem-erro">
        Não foi possível carregar a programação.
      </p>
    `;

    repertorioElement.innerHTML = `
      <p class="mensagem-erro">
        Não foi possível carregar o repertório.
      </p>
    `;
  }
}

function iniciarAtualizacaoAutomatica() {

  if (atualizacaoAutomatica) {
    return;
  }

  atualizacaoAutomatica = setInterval(
    atualizarQtsSilenciosamente,
    INTERVALO_ATUALIZACAO
  );

}

async function atualizarQtsSilenciosamente() {
  try {
    const resposta = await fetch(
      `${API_QTS}?acao=carregarQts&t=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!resposta.ok) {
      throw new Error(
        `Erro HTTP ${resposta.status}`
      );
    }

    const json = await resposta.json();

    if (!json.sucesso || !json.dados) {
      throw new Error(
        json.mensagem ||
        "Falha ao atualizar os dados."
      );
    }

    const {
      config: configLinhas,
      programacao: programacaoLinhas,
      repertorio: repertorioLinhas,
      catalogo: catalogoLinhas,
      partituras: partiturasLinhas
    } = json.dados;

    const config =
      transformarConfig(configLinhas);

    atualizarCabecalho(config);

    renderizarSemana(
      config,
      document.getElementById("semana")
    );

    renderizarProgramacao(
      programacaoLinhas,
      document.getElementById("programacao")
    );

    renderizarRepertorio(
      repertorioLinhas,
      catalogoLinhas,
      partiturasLinhas,
      document.getElementById("repertorio")
    );

    atualizarStatusSincronizacao(true);

  } catch (erro) {
    console.error(
      "Erro na atualização automática:",
      erro
    );

    atualizarStatusSincronizacao(false);
  }
}

function atualizarStatusSincronizacao(
  sucesso = true
) {

  const status =
    document.getElementById(
      "status-sincronizacao"
    );

  if (!status) {
    return;
  }

  const agora =
    new Date();

  const horario =
    agora.toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    );

  if (sucesso) {

    status.className =
      "status-sincronizacao atualizado";

    status.textContent =
      `🟢 Sincronizado às ${horario}`;

  } else {

    status.className =
      "status-sincronizacao erro";

    status.textContent =
      `🔴 Erro de sincronização`;

  }

}

/* ======================================================
   CONFIGURAÇÕES
====================================================== */

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
  const titulo = document.querySelector(".qts-header-text h1");
  const subtitulo = document.querySelector(".qts-header-text p");

  if (titulo && config.titulo) {
    titulo.textContent = config.titulo;
  }

  if (subtitulo && config.organizacao) {
    subtitulo.textContent = config.organizacao;
  }

  if (config.titulo) {
    document.title =
      `${config.titulo} | ${config.organizacao || "BMU"}`;
  }
}

function renderizarSemana(config, elemento) {
  const semana =
    config.semana || "Semana não informada";

  const ultimaAtualizacao =
    config.ultima_atualizacao || "Não informada";

  const responsavel =
    config.responsavel || "";

  const aviso =
    config.aviso || "";

  elemento.innerHTML = `
    <strong>
      ${escaparHtml(semana)}
    </strong>

    <span class="ultima-atualizacao">
  Última atualização:
  ${escaparHtml(ultimaAtualizacao)}
  ${
    responsavel
      ? ` - ${escaparHtml(responsavel)}`
      : ""
  }
</span>

    ${
      aviso
        ? `
          <span class="aviso-programacao">
            ${escaparHtml(aviso)}
          </span>
        `
        : ""
    }
  `;
}

/* ======================================================
   PROGRAMAÇÃO
====================================================== */

function renderizarProgramacao(linhas, elemento) {
  const itensPublicados = linhas
    .filter((linha) => normalizarSimNao(linha.mostrar));

  if (itensPublicados.length === 0) {
    elemento.innerHTML = `
      <p>
        Nenhuma programação publicada para esta semana.
      </p>
    `;

    return;
  }

  const programacaoPorDia =
    agruparPorDia(itensPublicados);

  elemento.innerHTML = Object
    .entries(programacaoPorDia)
    .map(([chaveDia, itens]) => {
      const primeiroItem = itens[0];

      return `
        <article class="dia-card">

          <header class="dia-card-header">
            <h3>
              ${escaparHtml(
                primeiroItem.dia || chaveDia
              )}
            </h3>

            <span>
              ${escaparHtml(
                primeiroItem.data || ""
              )}
            </span>
          </header>

          <div class="atividades-lista">

            ${itens
              .map((item) => {
                const horario =
                  formatarHorario(item.horario);

                const local =
                  String(item.local || "").trim();

                const observacao =
                  String(item.observacao || "").trim();

                return `
                  <div class="atividade-item">

                    <time>
                      ${escaparHtml(horario)}
                    </time>

                    <div class="atividade-conteudo">

                      <strong>
                        ${escaparHtml(
                          item.atividade || "Atividade"
                        )}
                      </strong>

                      ${
                        local &&
                        local !== "—" &&
                        local !== "-"
                          ? `
                            <span>
                              Local:
                              ${escaparHtml(local)}
                            </span>
                          `
                          : ""
                      }

                      ${
                        observacao &&
                        observacao !== "—" &&
                        observacao !== "-"
                          ? `
                            <small>
                              ${escaparHtml(observacao)}
                            </small>
                          `
                          : ""
                      }

                    </div>
                  </div>
                `;
              })
              .join("")}

          </div>
        </article>
      `;
    })
    .join("");
}

function agruparPorDia(linhas) {
  return linhas.reduce((grupos, item) => {
    const chave =
      `${item.dia || "Dia"}-${item.data || ""}`;

    if (!grupos[chave]) {
      grupos[chave] = [];
    }

    grupos[chave].push(item);

    return grupos;
  }, {});
}

function formatarHorario(valor) {
  const horario = String(valor || "").trim();

  if (!horario) {
    return "--:--";
  }

  const partes = horario.split(":");

  if (partes.length < 2) {
    return horario;
  }

  const horas = partes[0].padStart(2, "0");
  const minutos = partes[1].padStart(2, "0");

  return `${horas}:${minutos}`;
}

/* ======================================================
   REPERTÓRIO
====================================================== */

function renderizarRepertorio(
  repertorioLinhas,
  catalogoLinhas,
  partiturasLinhas,
  elemento
) {
  const catalogoPorNumero =
    criarIndiceCatalogo(catalogoLinhas);

  const partiturasPorObra =
    agruparPartiturasPorObra(partiturasLinhas);

  const itensPublicados = repertorioLinhas
    .filter((linha) => normalizarSimNao(linha.mostrar))
    .sort((a, b) => {
      return (
        Number(a.ordem || 9999) -
        Number(b.ordem || 9999)
      );
    });

  if (itensPublicados.length === 0) {
    elemento.innerHTML = `
      <p>
        Nenhuma obra publicada no repertório atual.
      </p>
    `;

    return;
  }

  elemento.innerHTML = `
    <div class="repertorio-grid">

      ${itensPublicados
        .map((item) => {
          return criarCardRepertorio(
            item,
            catalogoPorNumero,
            partiturasPorObra
          );
        })
        .join("")}

    </div>
  `;
}

function criarCardRepertorio(
  item,
  catalogoPorNumero,
  partiturasPorObra
) {
  const numero =
    String(item.numero || "").trim();

  const tituloAvulso =
    String(item.titulo_avulso || "").trim();

  const observacao =
    String(item.observacao || "").trim();

  const obraCatalogada = numero
    ? catalogoPorNumero[numero]
    : null;

  const titulo =
    obraCatalogada?.titulo ||
    tituloAvulso ||
    "Obra sem título";

  const categoria =
    obraCatalogada?.categoria ||
    "Obra avulsa";

  const obraId =
    obraCatalogada?.obra_id || "";

  const partituras =
    obraId && partiturasPorObra[obraId]
      ? partiturasPorObra[obraId]
      : [];

  const numeroExibido = numero
    ? numero.padStart(2, "0")
    : "S/N";

  return `
    <article class="obra-card">

      <div class="obra-numero">
        ${escaparHtml(numeroExibido)}
      </div>

      <div class="obra-conteudo">

        <h3>
          ${escaparHtml(titulo)}
        </h3>

        <div class="obra-metadados">

          <span>
            ${escaparHtml(categoria)}
          </span>

          ${
            obraCatalogada
              ? `
                <span class="status">
                  Caderno BACG
                </span>
              `
              : `
                <span class="status">
                  Obra avulsa
                </span>
              `
          }

        </div>

        ${
          observacao &&
          observacao !== "—" &&
          observacao !== "-"
            ? `
              <p>
                ${escaparHtml(observacao)}
              </p>
            `
            : ""
        }

        ${renderizarListaPartituras(partituras)}

      </div>
    </article>
  `;
}

/* ======================================================
   CATÁLOGO
====================================================== */

function criarIndiceCatalogo(linhas) {
  return linhas
    .filter((linha) => normalizarSimNao(linha.mostrar))
    .reduce((indice, linha) => {
      const numero =
        String(linha.numero || "").trim();

      if (!numero) {
        return indice;
      }

      indice[numero] = {
        numero,
        titulo:
          String(linha.titulo || "").trim(),

        categoria:
          String(linha.categoria || "").trim(),

        obra_id:
          String(linha.obra_id || "").trim()
      };

      return indice;
    }, {});
}

/* ======================================================
   PARTITURAS
====================================================== */

function agruparPartiturasPorObra(linhas) {
  return linhas
    .filter((linha) => normalizarSimNao(linha.mostrar))
    .reduce((grupos, linha) => {
      const obraId =
        String(linha.obra_id || "").trim();

      if (!obraId) {
        return grupos;
      }

      if (!grupos[obraId]) {
        grupos[obraId] = [];
      }

      grupos[obraId].push({
        instrumento:
          String(linha.instrumento || "").trim(),

        parte:
          String(linha.parte || "").trim(),

        pdf:
          String(linha.pdf || "").trim()
      });

      return grupos;
    }, {});
}

function renderizarListaPartituras(partituras) {
  const partiturasValidas = partituras
    .filter((partitura) => {
      return Boolean(partitura.pdf);
    });

  if (partiturasValidas.length === 0) {
    return `
      <span class="pdf-indisponivel">
        Partituras ainda não disponíveis
      </span>
    `;
  }

  const partiturasOrdenadas =
    ordenarPartituras(partiturasValidas);

  return `
    <details class="partituras-details">

      <summary>
        Ver partituras
        (${partiturasOrdenadas.length})
      </summary>

      <div class="partituras-lista">

        ${partiturasOrdenadas
          .map((partitura) => {
            const nomeExibido =
              partitura.parte ||
              partitura.instrumento ||
              "Abrir partitura";

            return `
              <a
                class="botao-pdf"
                href="${escaparAtributo(partitura.pdf)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${escaparHtml(nomeExibido)}
              </a>
            `;
          })
          .join("")}

      </div>
    </details>
  `;
}

function ordenarPartituras(partituras) {
  return [...partituras].sort((a, b) => {
    const nomeA =
      `${a.instrumento} ${a.parte}`
        .toLocaleLowerCase("pt-BR");

    const nomeB =
      `${b.instrumento} ${b.parte}`
        .toLocaleLowerCase("pt-BR");

    return nomeA.localeCompare(
      nomeB,
      "pt-BR",
      {
        numeric: true,
        sensitivity: "base"
      }
    );
  });
}

/* ======================================================
   FUNÇÕES UTILITÁRIAS
====================================================== */

function normalizarSimNao(valor) {
  const texto = String(valor || "")
    .trim()
    .toLowerCase();

  return [
    "sim",
    "s",
    "true",
    "1",
    "yes"
  ].includes(texto);
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