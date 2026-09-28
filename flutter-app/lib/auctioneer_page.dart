import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'auction_api.dart';
import 'auction_live_feed.dart';
import 'models.dart';

const _gold = Color(0xFFF1BA45);
const _ink = Color(0xFF07131E);
const _card = Color(0xFF122936);
const _muted = Color(0xFFAAB8C0);

class AuctioneerPage extends StatefulWidget {
  const AuctioneerPage({super.key, required this.api});
  final AuctionApi api;

  @override
  State<AuctioneerPage> createState() => _AuctioneerPageState();
}

class _AuctioneerPageState extends State<AuctioneerPage> {
  final username = TextEditingController();
  final password = TextEditingController();
  AuctionSnapshot? snapshot;
  List<AuctionInstance> auctions = const [];
  String? selectedAuctionId;
  bool busy = false;
  String? message;

  @override
  void dispose() {
    username.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (busy) return;
    setState(() {
      busy = true;
      message = null;
    });
    try {
      await widget.api.signIn(username.text.trim(), password.text);
      password.clear();
      await _reload();
    } on AuctionApiException catch (error) {
      setState(() => message = error.message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _reload() async {
    final values = await Future.wait([
      widget.api.load(auctionId: selectedAuctionId),
      widget.api.listAuctions(),
    ]);
    if (!mounted) return;
    final loaded = values[0] as AuctionSnapshot;
    setState(() {
      snapshot = loaded;
      selectedAuctionId ??= loaded.auction?.id;
      auctions = values[1] as List<AuctionInstance>;
    });
  }

  Future<void> _createPhfAuction() async {
    final controller = TextEditingController(text: 'PHF Premier League');
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create PHF auction'),
        content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                  'Players, teams and official PHF rules will be copied automatically.'),
              const SizedBox(height: 14),
              TextField(
                  controller: controller,
                  autofocus: true,
                  decoration: const InputDecoration(labelText: 'Auction name')),
            ]),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Create')),
        ],
      ),
    );
    controller.dispose();
    if (name == null || name.length < 3 || busy) return;
    setState(() {
      busy = true;
      message = null;
    });
    try {
      final source = snapshot!;
      final id = await widget.api.action('auction_create_instance', {
        'p_name': name,
        'p_kind': 'official',
        'p_purse': 30,
        'p_base_price': 1,
        'p_increment': .20,
        'p_increment_threshold': 5,
        'p_increment_above_threshold': .50,
        'p_min_squad_size': 14,
        'p_max_squad_size': 15,
        'p_money_label': 'CR',
        'p_players': source.players
            .where((player) => player.status != 'captain')
            .map((player) => {
                  'id': player.id,
                  'name': player.name,
                  'role': player.role,
                  'photo': player.photo
                })
            .toList(),
      });
      selectedAuctionId = id.toString();
      await _reload();
      if (mounted) {
        setState(() => message = '$name created.');
        await _openRoom(selectedAuctionId!);
      }
    } on AuctionApiException catch (error) {
      if (mounted) setState(() => message = error.message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _openRoom(String auctionId) async {
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => AuctionRoomPage(api: widget.api, auctionId: auctionId),
    ));
    if (mounted) await _reload();
  }

  Future<void> _copyLink(String label, String value) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text('$label copied.')));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const Text('Auctioneer console'),
          actions: [
            if (widget.api.isSignedIn)
              IconButton(
                  onPressed: busy ? null : _reload,
                  icon: const Icon(Icons.refresh_rounded)),
            if (widget.api.isSignedIn)
              IconButton(
                tooltip: 'Sign out',
                onPressed: () => setState(() {
                  widget.api.signOut();
                  snapshot = null;
                  auctions = const [];
                }),
                icon: const Icon(Icons.logout_rounded),
              ),
          ],
        ),
        body: SafeArea(
          child: widget.api.isSignedIn ? _console() : _signIn(),
        ),
      );

  Widget _signIn() => ListView(
        padding: const EdgeInsets.all(22),
        children: [
          const Icon(Icons.gavel_rounded, color: _gold, size: 58),
          const SizedBox(height: 18),
          Text('Run the auction',
              style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 8),
          const Text(
              'Sign in with an approved auctioneer account. Bids and sales update every connected screen.',
              style: TextStyle(color: _muted)),
          const SizedBox(height: 28),
          TextField(
              controller: username,
              enabled: !busy,
              decoration: const InputDecoration(labelText: 'Username'),
              textInputAction: TextInputAction.next),
          const SizedBox(height: 14),
          TextField(
              controller: password,
              enabled: !busy,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password'),
              onSubmitted: (_) => _login()),
          const SizedBox(height: 18),
          FilledButton.icon(
              onPressed: busy ? null : _login,
              icon: const Icon(Icons.lock_open_rounded),
              label: Text(busy ? 'Signing in…' : 'Sign in securely')),
          if (message != null)
            Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Text(message!,
                    style: const TextStyle(color: Colors.redAccent))),
        ],
      );

  Widget _console() {
    final data = snapshot;
    if (data == null) return const Center(child: CircularProgressIndicator());
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        if (busy) const LinearProgressIndicator(minHeight: 3),
        if (message != null)
          Container(
              margin: const EdgeInsets.only(top: 10),
              padding: const EdgeInsets.all(12),
              color: _card,
              child: Text(message!)),
        const SizedBox(height: 12),
        Text('Your auctions',
            style: Theme.of(context).textTheme.headlineMedium),
        const Text('Create a room or open one to run it.',
            style: TextStyle(color: _muted)),
        const SizedBox(height: 14),
        FilledButton.icon(
          onPressed: busy ? null : _createPhfAuction,
          icon: const Icon(Icons.add_circle_outline_rounded),
          label: const Text('Create PHF auction'),
        ),
        const Padding(
          padding: EdgeInsets.only(top: 8),
          child: Text(
              'Uses the configured PHF player pool, six teams and official bidding rules. Every room has isolated live bids and can run concurrently.',
              style: TextStyle(color: _muted, fontSize: 12)),
        ),
        const SizedBox(height: 14),
        Text('Auction rooms', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        for (final room in auctions.where((item) => !item.archived))
          Card(
              child: Column(children: [
            ListTile(
              onTap: busy ? null : () => _openRoom(room.id),
              leading: const CircleAvatar(
                  backgroundColor: _ink,
                  child: Icon(Icons.gavel_rounded, color: _gold)),
              title: Text(room.name),
              subtitle: Text(
                  '${room.kind} · ${room.status} · ${room.playerCount} players'),
              trailing: const Icon(Icons.chevron_right_rounded, color: _gold),
            ),
            const Divider(height: 1),
            Padding(
                padding: const EdgeInsets.fromLTRB(10, 4, 10, 7),
                child: Row(children: [
                  Expanded(
                      child: TextButton.icon(
                          onPressed: () => _copyLink('Live dashboard link',
                              widget.api.projectorUrl(room.id)),
                          icon: const Icon(Icons.live_tv_rounded, size: 18),
                          label: const Text('Live link'))),
                  Expanded(
                      child: TextButton.icon(
                          onPressed: () => _copyLink(
                              'Results link', widget.api.resultsUrl(room.id)),
                          icon:
                              const Icon(Icons.emoji_events_rounded, size: 18),
                          label: const Text('Results link'))),
                ]))
          ])),
      ],
    );
  }
}

