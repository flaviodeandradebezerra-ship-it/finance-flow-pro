from datetime import date
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


app = FastAPI(
    title="Finance Flow Pro FULL",
    description="API de inteligencia financeira, credito e capital de giro para PMEs.",
    version="2.0.0",
)

PUBLIC_DIR = Path(__file__).parent / "public"

if PUBLIC_DIR.exists():
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

    proximas_acoes = [
        {
            "acao": "Cobrar recebiveis vencidos",
            "impacto": "Aumenta caixa sem contratar credito",
            "prazo": "Hoje",
        },
        {
            "acao": "Simular antecipacao parcial",
            "impacto": f"Cobre ate {_moeda(ncg)} de necessidade de giro" if ncg else "Compara custo de credito com folga de caixa atual",
            "prazo": "24h",
        },
        {
            "acao": "Revisar Top despesas",
            "impacto": "Reduz saidas recorrentes com poucos cliques",
            "prazo": "Esta semana",
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


@app.get("/", include_in_schema=False, response_model=None)
def web_app():
    index = PUBLIC_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return status()


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


@app.get("/api/demo/dados")
@app.get("/demo/dados")
def demo_dados() -> list[dict[str, Any]]:
    return DEMO_DADOS


@app.post("/api/analise")
@app.post("/analise")
def analise(dados: list[Movimento]) -> dict[str, Any]:
    return _analise_core(dados)


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
