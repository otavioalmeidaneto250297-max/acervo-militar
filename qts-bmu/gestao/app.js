document.addEventListener("DOMContentLoaded", iniciarGestao);

const API_URL =
  "https://script.google.com/macros/s/AKfycbzL7ttaSBeu6hinpf3_0W149UBG9PMXDkpak16e8i_kxknueOCKzjWU5Ny6d9LMIjES/exec";

const estadoGestao = {
  catalogo: [],
  repertorioAtual: [],
  repertorioSelecionado: [],
  programacaoAtual: [],
  alteracoesPendentes: false
};

function iniciarGestao() {
  const form = document.getElementById("access-form");
  const pinInput = document.getElementById("management-pin");
  const message = document.getElementById("access-message");
  const preview = document.getElementById("management-preview");

  if (!form || !pinInput || !message || !preview) {
    console.error(
      "Elementos principais da gestão não encontrados."
    );

    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const pin = pinInput.value.trim();

    message.className = "access-message";
    preview.classList.add("is-hidden");

    if (!pin) {
      message.textContent = "Digite o código de gestão.";
      message.classList.add("error");

      return;
    }

    message.textContent = "Validando acesso...";

    try {
      const resultado = await validarPin(pin);

      if (!resultado.sucesso) {
        message.textContent =
          resultado.mensagem || "PIN inválido.";

        message.className = "access-message error";
        pinInput.select();
        return;
      }

      message.textContent = "Carregando painel...";
      message.className = "access-message success";

      await carregarDadosGestao();

      preview.classList.remove("is-hidden");

      message.textContent = "Acesso autorizado.";
      message.className = "access-message success";
    } catch (erro) {
      console.error("Erro ao validar acesso:", erro);

      message.textContent =
        "Não foi possível validar o acesso.";

      message.className = "access-message error";
    }
  });

  configurarPesquisa();
  configurarObraAvulsa();
  configurarBotaoSalvar();
  configurarBotaoProgramacao();
  configurarBotaoNovaAtividade();
}

async function validarPin(pin) {
  const resposta = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      acao: "validarPin",
      pin
    })
  });

  if (!resposta.ok) {
    throw new Error(`Erro HTTP ${resposta.status}`);
  }

  return resposta.json();
}

async function carregarDadosGestao() {
  const listaObras =
    document.getElementById("lista-obras");

  if (listaObras) {
    listaObras.innerHTML = `
      <p class="loading-message">
        Carregando catálogo...
      </p>
    `;
  }

  const resposta = await fetch(
  `${API_URL}?acao=carregarQts&t=${Date.now()}`,
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
    "Falha ao carregar dados da gestão."
  );
}

const {
  catalogo: catalogoLinhas,
  repertorio: repertorioLinhas,
  programacao: programacaoLinhas
} = json.dados;

  estadoGestao.catalogo =
    catalogoLinhas
      .filter((linha) =>
        normalizarSimNao(linha.mostrar)
      )
      .sort((a, b) => {
        return (
          Number(a.numero || 9999) -
          Number(b.numero || 9999)
        );
      });

  estadoGestao.repertorioAtual =
    repertorioLinhas
      .filter((linha) =>
        normalizarSimNao(linha.mostrar)
      )
      .sort((a, b) => {
        return (
          Number(a.ordem || 9999) -
          Number(b.ordem || 9999)
        );
      });

  estadoGestao.programacaoAtual =
    programacaoLinhas.filter(    
      (linha) => normalizarSimNao(linha.mostrar)
    );

  estadoGestao.repertorioSelecionado =
    transformarRepertorioAtual();

  estadoGestao.alteracoesPendentes =
    false;

  renderizarCatalogo();
  renderizarRepertorioSelecionado();
  atualizarContador();
  atualizarStatusAlteracoes();
}

