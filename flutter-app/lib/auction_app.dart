import 'dart:async';

import 'package:flutter/material.dart';

import 'auction_api.dart';
import 'auction_live_feed.dart';
import 'models.dart';

const midnight = Color(0xFF07131E);
const scoreboard = Color(0xFF102735);
const raised = Color(0xFF193846);
const floodlight = Color(0xFFFFF8E7);
const trophyGold = Color(0xFFF2B84B);
const leatherRed = Color(0xFFBD4238);
const pitchGreen = Color(0xFF2E7857);
const mist = Color(0xFFA8BBC4);
const line = Color(0xFF31505E);

class AuctionArenaApp extends StatelessWidget {
  const AuctionArenaApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Auction Arena',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          scaffoldBackgroundColor: midnight,
          colorScheme: const ColorScheme.dark(
            primary: trophyGold,
            onPrimary: midnight,
            secondary: pitchGreen,
            surface: scoreboard,
            onSurface: floodlight,
            error: Color(0xFFFF8A80),
          ),
          textTheme: const TextTheme(
            headlineLarge: TextStyle(
                fontSize: 34,
                height: .98,
                fontWeight: FontWeight.w900,
                letterSpacing: -1.2),
            headlineMedium: TextStyle(
                fontSize: 25,
                height: 1.05,
                fontWeight: FontWeight.w900,
                letterSpacing: -.5),
            titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            bodyLarge: TextStyle(fontSize: 16, height: 1.4),
            bodyMedium: TextStyle(fontSize: 14, height: 1.4),
            labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
          ),
          appBarTheme: const AppBarTheme(
              backgroundColor: midnight,
              foregroundColor: floodlight,
              elevation: 0,
              scrolledUnderElevation: 0),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: scoreboard,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
            enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(color: line)),
            focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(color: trophyGold, width: 2)),
          ),
          navigationBarTheme: NavigationBarThemeData(
            height: 70,
            backgroundColor: const Color(0xFF061019),
            indicatorColor: trophyGold,
            labelTextStyle: WidgetStateProperty.resolveWith((s) => TextStyle(
                color: s.contains(WidgetState.selected) ? trophyGold : mist,
                fontWeight: FontWeight.w800,
                fontSize: 12)),
            iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(
                color: s.contains(WidgetState.selected) ? midnight : mist)),
          ),
          cardTheme: CardTheme(
            color: scoreboard,
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 10),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(6),
                side: const BorderSide(color: line)),
          ),
          filledButtonTheme: FilledButtonThemeData(
              style: FilledButton.styleFrom(
                  minimumSize: const Size(48, 50),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(5)))),
          outlinedButtonTheme: OutlinedButtonThemeData(
              style: OutlinedButton.styleFrom(
                  minimumSize: const Size(48, 50),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(5)))),
        ),
        home: const AuctionHome(),
      );
}

class AuctionHome extends StatefulWidget {
  const AuctionHome({super.key, this.api});
  final AuctionApi? api;
  @override
  State<AuctionHome> createState() => _AuctionHomeState();
}

