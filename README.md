# Finance Flow Pro FULL

Plataforma de inteligencia financeira, contabil e credito para PMEs, com foco em poucos cliques e decisao rapida.

## Links

- Producao Vercel: https://financeflowprofull.vercel.app
- API publica: https://financeflowprofull.vercel.app/api/status
- Repositorio GitHub: https://github.com/flaviodeandradebezerra-ship-it/finance-flow-pro

## O que mudou

- Dashboard executivo em uma tela: caixa, NCG, score de credito, runway, fluxo previsto/realizado e fila de decisoes.
- Acoes rapidas para os fluxos mais frequentes: novo movimento, Open Finance, cobrar clientes, simular credito e enviar relatorio ao contador.
- API sem dependencia pesada para a demo, com validacao de movimentos, serie de fluxo, alertas, proximas acoes, score de credito e dados demo.
- Copiloto financeiro com resposta orientada a acao, nao apenas relatorio.
- Benchmark documentado para posicionar o produto contra Conta Azul, QuickBooks Advanced e Pluggy/Open Finance.

## Benchmark de mercado

- Conta Azul Mais trabalha bem dashboards de fluxo com realizado, previsto, orcado, filtros, top categorias e drill-down.
- QuickBooks Advanced aposta em IA, dashboards customizaveis, comparacao com benchmarks, automacoes e relatorios rapidos.
- Pluggy/Open Finance oferece base forte para integracao bancaria, categorizacao, enriquecimento de transacoes e recorrencias.

## Diferenciais propostos

1. Botao "Resolver caixa de hoje": combina cobranca, antecipacao, renegociacao e simulacao de credito em uma fila unica.
2. Credito explicavel: mostra por que o score subiu ou caiu antes de pedir limite.
3. Radar de anomalias: identifica gasto fora do padrao, fornecedor duplicado, imposto alto e receita recorrente em risco.
4. Modo gestor e modo contador: mesma informacao em linguagem diferente para reduzir suporte e retrabalho.
5. Relatorio de NCG pronto para banco, socio ou contador em um clique.

## Endpoints principais

- `GET /`: status e novidades da API.
- `GET /demo/dados`: dados de exemplo para prototipacao.
- `POST /analise`: calcula entradas, saidas, saldo, NCG, margem, runway, score, alertas e proximas acoes.
- `GET /benchmark-insights`: resumo de benchmarks e diferenciais.
- `POST /assistente`: gera resposta financeira contextual a partir dos movimentos enviados.

## Rodando a API

```bash
pip install -r requirements.txt
uvicorn api_full:app --reload
```

Depois acesse `http://127.0.0.1:8000/docs`.

## Testando os modulos da interface

Com a API local rodando em `http://127.0.0.1:8000`:

```bash
npm install
npm run test:e2e
```

O teste clica nos modulos Painel, Fluxo, Credito e IA e valida se a tela principal troca corretamente.

## Proximos passos recomendados

- Conectar Pluggy/Open Finance para importar contas, saldos e transacoes.
- Persistir empresas, usuarios e movimentos em banco de dados.
- Criar testes automatizados para calculo financeiro e validacao de payloads.
- Integrar app Flutter com a API real usando `http` ou client gerado por OpenAPI.
- Adicionar exportacao PDF/Excel e trilha de auditoria para contador.
