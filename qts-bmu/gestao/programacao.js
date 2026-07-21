/* ==========================================
   PROGRAMAÇÃO SEMANAL — GESTÃO BACG
========================================== */

const PROGRAMACAO_DIAS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira"
];
let inicioSemanaAtual = null;

const programacaoSemana = {};

function carregarProgramacaoPublicada() {

  PROGRAMACAO_DIAS.forEach((dia) => {
    programacaoSemana[dia] = [];
  });

  if (
    typeof estadoGestao === "undefined" ||
    !Array.isArray(estadoGestao.programacaoAtual)
  ) {
    return;
  }

  estadoGestao.programacaoAtual.forEach((item) => {

    const dia =
      String(item.dia || "").trim();

    if (!programacaoSemana[dia]) {
      programacaoSemana[dia] = [];
    }

    programacaoSemana[dia].push({

      horario:
        item.horario || "",

      atividade:
        item.atividade || "",

      local:
        item.local || "",

      uniforme:
        item.uniforme || "",

      observacao:
        item.observacao || ""

    });

  });

  PROGRAMACAO_DIAS.forEach((dia) => {

    programacaoSemana[dia].sort(

      (a, b) =>
        a.horario.localeCompare(
          b.horario
        )

    );

  });

}

function obterSegundaFeira(dataReferencia) {

  const data =
    new Date(dataReferencia);

  const diaSemana =
    data.getDay();

  const diferenca =
    diaSemana === 0
      ? -6
      : 1 - diaSemana;

  data.setDate(
    data.getDate() + diferenca
  );

  data.setHours(12, 0, 0, 0);

  return data;

}

function formatarDataParaInput(data) {

  const ano =
    data.getFullYear();

  const mes =
    String(
      data.getMonth() + 1
    ).padStart(2, "0");

  const dia =
    String(
      data.getDate()
    ).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;

}

function formatarDataBrasileira(data) {

  return data.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );

}

  function obterDatasSemana(dataInicial) {

  const datas = [];

  for (let i = 0; i < 5; i++) {

    const data = new Date(dataInicial);

    data.setDate(dataInicial.getDate() + i);

    datas.push(data);

  }

  return datas;

}

function iniciarProgramacaoSemanal() {

  console.log(
    "Módulo de programação semanal iniciado."
  );

  const campoInicio =
    document.getElementById(
      "inicio-semana-input"
    );

  if (!campoInicio) {
    console.error(
      "Campo de início da semana não encontrado."
    );

    return;
  }

  const inicioSemanaSalvo =
    localStorage.getItem(
      "qts_inicio_semana"
    );

  if (inicioSemanaSalvo) {

    const partesSalvas =
      inicioSemanaSalvo
        .split("-")
        .map(Number);

    inicioSemanaAtual =
      new Date(
        partesSalvas[0],
        partesSalvas[1] - 1,
        partesSalvas[2],
        12
      );

  } else {

    inicioSemanaAtual =
      obterSegundaFeira(
        new Date()
      );

  }

  campoInicio.value =
    formatarDataParaInput(
      inicioSemanaAtual
    );

  campoInicio.addEventListener(
    "change",
    () => {

      if (!campoInicio.value) {
        return;
      }

      const partesEscolhidas =
        campoInicio.value
          .split("-")
          .map(Number);

      const dataEscolhida =
        new Date(
          partesEscolhidas[0],
          partesEscolhidas[1] - 1,
          partesEscolhidas[2],
          12
        );

      inicioSemanaAtual =
        obterSegundaFeira(
          dataEscolhida
        );

      campoInicio.value =
        formatarDataParaInput(
          inicioSemanaAtual
        );

      localStorage.setItem(
        "qts_inicio_semana",
        campoInicio.value
      );

      renderizarNovoEditorProgramacao();

    }
  );

  carregarProgramacaoPublicada();

  renderizarNovoEditorProgramacao();

}

function renderizarAtividadesDia(dia) {

  const atividades =
    programacaoSemana[dia] || [];

  if (atividades.length === 0) {
    return `
      <p class="empty-message">
        Nenhuma atividade cadastrada.
      </p>
    `;
  }

  return atividades
    .map((atividade, indice) => `
      <article class="programacao-atividade-item">

        <div class="programacao-atividade-horario">
          ${atividade.horario}
        </div>

        <div class="programacao-atividade-conteudo">

          <strong>
            ${atividade.atividade}
          </strong>

          ${
            atividade.local
              ? `<span>Local: ${atividade.local}</span>`
              : ""
          }

          ${
            atividade.uniforme
              ? `<span>Uniforme: ${atividade.uniforme}</span>`
              : ""
          }

          ${
            atividade.observacao
              ? `<small>${atividade.observacao}</small>`
              : ""
          }

        </div>

        <button
          class="remove-button programacao-atividade-remover"
          type="button"
          data-dia="${dia}"
          data-indice="${indice}"
        >
          Remover
        </button>

      </article>
    `)
    .join("");

}

function sincronizarProgramacaoComGestao() {

  if (
    typeof estadoGestao === "undefined"
  ) {
    console.error(
      "Estado da Gestão não está disponível."
    );

    return;
  }

  const dataInicial =
    inicioSemanaAtual || new Date();

  const datas =
    obterDatasSemana(dataInicial);

  const programacaoConvertida = [];

  PROGRAMACAO_DIAS.forEach(
    (dia, indiceDia) => {

      const atividades =
        programacaoSemana[dia] || [];

      atividades.forEach(
        (atividade) => {

          programacaoConvertida.push({

            dia,

            data:
              formatarDataBrasileira(
                datas[indiceDia]
              ),

            horario:
              atividade.horario || "",

            atividade:
              atividade.atividade || "",

            local:
              atividade.local || "",

            uniforme:
              atividade.uniforme || "",

            observacao:
              atividade.observacao || "",

            mostrar: "SIM"

          });

        }
      );

    }
  );

  estadoGestao.programacaoAtual =
    programacaoConvertida;

  console.table(
    estadoGestao.programacaoAtual
  );  

}