function transformarRepertorioAtual() {
  return estadoGestao.repertorioAtual.map(
    (linha) => {
      const numero =
        String(linha.numero || "").trim();

      const tituloAvulso =
        String(
          linha.titulo_avulso || ""
        ).trim();

      const obraCatalogada =
        estadoGestao.catalogo.find(
          (obra) =>
            String(
              obra.numero || ""
            ).trim() === numero
        );

      if (obraCatalogada) {
        return {
          id: `catalogo-${numero}`,
          tipo: "catalogo",
          numero,
          titulo:
            String(
              obraCatalogada.titulo || ""
            ).trim(),
          categoria:
            String(
              obraCatalogada.categoria || ""
            ).trim(),
          observacao:
            String(
              linha.observacao || ""
            ).trim()
        };
      }

      return {
        id: criarIdAvulso(),
        tipo: "avulsa",
        numero: "",
        titulo:
          tituloAvulso ||
          "Obra sem título",
        categoria:
          "Obra avulsa",
        observacao:
          String(
            linha.observacao || ""
          ).trim()
      };
    }
  );
}
function renderizarCatalogo(filtro = "") {
  const listaObras =
    document.getElementById("lista-obras");

  if (!listaObras) {
    return;
  }

  const termo =
    normalizarTexto(filtro);

  const obrasFiltradas =
    estadoGestao.catalogo.filter((obra) => {
      const numero =
        normalizarTexto(obra.numero);

      const titulo =
        normalizarTexto(obra.titulo);

      const categoria =
        normalizarTexto(obra.categoria);

      return (
        numero.includes(termo) ||
        titulo.includes(termo) ||
        categoria.includes(termo)
      );
    });

  if (obrasFiltradas.length === 0) {
    listaObras.innerHTML = `
      <p class="empty-message">
        Nenhuma obra encontrada.
      </p>
    `;

    return;
  }

  listaObras.innerHTML =
    obrasFiltradas
      .map((obra) => {
        const numero =
          String(
            obra.numero || ""
          ).trim();

        const titulo =
          String(
            obra.titulo ||
            "Obra sem título"
          ).trim();

        const categoria =
          String(
            obra.categoria || ""
          ).trim();

        const selecionada =
          obraEstaSelecionada(numero);

        return `
          <label
            class="obra-item ${
              selecionada
                ? "is-selected"
                : ""
            }"
          >

            <input
              type="checkbox"
              class="obra-checkbox"
              value="${
                escaparAtributo(numero)
              }"
              ${
                selecionada
                  ? "checked"
                  : ""
              }
            >

            <span class="obra-item-number">
              ${
                escaparHtml(
                  numero.padStart(2, "0")
                )
              }
            </span>

            <span class="obra-item-content">
              <strong>
                ${
                  escaparHtml(titulo)
                }
              </strong>

              ${
                categoria
                  ? `
                    <small>
                      ${
                        escaparHtml(
                          categoria
                        )
                      }
                    </small>
                  `
                  : ""
              }
            </span>

          </label>
        `;
      })
      .join("");

  configurarCheckboxes();
}

function configurarCheckboxes() {
  const checkboxes =
    document.querySelectorAll(
      ".obra-checkbox"
    );

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener(
      "change",
      () => {
        const numero =
          String(
            checkbox.value || ""
          ).trim();

        if (checkbox.checked) {
          adicionarObraDoCatalogo(
            numero
          );
        } else {
          removerObraDoCatalogo(
            numero
          );
        }

        estadoGestao.alteracoesPendentes =
          true;

        renderizarCatalogo(
          document
            .getElementById(
              "catalog-search-input"
            )
            ?.value || ""
        );

        renderizarRepertorioSelecionado();
        atualizarContador();
        atualizarStatusAlteracoes();
      }
    );
  });
}

function adicionarObraDoCatalogo(
  numero
) {
  if (
    obraEstaSelecionada(numero)
  ) {
    return;
  }

  const obra =
    estadoGestao.catalogo.find(
      (item) =>
        String(
          item.numero || ""
        ).trim() === numero
    );

  if (!obra) {
    return;
  }

  estadoGestao
    .repertorioSelecionado
    .push({
      id: `catalogo-${numero}`,
      tipo: "catalogo",
      numero,
      titulo:
        String(
          obra.titulo || ""
        ).trim(),
      categoria:
        String(
          obra.categoria || ""
        ).trim(),
      observacao: ""
    });
}

function removerObraDoCatalogo(
  numero
) {
  estadoGestao.repertorioSelecionado =
    estadoGestao
      .repertorioSelecionado
      .filter(
        (item) =>
          !(
            item.tipo ===
              "catalogo" &&
            item.numero ===
              numero
          )
      );
}

function obraEstaSelecionada(
  numero
) {
  return estadoGestao
    .repertorioSelecionado
    .some(
      (item) =>
        item.tipo ===
          "catalogo" &&
        item.numero ===
          numero
    );
}

