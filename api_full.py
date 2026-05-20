import os
from datetime import date
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


app = FastAPI(
    title="Finance Flow Pro FULL",
    description="API de inteligencia financeira, credito e capital de giro para PMEs.",
    version="2.0.0",
)

# Resolve o caminho da pasta public de forma confiável
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
INDEX_FILE = os.path.join(PUBLIC_DIR, "index.html")

# Função para servir o index.html
def get_index_html() -> HTMLResponse:
    if os.path.isfile(INDEX_FILE):
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Finance Flow Pro</h1>", status_code=200)

# Monta arquivos estáticos
if os.path.isdir(PUBLIC_DIR):
    app.mount("/assets", StaticFiles(directory=PUBLIC_DIR), name="assets")


class Movimento(BaseModel):
    data: date | None = None
    descricao: str = Field(default="Movimento")
    tipo: Literal["entrada", "saida"]
    valor: float = Field(gt=0)
    categoria: str = Field(default="Sem categoria")
    cliente_fornecedor: str | None = None
    previsto: bool = False


class AssistenteRequest(BaseModel):
    pergunta: str = Field(min_length=3)
    dados: list[Movimento] = Field(default_factory=list)


class OpenFinanceConsent(BaseModel):
    instituicoes: list[str] = Field(min_length=1)
    escopos: list[str] = Field(default_factory=lambda: ["saldos", "extratos"])
    modo: Literal["individual", "lote"] = "individual"
    prazo_dias: int = Field(default=180, ge=1, le=365)
    finalidade: str = Field(default="gestao financeira empresarial")


class CreditSimulationRequest(BaseModel):
    amount: float = Field(gt=0)
    rate: float = Field(ge=0)
    rate_period: Literal["monthly", "annual"] = "monthly"
    rate_type: Literal["prefixada", "posfixada"] = "prefixada"
    index: Literal["none", "ipca", "igpm", "tr", "poupanca", "selic", "cdi", "legal"] = "none"
    amortization: Literal["price", "sac", "estruturada", "personalizada"] = "price"
    months: int = Field(gt=0)
    grace: int = Field(ge=0)
    extension: int = Field(ge=0)
    iof: float = Field(ge=0)
    fees: float = Field(ge=0)
    insurance: float = Field(ge=0)
    custom_schedule: list[float] = Field(default_factory=list)


def _credit_index_rate(name: str) -> float:
    return {
        "none": 0.0,
        "ipca": 0.0032,
        "igpm": 0.0048,
        "tr": 0.0017,
        "poupanca": 0.0021,
        "selic": 0.0040,
        "cdi": 0.0043,
        "legal": 0.0035,
    }.get(name, 0.0)


def _build_credit_schedule(
    principal: float,
    monthly_rate: float,
    months: int,
    amortization: str,
    grace: int,
    extension: int,
    custom_schedule: list[float] | None = None,
) -> dict[str, Any]:
    if custom_schedule:
        total_months = len(custom_schedule)
    else:
        total_months = months + extension

    schedule: list[dict[str, float]] = []
    balance = principal
    amort_months = max(1, total_months - grace)
    total_interest = 0.0
    total_payment = 0.0

    if amortization in {"price", "estruturada", "personalizada"} and not custom_schedule:
        installment = monthly_rate and balance * monthly_rate / (1 - pow(1 + monthly_rate, -amort_months)) or balance / amort_months
    else:
        installment = 0.0

    for month in range(1, total_months + 1):
        interest = balance * monthly_rate
        if custom_schedule and month <= len(custom_schedule):
            payment = custom_schedule[month - 1]
        elif month <= grace:
            payment = interest
        elif amortization == "sac":
            amortization_value = principal / amort_months
            payment = amortization_value + interest
        else:
            payment = installment

        if amortization == "sac":
            amortization_value = principal / amort_months
        elif month <= grace:
            amortization_value = max(0.0, payment - interest)
        else:
            amortization_value = max(0.0, payment - interest)

        if month == total_months:
            payment = interest + balance
            amortization_value = balance
            balance = 0.0
        else:
            balance = max(0.0, balance - amortization_value)

        total_interest += interest
        total_payment += payment
        schedule.append(
            {
                "month": month,
                "payment": round(payment, 2),
                "interest": round(interest, 2),
                "amortization": round(amortization_value, 2),
                "balance": round(balance, 2),
            }
        )

    return {
        "schedule": schedule,
        "total_interest": round(total_interest, 2),
        "total_payment": round(total_payment, 2),
        "total_months": total_months,
    }


