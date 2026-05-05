function formatOvers(balls) {
  return `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
}

export default function PlayerStats({ matchHistory }) {
  const groupedByDate = {};

  matchHistory.forEach((match) => {
    const date = match.date || "Unknown date";

    if (!groupedByDate[date]) {
      groupedByDate[date] = {};
    }

    const players =
      match.teamAPlayers || match.teamBPlayers
        ? [...(match.teamAPlayers || []), ...(match.teamBPlayers || [])]
        : [
            ...(match.firstInnings?.players || []),
            ...(match.secondInnings?.players || []),
          ];

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

      groupedByDate[date][player.name].runs += player.runs || 0;
      groupedByDate[date][player.name].balls += player.balls || 0;
      groupedByDate[date][player.name].fours += player.fours || 0;
      groupedByDate[date][player.name].sixes += player.sixes || 0;
      groupedByDate[date][player.name].ballsBowled += player.ballsBowled || 0;
      groupedByDate[date][player.name].runsConceded += player.runsConceded || 0;
      groupedByDate[date][player.name].wicketsTaken += player.wicketsTaken || 0;
      groupedByDate[date][player.name].matches += 1;
    });
  });

  const dateGroups = Object.entries(groupedByDate).sort(
    ([a], [b]) => new Date(b) - new Date(a)
  );

  return (
    <div className="bg-slate-900 p-6 rounded-3xl">
      <h2 className="text-3xl font-black mb-6">Player Stats by Date</h2>

      {dateGroups.length === 0 ? (
        <p className="text-slate-400">No stats yet. Save matches first.</p>
      ) : (
        <div className="space-y-8">
          {dateGroups.map(([date, playersObj]) => {
            const players = Object.values(playersObj).sort(
              (a, b) => b.runs - a.runs
            );

            return (
              <div key={date} className="bg-slate-800 p-5 rounded-2xl">
                <h3 className="text-2xl font-black mb-2">{date}</h3>
                <p className="text-slate-300 mb-4">
                  On this date, the following players performed as below:
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-300 border-b border-slate-700">
                        <th className="p-3">Player</th>
                        <th className="p-3">Matches</th>
                        <th className="p-3">Runs</th>
                        <th className="p-3">Balls</th>
                        <th className="p-3">4s</th>
                        <th className="p-3">6s</th>
                        <th className="p-3">SR</th>
                        <th className="p-3">Overs</th>
                        <th className="p-3">Runs Given</th>
                        <th className="p-3">Wkts</th>
                      </tr>
                    </thead>

                    <tbody>
                      {players.map((player) => (
                        <tr
                          key={player.name}
                          className="border-b border-slate-700"
                        >
                          <td className="p-3 font-bold">{player.name}</td>
                          <td className="p-3">{player.matches}</td>
                          <td className="p-3">{player.runs}</td>
                          <td className="p-3">{player.balls}</td>
                          <td className="p-3">{player.fours}</td>
                          <td className="p-3">{player.sixes}</td>
                          <td className="p-3">
                            {player.balls > 0
                              ? ((player.runs / player.balls) * 100).toFixed(2)
                              : "0.00"}
                          </td>
                          <td className="p-3">
                            {formatOvers(player.ballsBowled)}
                          </td>
                          <td className="p-3">{player.runsConceded}</td>
                          <td className="p-3">{player.wicketsTaken}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}