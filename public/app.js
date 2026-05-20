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

const moduleMeta = {
  dashboard: {
    eyebrow: "Painel executivo",
    title: "Decisoes financeiras em uma tela",
    subtitle: "Caixa, credito, alertas e acoes prioritarias para PMEs, sem navegar por varios menus.",
  },
  cashflow: {
    eyebrow: "Fluxo de caixa",
    title: "Realizado, previsto e categorias",
    subtitle: "Veja onde o caixa sobe ou aperta, filtre movimentos e acompanhe as maiores saidas.",
  },
  credit: {
    eyebrow: "Credito inteligente",
    title: "Score explicavel e simulacao",
    subtitle: "Entenda o limite operacional antes de contratar credito e compare custo com folga de caixa.",
  },
  assistant: {
    eyebrow: "Copiloto financeiro",
    title: "Pergunte e execute a proxima acao",
    subtitle: "Use a IA para traduzir os numeros em tarefas objetivas para hoje.",
  },
};

const state = {
  view: "dashboard",
  data: fallbackData,
  analysis: null,
};

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
  try {
    state.data = await request("/demo/dados");
  } catch (error) {
    console.warn("Usando dados locais de fallback.", error);
    state.data = fallbackData;
  }

  state.analysis = await request("/analise", {
    method: "POST",
    body: JSON.stringify(state.data),
  });

  renderView(state.view);
}

function renderView(view) {
  state.view = view;
  updateNavigation(view);
  updateHeader(view);

  if (!state.analysis) {
    document.querySelector("#moduleContent").innerHTML = `<article class="panel">Carregando analise...</article>`;
    return;
  }

  renderMetrics(state.analysis.resumo);

  const renderers = {
    dashboard: renderDashboard,
    cashflow: renderCashflow,
    credit: renderCredit,
    assistant: renderAssistant,
  };

  renderers[view]();
}

function updateNavigation(view) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function updateHeader(view) {
  const meta = moduleMeta[view];
  document.querySelector("#moduleEyebrow").textContent = meta.eyebrow;
  document.querySelector("#moduleTitle").textContent = meta.title;
  document.querySelector("#moduleSubtitle").textContent = meta.subtitle;
}