def _simulate_credit(payload: CreditSimulationRequest) -> dict[str, Any]:
    nominal_rate = payload.rate / 100
    monthly_rate = nominal_rate if payload.rate_period == "monthly" else pow(1 + nominal_rate, 1 / 12) - 1
    index_rate = _credit_index_rate(payload.index)
    effective_monthly_rate = monthly_rate + (index_rate if payload.rate_type == "posfixada" else 0)
    total_days = (payload.months + payload.extension) * 30
    iof_base_cost = payload.amount * (payload.iof / 100)
    iof_daily_cost = payload.amount * 0.000082 * total_days
    iof_cost = round(iof_base_cost + iof_daily_cost, 2)
    schedule_info = _build_credit_schedule(
        payload.amount,
        effective_monthly_rate,
        payload.months,
        payload.amortization,
        payload.grace,
        payload.extension,
        payload.custom_schedule if payload.custom_schedule else None,
    )
    total_cost = schedule_info["total_interest"] + payload.fees + payload.insurance + iof_cost
    total_amount_paid = schedule_info["total_payment"] + payload.fees + payload.insurance + iof_cost
    effective_annual_rate = round((pow(1 + effective_monthly_rate, 12) - 1) * 100, 2)
    cet_annual = round((pow(1 + total_cost / payload.amount, 12 / schedule_info["total_months"]) - 1) * 100, 2) if payload.amount and schedule_info["total_months"] else 0.0

    return {
        "amount": payload.amount,
        "iof_cost": round(iof_cost, 2),
        "iof_days": total_days,
        "iof_base_rate": payload.iof,
        "iof_daily_rate": 0.0082,
        "fees": payload.fees,
        "insurance": payload.insurance,
        "monthly_rate": round(effective_monthly_rate * 100, 4),
        "effective_annual_rate": effective_annual_rate,
        "cet_annual": cet_annual,
        "total_interest": schedule_info["total_interest"],
        "total_payment": schedule_info["total_payment"],
        "total_cost": round(total_cost, 2),
        "amount_with_costs": round(payload.amount + total_cost, 2),
        "total_months": schedule_info["total_months"],
        "rate_type": payload.rate_type,
        "amortization": payload.amortization,
        "grace": payload.grace,
        "extension": payload.extension,
        "schedule": schedule_info["schedule"],
    }


DEMO_DADOS = [
    {"data": "2026-05-01", "descricao": "Vendas Pix", "tipo": "entrada", "valor": 42000, "categoria": "Receita"},
    {"data": "2026-05-03", "descricao": "Boleto cliente A", "tipo": "entrada", "valor": 18000, "categoria": "Receita"},
    {"data": "2026-05-05", "descricao": "Fornecedor materia-prima", "tipo": "saida", "valor": 23000, "categoria": "Fornecedores"},
    {"data": "2026-05-08", "descricao": "Folha de pagamento", "tipo": "saida", "valor": 16500, "categoria": "Pessoal"},
    {"data": "2026-05-12", "descricao": "Aluguel", "tipo": "saida", "valor": 6400, "categoria": "Ocupacao"},
    {"data": "2026-05-18", "descricao": "Campanha comercial", "tipo": "saida", "valor": 3900, "categoria": "Marketing"},
    {"data": "2026-05-24", "descricao": "Recebimento previsto", "tipo": "entrada", "valor": 26000, "categoria": "Receita", "previsto": True},
    {"data": "2026-05-28", "descricao": "Impostos previstos", "tipo": "saida", "valor": 8100, "categoria": "Impostos", "previsto": True},
]

OPEN_FINANCE_PARTICIPANTES = [
    {
        "id": "banco-brasil",
        "nome": "Banco do Brasil",
        "tipo": "Obrigatorio",
        "dados_disponiveis": ["saldos", "extratos", "cartoes", "credito"],
    },
    {
        "id": "itau",
        "nome": "Itau",
        "tipo": "Obrigatorio",
        "dados_disponiveis": ["saldos", "extratos", "cartoes", "credito", "investimentos"],
    },
    {
        "id": "nubank",
        "nome": "Nubank",
        "tipo": "Participante",
        "dados_disponiveis": ["saldos", "extratos", "cartoes"],
    },
    {
        "id": "santander",
        "nome": "Santander",
        "tipo": "Obrigatorio",
        "dados_disponiveis": ["saldos", "extratos", "cartoes", "credito"],
    },
]

