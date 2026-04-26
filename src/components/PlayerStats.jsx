export default function PlayerStats({ matchHistory }) {
  const stats = {};

  matchHistory.forEach((match) => {
    const inningsList = [match.firstInnings, match.secondInnings];

    inningsList.forEach((innings) => {
      innings?.players?.forEach((player) => {
        if (!stats[player.name]) {
          stats[player.name] = {
            name: player.name,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            matches: 0,
          };
        }

        stats[player.name].runs += player.runs || 0;
        stats[player.name].balls += player.balls || 0;
        stats[player.name].fours += player.fours || 0;
        stats[player.name].sixes += player.sixes || 0;
        stats[player.name].matches += 1;
      });
    });
  });

  const players = Object.values(stats).sort((a, b) => b.runs - a.runs);

  return (
    <div className="bg-slate-900 p-6 rounded-3xl">
      <h2 className="text-3xl font-black mb-6">Player Stats</h2>

      {players.length === 0 ? (
        <p className="text-slate-400">No stats yet. Save matches first.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-300 border-b border-slate-700">
                <th className="p-3">Player</th>
                <th className="p-3">Runs</th>
                <th className="p-3">Balls</th>
                <th className="p-3">4s</th>
                <th className="p-3">6s</th>
                <th className="p-3">SR</th>
              </tr>
            </thead>

            <tbody>
              {players.map((player) => (
                <tr key={player.name} className="border-b border-slate-800">
                  <td className="p-3 font-bold">{player.name}</td>
                  <td className="p-3">{player.runs}</td>
                  <td className="p-3">{player.balls}</td>
                  <td className="p-3">{player.fours}</td>
                  <td className="p-3">{player.sixes}</td>
                  <td className="p-3">
                    {player.balls > 0
                      ? ((player.runs / player.balls) * 100).toFixed(2)
                      : "0.00"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}