class AuctionRoomPage extends StatefulWidget {
  const AuctionRoomPage(
      {super.key, required this.api, required this.auctionId});
  final AuctionApi api;
  final String auctionId;

  @override
  State<AuctionRoomPage> createState() => _AuctionRoomPageState();
}

class _AuctionRoomPageState extends State<AuctionRoomPage> {
  AuctionSnapshot? data;
  AuctionLiveFeed? liveFeed;
  StreamSubscription<AuctionSnapshot>? liveSubscription;
  bool busy = true;
  String? message;

  @override
  void initState() {
    super.initState();
    _startLiveFeed();
  }

  Future<void> _startLiveFeed() async {
    final feed = AuctionLiveFeed(api: widget.api, auctionId: widget.auctionId);
    liveFeed = feed;
    liveSubscription = feed.snapshots.listen((value) {
      if (!mounted || !identical(liveFeed, feed)) return;
      setState(() {
        data = value;
        message = null;
        busy = false;
      });
    }, onError: (Object error) {
      if (!mounted || !identical(liveFeed, feed)) return;
      setState(() {
        message = error is AuctionApiException
            ? error.message
            : 'Live auction updates are temporarily unavailable.';
        busy = false;
      });
    });
    feed.start();
  }

  @override
  void dispose() {
    liveSubscription?.cancel();
    final feed = liveFeed;
    if (feed != null) unawaited(feed.dispose());
    super.dispose();
  }

