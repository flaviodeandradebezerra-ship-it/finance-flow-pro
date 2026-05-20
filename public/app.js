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

const fallbackOpenFinanceMovements = {
  "banco-brasil": [
    { data: "2026-05-06", descricao: "OF Banco do Brasil - saldo conta PJ", tipo: "entrada", valor: 12200, categoria: "Open Finance" },
    { data: "2026-05-17", descricao: "OF Banco do Brasil - tarifa bancaria", tipo: "saida", valor: 180, categoria: "Tarifas" },
  ],
  itau: [
    { data: "2026-05-09", descricao: "OF Itau - recebiveis cartao", tipo: "entrada", valor: 15700, categoria: "Receita" },
    { data: "2026-05-19", descricao: "OF Itau - parcela capital de giro", tipo: "saida", valor: 2400, categoria: "Credito" },
  ],
  nubank: [
    { data: "2026-05-11", descricao: "OF Nubank - vendas online", tipo: "entrada", valor: 8900, categoria: "Receita" },
    { data: "2026-05-20", descricao: "OF Nubank - assinatura SaaS", tipo: "saida", valor: 620, categoria: "Tecnologia" },
  ],
};

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
  baseData: fallbackData,
  openFinanceData: [],
  data: fallbackData,
  analysis: null,
  participants: [],
  syncTimer: null,
  lastSyncAt: null,
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
    state.baseData = await request("/demo/dados");
  } catch (error) {
    console.warn("Usando dados locais de fallback.", error);
    state.baseData = fallbackData;
  }

  await refreshAnalysis({ silent: true });
  await loadOpenFinanceParticipants();
  startAutoSync();
}

async function refreshAnalysis(options = {}) {
  state.data = [...state.baseData, ...state.openFinanceData];
  state.analysis = await request("/analise", {
    method: "POST",
    body: JSON.stringify(state.data),
  });
  state.lastSyncAt = new Date();
  updateSyncStatus();

  renderView(state.view);
  if (!options.silent) {
    showToast("Informacoes atualizadas automaticamente.");
  }
}

function startAutoSync() {
  window.clearInterval(state.syncTimer);
  state.syncTimer = window.setInterval(() => {
    refreshAnalysis({ silent: true }).catch((error) => console.error("Falha na sincronizacao automatica", error));
  }, 12000);
}

function updateSyncStatus() {
  const target = document.querySelector("#syncStatus");
  if (!target) return;

  const time = state.lastSyncAt
    ? state.lastSyncAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--";
  target.textContent = `Sincronizacao automatica ativa - ${time}`;
}

