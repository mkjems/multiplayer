# Sprint 22 Protocol And Interpolation Notes

## Smaller Recurring Protocol

Sprint 22 split player data into:

- `PlayerInfo`: stable identity data (`id`, `name`, `color`)
- `PlayerStateSnapshot`: frequently changing state (`x`, `y`, health, ammo,
  energy, facing, reloading, alive, kills)

The server now sends player identity through `player_joined` events and sends
only player state in the recurring `game_state` snapshot.

This keeps the protocol strongly typed while reducing repeated metadata in the
20 Hz payload.

## Event And Snapshot Mix

Current split:

- `arena`: initial/static arena data
- `player_joined`: stable player identity
- `player_left`: player removal
- `cactus_damaged`: one-off cactus segment damage
- `game_state`: recurring player state and bullet state
- `game_over`: terminal room event

This is a good middle ground: snapshots still recover moving state, while events
avoid resending static or one-off data every tick.

## Interpolation Spike

Do not add interpolation yet.

The current server snapshot rate is still 20 Hz, and the client already renders
at 60 Hz. Interpolation becomes more valuable if we lower snapshot rate, add
sequence numbers/server timestamps, or see visible jitter during real play.

Recommended next step before interpolation:

- Add `sequence` and `serverTimeMilliseconds` to `game_state`.
- Record skipped snapshot counts from diagnostics during real sessions.
- Only then test remote-player interpolation between buffered snapshots.

Local prediction is not recommended yet. Remote interpolation is the likely
first step because it improves smoothness without risking server/client
disagreement for the local player.