OPEN_FINANCE_MOVIMENTOS = {
    "banco-brasil": [
        {"data": "2026-05-06", "descricao": "OF Banco do Brasil - saldo conta PJ", "tipo": "entrada", "valor": 12200, "categoria": "Open Finance"},
        {"data": "2026-05-17", "descricao": "OF Banco do Brasil - tarifa bancaria", "tipo": "saida", "valor": 180, "categoria": "Tarifas"},
    ],
    "itau": [
        {"data": "2026-05-09", "descricao": "OF Itau - recebiveis cartao", "tipo": "entrada", "valor": 15700, "categoria": "Receita"},
        {"data": "2026-05-19", "descricao": "OF Itau - parcela capital de giro", "tipo": "saida", "valor": 2400, "categoria": "Credito"},
    ],
    "nubank": [
        {"data": "2026-05-11", "descricao": "OF Nubank - vendas online", "tipo": "entrada", "valor": 8900, "categoria": "Receita"},
        {"data": "2026-05-20", "descricao": "OF Nubank - assinatura SaaS", "tipo": "saida", "valor": 620, "categoria": "Tecnologia"},
    ],
    "santander": [
        {"data": "2026-05-13", "descricao": "OF Santander - conciliacao Pix", "tipo": "entrada", "valor": 6300, "categoria": "Receita"},
        {"data": "2026-05-21", "descricao": "OF Santander - aluguel maquina", "tipo": "saida", "valor": 350, "categoria": "Operacional"},
    ],
}


def _to_movimentos(dados: list[Movimento]) -> list[Movimento]:
    if not dados:
        dados = [Movimento(**item) for item in DEMO_DADOS]

    if not dados:
        raise HTTPException(status_code=400, detail="Envie ao menos um movimento financeiro.")

    return sorted(dados, key=lambda item: (item.data or date.max, item.descricao))


def _moeda(valor: float) -> str:
    return f"R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _percentual(valor: float) -> float:
    return round(float(valor), 2)