class _AuctionHomeState extends State<AuctionHome> with WidgetsBindingObserver {
  late final AuctionApi api = widget.api ?? AuctionApi();
  AuctionSnapshot? snapshot;
  AuctionLiveFeed? liveFeed;
  StreamSubscription<AuctionSnapshot>? liveSubscription;
  String? auctionId;
  String? error;
  bool loading = true;
  bool refreshing = false;
  int tab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startLiveFeed();
  }

  Future<void> _startLiveFeed() async {
    await liveSubscription?.cancel();
    await liveFeed?.dispose();
    final nextFeed = AuctionLiveFeed(api: api, auctionId: auctionId);
    liveFeed = nextFeed;
    liveSubscription = nextFeed.snapshots.listen(
      (data) {
        if (!mounted || !identical(liveFeed, nextFeed)) return;
        setState(() {
          snapshot = data;
          error = null;
          loading = false;
          refreshing = false;
        });
      },
      onError: (Object feedError) {
        if (!mounted || !identical(liveFeed, nextFeed)) return;
        setState(() {
          error = feedError is AuctionApiException
              ? feedError.message
              : 'Live data could not be reached. Check your connection, then try again.';
          loading = false;
          refreshing = false;
        });
      },
    );
    nextFeed.start();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      liveFeed?.resume();
    } else if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.inactive ||
        state == AppLifecycleState.detached) {
      liveFeed?.pause();
    }
  }

  Future<void> _refresh() async {
    if (refreshing) return;
    setState(() => refreshing = true);
    await liveFeed?.refresh();
  }

  Future<void> _join() async {
    final controller = TextEditingController();
    final selected = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Join an auction'),
        content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Enter the auction ID shared by the organizer.'),
              const SizedBox(height: 16),
              TextField(
                  controller: controller,
                  autofocus: true,
                  decoration: const InputDecoration(labelText: 'Auction ID')),
            ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () =>
                  Navigator.pop(dialogContext, controller.text.trim()),
              child: const Text('Join auction')),
        ],
      ),
    );
    controller.dispose();
    final valid = selected != null &&
        RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$')
            .hasMatch(selected);
    if (!valid) {
      if (selected != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content:
                Text('That auction ID is not valid. Check it and try again.')));
      }
      return;
    }
    setState(() {
      auctionId = selected;
      tab = 2;
      loading = true;
    });
    await _startLiveFeed();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    unawaited(liveSubscription?.cancel());
    unawaited(liveFeed?.dispose());
    if (widget.api == null) api.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          toolbarHeight: 68,
          titleSpacing: 18,
          title: const Row(children: [
            _BrandMark(),
            SizedBox(width: 12),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text('Auction Arena',
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -.4)),
                  Text('PHF Premier League · Season 5',
                      style: TextStyle(
                          fontSize: 12,
                          color: mist,
                          fontWeight: FontWeight.w600)),
                ])),
          ]),
          actions: [
            if (refreshing)
              const Padding(
                  padding: EdgeInsets.only(right: 8),
                  child: SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2))),
            IconButton(
                onPressed: refreshing ? null : _refresh,
                icon: const Icon(Icons.refresh_rounded),
                tooltip: 'Refresh live data'),
            const SizedBox(width: 6),
          ],
        ),
        body: AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          child: loading && snapshot == null
              ? const _LoadingView()
              : snapshot == null
                  ? _ErrorView(message: error, onRetry: _refresh)
                  : _PageWidth(
                      key: ValueKey(tab),
                      child: switch (tab) {
                        0 =>
                          HomePanel(snapshot!, onJoin: _join, onFeatured: () {
                            setState(() {
                              auctionId = null;
                              loading = true;
                            });
                            unawaited(_startLiveFeed());
                          }, api: api),
                        1 => PlayersPanel(snapshot!, api),
                        2 => LivePanel(snapshot!, api),
                        _ => TeamsPanel(snapshot!, api),
                      }),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: tab,
          onDestinationSelected: (value) => setState(() => tab = value),
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home_rounded),
                label: 'Home'),
            NavigationDestination(
                icon: Icon(Icons.person_search_outlined),
                selectedIcon: Icon(Icons.person_search_rounded),
                label: 'Players'),
            NavigationDestination(
                icon: Icon(Icons.sensors_outlined),
                selectedIcon: Icon(Icons.sensors_rounded),
                label: 'Live'),
            NavigationDestination(
                icon: Icon(Icons.shield_outlined),
                selectedIcon: Icon(Icons.shield_rounded),
                label: 'Teams'),
          ],
        ),
      );
}

class HomePanel extends StatelessWidget {
  const HomePanel(this.data,
      {required this.onJoin,
      required this.onFeatured,
      required this.api,
      super.key});
  final AuctionSnapshot data;
  final VoidCallback onJoin;
  final VoidCallback onFeatured;
  final AuctionApi api;
  @override
  Widget build(BuildContext context) {
    final assigned = data.players
        .where((p) => p.status == 'sold' || p.status == 'captain')
        .length;
    return ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 28),
        children: [
          _StadiumHero(
              live: data.config?.status == 'live',
              title: data.auction?.name ?? 'Season 5 player auction'),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(
                child: FilledButton.icon(
                    onPressed: onJoin,
                    icon: const Icon(Icons.tag_rounded),
                    label: const Text('Join with ID'))),
            const SizedBox(width: 10),
            OutlinedButton.icon(
                onPressed: onFeatured,
                icon: const Icon(Icons.star_outline_rounded),
                label: const Text('Featured')),
          ]),
          const SizedBox(height: 18),
          _ScoreStrip(items: [
            ('${data.teams.length}', 'Teams'),
            ('${data.players.length}', 'Players'),
            ('$assigned', 'Assigned')
          ]),
          const SizedBox(height: 28),
          const _SectionTitle(
              'Teams at the table', 'Live purses and squad strength'),
          const SizedBox(height: 12),
          for (final team in data.teams) _TeamLine(team, data, api),
        ]);
  }
}