function renderMetrics(summary) {
  const metrics = [
    ["Caixa hoje", currency.format(summary.saldo_final), `${summary.lucro_percentual}% margem`, "cash"],
    ["NCG", currency.format(summary.ncg_valor), `${summary.ncg_percentual}% receita`, "giro"],
    ["Score credito", `${summary.score_credito}/100`, "explicavel", "score"],
    ["Runway", `${summary.runway_dias} dias`, summary.runway_dias < 30 ? "alerta" : "ok", "dias"],
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

function renderDashboard() {
  const analysis = state.analysis;
  document.querySelector("#moduleContent").innerHTML = `
    <section class="workspace">
      <article class="panel cash-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Fluxo de caixa</p>
            <h2>Realizado + previsto</h2>
          </div>
          <button class="icon-button" data-view="cashflow" title="Abrir fluxo completo">F</button>
        </div>
        <div id="chart" class="chart" aria-label="Grafico de fluxo"></div>
        <div id="chips" class="chips"></div>
      </article>

      <article class="panel ai-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Copiloto financeiro</p>
            <h2>O que fazer agora</h2>
          </div>
          <span class="status-dot"></span>
        </div>
        <p id="aiAnswer" class="ai-answer">Analisando dados financeiros...</p>
        <button id="askCreditButton" class="primary-button wide-button">Perguntar sobre credito</button>
        <ul id="alerts" class="signal-list"></ul>
      </article>
    </section>

    <section class="panel decision-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Poucos cliques</p>
          <h2>Fila de decisoes</h2>
        </div>
        <div class="segmented" role="group" aria-label="Periodo">
          <button class="active" data-period="today">Hoje</button>
          <button data-period="week">Semana</button>
          <button data-period="accounting">Contador</button>
        </div>
      </div>
      <div id="actions" class="decision-list"></div>
    </section>
  `;

  renderChart(analysis.serie_fluxo);
  renderChips(analysis.resumo, analysis.categorias);
  renderAlerts(analysis.alertas);
  renderActions(analysis.proximas_acoes);
  askAssistant("Preciso de credito?", "#aiAnswer");
  wireDynamicButtons();
}

function renderCashflow() {
  const analysis = state.analysis;
  const rows = analysis.serie_fluxo
    .map(
      (item) => `
        <tr>
          <td>${item.data ?? "-"}</td>
          <td>${item.descricao}</td>
          <td>${item.previsto ? "Previsto" : "Realizado"}</td>
          <td class="${item.fluxo < 0 ? "danger-text" : "success-text"}">${currency.format(item.fluxo)}</td>
          <td>${currency.format(item.saldo)}</td>
        </tr>
      `,
    )
    .join("");

  const categories = analysis.categorias
    .map(
      (item) => `
        <article class="category-card">
          <span>${item.tipo}</span>
          <strong>${item.categoria}</strong>
          <p>${currency.format(item.valor)}</p>
        </article>
      `,
    )
    .join("");

  document.querySelector("#moduleContent").innerHTML = `
    <section class="workspace">
      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Linha do tempo</p>
            <h2>Movimentos e saldo acumulado</h2>
          </div>
          <button class="secondary-button" data-action="new-entry">Novo movimento</button>
        </div>
        <div id="chart" class="chart compact-chart" aria-label="Grafico de fluxo"></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Data</th><th>Descricao</th><th>Status</th><th>Fluxo</th><th>Saldo</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Categorias</p>
            <h2>Maiores impactos</h2>
          </div>
        </div>
        <div class="category-grid">${categories}</div>
      </article>
    </section>
  `;

  renderChart(analysis.serie_fluxo);
  wireDynamicButtons();
}

function renderCredit() {
  const summary = state.analysis.resumo;
  document.querySelector("#moduleContent").innerHTML = `
    <section class="workspace">
      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Score operacional</p>
            <h2>${summary.score_credito}/100</h2>
          </div>
          <button class="secondary-button" data-action="credit-report">Relatorio banco</button>
        </div>
        <div class="score-ring" aria-label="Score de credito">${summary.score_credito}</div>
        <ul class="signal-list">
          <li><strong>Fator positivo</strong><span>Margem de caixa em ${summary.lucro_percentual}%.</span></li>
          <li><strong>Fator de atencao</strong><span>Runway atual de ${summary.runway_dias} dias.</span></li>
          <li><strong>NCG</strong><span>${currency.format(summary.ncg_valor)} de necessidade projetada.</span></li>
        </ul>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Simulador</p>
            <h2>Custo estimado do credito</h2>
          </div>
        </div>
        <form id="creditForm" class="form-grid">
          <label>Valor desejado<input id="creditAmount" type="number" min="1000" value="25000" /></label>
          <label>Taxa ao mes (%)<input id="creditRate" type="number" min="0" step="0.1" value="2.4" /></label>
          <label>Prazo em meses<input id="creditMonths" type="number" min="1" value="12" /></label>
          <button class="primary-button" type="submit">Calcular parcela</button>
        </form>
        <div id="creditResult" class="result-box"></div>
      </article>
    </section>
  `;

  document.querySelector("#creditForm").addEventListener("submit", calculateCredit);
  calculateCredit();
  wireDynamicButtons();
}

function renderAssistant() {
  const analysis = state.analysis;
  document.querySelector("#moduleContent").innerHTML = `
    <section class="workspace">
      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Pergunta rapida</p>
            <h2>Assistente contextual</h2>
          </div>
        </div>
        <form id="assistantForm" class="assistant-form">
          <textarea id="assistantQuestion" rows="4">Como melhorar meu caixa esta semana?</textarea>
          <button class="primary-button" type="submit">Perguntar</button>
        </form>
        <p id="assistantAnswer" class="ai-answer">Pronto para analisar.</p>
      </article>

      <article class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Execucao</p>
            <h2>Acoes recomendadas</h2>
          </div>
        </div>
        <ul id="alerts" class="signal-list"></ul>
        <div id="actions" class="decision-list compact-list"></div>
      </article>
    </section>
  `;

  renderAlerts(analysis.alertas);
  renderActions(analysis.proximas_acoes);
  document.querySelector("#assistantForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const question = document.querySelector("#assistantQuestion").value.trim();
    await askAssistant(question || "Como melhorar meu caixa?", "#assistantAnswer");
  });
  wireDynamicButtons();
}

function renderChart(series) {
  const maxAbs = Math.max(...series.map((item) => Math.abs(item.fluxo)), 1);
  const chart = document.querySelector("#chart");
  if (!chart) return;

  chart.innerHTML = series
    .map((item) => {
      const height = Math.max(14, Math.round((Math.abs(item.fluxo) / maxAbs) * 100));
      const negative = item.fluxo < 0 ? " negative" : "";
      const day = item.data ? item.data.slice(8, 10) : "";
      return `<button class="bar${negative}" style="height:${height}%" title="${item.descricao}: ${currency.format(item.fluxo)}"><span>${day}</span></button>`;
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
  const target = document.querySelector("#alerts");
  if (!target) return;

  const items = alerts.length
    ? alerts
    : [{ titulo: "Operacao saudavel", mensagem: "Nao ha risco de NCG negativa na projecao atual." }];

  target.innerHTML = items
    .map((item) => `<li><strong>${item.titulo}</strong><span>${item.mensagem}</span></li>`)
    .join("");
}

function renderActions(actions) {
  const target = document.querySelector("#actions");
  if (!target) return;

  target.innerHTML = actions
    .map(
      (item) => `
        <article class="decision-item">
          <div><strong>${item.acao}</strong><span>${item.impacto} - ${item.prazo}</span></div>
          <button data-action="execute-action" title="Executar acao">-></button>
        </article>
      `,
    )
    .join("");
}

async function askAssistant(question, targetSelector) {
  const target = document.querySelector(targetSelector);
  if (target) target.textContent = "Analisando...";

  const result = await request("/assistente", {
    method: "POST",
    body: JSON.stringify({ pergunta: question, dados: state.data }),
  });

  if (target) target.textContent = result.resposta;
}

function calculateCredit(event) {
  if (event) event.preventDefault();

  const amount = Number(document.querySelector("#creditAmount")?.value ?? 0);
  const rate = Number(document.querySelector("#creditRate")?.value ?? 0) / 100;
  const months = Number(document.querySelector("#creditMonths")?.value ?? 1);
  const monthly = rate ? (amount * rate) / (1 - Math.pow(1 + rate, -months)) : amount / months;
  const total = monthly * months;

  document.querySelector("#creditResult").innerHTML = `
    <strong>Parcela estimada: ${currency.format(monthly)}</strong>
    <span>Custo total aproximado: ${currency.format(total)}. Compare com a folga de caixa de ${currency.format(state.analysis.resumo.saldo_final)}.</span>
  `;
}

function executeQuickAction(action) {
  const actions = {
    "solve-cash": ["dashboard", "Fila de decisoes priorizada para resolver o caixa de hoje."],
    collect: ["cashflow", "Clientes a cobrar filtrados na linha do tempo financeira."],
    "simulate-credit": ["credit", "Simulador de credito aberto com dados do caixa atual."],
    "export-accounting": ["assistant", "Relatorio contabil preparado para envio em PDF."],
    "new-entry": ["cashflow", "Formulario de novo movimento sera o proximo passo deste modulo."],
    "credit-report": ["credit", "Relatorio de score e NCG pronto para banco ou socio."],
    "execute-action": [state.view, "Acao marcada para execucao."],
  };

  const [view, message] = actions[action] ?? [state.view, "Acao executada."];
  renderView(view);
  showToast(message);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function wireDynamicButtons() {
  document.querySelectorAll("#moduleContent [data-view]").forEach((button) => {
    button.addEventListener("click", () => renderView(button.dataset.view));
  });

  document.querySelectorAll("#moduleContent [data-action]").forEach((button) => {
    button.addEventListener("click", () => executeQuickAction(button.dataset.action));
  });

  document.querySelectorAll("[data-period]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-period]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      showToast(`Periodo selecionado: ${button.textContent}`);
    });
  });
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => renderView(button.dataset.view));
});

document.querySelectorAll(".quick-actions [data-action]").forEach((button) => {
  button.addEventListener("click", () => executeQuickAction(button.dataset.action));
});

document.querySelector("#refreshButton").addEventListener("click", async () => {
  await loadDashboard();
  showToast("Painel atualizado com dados da API.");
});

document.querySelector("#openFinanceButton").addEventListener("click", () => {
  showToast("Conector Open Finance preparado para ativacao.");
});

loadDashboard().catch((error) => {
  document.querySelector("#moduleContent").innerHTML = `
    <article class="panel">
      Nao foi possivel carregar a API. Rode python -m uvicorn api_full:app --reload.
    </article>
  `;
  console.error(error);
});