def _analise_core(dados: list[Movimento]) -> dict[str, Any]:
    movimentos = _to_movimentos(dados)
    entradas = sum(item.valor for item in movimentos if item.tipo == "entrada")
    saidas = sum(item.valor for item in movimentos if item.tipo == "saida")

    saldo = 0.0
    saldo_minimo = 0.0
    serie_fluxo = []
    dias_com_movimento = {item.data for item in movimentos if item.data}
    categorias: dict[tuple[str, str], float] = {}

    for item in movimentos:
        fluxo = item.valor if item.tipo == "entrada" else -item.valor
        saldo += fluxo
        saldo_minimo = min(saldo_minimo, saldo)
        categorias[(item.categoria, item.tipo)] = categorias.get((item.categoria, item.tipo), 0.0) + item.valor
        serie_fluxo.append(
            {
                "data": item.data.isoformat() if item.data else None,
                "descricao": item.descricao,
                "fluxo": round(float(fluxo), 2),
                "saldo": round(float(saldo), 2),
                "previsto": item.previsto,
            }
        )

    saldo_final = saldo
    ncg = abs(min(saldo_minimo, 0))
    lucro_estimado = max(saldo_final, 0)
    margem_caixa = (saldo_final / entradas) * 100 if entradas else 0
    periodo_dias = max(30, len(dias_com_movimento) or len(movimentos))
    burn_rate = saidas / periodo_dias
    runway_dias = int(max(0, saldo_final) / burn_rate) if burn_rate else 999

    por_categoria = [
        {"categoria": categoria, "tipo": tipo, "valor": round(valor, 2)}
        for (categoria, tipo), valor in sorted(categorias.items(), key=lambda item: item[1], reverse=True)[:8]
    ]

    alertas: list[dict[str, str]] = []
    if ncg > 0:
        alertas.append(
            {
                "nivel": "critico",
                "titulo": "Risco de caixa negativo",
                "mensagem": f"Antecipe recebiveis ou renegocie saidas para cobrir {_moeda(ncg)}.",
            }
        )
    if margem_caixa < 10:
        alertas.append(
            {
                "nivel": "atencao",
                "titulo": "Margem de caixa apertada",
                "mensagem": "Priorize cobranca ativa, corte despesas nao essenciais e revise precos.",
            }
        )
    if runway_dias < 30:
        alertas.append(
            {
                "nivel": "atencao",
                "titulo": "Baixa autonomia financeira",
                "mensagem": f"O caixa cobre aproximadamente {runway_dias} dias no ritmo atual.",
            }
        )

    estimativa_cobranca = min(entradas * 0.15, ncg + 4000) if entradas else 0
    proximas_acoes = [
        {
            "acao": "Cobrar recebiveis vencidos",
            "impacto": "Aumenta caixa sem contratar credito",
            "prazo": "Hoje",
            "simulacao": f"Estimativa de {_moeda(estimativa_cobranca)} liberados em ate 7 dias com cobranca ativa.",
            "help": "Cobrar clientes em atraso reduz a necessidade de credito. Ex: um recebimento adicional de 5 mil em 7 dias pode diminuir o risco de NCG.",
        },
        {
            "acao": "Simular antecipacao parcial",
            "impacto": f"Cobre ate {_moeda(ncg)} de necessidade de giro" if ncg else "Compara custo de credito com folga de caixa atual",
            "prazo": "24h",
            "simulacao": "Mostra se a antecipacao de recebiveis custa menos que um novo emprestimo e quanto ela reduz a NCG.",
            "help": "Antecipar recebiveis ajuda a por o caixa em dia. Ex: antecipar 20% de vendas previstas pode pagar despesas imediatas com menor custo que credito novo.",
        },
        {
            "acao": "Revisar Top despesas",
            "impacto": "Reduz saidas recorrentes com poucos cliques",
            "prazo": "Esta semana",
            "simulacao": "Estima economia de 10% nas maiores despesas recorrentes para melhorar o fluxo de caixa.",
            "help": "Reduzir despesas recorrentes melhora o resultado sem contrair mais dividas. Ex: cortar 10% em marketing ou aluguel aumenta o caixa imediatamente.",
        },
    ]

    score_credito = max(0, min(100, 72 + margem_caixa * 0.25 - (ncg / entradas * 100 if entradas else 15)))
    return {
        "resumo": {
            "entradas": round(entradas, 2),
            "saidas": round(saidas, 2),
            "saldo_final": round(saldo_final, 2),
            "ncg_valor": round(ncg, 2),
            "ncg_percentual": _percentual((ncg / entradas) * 100 if entradas else 0),
            "lucro_valor": round(lucro_estimado, 2),
            "lucro_percentual": _percentual(margem_caixa),
            "runway_dias": runway_dias,
            "score_credito": round(score_credito, 1),
        },
        "alertas": alertas,
        "proximas_acoes": proximas_acoes,
        "categorias": por_categoria,
        "serie_fluxo": serie_fluxo,
    }


@app.get("/", response_class=HTMLResponse, include_in_schema=False)
def web_app() -> HTMLResponse:
    return get_index_html()


@app.get("/api/status")
@app.get("/status")
def root() -> dict[str, Any]:
    return status()


def status() -> dict[str, Any]:
    return {
        "status": "Finance Flow Pro FULL rodando",
        "novidades": [
            "dashboard decisorio em uma tela",
            "alertas de caixa e NCG",
            "assistente financeiro com recomendacoes",
            "benchmark setorial e score de credito",
        ],
    }


# Catch-all route para servir index.html para SPA routing
@app.get("/{full_path:path}", response_class=HTMLResponse, include_in_schema=False)
def catch_all(full_path: str) -> HTMLResponse:
    # Ignora requisições para /api
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not Found")
    return get_index_html()


@app.get("/api/demo/dados")
@app.get("/demo/dados")
def demo_dados() -> list[dict[str, Any]]:
    return DEMO_DADOS


@app.get("/api/open-finance/participantes")
@app.get("/open-finance/participantes")
def open_finance_participantes() -> dict[str, Any]:
    return {
        "participantes": OPEN_FINANCE_PARTICIPANTES,
        "regras_consentimento": [
            "O cliente escolhe a instituicao receptora e a transmissora dos dados.",
            "O consentimento deve informar finalidade, prazo, instituicao e dados compartilhados.",
            "A autenticacao e a confirmacao ocorrem em canal eletronico da instituicao transmissora.",
            "O cliente pode cancelar o compartilhamento a qualquer momento.",
        ],
    }