class PlayersPanel extends StatefulWidget {
  const PlayersPanel(this.data, this.api, {super.key});
  final AuctionSnapshot data;
  final AuctionApi api;
  @override
  State<PlayersPanel> createState() => _PlayersPanelState();
}

class _PlayersPanelState extends State<PlayersPanel> {
  String query = '';
  String status = 'All';
  @override
  Widget build(BuildContext context) {
    final players = widget.data.players
        .where((p) =>
            (query.isEmpty ||
                p.name.toLowerCase().contains(query.toLowerCase()) ||
                p.role.toLowerCase().contains(query.toLowerCase())) &&
            (status == 'All' || p.status.toLowerCase() == status.toLowerCase()))
        .toList();
    return CustomScrollView(slivers: [
      SliverPadding(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 0),
          sliver: SliverToBoxAdapter(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                const _SectionTitle(
                    'Player pool', 'Search by player name or playing role'),
                const SizedBox(height: 14),
                TextField(
                    onChanged: (v) => setState(() => query = v),
                    textInputAction: TextInputAction.search,
                    decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search_rounded),
                        hintText: 'Search players or roles')),
              ]))),
      SliverToBoxAdapter(
          child: SizedBox(
              height: 58,
              child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                  children: [
                    for (final item in const [
                      'All',
                      'Queued',
                      'Sold',
                      'Unsold'
                    ])
                      Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                              label: Text(item),
                              selected: status == item,
                              showCheckmark: false,
                              onSelected: (_) =>
                                  setState(() => status = item))),
                  ]))),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(18, 2, 18, 28),
        sliver: players.isEmpty
            ? const SliverFillRemaining(
                hasScrollBody: false,
                child: _EmptyView(
                    icon: Icons.person_off_outlined,
                    title: 'No players found',
                    message: 'Try a different name, role or auction status.'))
            : SliverList.builder(
                itemCount: players.length + 1,
                itemBuilder: (context, index) {
                  if (index == 0) {
                    return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Text('${players.length} players',
                            style: const TextStyle(
                                color: mist, fontWeight: FontWeight.w700)));
                  }
                  final p = players[index - 1];
                  return _PlayerCard(
                      player: p,
                      team: widget.data.teamById(p.teamId),
                      api: widget.api);
                }),
      ),
    ]);
  }
}

class LivePanel extends StatelessWidget {
  const LivePanel(this.data, this.api, {super.key});
  final AuctionSnapshot data;
  final AuctionApi api;
  @override
  Widget build(BuildContext context) {
    final player = data.currentPlayer;
    final bidder = data.teamById(player?.currentBidTeamId);
    return ListView(
        padding: const EdgeInsets.fromLTRB(18, 12, 18, 30),
        children: [
          _BidBoard(
              live: data.config?.status == 'live',
              amount: _money(
                  player?.currentBid == 0
                      ? player?.basePrice
                      : player?.currentBid,
                  data),
              bidder: bidder?.name ??
                  (player == null
                      ? 'Waiting for the auctioneer'
                      : 'Opening price')),
          const SizedBox(height: 12),
          if (player != null)
            _OnTheBlock(
                player: player,
                api: api,
                basePrice: _money(player.basePrice, data))
          else
            const _EmptyView(
                icon: Icons.hourglass_top_rounded,
                title: 'Next player coming up',
                message:
                    'This screen updates automatically when the auctioneer starts the next lot.'),
          const SizedBox(height: 26),
          const _SectionTitle(
              'Purse board', 'Remaining balance after confirmed sales'),
          const SizedBox(height: 12),
          for (final team in data.teams)
            _TeamLine(team, data, api, active: team.id == bidder?.id),
          if (data.events.isNotEmpty) ...[
            const SizedBox(height: 26),
            const _SectionTitle('Recent calls', 'Latest action from the table'),
            const SizedBox(height: 8),
            Card(
                child: Column(children: [
              for (var i = 0; i < data.events.take(8).length; i++)
                _EventLine(
                    event: data.events[i],
                    playerName: _playerName(data, data.events[i].playerId),
                    isLast: i == data.events.take(8).length - 1)
            ])),
          ],
        ]);
  }
}

