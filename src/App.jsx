import { useEffect, useMemo, useState } from "react";
import "./index.css";

const STORAGE_KEY = "celle-strikers-v2";

function createPlayer(name) {
  return {
    id: crypto.randomUUID(),
    name,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    out: false,
  };
}

function resetPlayerStats(players) {
  return players.map((player) => ({
    ...player,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    out: false,
  }));
}

function formatOvers(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export default function App() {
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");

  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);

  const [teamAInput, setTeamAInput] = useState("");
  const [teamBInput, setTeamBInput] = useState("");

  const [matchOvers, setMatchOvers] = useState(6);
  const [tossWinner, setTossWinner] = useState("A");
  const [tossDecision, setTossDecision] = useState("bat");

  const [lastManStanding, setLastManStanding] = useState(true);
  const [matchStarted, setMatchStarted] = useState(false);
  const [matchFinished, setMatchFinished] = useState(false);

  const [inningsNumber, setInningsNumber] = useState(1);
  const [battingTeam, setBattingTeam] = useState("A");

  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [balls, setBalls] = useState(0);
  const [extras, setExtras] = useState(0);

  const [firstInnings, setFirstInnings] = useState(null);
  const [result, setResult] = useState("");

  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [timeline, setTimeline] = useState([]);
  const [ballHistory, setBallHistory] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const data = JSON.parse(saved);
      setTeamAName(data.teamAName || "Team A");
      setTeamBName(data.teamBName || "Team B");
      setTeamAPlayers(data.teamAPlayers || []);
      setTeamBPlayers(data.teamBPlayers || []);
      setMatchOvers(data.matchOvers || 6);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        teamAName,
        teamBName,
        teamAPlayers,
        teamBPlayers,
        matchOvers,
      })
    );
  }, [teamAName, teamBName, teamAPlayers, teamBPlayers, matchOvers]);

  const currentPlayers = battingTeam === "A" ? teamAPlayers : teamBPlayers;
  const currentTeamName = battingTeam === "A" ? teamAName : teamBName;
  const bowlingTeamName = battingTeam === "A" ? teamBName : teamAName;
  const maxBalls = Number(matchOvers) * 6;

  const target = firstInnings ? firstInnings.score + 1 : null;

  const selectedStriker = useMemo(
    () => currentPlayers.find((player) => player.id === strikerId),
    [currentPlayers, strikerId]
  );

  const selectedNonStriker = useMemo(
    () => currentPlayers.find((player) => player.id === nonStrikerId),
    [currentPlayers, nonStrikerId]
  );

  function addPlayerToTeam(team) {
    if (team === "A") {
      if (!teamAInput.trim()) return;
      setTeamAPlayers([...teamAPlayers, createPlayer(teamAInput.trim())]);
      setTeamAInput("");
    }

    if (team === "B") {
      if (!teamBInput.trim()) return;
      setTeamBPlayers([...teamBPlayers, createPlayer(teamBInput.trim())]);
      setTeamBInput("");
    }
  }

  function removePlayer(team, id) {
    if (team === "A") {
      setTeamAPlayers(teamAPlayers.filter((player) => player.id !== id));
    } else {
      setTeamBPlayers(teamBPlayers.filter((player) => player.id !== id));
    }
  }

  function startMatch() {
    if (teamAPlayers.length < 2 || teamBPlayers.length < 2) {
      alert("Please add at least 2 players in each team.");
      return;
    }

    const tossLoser = tossWinner === "A" ? "B" : "A";
    const firstBattingTeam = tossDecision === "bat" ? tossWinner : tossLoser;
    const firstBattingPlayers = firstBattingTeam === "A" ? teamAPlayers : teamBPlayers;

    setTeamAPlayers(resetPlayerStats(teamAPlayers));
    setTeamBPlayers(resetPlayerStats(teamBPlayers));

    setMatchStarted(true);
    setMatchFinished(false);
    setInningsNumber(1);
    setBattingTeam(firstBattingTeam);

    setScore(0);
    setWickets(0);
    setBalls(0);
    setExtras(0);
    setTimeline([]);
    setFirstInnings(null);
    setResult("");

    setStrikerId(firstBattingPlayers[0].id);
    setNonStrikerId(firstBattingPlayers[1].id);
  }

  function updateCurrentPlayers(updatedPlayers) {
    if (battingTeam === "A") {
      setTeamAPlayers(updatedPlayers);
    } else {
      setTeamBPlayers(updatedPlayers);
    }
  }

  function updateStriker(run, isLegalBall) {
    const updated = currentPlayers.map((player) => {
      if (player.id !== strikerId) return player;

      return {
        ...player,
        runs: player.runs + run,
        balls: player.balls + (isLegalBall ? 1 : 0),
        fours: player.fours + (run === 4 ? 1 : 0),
        sixes: player.sixes + (run === 6 ? 1 : 0),
      };
    });

    updateCurrentPlayers(updated);
  }

  function changeStrike() {
    const oldStriker = strikerId;
    setStrikerId(nonStrikerId);
    setNonStrikerId(oldStriker);
  }

