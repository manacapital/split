// =============================
// EVENTOS
// =============================

document
  .getElementById("inputExcel")
  .addEventListener("change", handleFile, false);

document
  .getElementById("inputContaCorrente")
  .addEventListener("change", handleFileContaCorrente, false);

// =============================
// UTILITÁRIAS
// =============================

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarPercentual(valor) {
  return (valor * 100).toFixed(2).replace(".", ",") + "%";
}

function formatarData(data) {
  return data.toLocaleDateString("pt-BR");
}

function converterDataBR(dataStr) {
  if (!dataStr) return null;
  if (dataStr instanceof Date) return dataStr;

  const partes = dataStr.toString().split("/");
  if (partes.length !== 3) return null;

  return new Date(partes[2], partes[1] - 1, partes[0]);
}

function converterValorBR(valor) {
  if (valor === undefined || valor === null) return 0;
  if (typeof valor === "number") return valor;

  return (
    parseFloat(
      valor
        .toString()
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim(),
    ) || 0
  );
}

// ==========================================================
// 🔵 MÓDULO SPLIT (CONTA LIQUIDANTE)
// ==========================================================

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { raw: true });

    processarSplit(json);
  };

  reader.readAsArrayBuffer(file);
}

function processarSplit(dados) {
  let datas = [];
  let liquidacaoPOS = 0;
  let splitUtilizado = 0;
  let saldoAnterior = 0;
  let saldoLiquidanteFinal = 0;

  dados.forEach((linha) => {
    const data = converterDataBR(linha["Data"]);
    const valor = converterValorBR(linha["Valor"]);
    const tipo = (linha["Tipo de transação"] || "").trim();
    const cliente = (linha["Cliente"] || "").trim();

    if (data) datas.push(data);

    if (tipo === "Crédito Recebível") liquidacaoPOS += valor;

    if (tipo === "Débito Pix" || tipo === "Pagamento de Conta")
      splitUtilizado += valor;

    if (cliente.includes("Saldo Inicial")) saldoAnterior += valor;

    if (cliente === "Saldo final do dia") saldoLiquidanteFinal = valor;
  });

  splitUtilizado = Math.abs(splitUtilizado);

  const dataInicial = new Date(Math.min(...datas));
  const dataFinal = new Date(Math.max(...datas));

  const limiteSplit = liquidacaoPOS * 0.9;
  const saldoDisponivel = limiteSplit - splitUtilizado;
  const saldoInicialMaisPOS = saldoAnterior + liquidacaoPOS;
  const valorFinal = saldoInicialMaisPOS - splitUtilizado;
  const percSplit = liquidacaoPOS === 0 ? 0 : splitUtilizado / liquidacaoPOS;

  // 🎯 REGRA INTELIGENTE DE ALERTA

  const percentualUtilizado = percSplit * 100;
  const percentualArredondado = Math.round(percentualUtilizado * 10) / 10;

  const alerta = document.getElementById("alertaLimite");

  if (alerta) {
    alerta.style.display = "block";

    document.getElementById("split").classList.remove("vermelho");
    document.getElementById("saldo").classList.remove("vermelho");

    if (percentualArredondado >= 90.1) {
      alerta.innerHTML =
        "⚠ Atenção: O Split Utilizado ultrapassou o limite permitido de 90%.";
      alerta.style.background = "#ffe5e5";
      alerta.style.color = "#b30000";

      document.getElementById("split").classList.add("vermelho");
      document.getElementById("saldo").classList.add("vermelho");
    } else if (percentualArredondado === 90.0) {
      alerta.innerHTML =
        "✔ Parabéns! Seu Split está dentro do limite permitido.";
      alerta.style.background = "#e6f4ea";
      alerta.style.color = "#1e7e34";
    } else {
      alerta.innerHTML =
        "✔ Você ainda possui saldo disponível para realizar seu Split.";
      alerta.style.background = "#e6f4ea";
      alerta.style.color = "#1e7e34";
    }
  }

  // EXIBIÇÃO

  document.getElementById("periodoSplit").innerText =
    formatarData(dataInicial) + " até " + formatarData(dataFinal);

  document.getElementById("periodoContabil").innerText =
    formatarData(dataInicial) + " até " + formatarData(dataFinal);

  document.getElementById("liquidacao").innerText =
    formatarMoeda(liquidacaoPOS);

  document.getElementById("limite").innerText =
    formatarMoeda(limiteSplit) + " | 90,00%";

  document.getElementById("split").innerText =
    formatarMoeda(splitUtilizado) + " | " + formatarPercentual(percSplit);

  document.getElementById("saldo").innerText = formatarMoeda(saldoDisponivel);

  document.getElementById("saldoAnterior").innerText =
    formatarMoeda(saldoAnterior);

  document.getElementById("saldoInicialMaisPOS").innerText =
    formatarMoeda(saldoInicialMaisPOS);

  document.getElementById("split2").innerText = formatarMoeda(splitUtilizado);

  document.getElementById("valorFinal").innerText = formatarMoeda(valorFinal);

  document.getElementById("saldoLiquidante").innerText =
    formatarMoeda(saldoLiquidanteFinal);

  document.getElementById("resultado").style.display = "block";
}

