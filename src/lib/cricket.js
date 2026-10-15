// Pure scoring helpers, kept out of the components so they can be tested.

export function createPlayer(name, type = "regular") {
  return {
    id: crypto.randomUUID(),
    name,
    type,

    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    out: false,

    ballsBowled: 0,
    runsConceded: 0,
    wicketsTaken: 0,
  };
}

export function resetPlayerStats(players) {
  return players.map((player) => ({
    ...player,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    out: false,
    ballsBowled: 0,
    runsConceded: 0,
    wicketsTaken: 0,
  }));
}

/** Balls as overs in cricket notation: 14 balls is "2.2". */
export function formatOvers(balls) {
  return `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
}

/** Wides and no-balls do not count towards the over. */
export function isExtraBall(item) {
  return item === "WD" || item === "NB";
}

export function isEndOfOver(legalBalls) {
  return legalBalls > 0 && legalBalls % 6 === 0;
}

/** Runs per 100 balls faced, as shown on the scorecard. */
export function strikeRate(runs, balls) {
  return balls > 0 ? ((runs / balls) * 100).toFixed(2) : "0.00";
}

/**
 * Why an innings is over, if it is. With "last man standing" the last batter
 * may bat alone, so the side is all out only when every player is out.
 */
export function inningsEnd({
  wickets,
  balls,
  score,
  playerCount,
  lastManStanding,
  maxBalls,
  inningsNumber,
  target,
}) {
  const allOut = lastManStanding ? wickets >= playerCount : wickets >= playerCount - 1;
  const oversFinished = balls >= maxBalls;
  const targetReached = inningsNumber === 2 && score >= target;
  return { allOut, oversFinished, targetReached, over: allOut || oversFinished || targetReached };
}

/** Adds up each player's figures per match day from the saved matches. */
export function statsByDate(matchHistory) {
  const groupedByDate = {};

  matchHistory.forEach((match) => {
    const date = match.date || "Unknown date";
    if (!groupedByDate[date]) groupedByDate[date] = {};

    const players =
      match.teamAPlayers || match.teamBPlayers
        ? [...(match.teamAPlayers || []), ...(match.teamBPlayers || [])]
        : [...(match.firstInnings?.players || []), ...(match.secondInnings?.players || [])];

    players.forEach((player) => {
      if (!groupedByDate[date][player.name]) {
        groupedByDate[date][player.name] = {
          name: player.name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          ballsBowled: 0,
          runsConceded: 0,
          wicketsTaken: 0,
          matches: 0,
        };
      }

      const s = groupedByDate[date][player.name];
      s.runs += player.runs || 0;
      s.balls += player.balls || 0;
      s.fours += player.fours || 0;
      s.sixes += player.sixes || 0;
      s.ballsBowled += player.ballsBowled || 0;
      s.runsConceded += player.runsConceded || 0;
      s.wicketsTaken += player.wicketsTaken || 0;
      s.matches += 1;
    });
  });

  return Object.entries(groupedByDate)
    .sort(([a], [b]) => new Date(b) - new Date(a))
    .map(([date, players]) => [date, Object.values(players).sort((a, b) => b.runs - a.runs)]);
}