function checkInningsEnd(newScore, newWickets, newBalls, updatedPlayers = currentPlayers) {
  const allOut = lastManStanding ? newWickets >= currentPlayers.length : newWickets >= currentPlayers.length - 1;
  const oversFinished = newBalls >= maxBalls;
  const targetReached = inningsNumber === 2 && newScore >= target;

  if (inningsNumber === 1 && (allOut || oversFinished)) {
    setTimeout(() => {
      endFirstInnings(newScore, newWickets, newBalls, updatedPlayers);
    }, 200);
  }

  if (inningsNumber === 2 && (allOut || oversFinished || targetReached)) {
    setTimeout(() => {
      finishMatch(newScore, newWickets);
    }, 200);
  }
}
 
  function isEndOfOver(newBalls) {
  return newBalls > 0 && newBalls % 6 === 0;
}

function addRuns(run) {
  const newScore = score + run;
  const newBalls = balls + 1;

  setScore(newScore);
  setBalls(newBalls);
  setTimeline([...timeline, run]);

  setBallHistory([
    ...ballHistory,
    {
      type: "RUN",
      value: run,
      batsmanId: strikerId,
      legalBall: true,
      overBall: formatOvers(newBalls),
    },
  ]);

  updateStriker(run, true);

  const oddRun = run === 1 || run === 3;
  const overFinished = isEndOfOver(newBalls);

  if (oddRun !== overFinished) {
    changeStrike();
  }

  checkInningsEnd(newScore, wickets, newBalls);
}

function addWide() {
  const newScore = score + 1;

  setScore(newScore);
  setExtras(extras + 1);
  setTimeline([...timeline, "WD"]);

  setBallHistory([
    ...ballHistory,
    {
      type: "WIDE",
      value: 1,
      batsmanId: null,
      legalBall: false,
      overBall: formatOvers(balls),
    },
  ]);

  checkInningsEnd(newScore, wickets, balls);
}

function addNoBall() {
  const newScore = score + 1;

  setScore(newScore);
  setExtras(extras + 1);
  setTimeline([...timeline, "NB"]);

  setBallHistory([
    ...ballHistory,
    {
      type: "NO_BALL",
      value: 1,
      batsmanId: null,
      legalBall: false,
      overBall: formatOvers(balls),
    },
  ]);

  checkInningsEnd(newScore, wickets, balls);
}