function renderizarRepertorioSelecionado() {
  const container =
    document.getElementById(
      "repertorio-selecionado"
    );

  if (!container) {
    return;
  }

  if (
    estadoGestao
      .repertorioSelecionado
      .length === 0
  ) {
    container.innerHTML = `
      <p class="empty-message">
        Nenhuma obra selecionada.
      </p>
    `;

    return;
  }

  container.innerHTML =
    estadoGestao
      .repertorioSelecionado
      .map((item, indice) => {
        const numeroExibido =
          item.numero
            ? item.numero.padStart(
                2,
                "0"
              )
            : "S/N";

        return `
          <article
            class="selected-work"
          >

            <div
              class="selected-work-order"
            >
              ${indice + 1}
            </div>

            <div
              class="selected-work-content"
            >

              <strong>
                ${
                  escaparHtml(
                    numeroExibido
                  )
                }
                —
                ${
                  escaparHtml(
                    item.titulo
                  )
                }
              </strong>

              <small>
                ${
                  escaparHtml(
                    item.categoria
                  )
                }
              </small>

              <label>
                Observação

                <input
                  class="selected-work-note"
                  type="text"
                  data-id="${
                    escaparAtributo(
                      item.id
                    )
                  }"
                  value="${
                    escaparAtributo(
                      item.observacao
                    )
                  }"
                  placeholder="Observação opcional"
                >
              </label>

            </div>

            <div
              class="selected-work-actions"
            >

              <button
                type="button"
                class="order-button"
                data-action="up"
                data-id="${
                  escaparAtributo(
                    item.id
                  )
                }"
                aria-label="Mover para cima"
                ${
                  indice === 0
                    ? "disabled"
                    : ""
                }
              >
                ↑
              </button>

              <button
                type="button"
                class="order-button"
                data-action="down"
                data-id="${
                  escaparAtributo(
                    item.id
                  )
                }"
                aria-label="Mover para baixo"
                ${
                  indice ===
                  estadoGestao
                    .repertorioSelecionado
                    .length -
                    1
                    ? "disabled"
                    : ""
                }
              >
                ↓
              </button>

              <button
                type="button"
                class="remove-button"
                data-action="remove"
                data-id="${
                  escaparAtributo(
                    item.id
                  )
                }"
              >
                Remover
              </button>

            </div>

          </article>
        `;
      })
      .join("");

  configurarAcoesRepertorio();
}
function configurarAcoesRepertorio() {
  const botoes =
    document.querySelectorAll(
      "[data-action][data-id]"
    );

  botoes.forEach((botao) => {
    botao.addEventListener(
      "click",
      () => {
        const id =
          botao.dataset.id;

        const acao =
          botao.dataset.action;

        const indice =
          estadoGestao
            .repertorioSelecionado
            .findIndex(
              (item) =>
                item.id === id
            );

        if (indice < 0) {
          return;
        }

        if (
          acao === "up" &&
          indice > 0
        ) {
          trocarPosicoes(
            indice,
            indice - 1
          );
        }

        if (
          acao === "down" &&
          indice <
            estadoGestao
              .repertorioSelecionado
              .length -
              1
        ) {
          trocarPosicoes(
            indice,
            indice + 1
          );
        }

        if (
          acao === "remove"
        ) {
          estadoGestao
            .repertorioSelecionado
            .splice(
              indice,
              1
            );
        }

        estadoGestao
          .alteracoesPendentes =
          true;

        renderizarRepertorioSelecionado();

        renderizarCatalogo(
          document
            .getElementById(
              "catalog-search-input"
            )
            ?.value || ""
        );

        atualizarContador();
        atualizarStatusAlteracoes();
      }
    );
  });

  const observacoes =
    document.querySelectorAll(
      ".selected-work-note"
    );

  observacoes.forEach((input) => {
    input.addEventListener(
      "input",
      () => {
        const item =
          estadoGestao
            .repertorioSelecionado
            .find(
              (obra) =>
                obra.id ===
                input.dataset.id
            );

        if (!item) {
          return;
        }

        item.observacao =
          input.value;

        estadoGestao
          .alteracoesPendentes =
          true;

        atualizarStatusAlteracoes();
      }
    );
  });
}

function trocarPosicoes(
  indiceA,
  indiceB
) {
  const lista =
    estadoGestao
      .repertorioSelecionado;

  [
    lista[indiceA],
    lista[indiceB]
  ] = [
    lista[indiceB],
    lista[indiceA]
  ];
}

