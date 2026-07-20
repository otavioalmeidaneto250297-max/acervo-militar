async function carregarCsv(url) {
  
  const urlAtualizada =
  `${url}${
    url.includes("?") ? "&" : "?"
  }t=${Date.now()}`;

  const resposta = await fetch(
  urlAtualizada,
  {
    cache: "no-store"
  }
);

  if (!resposta.ok) {
    throw new Error(`Erro ao carregar planilha: ${resposta.status}`);
  }

  const texto = await resposta.text();

  return converterCsvParaObjetos(texto);
}

function converterCsvParaObjetos(textoCsv) {
  const linhas = separarLinhasCsv(textoCsv);

  if (linhas.length < 2) {
    return [];
  }

  const cabecalhos = separarColunasCsv(linhas[0]).map(normalizarCabecalho);

  return linhas
    .slice(1)
    .filter((linha) => linha.trim() !== "")
    .map((linha) => {
      const valores = separarColunasCsv(linha);
      const objeto = {};

      cabecalhos.forEach((cabecalho, indice) => {
        objeto[cabecalho] = String(valores[indice] ?? "").trim();
      });

      return objeto;
    });
}

function separarLinhasCsv(textoCsv) {
  const linhas = [];
  let linhaAtual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < textoCsv.length; i += 1) {
    const caractere = textoCsv[i];

    if (caractere === '"') {
      const proximo = textoCsv[i + 1];

      if (dentroDeAspas && proximo === '"') {
        linhaAtual += '"';
        i += 1;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
    } else if (
      (caractere === "\n" || caractere === "\r") &&
      !dentroDeAspas
    ) {
      if (linhaAtual.trim() !== "") {
        linhas.push(linhaAtual);
      }

      linhaAtual = "";

      if (caractere === "\r" && textoCsv[i + 1] === "\n") {
        i += 1;
      }
    } else {
      linhaAtual += caractere;
    }
  }

  if (linhaAtual.trim() !== "") {
    linhas.push(linhaAtual);
  }

  return linhas;
}

function separarColunasCsv(linha) {
  const colunas = [];
  let valorAtual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < linha.length; i += 1) {
    const caractere = linha[i];

    if (caractere === '"') {
      const proximo = linha[i + 1];

      if (dentroDeAspas && proximo === '"') {
        valorAtual += '"';
        i += 1;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
    } else if (caractere === "," && !dentroDeAspas) {
      colunas.push(valorAtual);
      valorAtual = "";
    } else {
      valorAtual += caractere;
    }
  }

  colunas.push(valorAtual);

  return colunas;
}

function normalizarCabecalho(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}