function addWicket() {
  const newWickets = wickets + 1;
  const newBalls = balls + 1;

  const updated = currentPlayers.map((player) => {
    if (player.id !== strikerId) return player;

    return {
      ...player,
      balls: player.balls + 1,
      out: true,
    };
  });

  updateCurrentPlayers(updated);

  const nextPlayer = updated.find(
    (player) =>
      !player.out &&
      player.id !== strikerId &&
      player.id !== nonStrikerId
  );

  setWickets(newWickets);
  setBalls(newBalls);
  setTimeline([...timeline, "W"]);

  setBallHistory([
    ...ballHistory,
    {
      type: "WICKET",
      value: "W",
      batsmanId: strikerId,
      legalBall: true,
      overBall: formatOvers(newBalls),
    },
  ]);

  const overFinished = isEndOfOver(newBalls);

  if (nextPlayer) {
    if (overFinished) {
      setStrikerId(nonStrikerId);
      setNonStrikerId(nextPlayer.id);
    } else {
      setStrikerId(nextPlayer.id);
    }
  }

checkInningsEnd(score, newWickets, newBalls, updated);
}

        function undoLastBall() {
  if (timeline.length === 0) {
    alert("No ball to undo.");
    return;
  }

  const last = timeline[timeline.length - 1];

  setTimeline(timeline.slice(0, -1));

  if (last === "WD" || last === "NB") {
    setScore(score - 1);
    setExtras(extras - 1);
    return;
  }

  if (last === "W") {
    setWickets(wickets - 1);
    setBalls(balls - 1);
    return;
  }

  setScore(score - last);
  setBalls(balls - 1);

  const updatedPlayers = currentPlayers.map((player) => {
    if (player.id !== strikerId) return player;

    return {
      ...player,
      runs: Math.max(0, player.runs - last),
      balls: Math.max(0, player.balls - 1),
      fours: last === 4 ? Math.max(0, player.fours - 1) : player.fours,
      sixes: last === 6 ? Math.max(0, player.sixes - 1) : player.sixes,
    };
  });

  updateCurrentPlayers(updatedPlayers);
}