class TeamsPanel extends StatelessWidget {
  const TeamsPanel(this.data, this.api, {super.key});
  final AuctionSnapshot data;
  final AuctionApi api;
  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.fromLTRB(18, 12, 18, 30), children: [
        const _SectionTitle(
            'Squad room', 'Every roster, updated as the hammer falls'),
        const SizedBox(height: 14),
        for (final team in data.teams)
          _SquadCard(team: team, data: data, api: api),
      ]);
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();
  @override
  Widget build(BuildContext context) => Container(
      width: 42,
      height: 42,
      decoration:
          const BoxDecoration(color: leatherRed, shape: BoxShape.circle),
      child: const Icon(Icons.sports_cricket_rounded,
          color: floodlight, size: 23));
}

class _PageWidth extends StatelessWidget {
  const _PageWidth({required this.child, super.key});
  final Widget child;
  @override
  Widget build(BuildContext context) => Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760), child: child));
}

class _StadiumHero extends StatelessWidget {
  const _StadiumHero({required this.live, required this.title});
  final bool live;
  final String title;
  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(7),
        child: Stack(children: [
          Positioned.fill(child: CustomPaint(painter: _FloodlightPainter())),
          Container(
            constraints: const BoxConstraints(minHeight: 218),
            padding: const EdgeInsets.all(22),
            decoration: const BoxDecoration(
                gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF173D4C), Color(0xF207131E)])),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _LiveFlag(live: live),
              const SizedBox(height: 40),
              Text(title, style: Theme.of(context).textTheme.headlineLarge),
              const SizedBox(height: 10),
              const Text(
                  'Follow every call, purse and squad from the auction floor.',
                  style: TextStyle(color: mist, fontSize: 15)),
            ]),
          ),
        ]),
      );
}

class _FloodlightPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = trophyGold.withOpacity(.11);
    canvas.drawCircle(
        Offset(size.width * .82, size.height * .18), size.width * .33, paint);
    paint.color = floodlight.withOpacity(.07);
    for (var i = 0; i < 5; i++) {
      canvas.drawCircle(
          Offset(size.width * (.72 + i * .045), size.height * .12), 4, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _LiveFlag extends StatelessWidget {
  const _LiveFlag({required this.live});
  final bool live;
  @override
  Widget build(BuildContext context) =>
      Row(mainAxisSize: MainAxisSize.min, children: [
        Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(
                color: live ? const Color(0xFFFF645C) : mist,
                shape: BoxShape.circle)),
        const SizedBox(width: 8),
        Text(live ? 'Auction live' : 'Auction room',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
      ]);
}

class _ScoreStrip extends StatelessWidget {
  const _ScoreStrip({required this.items});
  final List<(String, String)> items;
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
            color: scoreboard,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: line)),
        child: IntrinsicHeight(
            child: Row(children: [
          for (var i = 0; i < items.length; i++) ...[
            Expanded(
                child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 15),
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(items[i].$1,
                              style: const TextStyle(
                                  color: trophyGold,
                                  fontSize: 25,
                                  height: 1,
                                  fontWeight: FontWeight.w900)),
                          const SizedBox(height: 5),
                          Text(items[i].$2,
                              style: const TextStyle(
                                  color: mist,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700)),
                        ]))),
            if (i < items.length - 1)
              const VerticalDivider(width: 1, color: line),
          ],
        ])),
      );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, this.subtitle);
  final String title;
  final String subtitle;
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 4),
        Text(subtitle, style: const TextStyle(color: mist)),
      ]);
}

class _PlayerCard extends StatelessWidget {
  const _PlayerCard(
      {required this.player, required this.team, required this.api});
  final AuctionPlayer player;
  final AuctionTeam? team;
  final AuctionApi api;
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            _Photo(api.imageUrl(player.photo), 68),
            const SizedBox(width: 14),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(player.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 3),
                  Text(player.role, style: const TextStyle(color: mist)),
                  if (team != null) ...[
                    const SizedBox(height: 5),
                    Text(team!.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            color: trophyGold,
                            fontSize: 13,
                            fontWeight: FontWeight.w700))
                  ],
                ])),
            const SizedBox(width: 8),
            _Status(player.status),
          ])));
}