function configurarObraAvulsa() {
  const form =
    document.getElementById(
      "obra-avulsa-form"
    );

  const tituloInput =
    document.getElementById(
      "obra-avulsa-titulo"
    );

  const observacaoInput =
    document.getElementById(
      "obra-avulsa-observacao"
    );

  const message =
    document.getElementById(
      "obra-avulsa-message"
    );

  if (
    !form ||
    !tituloInput ||
    !observacaoInput ||
    !message
  ) {
    return;
  }

  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const titulo =
        tituloInput.value.trim();

      const observacao =
        observacaoInput.value.trim();

      message.className =
        "access-message";

      if (!titulo) {
        message.textContent =
          "Informe o nome da obra avulsa.";

        message.classList.add(
          "error"
        );

        return;
      }

      estadoGestao
        .repertorioSelecionado
        .push({
          id: criarIdAvulso(),
          tipo: "avulsa",
          numero: "",
          titulo,
          categoria:
            "Obra avulsa",
          observacao
        });

      tituloInput.value = "";
      observacaoInput.value = "";

      message.textContent =
        "Obra avulsa adicionada ao repertório.";

      message.classList.add(
        "success"
      );

      estadoGestao
        .alteracoesPendentes =
        true;

      renderizarRepertorioSelecionado();
      atualizarContador();
      atualizarStatusAlteracoes();
    }
  );
}

function criarIdAvulso() {
  return (
    `avulsa-${Date.now()}-` +
    Math.random()
      .toString(16)
      .slice(2)
  );
}

function configurarPesquisa() {
  const searchInput =
    document.getElementById(
      "catalog-search-input"
    );

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener(
    "input",
    () => {
      renderizarCatalogo(
        searchInput.value
      );
    }
  );
}

function atualizarContador() {
  const counter =
    document.getElementById(
      "selected-counter"
    );

  if (!counter) {
    return;
  }

  const quantidade =
    estadoGestao
      .repertorioSelecionado
      .length;

  counter.textContent =
    quantidade === 1
      ? "1 selecionada"
      : `${quantidade} selecionadas`;
}

function atualizarStatusAlteracoes() {
  const status =
    document.getElementById(
      "status-alteracoes"
    );

  const botaoSalvar =
    document.getElementById(
      "btn-salvar"
    );

  if (!status) {
    return;
  }

  if (
    estadoGestao.alteracoesPendentes
  ) {
    status.textContent =
      "Existem alterações ainda não publicadas.";

    status.classList.add(
      "has-changes"
    );

    if (botaoSalvar) {
      botaoSalvar.disabled = false;
    }

  } else {
    status.textContent =
      "Nenhuma alteração pendente.";

    status.classList.remove(
      "has-changes"
    );

    if (botaoSalvar) {
      botaoSalvar.disabled = true;
    }
  }
}

function configurarBotaoProgramacao() {

  const botao =
    document.getElementById(
      "btn-programacao"
    );

  const painel =
    document.getElementById(
      "painel-programacao"
    );

  if (!botao || !painel) {
    return;
  }

  botao.addEventListener("click", () => {

    const aberto =
      !painel.classList.contains(
        "is-hidden"
      );

    if (aberto) {

      painel.classList.add("is-hidden");

      botao.textContent =
        "Editar programação";

      return;

    }

    renderizarEditorProgramacao();

    painel.classList.remove(
      "is-hidden"
    );

    botao.textContent =
      "Fechar programação";

  });

}

function renderizarEditorProgramacao() {
  const painel =
    document.getElementById("lista-programacao");

  if (!painel) {
    return;
  }

  if (estadoGestao.programacaoAtual.length === 0) {
    painel.innerHTML = `
      <p class="empty-message">
        Nenhuma atividade encontrada.
      </p>
    `;

    return;
  }

  painel.innerHTML =
    estadoGestao.programacaoAtual
      .map((atividade, indice) =>
        renderizarCardProgramacao(atividade, indice)
      )
      .join("");

  configurarCamposProgramacao();
  configurarBotoesOrdenacaoProgramacao();
  configurarBotoesRemoverProgramacao();
}