  Future<void> _reload() async {
    try {
      final value = await widget.api.load(auctionId: widget.auctionId);
      if (mounted) {
        setState(() {
          data = value;
          message = null;
        });
      }
    } on AuctionApiException catch (error) {
      if (mounted) setState(() => message = error.message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _action(String name,
      [Map<String, dynamic> args = const {}]) async {
    if (busy) return;
    setState(() {
      busy = true;
      message = null;
    });
    try {
      await widget.api.action(name, args, widget.auctionId);
      await _reload();
    } on AuctionApiException catch (error) {
      if (mounted) setState(() => message = error.message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<bool> _confirm(String title, String detail) async =>
      await showDialog<bool>(
        context: context,
        builder: (_) =>
            AlertDialog(title: Text(title), content: Text(detail), actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Confirm')),
        ]),
      ) ??
      false;

  @override
  Widget build(BuildContext context) {
    final state = data;
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: Text(state?.auction?.name ?? 'Auction room',
            overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
              onPressed: busy ? null : _reload,
              icon: const Icon(Icons.refresh_rounded))
        ],
      ),
      body: SafeArea(
          child: state == null
              ? Center(
                  child: message == null
                      ? const CircularProgressIndicator()
                      : Text(message!, textAlign: TextAlign.center))
              : _desk(state)),
    );
  }

  Widget _desk(AuctionSnapshot state) {
    final config = state.config;
    final current = state.currentPlayer;
    final leader = state.teamById(current?.currentBidTeamId);
    final next = _nextBid(current, config);
    final queued = state.players.where((p) => p.status == 'queued').length;
    return LayoutBuilder(
        builder: (context, box) => SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 18),
              child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: box.maxHeight - 26),
                  child: Column(children: [
                    if (busy) const LinearProgressIndicator(minHeight: 3),
                    if (message != null)
                      Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          color: const Color(0xFF5A2929),
                          child: Text(message!)),
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                          color: _ink,
                          border: Border.all(color: const Color(0xFF36505D))),
                      child: Row(children: [
                        const Icon(Icons.connected_tv_rounded,
                            color: _gold, size: 20),
                        const SizedBox(width: 9),
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              const Text('LIVE DASHBOARD LINK',
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: _muted,
                                      fontWeight: FontWeight.w700)),
                              SelectableText(
                                  widget.api.projectorUrl(widget.auctionId),
                                  maxLines: 1,
                                  style: const TextStyle(
                                      fontSize: 12,
                                      color: _gold,
                                      fontWeight: FontWeight.w800))
                            ])),
                        IconButton(
                            tooltip: 'Copy live dashboard link',
                            onPressed: () async {
                              await Clipboard.setData(ClipboardData(
                                  text: widget.api
                                      .projectorUrl(widget.auctionId)));
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content:
                                          Text('Live dashboard link copied.')));
                            },
                            icon: const Icon(Icons.copy_rounded))
                      ]),
                    ),
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                          color: _ink,
                          border: Border.all(color: const Color(0xFF36505D))),
                      child: Row(children: [
                        const Icon(Icons.emoji_events_rounded,
                            color: _gold, size: 20),
                        const SizedBox(width: 9),
                        const Expanded(
                            child: Text('PERMANENT RESULTS & SQUADS LINK',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: _muted,
                                    fontWeight: FontWeight.w700))),
                        IconButton(
                            tooltip: 'Copy results link',
                            onPressed: () async {
                              await Clipboard.setData(ClipboardData(
                                  text:
                                      widget.api.resultsUrl(widget.auctionId)));
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text('Results link copied.')));
                            },
                            icon: const Icon(Icons.copy_rounded))
                      ]),
                    ),
                    Row(children: [
                      _statusPill(config?.status ?? 'loading'),
                      const SizedBox(width: 8),
                      Expanded(
                          child: Text('$queued players waiting',
                              style: const TextStyle(color: _muted))),
                      if (config?.status == 'preparing')
                        FilledButton(
                            onPressed: busy
                                ? null
                                : () => _action(
                                    'auction_set_status', {'p_status': 'live'}),
                            child: const Text('Start')),
                      if (config?.status == 'live')
                        OutlinedButton(
                            onPressed: busy
                                ? null
                                : () => _action('auction_set_status',
                                    {'p_status': 'paused'}),
                            child: const Text('Pause')),
                      if (config?.status == 'paused')
                        FilledButton(
                            onPressed: busy
                                ? null
                                : () => _action(
                                    'auction_set_status', {'p_status': 'live'}),
                            child: const Text('Resume')),
                    ]),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                          color: _card,
                          border: Border.all(
                              color: current == null
                                  ? const Color(0xFF35505D)
                                  : _gold)),
                      child: current == null
                          ? Row(children: [
                              const Expanded(
                                  child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                    Text('Ready for the next player',
                                        style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.w900)),
                                    Text(
                                        'Players follow the configured role rounds.',
                                        style: TextStyle(
                                            color: _muted, fontSize: 12))
                                  ])),
                              FilledButton.icon(
                                  onPressed: busy ||
                                          config?.status != 'live' ||
                                          queued == 0
                                      ? null
                                      : () => _action(
                                          'auction_start_random_player'),
                                  icon: const Icon(Icons.casino_rounded),
                                  label: const Text('Call next')),
                            ])
                          : Row(children: [
                              if (current.photo != null)
                                ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: Image.network(
                                        widget.api.imageUrl(current.photo!)!,
                                        width: 62,
                                        height: 72,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) =>
                                            _initials(current.name)))
                              else
                                _initials(current.name),
                              const SizedBox(width: 10),
                              Expanded(
                                  child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                    Text(current.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.w900)),
                                    Text(current.role,
                                        style: const TextStyle(color: _muted)),
                                    Text('Leading: ${leader?.name ?? 'No bid'}',
                                        style: const TextStyle(
                                            color: _gold,
                                            fontWeight: FontWeight.w800))
                                  ])),
                              Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    const Text('CURRENT / NEXT',
                                        style: TextStyle(
                                            color: _muted, fontSize: 10)),
                                    Text(
                                        '${_money(current.currentBid == 0 ? current.basePrice : current.currentBid, state)}  ›  ${_money(next, state)}',
                                        style: const TextStyle(
                                            color: _gold,
                                            fontSize: 18,
                                            fontWeight: FontWeight.w900))
                                  ]),
                            ]),
                    ),
                    const SizedBox(height: 8),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: state.teams.length,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 2.35,
                              crossAxisSpacing: 7,
                              mainAxisSpacing: 7),
                      itemBuilder: (_, index) {
                        final team = state.teams[index];
                        final captain = _captainName(team, state);
                        final leading = team.id == current?.currentBidTeamId;
                        final enabled = current != null &&
                            !busy &&
                            config?.status == 'live' &&
                            next <= _maxBid(team, state);
                        return Material(
                            color: leading ? const Color(0xFF23585A) : _card,
                            child: InkWell(
                                onTap: enabled
                                    ? () => _action('auction_place_bid', {
                                          'p_team_id': team.id,
                                          'p_amount': next
                                        })
                                    : null,
                                child: Container(
                                    padding: const EdgeInsets.all(9),
                                    decoration: BoxDecoration(
                                        border: Border.all(
                                            color: leading
                                                ? _gold
                                                : const Color(0xFF36505D))),
                                    child: Row(children: [
                                      CircleAvatar(
                                          radius: 17,
                                          backgroundColor: _ink,
                                          child: Text(_abbr(team.name),
                                              style: const TextStyle(
                                                  color: _gold,
                                                  fontSize: 11,
                                                  fontWeight:
                                                      FontWeight.w900))),
                                      const SizedBox(width: 8),
                                      Expanded(
                                          child: Column(
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                            Text(team.name,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                    fontWeight:
                                                        FontWeight.w900)),
                                            Text('Captain · $captain',
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                    color: _gold,
                                                    fontSize: 10,
                                                    fontWeight:
                                                        FontWeight.w700)),
                                            Text(
                                                'Max ${_money(_maxBid(team, state), state)}',
                                                style: const TextStyle(
                                                    color: _muted,
                                                    fontSize: 11))
                                          ])),
                                      Icon(
                                          leading
                                              ? Icons.gavel_rounded
                                              : Icons
                                                  .add_circle_outline_rounded,
                                          color: enabled || leading
                                              ? _gold
                                              : _muted,
                                          size: 20),
                                    ]))));
                      },
                    ),
                    const SizedBox(height: 9),
                    if (current != null) ...[
                      SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            style: FilledButton.styleFrom(
                                backgroundColor: _gold,
                                foregroundColor: _ink,
                                minimumSize: const Size.fromHeight(48)),
                            onPressed: busy || current.currentBidTeamId == null
                                ? null
                                : () async {
                                    if (await _confirm('Sell ${current.name}?',
                                        '${leader?.name} for ${_money(current.currentBid, state)}')) {
                                      await _action('auction_sell_current');
                                    }
                                  },
                            icon: const Icon(Icons.gavel_rounded),
                            label: Text(leader == null
                                ? 'Select a bidding team'
                                : 'Sold to ${leader.name}'),
                          )),
                      const SizedBox(height: 7),
                      Row(children: [
                        Expanded(
                            child: OutlinedButton(
                                onPressed: busy || current.currentBid == 0
                                    ? null
                                    : () => _action('auction_undo_last_bid'),
                                child: const Text('Undo last bid'))),
                        const SizedBox(width: 7),
                        Expanded(
                            child: OutlinedButton(
                                onPressed: busy
                                    ? null
                                    : () async {
                                        if (await _confirm(
                                            'Mark unsold?', current.name)) {
                                          await _action('auction_mark_unsold');
                                        }
                                      },
                                child: const Text('Unsold'))),
                      ]),
                    ],
                  ])),
            ));
  }

  Widget _statusPill(String status) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      color:
          status == 'live' ? const Color(0xFF176B50) : const Color(0xFF273B47),
      child: Text(status.toUpperCase(),
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)));
  Widget _initials(String name) => Container(
      width: 62,
      height: 72,
      color: _ink,
      alignment: Alignment.center,
      child: Text(_abbr(name),
          style: const TextStyle(color: _gold, fontWeight: FontWeight.w900)));
  String _abbr(String name) => name
      .split(' ')
      .where((e) => e.isNotEmpty)
      .map((e) => e[0])
      .take(2)
      .join()
      .toUpperCase();
}