class _BidBoard extends StatelessWidget {
  const _BidBoard(
      {required this.live, required this.amount, required this.bidder});
  final bool live;
  final String amount;
  final String bidder;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
        decoration: BoxDecoration(
            color: trophyGold, borderRadius: BorderRadius.circular(7)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(live ? Icons.sensors_rounded : Icons.gavel_rounded,
                color: midnight, size: 19),
            const SizedBox(width: 7),
            Text(live ? 'Live bid' : 'Auction status',
                style: const TextStyle(
                    color: midnight, fontWeight: FontWeight.w900))
          ]),
          const SizedBox(height: 15),
          FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(amount,
                  style: const TextStyle(
                      color: midnight,
                      fontSize: 42,
                      height: 1,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1.4))),
          const SizedBox(height: 8),
          Text(bidder,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                  color: midnight, fontWeight: FontWeight.w800, fontSize: 15)),
        ]),
      );
}

class _OnTheBlock extends StatelessWidget {
  const _OnTheBlock(
      {required this.player, required this.api, required this.basePrice});
  final AuctionPlayer player;
  final AuctionApi api;
  final String basePrice;
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            _Photo(api.imageUrl(player.photo), 112),
            const SizedBox(width: 16),
            Expanded(
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  const Text('On the block',
                      style: TextStyle(
                          color: trophyGold, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 5),
                  Text(player.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 4),
                  Text(player.role, style: const TextStyle(color: mist)),
                  const SizedBox(height: 13),
                  Text('Base $basePrice',
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                ])),
          ])));
}

class _TeamLine extends StatelessWidget {
  const _TeamLine(this.team, this.data, this.api, {this.active = false});
  final AuctionTeam team;
  final AuctionSnapshot data;
  final AuctionApi api;
  final bool active;
  @override
  Widget build(BuildContext context) {
    final count = data.players.where((p) => p.teamId == team.id).length;
    return Container(
      margin: const EdgeInsets.only(bottom: 9),
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
          color: active ? const Color(0xFF1E3F48) : scoreboard,
          borderRadius: BorderRadius.circular(5),
          border: Border.all(
              color: active ? trophyGold : line, width: active ? 1.5 : 1)),
      child: Row(children: [
        _Photo(api.imageUrl(team.logoUrl), 48, round: true),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Flexible(
                child: Text(team.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w800))),
            if (active) ...[
              const SizedBox(width: 7),
              const Icon(Icons.gavel_rounded, size: 15, color: trophyGold)
            ]
          ]),
          const SizedBox(height: 3),
          Text('$count/${data.config?.maxSquadSize ?? 14} players',
              style: const TextStyle(color: mist, fontSize: 12)),
        ])),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(_money(team.remaining, data),
              style: const TextStyle(
                  color: trophyGold,
                  fontWeight: FontWeight.w900,
                  fontSize: 15)),
          const Text('remaining', style: TextStyle(color: mist, fontSize: 11))
        ]),
      ]),
    );
  }
}

class _SquadCard extends StatelessWidget {
  const _SquadCard({required this.team, required this.data, required this.api});
  final AuctionTeam team;
  final AuctionSnapshot data;
  final AuctionApi api;
  @override
  Widget build(BuildContext context) {
    final squad = data.players.where((p) => p.teamId == team.id).toList();
    final max = data.config?.maxSquadSize ?? 14;
    return Card(
        child: Padding(
            padding: const EdgeInsets.all(15),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                _Photo(api.imageUrl(team.logoUrl), 62, round: true),
                const SizedBox(width: 14),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text(team.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 4),
                      Text('${squad.length}/$max players',
                          style: const TextStyle(color: mist))
                    ])),
                const Icon(Icons.chevron_right_rounded, color: mist),
              ]),
              const SizedBox(height: 14),
              ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                      value: max == 0 ? 0 : squad.length / max,
                      minHeight: 5,
                      color: trophyGold,
                      backgroundColor: raised)),
              if (squad.isNotEmpty) ...[
                const Divider(height: 26, color: line),
                Wrap(spacing: 7, runSpacing: 7, children: [
                  for (final p in squad.take(6))
                    Chip(
                        avatar: p.status == 'captain'
                            ? const Icon(Icons.stars_rounded,
                                size: 16, color: trophyGold)
                            : null,
                        label: Text(p.name),
                        visualDensity: VisualDensity.compact,
                        side: const BorderSide(color: line),
                        backgroundColor: midnight),
                  if (squad.length > 6)
                    Chip(
                        label: Text('+${squad.length - 6} more'),
                        backgroundColor: raised,
                        side: BorderSide.none),
                ]),
              ] else ...[
                const SizedBox(height: 14),
                const Text(
                    'No players assigned yet. Sold players will appear here.',
                    style: TextStyle(color: mist))
              ],
            ])));
  }
}