function renderizarNovoEditorProgramacao() {

  const painel =
    document.getElementById(
      "lista-programacao-semanal"
    );

  if (!painel) return;

  const datas = obterDatasSemana(
  inicioSemanaAtual || new Date()
);

painel.innerHTML =
  PROGRAMACAO_DIAS
    .map((dia, indice) => `

        <section class="programacao-dia-card">

          <div class="programacao-dia-header">

            <div>

              <h4>${dia}</h4>

              <span>${formatarDataBrasileira(datas[indice])}</span>

            </div>

          </div>

          <div class="programacao-dia-atividades">

            <div class="programacao-dia-lista">
               ${renderizarAtividadesDia(dia)}
            </div>

            <button
              class="primary-button programacao-dia-adicionar"
              type="button"
              data-dia="${dia}"
            >

              + Adicionar atividade

            </button>

          </div>

        </section>
      `)
      .join("");

      configurarBotoesAdicionarAtividade();
      configurarBotoesRemoverAtividade();

}

function configurarBotoesAdicionarAtividade() {

  const botoes =
    document.querySelectorAll(
      ".programacao-dia-adicionar"
    );

  botoes.forEach((botao) => {

    botao.addEventListener(
      "click",
      () => {

        const dia = botao.dataset.dia;

        const areaAtividades =
          botao.closest(
            ".programacao-dia-atividades"
          );

        if (!areaAtividades) return;

        const formularioExistente =
          areaAtividades.querySelector(
            ".programacao-atividade-form"
          );

        if (formularioExistente) {
          formularioExistente
            .querySelector(
              ".atividade-horario-input"
            )
            ?.focus();

          return;
        }

        const formulario =
          document.createElement("form");

        formulario.className =
          "programacao-atividade-form";

        formulario.dataset.dia = dia;

        formulario.innerHTML = `
          <div class="programacao-atividade-campos">

            <label>
              Horário

              <input
                class="atividade-horario-input"
                type="text"
                list="lista-horarios"
                placeholder="Ex.: 07:50"
                autocomplete="off"
                required
              >
            </label>

            <label>
              Atividade

              <input
                class="atividade-nome-input"
                type="text"
                list="lista-atividades"
                placeholder="Ex.: Chamada"
                autocomplete="off"
                required
              >
            </label>

            <label>
              Local

              <input
                class="atividade-local-input"
                type="text"
                list="lista-locais"
                placeholder="Ex.: Sala da Banda"
                autocomplete="off"
              >
            </label>

            <label>
              Uniforme

              <input
                class="atividade-uniforme-input"
                type="text"
                list="lista-uniformes"
                placeholder="Ex.: 10º"
                autocomplete="off"
              >
              </label>

            <label>
              Observação

              <input
                class="atividade-observacao-input"
                type="text"
                placeholder="Observação opcional"
                autocomplete="off"
              >
            </label>

          </div>

          <div class="programacao-atividade-acoes">

            <button
              class="primary-button"
              type="submit"
            >
              Adicionar
            </button>

            <button
              class="secondary-button atividade-cancelar"
              type="button"
            >
              Cancelar
            </button>

          </div>
        `;

        areaAtividades.insertBefore(
          formulario,
          botao
        );

        formulario
          .querySelector(
            ".atividade-cancelar"
          )
          ?.addEventListener(
            "click",
            () => formulario.remove()
          );

        formulario
          .querySelector(
            ".atividade-horario-input"
          )
          ?.focus();

          formulario.addEventListener(
  "submit",
  (evento) => {

    evento.preventDefault();

    if (!programacaoSemana[dia]) {
      programacaoSemana[dia] = [];
    }

    programacaoSemana[dia].push({

      horario:
        formulario.querySelector(
          ".atividade-horario-input"
        ).value,

      atividade:
        formulario.querySelector(
          ".atividade-nome-input"
        ).value,

      local:
        formulario.querySelector(
          ".atividade-local-input"
        ).value,

      uniforme:
        formulario.querySelector(
          ".atividade-uniforme-input"
        ).value,

      observacao:
        formulario.querySelector(
          ".atividade-observacao-input"
        ).value

    });

    programacaoSemana[dia].sort(
  (atividadeA, atividadeB) =>
    atividadeA.horario.localeCompare(
      atividadeB.horario
    )
);

    sincronizarProgramacaoComGestao();

    estadoGestao.alteracoesPendentes = true;
    atualizarStatusAlteracoes();

    renderizarNovoEditorProgramacao();

  }
);

      }
    );

  });

}

function configurarBotoesRemoverAtividade() {

  document
    .querySelectorAll(
      ".programacao-atividade-remover"
    )
    .forEach((botao) => {

      botao.addEventListener(
        "click",
        () => {

          const dia =
            botao.dataset.dia;

          const indice =
            Number(
              botao.dataset.indice
            );

          if (!programacaoSemana[dia]) {
            return;
          }

          programacaoSemana[dia].splice(
            indice,
            1
          );

          sincronizarProgramacaoComGestao();

          estadoGestao.alteracoesPendentes = true;
          atualizarStatusAlteracoes();

          renderizarNovoEditorProgramacao();

        }
      );

    });

}