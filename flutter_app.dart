import 'package:flutter/material.dart';

void main() => runApp(const FinanceFlowApp());

class FinanceFlowApp extends StatelessWidget {
  const FinanceFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Finance Flow Pro',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF126C58),
          primary: const Color(0xFF126C58),
          secondary: const Color(0xFFD18B2F),
          tertiary: const Color(0xFF285DA8),
          surface: const Color(0xFFF8FAF9),
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF3F7F5),
        textTheme: const TextTheme(
          headlineMedium: TextStyle(fontWeight: FontWeight.w800),
          titleLarge: TextStyle(fontWeight: FontWeight.w800),
          titleMedium: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
      home: const FinanceHomePage(),
    );
  }
}

class FinanceHomePage extends StatefulWidget {
  const FinanceHomePage({super.key});

  @override
  State<FinanceHomePage> createState() => _FinanceHomePageState();
}

class _FinanceHomePageState extends State<FinanceHomePage> {
  int selectedTab = 0;

  final metrics = const [
    Metric('Caixa hoje', 'R\$ 32.100', '+18%', Icons.account_balance_wallet_outlined, Color(0xFF126C58)),
    Metric('NCG', 'R\$ 9.200', '-12%', Icons.sync_alt_outlined, Color(0xFFD18B2F)),
    Metric('Score credito', '81/100', '+6 pts', Icons.speed_outlined, Color(0xFF285DA8)),
    Metric('Runway', '14 dias', 'alerta', Icons.calendar_month_outlined, Color(0xFF6E4AA8)),
  ];

  final quickActions = const [
    QuickAction('Resolver caixa', Icons.flash_on_outlined, '3 passos'),
    QuickAction('Cobrar clientes', Icons.mark_email_unread_outlined, 'R\$ 18k'),
    QuickAction('Simular credito', Icons.request_quote_outlined, '2 min'),
    QuickAction('Enviar contador', Icons.ios_share_outlined, 'PDF'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth >= 920;
            return Row(
              children: [
                if (wide) const NavigationRailPro(),
                Expanded(
                  child: CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(child: _Header(wide: wide)),
                      SliverPadding(
                        padding: EdgeInsets.fromLTRB(wide ? 32 : 16, 8, wide ? 32 : 16, 20),
                        sliver: SliverList(
                          delegate: SliverChildListDelegate([
                            _QuickActions(actions: quickActions),
                            const SizedBox(height: 18),
                            _MetricsGrid(metrics: metrics, wide: wide),
                            const SizedBox(height: 18),
                            if (wide)
                              const Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(flex: 7, child: CashFlowPanel()),
                                  SizedBox(width: 18),
                                  Expanded(flex: 5, child: AiCopilotPanel()),
                                ],
                              )
                            else ...[
                              const CashFlowPanel(),
                              const SizedBox(height: 18),
                              const AiCopilotPanel(),
                            ],
                            const SizedBox(height: 18),
                            _ActionQueue(selectedTab: selectedTab, onChanged: (value) => setState(() => selectedTab = value)),
                          ]),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
      bottomNavigationBar: MediaQuery.of(context).size.width < 920
          ? NavigationBar(
              selectedIndex: 0,
              destinations: const [
                NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Painel'),
                NavigationDestination(icon: Icon(Icons.payments_outlined), label: 'Fluxo'),
                NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), label: 'IA'),
              ],
            )
          : null,
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.wide});

  final bool wide;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(wide ? 32 : 16, 24, wide ? 32 : 16, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.trending_up, color: Colors.white),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Finance Flow Pro', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                    Text('Painel de decisao financeira para PMEs'),
                  ],
                ),
              ),
              IconButton.filledTonal(onPressed: () {}, icon: const Icon(Icons.notifications_none)),
            ],
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.add), label: const Text('Novo movimento')),
              OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.link), label: const Text('Open Finance')),
              OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.tune), label: const Text('Filtros')),
            ],
          ),
        ],
      ),
    );
  }
}

class NavigationRailPro extends StatelessWidget {
  const NavigationRailPro({super.key});

  @override
  Widget build(BuildContext context) {
    return NavigationRail(
      selectedIndex: 0,
      labelType: NavigationRailLabelType.all,
      destinations: const [
        NavigationRailDestination(icon: Icon(Icons.dashboard_outlined), label: Text('Painel')),
        NavigationRailDestination(icon: Icon(Icons.payments_outlined), label: Text('Fluxo')),
        NavigationRailDestination(icon: Icon(Icons.receipt_long_outlined), label: Text('DRE')),
        NavigationRailDestination(icon: Icon(Icons.auto_awesome_outlined), label: Text('IA')),
      ],
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.actions});