function endFirstInnings(
  finalScore = score,
  finalWickets = wickets,
  finalBalls = balls,
  finalPlayers = currentPlayers
) {
  setFirstInnings({
    team: battingTeam,
    teamName: currentTeamName,
    score: finalScore,
    wickets: finalWickets,
    balls: finalBalls,
    extras,
    players: finalPlayers,
    ballHistory,
  });

  const secondTeam = battingTeam === "A" ? "B" : "A";
  const secondPlayers = secondTeam === "A" ? teamAPlayers : teamBPlayers;

  setInningsNumber(2);
  setBattingTeam(secondTeam);

  setScore(0);
  setWickets(0);
  setBalls(0);
  setExtras(0);
  setTimeline([]);
  setBallHistory([]);

  setStrikerId(secondPlayers[0]?.id || "");
  setNonStrikerId(secondPlayers[1]?.id || "");
}

  function finishMatch(finalScore, finalWickets) {
    const chasingTeamName = currentTeamName;

    if (finalScore >= target) {
      const wicketsLeft = currentPlayers.length - 1 - finalWickets;
      setResult(`${chasingTeamName} won by ${wicketsLeft} wickets`);
    } else if (finalScore === firstInnings.score) {
      setResult("Match tied");
    } else {
      const runsWonBy = firstInnings.score - finalScore;
      setResult(`${firstInnings.teamName} won by ${runsWonBy} runs`);
    }

    setMatchFinished(true);
  }

  function resetMatchOnly() {
    setMatchStarted(false);
    setMatchFinished(false);
    setInningsNumber(1);
    setBattingTeam("A");
    setScore(0);
    setWickets(0);
    setBalls(0);
    setExtras(0);
    setFirstInnings(null);
    setResult("");
    setStrikerId("");
    setNonStrikerId("");
    setTimeline([]);
    setBallHistory([]);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 bg-gradient-to-r from-green-600 to-slate-900 p-6 rounded-3xl shadow-xl">
          <h1 className="text-4xl md:text-6xl font-black">Celle Strikers</h1>
          <p className="text-green-100 mt-2">Sunday Cricket Scorebook</p>
        </header>

        {!matchStarted && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <TeamBox
                teamName={teamAName}
                setTeamName={setTeamAName}
                input={teamAInput}
                setInput={setTeamAInput}
                players={teamAPlayers}
                addPlayer={() => addPlayerToTeam("A")}
                removePlayer={(id) => removePlayer("A", id)}
                color="green"
              />

              <TeamBox
                teamName={teamBName}
                setTeamName={setTeamBName}
                input={teamBInput}
                setInput={setTeamBInput}
                players={teamBPlayers}
                addPlayer={() => addPlayerToTeam("B")}
                removePlayer={(id) => removePlayer("B", id)}
                color="blue"
              />
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl">
              <h2 className="text-2xl font-bold mb-4">Match Setup</h2>

              <label className="flex items-center gap-3 mt-4 bg-slate-800 p-4 rounded-xl">
              <input
                type="checkbox"
                checked={lastManStanding}
                onChange={(e) => setLastManStanding(e.target.checked)}/>
              <span>Allow Last Man Standing</span>
            </label>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-2 text-slate-300">Overs</label>
                  <input
                    type="number"
                    min="1"
                    value={matchOvers}
                    onChange={(e) => setMatchOvers(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-slate-300">Toss Winner</label>
                  <select
                    value={tossWinner}
                    onChange={(e) => setTossWinner(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
                  >
                    <option value="A">{teamAName}</option>
                    <option value="B">{teamBName}</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-slate-300">Decision</label>
                  <select
                    value={tossDecision}
                    onChange={(e) => setTossDecision(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
                  >
                    <option value="bat">Bat first</option>
                    <option value="bowl">Bowl first</option>
                  </select>
                </div>
              </div>

              <button
                onClick={startMatch}
                className="mt-6 w-full bg-green-500 hover:bg-green-600 p-5 rounded-2xl text-xl font-black"
              >
                Start Match
              </button>
            </div>
          </div>
        )}

        {matchStarted && !matchFinished && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 p-6 rounded-3xl">
              <p className="text-green-400">Innings {inningsNumber}</p>
              <h2 className="text-3xl font-black mb-1">{currentTeamName}</h2>
              <p className="text-slate-400 mb-4">Bowling: {bowlingTeamName}</p>

              {inningsNumber === 2 && (
                <p className="mb-4 bg-yellow-500 text-black p-3 rounded-xl font-bold">
                  Target: {target}
                </p>
              )}

              <div className="bg-slate-800 p-6 rounded-3xl mb-6">
                <h3 className="text-6xl font-black">
                  {score}/{wickets}
                </h3>
                <p className="text-slate-300 mt-2">
                  Overs: {formatOvers(balls)} / {matchOvers}
                </p>
                <p className="text-slate-300">Extras: {extras}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block mb-2 text-slate-300">Striker</label>
                  <select
                    value={strikerId}
                    onChange={(e) => setStrikerId(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800"
                  >
                    {currentPlayers
                      .filter((player) => !player.out)
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-slate-300">Non-Striker</label>
                  <select
                    value={nonStrikerId}
                    onChange={(e) => setNonStrikerId(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-800"
                  >
                    {currentPlayers
                      .filter((player) => !player.out)
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="mb-4 bg-slate-800 p-4 rounded-2xl">
                <p>
                  Current pair:{" "}
                  <strong>{selectedStriker?.name || "N/A"}</strong> and{" "}
                  <strong>{selectedNonStriker?.name || "N/A"}</strong>
                </p>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[0, 1, 2, 3, 4, 6].map((run) => (
                  <button
                    key={run}
                    onClick={() => addRuns(run)}
                    className="bg-green-500 hover:bg-green-600 p-6 rounded-2xl text-2xl font-black"
                  >
                    {run}
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-5 gap-3 mt-4">
                <button onClick={addWide} className="bg-yellow-500 text-black p-4 rounded-xl font-bold">
                  Wide
                </button>
                <button onClick={addNoBall} className="bg-orange-500 p-4 rounded-xl font-bold">
                  No Ball
                </button>
                <button onClick={addWicket} className="bg-red-500 p-4 rounded-xl font-bold">
                  Wicket
                </button>
                <button onClick={changeStrike} className="bg-slate-700 p-4 rounded-xl font-bold">
                  Change Strike
                </button>
                <button onClick={undoLastBall} className="bg-slate-700 p-4 rounded-xl font-bold">
                  Undo Last Ball
                </button>
              </div>

              {inningsNumber === 1 && (
                <button
                  onClick={endFirstInnings}
                  className="mt-6 w-full bg-blue-500 p-4 rounded-xl font-bold"
                >
                  End First Innings Manually
                </button>
              )}

              {inningsNumber === 2 && (
                <button
                  onClick={() => finishMatch(score, wickets)}
                  className="mt-6 w-full bg-purple-500 p-4 rounded-xl font-bold"
                >
                  Finish Match Manually
                </button>
              )}
            </div>

            <ScoreCard
              title="Batting Card"
              players={currentPlayers}
              strikerId={strikerId}
              timeline={timeline}
            />
          </div>
        )}

        {matchFinished && (
          <div className="bg-slate-900 p-8 rounded-3xl">
            <h2 className="text-4xl font-black mb-4">Match Result</h2>

            <p className="text-2xl text-green-400 font-bold mb-6">{result}</p>

            <div className="grid md:grid-cols-2 gap-6">
              <SummaryBox
                title={firstInnings.teamName}
                score={firstInnings.score}
                wickets={firstInnings.wickets}
                balls={firstInnings.balls}
                extras={firstInnings.extras}
                players={firstInnings.players}
              />

              <SummaryBox
                title={currentTeamName}
                score={score}
                wickets={wickets}
                balls={balls}
                extras={extras}
                players={currentPlayers}
              />
            </div>

            <button
              onClick={resetMatchOnly}
              className="mt-8 w-full bg-green-500 p-5 rounded-2xl text-xl font-black"
            >
              Start New Match
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamBox({
  teamName,
  setTeamName,
  input,
  setInput,
  players,
  addPlayer,
  removePlayer,
  color,
}) {
  return (
    <div className="bg-slate-900 p-6 rounded-3xl">
      <input
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        className="w-full mb-4 p-3 rounded-xl bg-slate-800 border border-slate-700 text-xl font-bold"
      />

      <div className="flex gap-2 mb-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          placeholder={`Add ${teamName} player`}
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
        />

        <button
          onClick={addPlayer}
          className={`${
            color === "green" ? "bg-green-500" : "bg-blue-500"
          } px-5 rounded-xl font-bold`}
        >
          Add
        </button>
      </div>

      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex justify-between bg-slate-800 p-3 rounded-xl"
          >
            <span>{player.name}</span>
            <button onClick={() => removePlayer(player.id)} className="text-red-400">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreCard({ title, players, strikerId, timeline }) {
  return (
    <div className="bg-slate-900 p-6 rounded-3xl">
      <h3 className="text-2xl font-bold mb-4">{title}</h3>

      <div className="space-y-3">
        {players.map((player) => (
          <div key={player.id} className="bg-slate-800 p-4 rounded-xl">
            <div className="flex justify-between">
              <span>
                {player.name}
                {player.id === strikerId ? " *" : ""}
              </span>
              <strong>
                {player.runs} ({player.balls})
              </strong>
            </div>

            <p className="text-sm text-slate-400">
              4s: {player.fours} | 6s: {player.sixes}
              {player.out ? " | Out" : ""}
            </p>
          </div>
        ))}
      </div>

      <h3 className="text-xl font-bold mt-6 mb-3">Timeline</h3>

      <div className="flex flex-wrap gap-2">
        {timeline.map((item, index) => (
          <span key={index} className="bg-slate-800 px-3 py-2 rounded-lg">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function SummaryBox({ title, score, wickets, balls, extras, players }) {
  return (
    <div className="bg-slate-800 p-6 rounded-3xl">
      <h3 className="text-2xl font-bold mb-2">{title}</h3>

      <p className="text-4xl font-black mb-2">
        {score}/{wickets}
      </p>

      <p className="text-slate-300 mb-4">
        Overs: {formatOvers(balls)} | Extras: {extras}
      </p>

      <div className="space-y-2">
        {players.map((player) => (
          <div key={player.id} className="flex justify-between bg-slate-900 p-3 rounded-xl">
            <span>{player.name}</span>
            <span>
              {player.runs} ({player.balls})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}