function renderizarCardProgramacao(atividade, indice) {
  return `
    <article class="programacao-editor-item">

      <div class="programacao-editor-order">
        ${indice + 1}
      </div>

      <div class="programacao-editor-fields">

        <label>
          Dia
          <input
            type="text"
            class="programacao-input"
            data-index="${indice}"
            data-campo="dia"
            value="${escaparAtributo(atividade.dia || "")}"
          >
        </label>

        <label>
          Data
          <input
            type="text"
            class="programacao-input"
            data-index="${indice}"
            data-campo="data"
            value="${escaparAtributo(atividade.data || "")}"
            placeholder="Ex.: 13/07"
          >
        </label>

        <label>
          Horário
          <input
            type="text"
            class="programacao-input"
            data-index="${indice}"
            data-campo="horario"
            value="${escaparAtributo(atividade.horario || "")}"
            placeholder="Ex.: 09:00"
          >
        </label>

        <label>
          Atividade
          <input
            type="text"
            class="programacao-input"
            data-index="${indice}"
            data-campo="atividade"
            value="${escaparAtributo(atividade.atividade || "")}"
            placeholder="Ex.: Ensaio"
          >
        </label>

        <label>
          Local
          <input
            type="text"
            class="programacao-input"
            data-index="${indice}"
            data-campo="local"
            value="${escaparAtributo(atividade.local || "")}"
            placeholder="Ex.: Sala da Banda"
          >
        </label>

        <label>
          Observação
          <input
            type="text"
            class="programacao-input"
            data-index="${indice}"
            data-campo="observacao"
            value="${escaparAtributo(atividade.observacao || "")}"
            placeholder="Observação opcional"
          >
        </label>

      </div>

      <div class="programacao-editor-actions">
        <button
          type="button"
          class="order-button programacao-order-button"
          data-action="up"
          data-index="${indice}"
          aria-label="Mover atividade para cima"
          ${indice === 0 ? "disabled" : ""}
  >
    ↑
  </button>

  <button
    type="button"
    class="order-button programacao-order-button"
    data-action="down"
    data-index="${indice}"
    aria-label="Mover atividade para baixo"
    ${
      indice === estadoGestao.programacaoAtual.length - 1
        ? "disabled"
        : ""
    }
    >
    ↓
  </button>

  <button
    type="button"
    class="remove-button programacao-remove-button"
    data-index="${indice}"
        >
          Remover atividade
        </button>
      </div>

    </article>
  `;
}

function configurarCamposProgramacao() {
  const campos =
    document.querySelectorAll(".programacao-input");

  campos.forEach((campo) => {
    campo.addEventListener("input", () => {
      const indice = Number(campo.dataset.index);
      const nomeCampo = campo.dataset.campo;

      const atividade =
        estadoGestao.programacaoAtual[indice];

      if (!atividade || !nomeCampo) {
        return;
      }

      atividade[nomeCampo] = campo.value;

      estadoGestao.alteracoesPendentes = true;
      atualizarStatusAlteracoes();
    });
  });
}

function configurarBotoesOrdenacaoProgramacao() {

  const botoes =
    document.querySelectorAll(
      ".programacao-order-button"
    );

  botoes.forEach((botao) => {

    botao.addEventListener("click", () => {

      const indice =
        Number(botao.dataset.index);

      const acao =
        botao.dataset.action;

      if (
        !Number.isInteger(indice)
      ) {
        return;
      }

      if (
        acao === "up" &&
        indice > 0
      ) {

        [
          estadoGestao.programacaoAtual[indice - 1],
          estadoGestao.programacaoAtual[indice]
        ] = [

          estadoGestao.programacaoAtual[indice],
          estadoGestao.programacaoAtual[indice - 1]

        ];

      }

      if (
        acao === "down" &&
        indice <
          estadoGestao.programacaoAtual.length - 1
      ) {

        [
          estadoGestao.programacaoAtual[indice + 1],
          estadoGestao.programacaoAtual[indice]
        ] = [

          estadoGestao.programacaoAtual[indice],
          estadoGestao.programacaoAtual[indice + 1]

        ];

      }

      estadoGestao.alteracoesPendentes =
        true;

      renderizarEditorProgramacao();

      atualizarStatusAlteracoes();

    });

  });

}

function configurarBotoesRemoverProgramacao() {
  const botoes = document.querySelectorAll(
    ".programacao-remove-button"
  );

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      const indice = Number(botao.dataset.index);

      if (
        !Number.isInteger(indice) ||
        !estadoGestao.programacaoAtual[indice]
      ) {
        return;
      }

      const atividade =
        estadoGestao.programacaoAtual[indice];

      const possuiConteudo = [
        atividade.dia,
        atividade.data,
        atividade.horario,
        atividade.atividade,
        atividade.local,
        atividade.observacao
      ].some((valor) => String(valor || "").trim());

      if (possuiConteudo) {
        const confirmar = window.confirm(
          "Deseja remover esta atividade da programação?"
        );

        if (!confirmar) {
          return;
        }
      }

      estadoGestao.programacaoAtual.splice(indice, 1);
      estadoGestao.alteracoesPendentes = true;

      renderizarEditorProgramacao();
      atualizarStatusAlteracoes();
    });
  });
}