  final List<QuickAction> actions;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 88,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: actions.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final action = actions[index];
          return SizedBox(
            width: 176,
            child: FilledButton.tonalIcon(
              onPressed: () {},
              icon: Icon(action.icon),
              label: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(action.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(action.badge, style: Theme.of(context).textTheme.labelSmall),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _MetricsGrid extends StatelessWidget {
  const _MetricsGrid({required this.metrics, required this.wide});

  final List<Metric> metrics;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: metrics.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: wide ? 4 : 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: wide ? 1.9 : 1.35,
      ),
      itemBuilder: (context, index) => MetricTile(metric: metrics[index]),
    );
  }
}

class MetricTile extends StatelessWidget {
  const MetricTile({super.key, required this.metric});

  final Metric metric;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Icon(metric.icon, color: metric.color),
                const Spacer(),
                Text(metric.delta, style: TextStyle(color: metric.color, fontWeight: FontWeight.w700)),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(metric.label),
                FittedBox(child: Text(metric.value, style: Theme.of(context).textTheme.titleLarge)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class CashFlowPanel extends StatelessWidget {
  const CashFlowPanel({super.key});

  @override
  Widget build(BuildContext context) {
    final bars = [0.42, 0.65, 0.38, 0.9, 0.55, 0.74, 0.48, 0.82];
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Fluxo realizado + previsto', style: Theme.of(context).textTheme.titleMedium),
                const Spacer(),
                IconButton(onPressed: () {}, icon: const Icon(Icons.fullscreen_outlined), tooltip: 'Ampliar'),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 190,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (final bar in bars)
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child: FractionallySizedBox(
                          heightFactor: bar,
                          alignment: Alignment.bottomCenter,
                          child: Container(
                            decoration: BoxDecoration(
                              color: bar > 0.7 ? const Color(0xFF126C58) : const Color(0xFF9CB8AD),
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Wrap(
              spacing: 10,
              runSpacing: 8,
              children: [
                _StatusChip(label: 'Previsto: R\$ 26k', icon: Icons.show_chart),
                _StatusChip(label: 'Risco: dia 12', icon: Icons.warning_amber_outlined),
                _StatusChip(label: 'Top saida: Pessoal', icon: Icons.groups_outlined),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class AiCopilotPanel extends StatelessWidget {
  const AiCopilotPanel({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.auto_awesome, color: Theme.of(context).colorScheme.secondary),
                const SizedBox(width: 8),
                Text('Copiloto financeiro', style: Theme.of(context).textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 14),
            const Text('Seu caixa fica negativo se os impostos forem pagos antes do recebimento previsto. Recomendo antecipar R\$ 9,2k ou renegociar 7 dias.'),
            const SizedBox(height: 16),
            FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.task_alt), label: const Text('Aplicar plano sugerido')),
            const SizedBox(height: 12),
            const Divider(),
            const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.insights_outlined),
              title: Text('Anomalia detectada'),
              subtitle: Text('Marketing subiu 31% acima da media dos ultimos meses.'),
            ),
            const ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.verified_user_outlined),
              title: Text('Credito explicavel'),
              subtitle: Text('Score melhora se a NCG cair abaixo de 8% da receita.'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionQueue extends StatelessWidget {
  const _ActionQueue({required this.selectedTab, required this.onChanged});

  final int selectedTab;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Fila de decisoes', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            SegmentedButton<int>(
              segments: const [
                ButtonSegment(value: 0, label: Text('Hoje'), icon: Icon(Icons.today_outlined)),
                ButtonSegment(value: 1, label: Text('Semana'), icon: Icon(Icons.date_range_outlined)),
                ButtonSegment(value: 2, label: Text('Contador'), icon: Icon(Icons.receipt_long_outlined)),
              ],
              selected: {selectedTab},
              onSelectionChanged: (value) => onChanged(value.first),
            ),
            const SizedBox(height: 12),
            const _DecisionTile(title: 'Cobrar 4 clientes com vencimento critico', subtitle: 'Impacto estimado: R\$ 18.000 no caixa', icon: Icons.call_outlined),
            const _DecisionTile(title: 'Renegociar fornecedor de materia-prima', subtitle: 'Move R\$ 7.400 para a proxima semana', icon: Icons.handshake_outlined),
            const _DecisionTile(title: 'Gerar relatorio de NCG para credito', subtitle: 'Pronto para banco, socio ou contador', icon: Icons.picture_as_pdf_outlined),
          ],
        ),
      ),
    );
  }
}

class _DecisionTile extends StatelessWidget {
  const _DecisionTile({required this.title, required this.subtitle, required this.icon});

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon),
      title: Text(title),
      subtitle: Text(subtitle),
      trailing: IconButton(onPressed: () {}, icon: const Icon(Icons.arrow_forward)),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.icon});

  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Chip(avatar: Icon(icon, size: 18), label: Text(label), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)));
  }
}

class Metric {
  const Metric(this.label, this.value, this.delta, this.icon, this.color);

  final String label;
  final String value;
  final String delta;
  final IconData icon;
  final Color color;
}

class QuickAction {
  const QuickAction(this.title, this.icon, this.badge);

  final String title;
  final IconData icon;
  final String badge;
}
