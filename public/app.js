const apiBase = "/api";

const fallbackData = [
  { data: "2026-05-01", descricao: "Vendas Pix", tipo: "entrada", valor: 42000, categoria: "Receita" },
  { data: "2026-05-03", descricao: "Boleto cliente A", tipo: "entrada", valor: 18000, categoria: "Receita" },
  { data: "2026-05-05", descricao: "Fornecedor materia-prima", tipo: "saida", valor: 23000, categoria: "Fornecedores" },
  { data: "2026-05-08", descricao: "Folha de pagamento", tipo: "saida", valor: 16500, categoria: "Pessoal" },
  { data: "2026-05-12", descricao: "Aluguel", tipo: "saida", valor: 6400, categoria: "Ocupacao" },
  { data: "2026-05-18", descricao: "Campanha comercial", tipo: "saida", valor: 3900, categoria: "Marketing" },
  { data: "2026-05-24", descricao: "Recebimento previsto", tipo: "entrada", valor: 26000, categoria: "Receita", previsto: true },
  { data: "2026-05-28", descricao: "Impostos previstos", tipo: "saida", valor: 8100, categoria: "Impostos", previsto: true },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Falha na API: ${response.status}`);
  }

  return response.json();
}

async function loadDashboard() {
  let demoData = fallbackData;

  try {
    demoData = await request("/demo/dados");
  } catch (error) {
    console.warn("Usando dados locais de fallback.", error);
  }

  const analysis = await request("/analise", {
    method: "POST",
    body: JSON.stringify(demoData),
  });

  renderMetrics(analysis.resumo);
  renderChart(analysis.serie_fluxo);
  renderChips(analysis.resumo, analysis.categorias);
  renderAlerts(analysis.alertas);
  renderActions(analysis.proximas_acoes);
  await askAssistant(demoData);
}

function renderMetrics(summary) {
  const metrics = [
    ["Caixa hoje", currency.format(summary.saldo_final), `${summary.lucro_percentual}% margem`, "↗"],
    ["NCG", currency.format(summary.ncg_valor), `${summary.ncg_percentual}% receita`, "↔"],
    ["Score credito", `${summary.score_credito}/100`, "explicavel", "$"],
    ["Runway", `${summary.runway_dias} dias`, summary.runway_dias < 30 ? "alerta" : "ok", "◷"],
  ];

  document.querySelector("#metrics").innerHTML = metrics
    .map(
      ([label, value, delta, icon]) => `
        <article class="metric-card">
          <div class="metric-top"><span>${icon}</span><span class="metric-delta">${delta}</span></div>
          <div class="metric-value">${value}</div>
          <p class="metric-label">${label}</p>
        </article>
      `,
    )
    .join("");
}

function renderChart(series) {
  const maxAbs = Math.max(...series.map((item) => Math.abs(item.fluxo)), 1);
  document.querySelector("#chart").innerHTML = series
    .map((item) => {
      const height = Math.max(14, Math.round((Math.abs(item.fluxo) / maxAbs) * 100));
      const negative = item.fluxo < 0 ? " negative" : "";
      const day = item.data ? item.data.slice(8, 10) : "";
      return `<div class="bar${negative}" style="height:${height}%"><span>${day}</span></div>`;
    })
    .join("");
}

function renderChips(summary, categories) {
  const topCategory = categories[0]?.categoria ?? "Sem categoria";
  document.querySelector("#chips").innerHTML = [
    `Previsto e realizado: ${currency.format(summary.entradas + summary.saidas)}`,
    `Top categoria: ${topCategory}`,
    `Score: ${summary.score_credito}/100`,
  ]
    .map((label) => `<span class="chip">${label}</span>`)
    .join("");
}

function renderAlerts(alerts) {
  const items = alerts.length
    ? alerts
    : [{ titulo: "Operacao saudavel", mensagem: "Nao ha risco de NCG negativa na projecao atual." }];

  document.querySelector("#alerts").innerHTML = items
    .map((item) => `<li><strong>${item.titulo}</strong><span>${item.mensagem}</span></li>`)
    .join("");
}

function renderActions(actions) {
  document.querySelector("#actions").innerHTML = actions
    .map(
      (item) => `
        <article class="decision-item">
          <div><strong>${item.acao}</strong><span>${item.impacto} · ${item.prazo}</span></div>
          <button title="Executar acao">→</button>
        </article>
      `,
    )
    .join("");
}

async function askAssistant(data = fallbackData) {
  const result = await request("/assistente", {
    method: "POST",
    body: JSON.stringify({ pergunta: "Preciso de credito?", dados: data }),
  });
  document.querySelector("#aiAnswer").textContent = result.resposta;
}

document.querySelector("#refreshButton").addEventListener("click", loadDashboard);
document.querySelector("#askCreditButton").addEventListener("click", () => askAssistant());

loadDashboard().catch((error) => {
  document.querySelector("#aiAnswer").textContent = "Nao foi possivel carregar a API. Rode python -m uvicorn api_full:app --reload.";
  console.error(error);
});