double _nextBid(AuctionPlayer? player, AuctionConfig? config) {
  if (player == null || config == null) return 0;
  if (player.currentBid <= 0) {
    return player.basePrice > 0 ? player.basePrice : config.defaultBasePrice;
  }
  final step = player.currentBid >= config.incrementThreshold
      ? config.incrementAboveThreshold
      : config.minimumIncrement;
  return ((player.currentBid + step) * 100).round() / 100;
}

int _squadSize(AuctionTeam team, AuctionSnapshot data) => data.players
    .where((player) =>
        player.teamId == team.id &&
        (player.status == 'captain' || player.status == 'sold'))
    .length;

double _maxBid(AuctionTeam team, AuctionSnapshot data) {
  final config = data.config;
  if (config == null) return 0;
  final reserveSlots = (config.maxSquadSize - _squadSize(team, data) - 1)
      .clamp(0, config.maxSquadSize);
  return (team.remaining - reserveSlots * config.defaultBasePrice)
      .clamp(0, team.remaining)
      .toDouble();
}

String _money(double value, AuctionSnapshot data) =>
    '${value.toStringAsFixed(value == value.roundToDouble() ? 0 : 2)} ${data.config?.moneyLabel ?? 'CR'}';

String _captainName(AuctionTeam team, AuctionSnapshot data) {
  for (final player in data.players) {
    if (player.teamId == team.id && player.status == 'captain') {
      return player.name;
    }
  }
  return 'Not assigned';
}