class _EventLine extends StatelessWidget {
  const _EventLine(
      {required this.event, required this.playerName, required this.isLast});
  final AuctionEvent event;
  final String playerName;
  final bool isLast;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        decoration: BoxDecoration(
            border: Border(
                bottom: BorderSide(color: isLast ? Colors.transparent : line))),
        child: Row(children: [
          Icon(
              event.eventType.contains('sold')
                  ? Icons.gavel_rounded
                  : Icons.bolt_rounded,
              size: 18,
              color: event.eventType.contains('sold') ? trophyGold : mist),
          const SizedBox(width: 11),
          Expanded(
              child: Text(playerName,
                  style: const TextStyle(fontWeight: FontWeight.w700))),
          Text(_eventLabel(event.eventType),
              style: const TextStyle(color: mist, fontSize: 12)),
        ]),
      );
}

class _Photo extends StatelessWidget {
  const _Photo(this.url, this.size, {this.round = false});
  final String? url;
  final double size;
  final bool round;
  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(round ? size / 2 : 4),
        child: Container(
            width: size,
            height: size,
            color: raised,
            child: url == null
                ? const Icon(Icons.sports_cricket_rounded, color: trophyGold)
                : Image.network(url!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const Icon(
                        Icons.sports_cricket_rounded,
                        color: trophyGold))),
      );
}

class _Status extends StatelessWidget {
  const _Status(this.status);
  final String status;
  @override
  Widget build(BuildContext context) {
    final value = status.isEmpty ? 'queued' : status.toLowerCase();
    final color = switch (value) {
      'sold' || 'captain' => pitchGreen,
      'up' => leatherRed,
      'unsold' => const Color(0xFF623D3D),
      _ => raised
    };
    return Container(
        constraints: const BoxConstraints(minHeight: 32),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
            color: color, borderRadius: BorderRadius.circular(18)),
        child: Text('${value[0].toUpperCase()}${value.substring(1)}',
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)));
  }
}

class _LoadingView extends StatelessWidget {
  const _LoadingView();
  @override
  Widget build(BuildContext context) => const Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        SizedBox.square(
            dimension: 34, child: CircularProgressIndicator(strokeWidth: 3)),
        SizedBox(height: 16),
        Text('Joining the auction room',
            style: TextStyle(fontWeight: FontWeight.w800)),
        SizedBox(height: 5),
        Text('Loading live players, teams and purses…',
            style: TextStyle(color: mist)),
      ]));
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String? message;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Center(
      child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.wifi_off_rounded, size: 50, color: leatherRed),
            const SizedBox(height: 16),
            Text('Auction room unavailable',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(message ?? 'Live data is unavailable.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: mist)),
            const SizedBox(height: 20),
            FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Try again')),
          ])));
}

class _EmptyView extends StatelessWidget {
  const _EmptyView(
      {required this.icon, required this.title, required this.message});
  final IconData icon;
  final String title;
  final String message;
  @override
  Widget build(BuildContext context) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 34, horizontal: 20),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 42, color: trophyGold),
        const SizedBox(height: 12),
        Text(title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 6),
        Text(message,
            textAlign: TextAlign.center, style: const TextStyle(color: mist)),
      ]));
}

String _money(double? value, AuctionSnapshot data) {
  final raw = value ?? 0;
  final number = raw == raw.roundToDouble()
      ? raw.toInt().toString()
      : raw
          .toStringAsFixed(2)
          .replaceFirst(RegExp(r'0+$'), '')
          .replaceFirst(RegExp(r'\.$'), '');
  return '${data.config?.moneyLabel ?? 'INR'} $number';
}

String _playerName(AuctionSnapshot data, String id) {
  for (final player in data.players) {
    if (player.id == id) return player.name;
  }
  return 'Player';
}

String _eventLabel(String value) {
  final words = value.replaceAll('_', ' ').trim();
  return words.isEmpty
      ? 'Update'
      : '${words[0].toUpperCase()}${words.substring(1)}';
}