async function loadOpenFinanceParticipants() {
  try {
    const result = await request("/open-finance/participantes");
    state.participants = result.participantes;
  } catch (error) {
    console.error("Falha ao carregar participantes Open Finance", error);
    state.participants = [
      { id: "banco-brasil", nome: "Banco do Brasil", tipo: "Obrigatorio", dados_disponiveis: ["saldos", "extratos"] },
      { id: "itau", nome: "Itau", tipo: "Obrigatorio", dados_disponiveis: ["saldos", "extratos", "credito"] },
      { id: "nubank", nome: "Nubank", tipo: "Participante", dados_disponiveis: ["saldos", "extratos"] },
    ];
  }
  renderOpenFinanceBanks();
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
          <label>Valor desejado<input id="creditAmount" type="number" min="1000" value="25000" step="100" /></label>
          <label>Taxa nominal (%)<input id="creditRate" type="number" min="0" step="0.01" value="2.4" /></label>
          <label>Periodicidade da taxa<select id="creditRatePeriod"><option value="monthly">Mensal</option><option value="annual">Anual</option></select></label>
          <label>Prefixada / Posfixada<select id="creditRateType"><option value="prefixada">Prefixada</option><option value="posfixada">Posfixada</option></select></label>
          <label>Indice de correcao<select id="creditIndex"><option value="none">Sem indice</option><option value="ipca">IPCA</option><option value="igpm">IGP-M</option><option value="tr">TR</option><option value="poupanca">Poupanca</option><option value="selic">Selic</option><option value="cdi">CDI</option><option value="legal">Taxa legal</option></select></label>
          <label>Amortizacao<select id="creditAmortization"><option value="price">Price</option><option value="sac">SAC</option><option value="estruturada">Estruturada</option><option value="personalizada">Personalizada</option></select></label>
          <div id="customScheduleRow" style="display:none;">
            <label>Parcelas personalizadas (R$ separados por vírgula)<textarea id="creditCustomSchedule" rows="3" placeholder="Ex: 2500, 2600, 2700, 2800"></textarea></label>
            <p class="field-note">Informe os pagamentos por mês. Se vazio, o simulador usa uma trajectória de amortização similar ao Price.</p>
          </div>
          <label>Prazo de amortizacao (meses)<input id="creditMonths" type="number" min="1" value="12" /></label>
          <label>Carencia (meses)<input id="creditGrace" type="number" min="0" value="0" /></label>
          <label>Prorrogacao (meses)<input id="creditExtension" type="number" min="0" value="0" /></label>
          <label>IOF (% do valor)<input id="creditIof" type="number" min="0" step="0.01" value="0.38" /></label>
          <label>Tarifas (R$)<input id="creditFees" type="number" min="0" step="1" value="200" /></label>
          <label>Seguros (R$)<input id="creditInsurance" type="number" min="0" step="1" value="350" /></label>
          <button class="primary-button" type="submit">Calcular</button>
        </form>
        <div id="creditResult" class="result-box"></div>
      </article>
    </section>
  `;

  const form = document.querySelector("#creditForm");
  const amortizationSelect = form.querySelector("#creditAmortization");
  amortizationSelect.addEventListener("change", togglePersonalizedScheduleField);
  form.addEventListener("submit", calculateCredit);
  form.querySelectorAll("input, select, textarea").forEach((element) => {
    element.addEventListener("input", calculateCredit);
  });
  togglePersonalizedScheduleField();
  calculateCredit();
  wireDynamicButtons();
}

function togglePersonalizedScheduleField() {
  const mode = document.querySelector("#creditAmortization")?.value;
  const customRow = document.querySelector("#customScheduleRow");
  if (!customRow) return;
  customRow.style.display = mode === "personalizada" ? "block" : "none";
}

function parseCustomSchedule(raw) {
  return raw
    .split(/[,;\n]/)
    .map((item) => Number(item.replace(/[^0-9.,-]/g, "").replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function creditIndexRate(indexName) {
  const indexRates = {
    none: 0,
    ipca: 0.0032,
    igpm: 0.0048,
    tr: 0.0017,
    poupanca: 0.0021,
    selic: 0.0040,
    cdi: 0.0043,
    legal: 0.0035,
  };
  return indexRates[indexName] ?? 0;
}

function buildCreditSchedule(principal, monthlyRate, months, amortization, grace, extension) {
  const totalMonths = months + extension;
  const schedule = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPayment = 0;
  const amortMonths = Math.max(1, totalMonths - grace);
  let baseInstallment = 0;

  if (amortization === "price" || amortization === "estruturada" || amortization === "personalizada") {
    baseInstallment = monthlyRate
      ? balance * monthlyRate / (1 - Math.pow(1 + monthlyRate, -amortMonths))
      : balance / amortMonths;
  }

  for (let month = 1; month <= totalMonths; month += 1) {
    let interest = balance * monthlyRate;
    let amortizationValue = 0;
    let payment = 0;

    if (month <= grace) {
      payment = interest;
      amortizationValue = 0;
    } else if (amortization === "sac") {
      amortizationValue = principal / amortMonths;
      payment = amortizationValue + interest;
    } else {
      payment = baseInstallment;
      amortizationValue = payment - interest;
    }

    if (month === totalMonths && month <= grace) {
      payment += balance;
      amortizationValue = balance;
      balance = 0;
    } else {
      balance = Math.max(0, balance - amortizationValue);
    }

    totalInterest += interest;
    totalPayment += payment;
    schedule.push({ month, payment, interest, amortization: amortizationValue, balance });
  }

  return { schedule, totalInterest, totalPayment, totalMonths };
}

async function calculateCredit(event) {
  if (event) event.preventDefault();

  const amount = Number(document.querySelector("#creditAmount")?.value ?? 0);
  const rate = Number(document.querySelector("#creditRate")?.value ?? 0);
  const ratePeriod = document.querySelector("#creditRatePeriod")?.value;
  const rateType = document.querySelector("#creditRateType")?.value;
  const index = document.querySelector("#creditIndex")?.value;
  const amortization = document.querySelector("#creditAmortization")?.value;
  const months = Number(document.querySelector("#creditMonths")?.value ?? 1);
  const grace = Number(document.querySelector("#creditGrace")?.value ?? 0);
  const extension = Number(document.querySelector("#creditExtension")?.value ?? 0);
  const iof = Number(document.querySelector("#creditIof")?.value ?? 0);
  const fees = Number(document.querySelector("#creditFees")?.value ?? 0);
  const insurance = Number(document.querySelector("#creditInsurance")?.value ?? 0);
  const customSchedule = parseCustomSchedule(document.querySelector("#creditCustomSchedule")?.value ?? "");

  if (amount <= 0 || months <= 0) {
    document.querySelector("#creditResult").innerHTML = `<p class="warning">Informe valor e prazo validos para simular o credito.</p>`;
    return;
  }

  const payload = {
    amount,
    rate,
    rate_period: ratePeriod,
    rate_type: rateType,
    index,
    amortization,
    months,
    grace,
    extension,
    iof,
    fees,
    insurance,
    custom_schedule: amortization === "personalizada" ? customSchedule : [],
  };

  try {
    const result = await request("/credit/simulate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const shortSchedule = result.schedule
      .slice(0, 6)
      .map(
        (item) => `<tr><td>${item.month}</td><td>${currency.format(item.payment)}</td><td>${currency.format(item.interest)}</td><td>${currency.format(item.amortization)}</td><td>${currency.format(item.balance)}</td></tr>`,
      )
      .join("");

    document.querySelector("#creditResult").innerHTML = `
      <div class="result-grid">
        <div><strong>Valor financiado</strong><span>${currency.format(result.amount)}</span></div>
        <div><strong>Custo IOF</strong><span>${currency.format(result.iof_cost)}</span></div>
        <div><strong>Tarifas + seguros</strong><span>${currency.format(result.fees + result.insurance)}</span></div>
        <div><strong>Taxa efetiva mensal</strong><span>${result.monthly_rate.toFixed(4)}%</span></div>
        <div><strong>Taxa efetiva anual</strong><span>${result.effective_annual_rate.toFixed(2)}%</span></div>
        <div><strong>CET anual estimado</strong><span>${result.cet_annual.toFixed(2)}%</span></div>
        <div><strong>Total de juros</strong><span>${currency.format(result.total_interest)}</span></div>
        <div><strong>Total pago</strong><span>${currency.format(result.total_payment + result.fees + result.insurance + result.iof_cost)}</span></div>
        <div><strong>Periodo total</strong><span>${result.total_months} meses</span></div>
      </div>
      <div class="result-summary">
        <p>Simulacao ${result.rate_type === "posfixada" ? "posfixada" : "prefixada"} ${result.amortization} com ${result.grace} meses de carencia e ${result.extension} meses de prorrogacao.</p>
        <p>${result.amortization === "personalizada" ? "Personalizada: use este modelo para examinar uma jornada de pagamento diferente. A simulacao aqui usa um fluxo similar ao Price quando nao ha parcelas customizadas." : "O simulador aplica o metodo selecionado e considera custos adicionais para mostrar o CET e a taxa efetiva."}</p>
      </div>
      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Cronograma de pagamento</p>
            <h2>Primeiros meses</h2>
          </div>
        </div>
        <div class="table-wrap compact-table">
          <table>
            <thead><tr><th>Mes</th><th>Parcela</th><th>Juros</th><th>Amortizacao</th><th>Saldo</th></tr></thead>
            <tbody>${shortSchedule}</tbody>
          </table>
        </div>
      </section>
    `;
  } catch (error) {
    document.querySelector("#creditResult").innerHTML = `<p class="warning">Erro ao calcular a simulacao. Tente novamente mais tarde.</p>`;
    console.error(error);
  }
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

function renderOpenFinanceBanks() {
  const target = document.querySelector("#openFinanceBanks");
  if (!target) return;

  if (!state.participants.length) {
    target.innerHTML = `<span class="privacy-note">Carregando instituicoes participantes...</span>`;
    return;
  }

  target.innerHTML = state.participants
    .map(
      (bank, index) => `
        <label class="bank-option">
          <input type="checkbox" name="institution" value="${bank.id}" ${index === 0 ? "checked" : ""} />
          <span>
            <strong>${bank.nome}</strong>
            <small>${bank.tipo} - ${bank.dados_disponiveis.join(", ")}</small>
          </span>
        </label>
      `,
    )
    .join("");
}

function openOpenFinanceModal() {
  const modal = document.querySelector("#openFinanceModal");
  modal.classList.add("visible");
  modal.setAttribute("aria-hidden", "false");
  renderOpenFinanceBanks();
  if (!state.participants.length) {
    loadOpenFinanceParticipants().catch((error) => console.error(error));
  }
}

function closeOpenFinanceModal() {
  const modal = document.querySelector("#openFinanceModal");
  modal.classList.remove("visible");
  modal.setAttribute("aria-hidden", "true");
}

async function submitOpenFinanceConsent(event) {
  event.preventDefault();

  const institutions = [...document.querySelectorAll('input[name="institution"]:checked')].map((item) => item.value);
  const scopes = [...document.querySelectorAll('input[name="scope"]:checked')].map((item) => item.value);
  const mode = document.querySelector("#openFinanceMode").value;

  if (!institutions.length) {
    showToast("Selecione ao menos uma instituicao para integrar.");
    return;
  }

  let result;
  try {
    result = await request("/open-finance/consentimentos", {
      method: "POST",
      body: JSON.stringify({
        instituicoes: institutions,
        escopos: scopes,
        modo: mode,
        prazo_dias: Number(document.querySelector("#openFinanceTerm").value),
        finalidade: "gestao financeira empresarial no Finance Flow Pro",
      }),
    });
  } catch (error) {
    console.warn("Endpoint Open Finance indisponivel, usando integracao local de demonstracao.", error);
    result = {
      instituicoes: institutions.map((id) => ({ id })),
      movimentos_importados: institutions.flatMap((id) => fallbackOpenFinanceMovements[id] ?? []),
    };
  }

  state.openFinanceData = mergeMovements(state.openFinanceData, result.movimentos_importados);
  closeOpenFinanceModal();
  await refreshAnalysis({ silent: true });
  showToast(`${result.instituicoes.length} instituicao(oes) integrada(s) via Open Finance.`);
}

function mergeMovements(current, incoming) {
  const byKey = new Map();
  [...current, ...incoming].forEach((item) => {
    byKey.set(`${item.data}-${item.descricao}-${item.valor}`, item);
  });
  return [...byKey.values()];
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => renderView(button.dataset.view));
});

document.querySelectorAll(".quick-actions [data-action]").forEach((button) => {
  button.addEventListener("click", () => executeQuickAction(button.dataset.action));
});

document.querySelector("#openFinanceButton").addEventListener("click", () => {
  openOpenFinanceModal();
});

document.querySelector("#closeOpenFinance").addEventListener("click", closeOpenFinanceModal);
document.querySelector("#openFinanceModal").addEventListener("click", (event) => {
  if (event.target.id === "openFinanceModal") closeOpenFinanceModal();
});
document.querySelector("#openFinanceForm").addEventListener("submit", submitOpenFinanceConsent);

loadDashboard().catch((error) => {
  document.querySelector("#moduleContent").innerHTML = `
    <article class="panel">
      Nao foi possivel carregar a API. Rode python -m uvicorn api_full:app --reload.
    </article>
  `;
  console.error(error);
});