@app.post("/api/open-finance/consentimentos")
@app.post("/open-finance/consentimentos")
def open_finance_consentimento(payload: OpenFinanceConsent) -> dict[str, Any]:
    participantes_validos = {item["id"] for item in OPEN_FINANCE_PARTICIPANTES}
    invalidos = [item for item in payload.instituicoes if item not in participantes_validos]
    if invalidos:
        raise HTTPException(status_code=400, detail=f"Instituicoes invalidas: {', '.join(invalidos)}")

    movimentos = [
        movimento
        for instituicao in payload.instituicoes
        for movimento in OPEN_FINANCE_MOVIMENTOS.get(instituicao, [])
    ]

    return {
        "consentimento_id": f"of-{date.today().isoformat()}-{len(payload.instituicoes)}",
        "status": "autorizado",
        "modo": payload.modo,
        "prazo_dias": payload.prazo_dias,
        "finalidade": payload.finalidade,
        "escopos": payload.escopos,
        "instituicoes": [
            item for item in OPEN_FINANCE_PARTICIPANTES if item["id"] in payload.instituicoes
        ],
        "movimentos_importados": movimentos,
        "mensagem": "Consentimento registrado e dados integrados ao painel financeiro.",
    }


@app.post("/api/analise")
@app.post("/analise")
def analise(dados: list[Movimento]) -> dict[str, Any]:
    return _analise_core(dados)


@app.post("/api/credit/simulate")
@app.post("/credit/simulate")
def credit_simulate(payload: CreditSimulationRequest) -> dict[str, Any]:
    return _simulate_credit(payload)


@app.get("/api/benchmark-insights")
@app.get("/benchmark-insights")
def benchmark_insights() -> dict[str, Any]:
    return {
        "benchmarks": [
            "Conta Azul: dashboards de fluxo com realizado, previsto, orcado, filtros e drill-down.",
            "QuickBooks Advanced: agentes de IA, dashboards customizaveis, benchmark de margem e fluxos automatizados.",
            "Pluggy/Open Finance: enriquecimento de transacoes com categoria e dados de estabelecimento.",
        ],
        "diferenciais_recomendados": [
            "Botao 'Resolver caixa de hoje' que junta cobranca, antecipacao e renegociacao em uma fila unica.",
            "Score de credito explicavel com fatores positivos/negativos e simulacao antes de solicitar limite.",
            "Radar de anomalias: gasto fora do padrao, fornecedor duplicado, imposto acima da media e receita recorrente em risco.",
            "Modo contador/gestor: mesma base, linguagem diferente para cada perfil.",
        ],
    }


@app.post("/api/assistente")
@app.post("/assistente")
def assistente_financeiro(payload: AssistenteRequest) -> dict[str, Any]:
    analise_atual = _analise_core(payload.dados)
    resumo = analise_atual["resumo"]
    pergunta = payload.pergunta.lower()

    if "credito" in pergunta or "emprestimo" in pergunta or "capital" in pergunta:
        if resumo["ncg_valor"] > 0:
            resposta = (
                f"Seu score operacional esta em {resumo['score_credito']}/100. "
                f"Antes de contratar credito, tente cobrir a NCG de {_moeda(resumo['ncg_valor'])} "
                "com cobranca e antecipacao parcial para reduzir juros."
            )
        else:
            resposta = (
                f"Seu score operacional esta em {resumo['score_credito']}/100 e nao ha NCG negativa na projecao. "
                "Use credito apenas se ele financiar crescimento com retorno maior que o custo."
            )
    elif "despesa" in pergunta or "cortar" in pergunta:
        resposta = "Comece pelas maiores saidas recorrentes e pelas categorias sem relacao direta com receita."
    else:
        resposta = (
            f"O caixa projetado fecha em {_moeda(resumo['saldo_final'])}, "
            f"com margem de {resumo['lucro_percentual']}%. A prioridade e executar as proximas acoes do painel."
        )

    return {
        "resposta": resposta,
        "contexto": resumo,
        "proximas_acoes": analise_atual["proximas_acoes"],
    }