function configurarBotaoNovaAtividade() {

  const botao =
    document.getElementById(
      "btn-nova-atividade"
    );

  if (!botao) {
    return;
  }

  botao.addEventListener(
    "click",
    () => {

      estadoGestao.programacaoAtual.push({

        dia: "",

        data: "",

        horario: "",

        atividade: "",

        local: "",

        observacao: "",

        mostrar: "SIM"

      });

      estadoGestao.alteracoesPendentes =
        true;

      atualizarStatusAlteracoes();

      renderizarEditorProgramacao();

    }
  );

}

let temporizadorToast = null;

function mostrarToast(mensagem, tipo = "success") {
  const toast =
    document.getElementById("toast-message");

  if (!toast) {
    console.warn(
      "Elemento de notificação não encontrado."
    );

    return;
  }

  if (temporizadorToast) {
    clearTimeout(temporizadorToast);
  }

  toast.textContent = mensagem;
  toast.className =
    `toast-message show ${tipo}`;

  temporizadorToast = setTimeout(() => {
    toast.className = "toast-message";
    toast.textContent = "";
  }, 4500);
}

function configurarBotaoSalvar() {
  const botao =
    document.getElementById("btn-salvar");

  if (!botao) {
    return;
  }

  botao.addEventListener("click", async () => {
    const pin =
      document
        .getElementById("management-pin")
        ?.value.trim();

    const responsavel =
      document
        .getElementById("responsavel-publicacao-select")
        ?.value.trim();

    if (!pin) {
      mostrarToast("Digite o PIN de gestão.", "error",);
      return;
    }

    if (!responsavel) {
      mostrarToast("Selecione o responsável pela atualização.", "error",);
      return;
    }

    const repertorio =
      estadoGestao.repertorioSelecionado.map(
        (obra, indice) => ({
          ordem: indice + 1,
          numero: obra.numero || "",
          titulo_avulso:
            obra.tipo === "avulsa"
              ? obra.titulo
              : "",
          observacao:
            obra.observacao || "",
          mostrar: "SIM"
        })
      );

    const programacao =
      estadoGestao.programacaoAtual.map(
        (item) => ({
          dia: item.dia || "",
          data: item.data || "",
          horario: item.horario || "",
          atividade: item.atividade || "",
          local: item.local || "",
          observacao: item.observacao || "",
          mostrar: "SIM"
        })
      );

    const textoOriginal = botao.textContent;

    botao.disabled = true;
    botao.textContent = "Publicando...";

    try {
      const resposta =
  await enviarDadosApi({
    acao: "salvarTudo",
    pin,
    responsavel,
    repertorio,
    programacao
  });

if (!resposta.sucesso) {
  throw new Error(
    resposta.mensagem ||
    "Erro ao publicar alterações."
  );
}

      estadoGestao.alteracoesPendentes = false;
      atualizarStatusAlteracoes();

      botao.textContent = "✓ Publicado";

      mostrarToast(
        "Repertório e programação publicados com sucesso!",
        "success"
      );

      await new Promise(resolve =>
      setTimeout(resolve, 1800)
      );

    } catch (erro) {
      console.error(
        "Erro ao publicar alterações:",
        erro
      );

      mostrarToast(
        erro.message ||
        "Erro ao conectar com a API.",
        "error"
      );
    } finally {
  botao.textContent =
    textoOriginal;

  atualizarStatusAlteracoes();
    }
  });
}

async function enviarDadosApi(dados) {
  const resposta = await fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },

    body: JSON.stringify(dados)
  });

  if (!resposta.ok) {
    throw new Error(
      `Erro HTTP ${resposta.status}`
    );
  }

  return resposta.json();
}

function normalizarTexto(texto) {

  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

}

function normalizarSimNao(valor) {

  return (
    normalizarTexto(valor) === "sim"
  );

}

function escaparHtml(texto) {

  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

}

function escaparAtributo(texto) {

  return escaparHtml(texto);

}