// ==========================================================
// 🟠 MÓDULO CONTA CORRENTE
// ==========================================================

function handleFileContaCorrente(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { raw: true });

    processarContaCorrente(json);
    e.target.value = "";
  };

  reader.readAsArrayBuffer(file);
}

function processarContaCorrente(dados) {
  let totalEntradas = 0;
  let totalSaidas = 0;
  let totalPixTotal = 0;
  let totalPixMesmaTitularidade = 0;
  let totalPixFornecedores = 0;
  let datas = [];

  dados.forEach((linha) => {
    const data = converterDataBR(linha["Data"]);
    const valor = converterValorBR(linha["Valor"]);
    const tipo = (linha["Tipo de transação"] || "").trim();
    const cliente = (linha["Cliente"] || "").trim();
    const descricao = (linha["Descrição"] || "").trim();

    if (data) datas.push(data);
    if (cliente === "Saldo final do dia") return;

    if (tipo === "Crédito Transferência entre contas") {
      totalEntradas += valor;
      return;
    }

    totalSaidas += Math.abs(valor);

    if (tipo === "Débito Pix") {
      totalPixTotal += Math.abs(valor);

      if (descricao.toLowerCase().includes("pix realizado para")) {
        const nomeDestino = descricao.replace(/pix realizado para/i, "").trim();

        if (normalizarTexto(nomeDestino) === normalizarTexto(cliente)) {
          totalPixMesmaTitularidade += Math.abs(valor);
        } else {
          totalPixFornecedores += Math.abs(valor);
        }
      }
    }
  });

  const dataInicial = new Date(Math.min(...datas));
  const dataFinal = new Date(Math.max(...datas));

  gerarPDFContaCorrente(
    totalEntradas,
    totalSaidas,
    totalPixTotal,
    totalPixMesmaTitularidade,
    totalPixFornecedores,
    dataInicial,
    dataFinal,
  );
}

function gerarPDFContaCorrente(
  totalEntradas,
  totalSaidas,
  totalPixTotal,
  totalPixMesmaTitularidade,
  totalPixFornecedores,
  dataInicial,
  dataFinal,
) {
  const agora = new Date();
  const dataHora =
    agora.toLocaleDateString("pt-BR") +
    " às " +
    agora.toLocaleTimeString("pt-BR");

  const conteudo = `
    <div style="font-family: Arial; padding: 30px;">
      <h2 style="text-align:center;">Relatório controle Contábil Conta Corrente</h2>
      <p><strong>Período:</strong> ${formatarData(dataInicial)} até ${formatarData(dataFinal)}</p>
      <hr/>

      <p><strong>Total de entradas no período</strong></p>
      <p style="font-size:20px; color:#1f4e79;">${formatarMoeda(totalEntradas)}</p>

      <p><strong>Total de saídas no período</strong></p>
      <p style="font-size:20px; color:#b30000;">${formatarMoeda(totalSaidas)}</p>

      <p><strong>Total Pix realizado</strong></p>
      <p>${formatarMoeda(totalPixTotal)}</p>

      <div style="margin-left:20px;">
        <p>Débito Pix mesma titularidade (retirada)</p>
        <p>${formatarMoeda(totalPixMesmaTitularidade)}</p>

        <p>Transferência Pix para Terceiros</p>
        <p>${formatarMoeda(totalPixFornecedores)}</p>
      </div>

      <hr style="margin-top:40px;"/>
      <p style="text-align:center; font-size:12px;">
        Sistema de Conferência de Split • Cooperativa Gontijo - Ceopag<br/>
        Cálculo realizado em: ${dataHora}
      </p>
    </div>
  `;

  const elemento = document.createElement("div");
  elemento.innerHTML = conteudo;

  html2pdf()
    .set({
      margin: 10,
      filename: "Relatorio_Controle_Contabil_Conta_Corrente.pdf",
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait" },
    })
    .from(elemento)
    .save();
}

// =============================
// MODAL AJUDA
// =============================

function abrirAjuda() {
  document.getElementById("modalAjuda").style.display = "block";
}

function fecharAjuda() {
  document.getElementById("modalAjuda").style.display = "none";
}
