import { useEffect, useMemo, useState } from "react";
import "./index.css";

import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "./firebase";
import Auth from "./components/Auth";
import PlayerStats from "./components/PlayerStats";

const STORAGE_KEY = "celle-strikers-v3";
const LIVE_MATCH_KEY = "celle-strikers-live-match";

function createPlayer(name, type = "regular") {
return {
  id: crypto.randomUUID(),
  name,
  type,

  // batting
  runs: 0,
  balls: 0,
  fours: 0,
  sixes: 0,
  out: false,

  // bowling 👇
  ballsBowled: 0,
//  runsGiven: 0,
//  wicketsTaken: 0,
//  oversBowled: 0,
//  ballsBowled: 0,
  runsConceded: 0,
  wicketsTaken: 0,
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
    ballsBowled: 0,
    runsConceded: 0,
    wicketsTaken: 0,
  }));
}

function formatOvers(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function isExtraBall(item) {
  return item === "WD" || item === "NB";
}

export default function App() {
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");

  const [playerPool, setPlayerPool] = useState([]);
  const [teamAIds, setTeamAIds] = useState([]);
  const [teamBIds, setTeamBIds] = useState([]);

  const [playerInput, setPlayerInput] = useState("");
  const [playerType, setPlayerType] = useState("regular");

  const [latePlayerInput, setLatePlayerInput] = useState("");
  const [latePlayerTeam, setLatePlayerTeam] = useState("A");
  const [selectedPoolPlayerId, setSelectedPoolPlayerId] = useState("");

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
  const [currentBowlerId, setCurrentBowlerId] = useState("");
  const [ballHistory, setBallHistory] = useState([]);
  const [lastBowlerId, setLastBowlerId] = useState("");
  const [oversHistory, setOversHistory] = useState([]);

  const [activeTab, setActiveTab] = useState("score");
  const [matchHistory, setMatchHistory] = useState([]);
  const [savingMatch, setSavingMatch] = useState(false);

  const [hasSavedLiveMatch, setHasSavedLiveMatch] = useState(false);
  const [editingFirstInnings, setEditingFirstInnings] = useState(false);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const teamAPlayers = useMemo(
    () => teamAIds.map((id) => playerPool.find((p) => p.id === id)).filter(Boolean),
    [teamAIds, playerPool]
  );

  const teamBPlayers = useMemo(
    () => teamBIds.map((id) => playerPool.find((p) => p.id === id)).filter(Boolean),
    [teamBIds, playerPool]
  );

  const currentPlayers = battingTeam === "A" ? teamAPlayers : teamBPlayers;
  const bowlingPlayers = battingTeam === "A" ? teamBPlayers : teamAPlayers;
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

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const data = JSON.parse(saved);
      setTeamAName(data.teamAName || "Team A");
      setTeamBName(data.teamBName || "Team B");
      setPlayerPool(data.playerPool || []);
      setTeamAIds(data.teamAIds || []);
      setTeamBIds(data.teamBIds || []);
      setMatchOvers(data.matchOvers || 6);
    }

    setHasSavedLiveMatch(Boolean(localStorage.getItem(LIVE_MATCH_KEY)));
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        teamAName,
        teamBName,
        playerPool,
        teamAIds,
        teamBIds,
        matchOvers,
      })
    );
  }, [teamAName, teamBName, playerPool, teamAIds, teamBIds, matchOvers]);

  useEffect(() => {
    if (!matchStarted || matchFinished) return;

    const liveMatchData = {
      teamAName,
      teamBName,
      playerPool,
      teamAIds,
      teamBIds,
      matchOvers,
      tossWinner,
      tossDecision,
      lastManStanding,
      inningsNumber,
      battingTeam,
      score,
      wickets,
      balls,
      extras,
      firstInnings,
      result,
      strikerId,
      nonStrikerId,
      timeline,
      ballHistory,
      matchStarted,
      currentBowlerId,
      lastBowlerId,
    };

    localStorage.setItem(LIVE_MATCH_KEY, JSON.stringify(liveMatchData));
    setHasSavedLiveMatch(true);
  }, [
    teamAName,
    teamBName,
    playerPool,
    teamAIds,
    teamBIds,
    matchOvers,
    tossWinner,
    tossDecision,
    lastManStanding,
    inningsNumber,
    battingTeam,
    score,
    wickets,
    balls,
    extras,
    firstInnings,
    result,
    strikerId,
    nonStrikerId,
    timeline,
    ballHistory,
    matchStarted,
    matchFinished,
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadMatchHistory();
    }
  }, [user]);

  async function loadMatchHistory() {
    try {
      const q = query(collection(db, "matches"), orderBy("createdAtMs", "desc"));
      const snapshot = await getDocs(q);

      const matches = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMatchHistory(matches);
    } catch (error) {
      console.error("Error loading match history:", error);
      alert(error.message || "Could not load match history.");
    }
  }

  function resumeSavedMatch() {
    const liveMatch = localStorage.getItem(LIVE_MATCH_KEY);

    if (!liveMatch) {
      alert("No unfinished match found.");
      setHasSavedLiveMatch(false);
      return;
    }

    const m = JSON.parse(liveMatch);

    setTeamAName(m.teamAName || "Team A");
    setTeamBName(m.teamBName || "Team B");
    setPlayerPool(m.playerPool || []);
    setTeamAIds(m.teamAIds || []);
    setTeamBIds(m.teamBIds || []);

    setMatchOvers(m.matchOvers || 6);
    setTossWinner(m.tossWinner || "A");
    setTossDecision(m.tossDecision || "bat");
    setLastManStanding(m.lastManStanding ?? true);

    setInningsNumber(m.inningsNumber || 1);
    setBattingTeam(m.battingTeam || "A");

    setScore(m.score || 0);
    setWickets(m.wickets || 0);
    setBalls(m.balls || 0);
    setExtras(m.extras || 0);

    setFirstInnings(m.firstInnings || null);
    setResult(m.result || "");

    setStrikerId(m.strikerId || "");
    setNonStrikerId(m.nonStrikerId || "");
    setCurrentBowlerId(m.currentBowlerId || "");
    setLastBowlerId(m.lastBowlerId || "");

    setTimeline(m.timeline || []);
    setBallHistory(m.ballHistory || []);

    setMatchStarted(true);
    setMatchFinished(false);
    setActiveTab("score");
    setHasSavedLiveMatch(false);
  }

  async function saveMatchToHistory() {
    if (!matchFinished || !firstInnings) {
      alert("Match is not finished yet.");
      return;
    }

    setSavingMatch(true);

    try {
      const today = new Date().toLocaleDateString("en-CA");

      const savedFirstInnings = JSON.parse(JSON.stringify(firstInnings));

      const savedSecondInnings = JSON.parse(
        JSON.stringify({
          team: battingTeam,
          teamName: currentTeamName,
          score,
          wickets,
          balls,
          extras,
          players: currentPlayers,
          ballHistory,
        })
      );

      const winner = result.includes(teamAName)
        ? teamAName
        : result.includes(teamBName)
        ? teamBName
        : "Tie";

      const matchData = {
        date: today,
        teamAName,
        teamBName,
        teamAPlayers: JSON.parse(JSON.stringify(teamAPlayers)),
        teamBPlayers: JSON.parse(JSON.stringify(teamBPlayers)),
        overs: Number(matchOvers),
        lastManStanding,
        result,
        winner,
        firstInnings: savedFirstInnings,
        secondInnings: savedSecondInnings,
        createdAt: new Date().toISOString(),
        createdAtMs: Date.now(),
        savedBy: user?.email || "unknown",
        };

      await addDoc(collection(db, "matches"), matchData);

      alert("Match saved to history!");
      await loadMatchHistory();
      setActiveTab("history");
    } catch (error) {
      console.error("Error saving match:", error);
      alert(error.message || "Could not save match.");
    } finally {
      setSavingMatch(false);
    }
  }

  async function deleteMatch(matchId) {
    const confirmed = confirm("Delete this match from history?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "matches", matchId));
      await loadMatchHistory();
    } catch (error) {
      alert(error.message);
    }
  }

  function addPlayerToPool() {
    const name = playerInput.trim();
    if (!name) return;

    const exists = playerPool.some(
      (player) => player.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      alert("Player already exists in pool.");
      return;
    }

    setPlayerPool([...playerPool, createPlayer(name, playerType)]);
    setPlayerInput("");
  }

  function removePlayerFromPool(playerId) {
    const usedInMatch =
      matchStarted &&
      (teamAIds.includes(playerId) || teamBIds.includes(playerId));

    if (usedInMatch) {
      alert("Cannot delete a player from pool during a match. Remove from team only.");
      return;
    }

    const confirmed = confirm("Remove player from pool completely?");
    if (!confirmed) return;

    setPlayerPool(playerPool.filter((p) => p.id !== playerId));
    setTeamAIds(teamAIds.filter((id) => id !== playerId));
    setTeamBIds(teamBIds.filter((id) => id !== playerId));
  }

function giveStrikeToPlayer(player, team) {
  if (team !== battingTeam) {
    alert("You can only give strike to the batting team.");
    return;
  }

  setPlayerPool((prevPool) =>
    prevPool.map((p) =>
      p.id === player.id ? { ...p, out: false } : p
    )
  );

  if (player.id === nonStrikerId) {
    const oldStriker = strikerId;
    setStrikerId(player.id);
    setNonStrikerId(oldStriker);
    return;
  }

  if (player.id !== strikerId) {
    setNonStrikerId(strikerId);
    setStrikerId(player.id);
  }
}

  function addToTeam(team, playerId) {
    if (team === "A") {
      if (!teamAIds.includes(playerId)) {
        setTeamAIds([...teamAIds, playerId]);
      }
      setTeamBIds(teamBIds.filter((id) => id !== playerId));
    }

    if (team === "B") {
      if (!teamBIds.includes(playerId)) {
        setTeamBIds([...teamBIds, playerId]);
      }
      setTeamAIds(teamAIds.filter((id) => id !== playerId));
    }
  }

  function removeFromTeam(team, playerId) {
    if (matchStarted && (playerId === strikerId || playerId === nonStrikerId)) {
      alert("Can't remove active batter.");
      return;
    }

    if (team === "A") {
      setTeamAIds(teamAIds.filter((id) => id !== playerId));
    } else {
      setTeamBIds(teamBIds.filter((id) => id !== playerId));
    }
  }

  function addLateNewPlayer() {
    const name = latePlayerInput.trim();
    if (!name) return;

    const newPlayer = createPlayer(name, "nonRegular");

    setPlayerPool([...playerPool, newPlayer]);

    if (latePlayerTeam === "A") {
      setTeamAIds([...teamAIds, newPlayer.id]);
    } else {
      setTeamBIds([...teamBIds, newPlayer.id]);
    }

    setLatePlayerInput("");
  }

  function addExistingPoolPlayerDuringMatch(team) {
    if (!selectedPoolPlayerId) {
      alert("Please select a player from pool.");
      return;
    }

    addToTeam(team, selectedPoolPlayerId);
    setSelectedPoolPlayerId("");
  }

  function startMatch() {
    if (teamAPlayers.length < 2 || teamBPlayers.length < 2) {
      alert("Please add at least 2 players in each team.");
      return;
    }

    const tossLoser = tossWinner === "A" ? "B" : "A";
    const firstBattingTeam = tossDecision === "bat" ? tossWinner : tossLoser;
    const firstBattingPlayers =
      firstBattingTeam === "A" ? teamAPlayers : teamBPlayers;

    setPlayerPool(resetPlayerStats(playerPool));

    setMatchStarted(true);
    setMatchFinished(false);
    setInningsNumber(1);
    setBattingTeam(firstBattingTeam);

    setScore(0);
    setWickets(0);
    setBalls(0);
    setExtras(0);
    setTimeline([]);
    setBallHistory([]);
    setFirstInnings(null);
    setResult("");
    setOversHistory([]);

    setStrikerId(firstBattingPlayers[0].id);
    setNonStrikerId(firstBattingPlayers[1].id);
  }

  function updateCurrentPlayers(updatedPlayers) {
    setPlayerPool((prevPool) =>
      prevPool.map((player) => {
        const updated = updatedPlayers.find((p) => p.id === player.id);
        return updated || player;
      })
    );
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

  function isEndOfOver(newBalls) {
    return newBalls > 0 && newBalls % 6 === 0;
  }

  function checkInningsEnd(
    newScore,
    newWickets,
    newBalls,
    updatedPlayers = currentPlayers
  ) {
    const allOut = lastManStanding
      ? newWickets >= currentPlayers.length
      : newWickets >= currentPlayers.length - 1;

    const oversFinished = newBalls >= maxBalls;
    const targetReached = inningsNumber === 2 && newScore >= target;

if (inningsNumber === 1 && !editingFirstInnings && (allOut || oversFinished)) {
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

function hasValidStriker() {
  if (!strikerId) {
    alert("Please select a striker before scoring.");
    return false;
  }

  const striker = currentPlayers.find((player) => player.id === strikerId);

  if (!striker || striker.out) {
    alert("Selected striker is not available. Please choose a valid striker.");
    return false;
  }

  return true;
}

function updateBowlerStats(bowlerId, ballsToAdd, runsToAdd, wicketsToAdd) {
  if (!bowlerId) return;

  setPlayerPool((prevPool) =>
    prevPool.map((p) =>
      p.id === bowlerId
        ? {
            ...p,
            ballsBowled: Math.max(0, (p.ballsBowled || 0) + ballsToAdd),
            runsConceded: Math.max(0, (p.runsConceded || 0) + runsToAdd),
            wicketsTaken: Math.max(0, (p.wicketsTaken || 0) + wicketsToAdd),
          }
        : p
    )
  );
}

function createBallSnapshot() {
  return {
    score,
    wickets,
    balls,
    extras,
    strikerId,
    nonStrikerId,
    currentBowlerId,
    lastBowlerId,
    playerPool,
    timeline,
    oversHistory,
  };
}

function getThisOverTimelineFromTimeline(sourceTimeline, sourceBalls) {
  const thisOver = [];
  const legalBallsInCurrentOver = sourceBalls % 6;
  let legalBallsFound = 0;

  if (sourceTimeline.length === 0) return [];

  if (legalBallsInCurrentOver === 0) {
    for (let i = sourceTimeline.length - 1; i >= 0; i--) {
      const item = sourceTimeline[i];
      thisOver.unshift(item);

      if (!isExtraBall(item)) {
        legalBallsFound++;
      }

      if (legalBallsFound === 6) break;
    }

    return thisOver;
  }

  for (let i = sourceTimeline.length - 1; i >= 0; i--) {
    const item = sourceTimeline[i];
    thisOver.unshift(item);

    if (!isExtraBall(item)) {
      legalBallsFound++;
    }

    if (legalBallsFound === legalBallsInCurrentOver) break;
  }

  return thisOver;
}

function addRuns(run) {
  if (!hasValidStriker()) return;

  if (!currentBowlerId) {
    alert("Select a bowler first");
    return;
  }

  const snapshot = createBallSnapshot();

  const newScore = score + run;
  const newBalls = balls + 1;
  const overFinished = isEndOfOver(newBalls);
  const oddRun = run === 1 || run === 3;

  const updatedPool = playerPool.map((player) => {
    if (player.id === strikerId) {
      return {
        ...player,
        runs: player.runs + run,
        balls: player.balls + 1,
        fours: player.fours + (run === 4 ? 1 : 0),
        sixes: player.sixes + (run === 6 ? 1 : 0),
      };
    }

    if (player.id === currentBowlerId) {
      return {
        ...player,
        ballsBowled: (player.ballsBowled || 0) + 1,
        runsConceded: (player.runsConceded || 0) + run,
      };
    }

    return player;
  });

  const newTimeline = [...timeline, run];

  setScore(newScore);
  setBalls(newBalls);
  setTimeline(newTimeline);
  setPlayerPool(updatedPool);

  setBallHistory([
    ...ballHistory,
    {
      type: "RUN",
      value: run,
      batsmanId: strikerId,
      bowlerId: currentBowlerId,
      legalBall: true,
      snapshot,
    },
  ]);

  const updatedCurrentPlayers = battingTeam === "A"
    ? teamAIds.map((id) => updatedPool.find((p) => p.id === id)).filter(Boolean)
    : teamBIds.map((id) => updatedPool.find((p) => p.id === id)).filter(Boolean);

  const playersLeft = updatedCurrentPlayers.filter((p) => !p.out).length;

  if (overFinished) {
    setOversHistory([
      ...oversHistory,
      {
        over: Math.floor(newBalls / 6),
        bowlerId: currentBowlerId,
        balls: getThisOverTimelineFromTimeline(newTimeline, newBalls),
      },
    ]);

    setLastBowlerId(currentBowlerId);
    setCurrentBowlerId("");
  }

  if (playersLeft > 1 && oddRun !== overFinished) {
    changeStrike();
  }

  checkInningsEnd(newScore, wickets, newBalls, updatedCurrentPlayers);
}

function addWide() {
  if (!currentBowlerId) {
    alert("Select a bowler first");
    return;
  }

  const snapshot = createBallSnapshot();
  const newScore = score + 1;

  const updatedPool = playerPool.map((player) => {
    if (player.id === currentBowlerId) {
      return {
        ...player,
        runsConceded: (player.runsConceded || 0) + 1,
      };
    }

    return player;
  });

  setScore(newScore);
  setExtras(extras + 1);
  setTimeline([...timeline, "WD"]);
  setPlayerPool(updatedPool);

  setBallHistory([
    ...ballHistory,
    {
      type: "WIDE",
      value: 1,
      bowlerId: currentBowlerId,
      legalBall: false,
      snapshot,
    },
  ]);

  checkInningsEnd(newScore, wickets, balls);
}

function addNoBall() {
  if (!currentBowlerId) {
    alert("Select a bowler first");
    return;
  }

  const snapshot = createBallSnapshot();
  const newScore = score + 1;

  const updatedPool = playerPool.map((player) => {
    if (player.id === currentBowlerId) {
      return {
        ...player,
        runsConceded: (player.runsConceded || 0) + 1,
      };
    }

    return player;
  });

  setScore(newScore);
  setExtras(extras + 1);
  setTimeline([...timeline, "NB"]);
  setPlayerPool(updatedPool);

  setBallHistory([
    ...ballHistory,
    {
      type: "NO_BALL",
      value: 1,
      bowlerId: currentBowlerId,
      legalBall: false,
      snapshot,
    },
  ]);

  checkInningsEnd(newScore, wickets, balls);
}

function addWicket() {
  if (!hasValidStriker()) return;

  if (!currentBowlerId) {
    alert("Select a bowler first");
    return;
  }

  const snapshot = createBallSnapshot();

  const newWickets = wickets + 1;
  const newBalls = balls + 1;
  const overFinished = isEndOfOver(newBalls);

  const updatedPool = playerPool.map((player) => {
    if (player.id === strikerId) {
      return {
        ...player,
        balls: player.balls + 1,
        out: true,
      };
    }

    if (player.id === currentBowlerId) {
      return {
        ...player,
        ballsBowled: (player.ballsBowled || 0) + 1,
        wicketsTaken: (player.wicketsTaken || 0) + 1,
      };
    }

    return player;
  });

  const updatedCurrentPlayers = battingTeam === "A"
    ? teamAIds.map((id) => updatedPool.find((p) => p.id === id)).filter(Boolean)
    : teamBIds.map((id) => updatedPool.find((p) => p.id === id)).filter(Boolean);

  const nextPlayer = updatedCurrentPlayers.find(
    (player) =>
      !player.out && player.id !== strikerId && player.id !== nonStrikerId
  );

  const newTimeline = [...timeline, "W"];

  setWickets(newWickets);
  setBalls(newBalls);
  setTimeline(newTimeline);
  setPlayerPool(updatedPool);

  setBallHistory([
    ...ballHistory,
    {
      type: "WICKET",
      value: "W",
      batsmanId: strikerId,
      bowlerId: currentBowlerId,
      legalBall: true,
      snapshot,
    },
  ]);

  if (overFinished) {
    setOversHistory([
      ...oversHistory,
      {
        over: Math.floor(newBalls / 6),
        bowlerId: currentBowlerId,
        balls: getThisOverTimelineFromTimeline(newTimeline, newBalls),
      },
    ]);

    setLastBowlerId(currentBowlerId);
    setCurrentBowlerId("");
  }

  if (nextPlayer) {
    if (overFinished && nonStrikerId) {
      setStrikerId(nonStrikerId);
      setNonStrikerId(nextPlayer.id);
    } else {
      setStrikerId(nextPlayer.id);
    }
  } else if (lastManStanding && nonStrikerId) {
    setStrikerId(nonStrikerId);
    setNonStrikerId("");
  } else {
    setStrikerId("");
  }

  checkInningsEnd(score, newWickets, newBalls, updatedCurrentPlayers);
}

function undoLastBall() {
  if (ballHistory.length === 0) {
    alert("No ball to undo.");
    return;
  }

  const lastBall = ballHistory[ballHistory.length - 1];
  const snapshot = lastBall.snapshot;

  if (!snapshot) {
    alert("This older ball cannot be fully restored.");
    return;
  }

  setScore(snapshot.score);
  setWickets(snapshot.wickets);
  setBalls(snapshot.balls);
  setExtras(snapshot.extras);
  setStrikerId(snapshot.strikerId);
  setNonStrikerId(snapshot.nonStrikerId);
  setCurrentBowlerId(snapshot.currentBowlerId);
  setLastBowlerId(snapshot.lastBowlerId);
  setPlayerPool(snapshot.playerPool);
  setTimeline(snapshot.timeline);
  setOversHistory(snapshot.oversHistory || []);
  setBallHistory(ballHistory.slice(0, -1));
}

function goBackToFirstInnings() {
  if (!firstInnings) return;

  const confirmed = confirm(
    "Go back to 1st innings? Current 2nd innings progress will be cleared."
  );

  if (!confirmed) return;

  setEditingFirstInnings(true);

  setMatchStarted(true);
  setMatchFinished(false);
  setInningsNumber(1);
  setBattingTeam(firstInnings.team);

  setScore(firstInnings.score);
  setWickets(firstInnings.wickets);
  setBalls(firstInnings.balls);
  setExtras(firstInnings.extras);

  setTimeline(firstInnings.timeline || []);
  setBallHistory(firstInnings.ballHistory || []);

  setPlayerPool((prevPool) =>
    prevPool.map((player) => {
      const savedPlayer = firstInnings.players.find((p) => p.id === player.id);
      return savedPlayer || player;
    })
  );

  const availablePlayers = firstInnings.players.filter((p) => !p.out);

  setStrikerId(availablePlayers[0]?.id || "");
  setNonStrikerId(availablePlayers[1]?.id || "");

  setFirstInnings(null);
  setResult("");
}

  function endFirstInnings(
    finalScore = score,
    finalWickets = wickets,
    finalBalls = balls,
    finalPlayers = currentPlayers
  ) {
    setEditingFirstInnings(false);
    setFirstInnings({
      team: battingTeam,
      teamName: currentTeamName,
      score: finalScore,
      wickets: finalWickets,
      balls: finalBalls,
      extras,
      players: finalPlayers,
      ballHistory,
      timeline,
      oversHistory,
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
    setOversHistory([]);

    setStrikerId(secondPlayers[0]?.id || "");
    setNonStrikerId(secondPlayers[1]?.id || "");
    setCurrentBowlerId(""); 
    setLastBowlerId("");      
  }

  function finishMatch(finalScore, finalWickets) {
    const chasingTeamName = currentTeamName;

    if (finalScore >= target) {
      const wicketsLeft = currentPlayers.length - finalWickets;
      setResult(`${chasingTeamName} won by ${wicketsLeft} wickets`);
    } else if (finalScore === firstInnings.score) {
      setResult("Match tied");
    } else {
      const runsWonBy = firstInnings.score - finalScore;
      setResult(`${firstInnings.teamName} won by ${runsWonBy} runs`);
    }

    setMatchFinished(true);
    localStorage.removeItem(LIVE_MATCH_KEY);
    setHasSavedLiveMatch(false);
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
    setOversHistory([]);
    localStorage.removeItem(LIVE_MATCH_KEY);
    setHasSavedLiveMatch(false);
  }

function resetCurrentInnings() {
  const confirmed = confirm("Reset current innings only?");
  if (!confirmed) return;

  const currentIds = battingTeam === "A" ? teamAIds : teamBIds;

  setPlayerPool((prevPool) =>
    prevPool.map((player) =>
      currentIds.includes(player.id)
        ? {
            ...player,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            out: false,
          }
        : player
    )
  );

  setScore(0);
  setWickets(0);
  setBalls(0);
  setExtras(0);
  setTimeline([]);
  setBallHistory([]);

  const resetPlayers = battingTeam === "A" ? teamAPlayers : teamBPlayers;

  setStrikerId(resetPlayers[0]?.id || "");
  setNonStrikerId(resetPlayers[1]?.id || "");
}

  function getThisOverTimeline() {
    const thisOver = [];
    const legalBallsInCurrentOver = balls % 6;
    let legalBallsFound = 0;

    if (timeline.length === 0) return [];

    if (legalBallsInCurrentOver === 0) {
      for (let i = timeline.length - 1; i >= 0; i--) {
        const item = timeline[i];

        if (!isExtraBall(item)) break;

        thisOver.unshift(item);
      }

      return thisOver;
    }

    for (let i = timeline.length - 1; i >= 0; i--) {
      const item = timeline[i];
      thisOver.unshift(item);

      if (!isExtraBall(item)) {
        legalBallsFound++;
      }

      if (legalBallsFound === legalBallsInCurrentOver) {
        break;
      }
    }

    return thisOver;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-2 md:p-2">
      <div className="max-w-8xl mx-auto">
          <header
            className={`mb-2 bg-gradient-to-r from-green-600 to-slate-900 p-3 rounded-3xl shadow-xl ${
              matchStarted && !matchFinished ? "hidden" : ""
            }`}
          >
          <h1 className="text-4xl md:text-5xl font-black">Celle Strikers</h1>
          <p className="text-green-100 mt-2">Sunday Cricket Scorebook</p>
          <p className="text-black-100 mt-2 font-bold">Created by Awais</p>

          <div className="mt-2 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <p className="text-sm text-green-100">Logged in as {user.email}</p>

            <button
              onClick={() => signOut(auth)}
              className="bg-slate-900 px-3 py-3 rounded-xl font-bold"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-3 mb-2">
          <button
            onClick={() => setActiveTab("score")}
            className={`px-3 py-3 rounded-xl font-bold ${
              activeTab === "score" ? "bg-green-500" : "bg-slate-800"
            }`}
          >
            Score Match
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-3 rounded-xl font-bold ${
              activeTab === "history" ? "bg-green-500" : "bg-slate-800"
            }`}
          >
            Match History
          </button>

          <button
            onClick={() => setActiveTab("stats")}
            className={`px-3 py-3 rounded-xl font-bold ${
              activeTab === "stats" ? "bg-green-500" : "bg-slate-800"
            }`}
          >
            Player Stats
          </button>
        </div>

        {activeTab === "score" && (
          <>
            {!matchStarted && (
              <div className="space-y-3">
                <div className="grid lg:grid-cols-[1fr_1.2fr_1fr] gap-3">
                  <TeamColumn
                    title={teamAName}
                    setTitle={setTeamAName}
                    players={teamAPlayers}
                    onRemove={(id) => removeFromTeam("A", id)}
                    color="green"
                  />

                  <PlayerPool
                    playerPool={playerPool}
                    playerInput={playerInput}
                    setPlayerInput={setPlayerInput}
                    playerType={playerType}
                    setPlayerType={setPlayerType}
                    addPlayerToPool={addPlayerToPool}
                    addToTeam={addToTeam}
                    removePlayerFromPool={removePlayerFromPool}
                    teamAIds={teamAIds}
                    teamBIds={teamBIds}
                  />

                  <TeamColumn
                    title={teamBName}
                    setTitle={setTeamBName}
                    players={teamBPlayers}
                    onRemove={(id) => removeFromTeam("B", id)}
                    color="blue"
                  />
                </div>

                <div className="bg-slate-900 p-3 rounded-3xl">
                  <h2 className="text-2xl font-bold mb-2">Match Setup</h2>

                  <div className="grid md:grid-cols-3 gap-3">
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
                      <label className="block mb-2 text-slate-300">
                        Toss Winner
                      </label>
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

                  <label className="flex items-center gap-3 mt-3 bg-slate-800 p-2 rounded-xl">
                    <input
                      type="checkbox"
                      checked={lastManStanding}
                      onChange={(e) => setLastManStanding(e.target.checked)}
                    />
                    <span>Allow Last Man Standing</span>
                  </label>

                  {hasSavedLiveMatch && !matchStarted && (
                    <button
                      onClick={resumeSavedMatch}
                      className="mt-3 w-full bg-yellow-500 text-black p-3 rounded-2xl text-xl font-black"
                    >
                      Resume Unfinished Match
                    </button>
                  )}

                  <button
                    onClick={startMatch}
                    className="mt-3 w-full bg-green-500 hover:bg-green-600 p-3 rounded-2xl text-xl font-black"
                  >
                    Start Match
                  </button>
                </div>
              </div>
            )}

            {matchStarted && !matchFinished && (
<div className="grid lg:grid-cols-3 gap-3">
<div>
  <ScoreCard
    title="Batting Card"
    players={currentPlayers}
    strikerId={strikerId}
    timeline={timeline}
  />

  <div className="mt-3">
  <h3 className="font-bold">Overs History</h3>

  {oversHistory.map((o, i) => (
    <div key={i} className="text-sm text-slate-300">
      Over {o.over}: {o.balls.join(" | ")}
    </div>
  ))}
</div>

  <BowlingCard
    players={battingTeam === "A" ? teamBPlayers : teamAPlayers}
  />
</div>

  <div className="lg:col-span-2 bg-slate-900 p-3 rounded-3xl">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div>
                  <p className="text-green-400">Innings {inningsNumber}</p>
                  <h2 className="text-3xl font-black mb-1">{currentTeamName}</h2>
                  <p className="text-slate-400">
                    Bowling: {bowlingTeamName}
                  </p>
                </div>

                {inningsNumber === 2 && (
                  <button
                    onClick={goBackToFirstInnings}
                    className="bg-yellow-500 text-black px-4 py-3 rounded-xl font-bold"
                  >
                    Go back to 1st Innings
                  </button>
                )}
              </div>
                  {inningsNumber === 2 && (
                    
                    <p className="mb-2 bg-yellow-500 text-black p-3 rounded-xl font-bold">
                      Target: {target}
                    </p>
                  )}

                  <div className="bg-slate-800 p-3 rounded-3xl mb-3">
                    <h3 className="text-5xl font-black">
                      {score}/{wickets}
                    </h3>

                    <p className="text-slate-300 mt-1">
                      Overs: {formatOvers(balls)} / {matchOvers}
                    </p>

                    <div className="mt-2">
                    <label className="text-slate-300 text-sm">Bowler</label>
                    <select
                      value={currentBowlerId}
                      onChange={(e) => setCurrentBowlerId(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-700 mt-1"
                    >
                      <option value="">Select Bowler</option>
                      {bowlingPlayers
                        .filter(p => p.id !== lastBowlerId) 
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                      ))}
                    </select>
                  </div>

                    <p className="text-slate-300">Extras: {extras}</p>

                    <p className="text-slate-300 mt-2">
                      This Over:{" "}
                      <span className="text-white font-bold">
                        {getThisOverTimeline().length > 0
                          ? getThisOverTimeline().join(" | ")
                          : "New over"}
                      </span>
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block mb-1 text-slate-300">Striker</label>
                      <select
                        value={strikerId}
                        onChange={(e) => setStrikerId(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-800"
                      >
                        {currentPlayers
                      .filter((player) => !player.out && player.id !== nonStrikerId)
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name} {player.id === strikerId ? "*" : ""}
                        </option>
                      ))}
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 text-slate-300">
                        Non-Striker
                      </label>
                      <select
                        value={nonStrikerId || ""}
                        onChange={(e) => setNonStrikerId(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-800"
                      >
                        {currentPlayers
                        .filter((player) => !player.out && player.id !== strikerId)
                        .map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {[0, 1, 2, 3, 4, 6].map((run) => (
                      <button
                        key={run}
                        onClick={() => addRuns(run)}
                        disabled={!strikerId}
                        className="bg-green-500 hover:bg-green-600 p-4 rounded-2xl text-2xl font-black"
                      >
                        {run}
                      </button>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-5 gap-3 mt-3">
                    <button
                      onClick={addWide}
                      className="bg-purple-500 text-white p-4 rounded-xl font-bold"
                    >
                      Wide
                    </button>
                    <button
                      onClick={addNoBall}
                      className="bg-orange-500 p-4 rounded-xl font-bold"
                    >
                      No Ball
                    </button>
                    <button
                      onClick={addWicket}
                      disabled={!strikerId}
                      className="bg-red-500 p-4 rounded-xl font-bold"
                    >
                      Wicket
                    </button>
                    <button
                      onClick={changeStrike}
                      className="bg-slate-700 p-4 rounded-xl font-bold"
                    >
                      Change Strike
                    </button>
                    <button
                      onClick={undoLastBall}
                      className="bg-slate-700 p-4 rounded-xl font-bold"
                    >
                      Undo Last Ball
                    </button>

                    <button
                      onClick={resetCurrentInnings}
                      className="mt-1 w-full bg-red-600 p-4 rounded-xl font-bold"
                    >
                      Reset Innings
                    </button>

                  </div>

                  <LivePlayerManager
                    teamAName={teamAName}
                    teamBName={teamBName}
                    teamAPlayers={teamAPlayers}
                    teamBPlayers={teamBPlayers}
                    latePlayerInput={latePlayerInput}
                    setLatePlayerInput={setLatePlayerInput}
                    latePlayerTeam={latePlayerTeam}
                    setLatePlayerTeam={setLatePlayerTeam}
                    addLateNewPlayer={addLateNewPlayer}
                    removeFromTeam={removeFromTeam}
                    strikerId={strikerId}
                    nonStrikerId={nonStrikerId}
                    battingTeam={battingTeam}
                    giveStrikeToPlayer={giveStrikeToPlayer}
                  />

{inningsNumber === 1 && (
  <button
    onClick={() => endFirstInnings()}
    className={`mt-6 w-full p-4 rounded-xl font-bold ${
      editingFirstInnings ? "bg-yellow-500 text-black" : "bg-blue-500"
    }`}
  >
    {editingFirstInnings
      ? "Save Edited 1st Innings / Continue to 2nd Innings"
      : "End First Innings Manually"}
  </button>
)}

                  {inningsNumber === 2 && (
                    <button
                      onClick={() => finishMatch(score, wickets)}
                      className="mt-1 w-full bg-slate-500 p-4 rounded-xl font-bold"
                    >
                      Finish Match Manually
                    </button>
                  )}
                </div>

              </div>
            )}

            {matchFinished && (
              <div className="bg-slate-900 p-8 rounded-3xl">
                <h2 className="text-4xl font-black mb-2">Match Result</h2>

                <p className="text-2xl text-green-400 font-bold mb-3">
                  {result}
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                <SummaryBox
                  title={teamAName}
                  score={firstInnings.team === "A" ? firstInnings.score : score}
                  wickets={firstInnings.team === "A" ? firstInnings.wickets : wickets}
                  balls={firstInnings.team === "A" ? firstInnings.balls : balls}
                  extras={firstInnings.team === "A" ? firstInnings.extras : extras}
                  players={teamAPlayers}
                />

                <SummaryBox
                  title={teamBName}
                  score={firstInnings.team === "B" ? firstInnings.score : score}
                  wickets={firstInnings.team === "B" ? firstInnings.wickets : wickets}
                  balls={firstInnings.team === "B" ? firstInnings.balls : balls}
                  extras={firstInnings.team === "B" ? firstInnings.extras : extras}
                  players={teamBPlayers}
                />
                </div>

                {hasSavedLiveMatch && (
                  <button
                    onClick={resumeSavedMatch}
                    className="mt-1 w-full bg-yellow-500 text-black p-5 rounded-2xl text-xl font-black"
                  >
                    Resume Unfinished Match
                  </button>
                )}

                <button
                  onClick={saveMatchToHistory}
                  disabled={savingMatch}
                  className="mt-1 w-full bg-blue-500 p-5 rounded-2xl text-xl font-black disabled:opacity-50"
                >
                  {savingMatch ? "Saving..." : "Save Match to History"}
                </button>

                <button
                  onClick={resetMatchOnly}
                  className="mt-2 w-full bg-green-500 p-5 rounded-2xl text-xl font-black"
                >
                  Start New Match
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "history" && (
          <MatchHistory
            matchHistory={matchHistory}
            reloadHistory={loadMatchHistory}
            deleteMatch={deleteMatch}
          />
        )}

        {activeTab === "stats" && <PlayerStats matchHistory={matchHistory} />}
      
      {matchStarted && !matchFinished && (
  <div className="mt-4 text-center text-slate-500 text-sm font-bold">
    Celle Strikers • Sunday Cricket Scorebook Created By Awais
  </div>
)}
      
      </div>
    </div>
  );
}

function TeamColumn({ title, setTitle, players, onRemove, color }) {
  return (
<div className={`p-3 rounded-3xl border ${color === "green" ? "bg-yellow-500 border-white-500" : "bg-blue-500 border-white-500"}`}>
      
<div className="flex justify-between items-center mb-3">
  <h3 className="font-bold">{title}</h3>
  <span className="bg-slate-800 px-3 py-1 rounded-full font-bold">
    {players.length}
  </span>
</div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full mb-2 p-3 rounded-xl bg-slate-800 border border-slate-700 text-xl font-bold"
      />

      <div className="space-y-2">
        {players.length === 0 ? (
          <p className="text-slate-400 bg-slate-800 p-3 rounded-xl">
            No players selected.
          </p>
        ) : (
          players.map((player) => (
            <div
              key={player.id}
              className="flex justify-between bg-slate-800 p-3 rounded-xl"
            >
              <span>{player.name}</span>
              <button onClick={() => onRemove(player.id)} className="text-red-400">
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PlayerPool({
  playerPool,
  playerInput,
  setPlayerInput,
  addPlayerToPool,
  addToTeam,
  removePlayerFromPool,
  teamAIds,
  teamBIds,
}) {

  const availablePlayers = playerPool.filter(
  (p) => !teamAIds.includes(p.id) && !teamBIds.includes(p.id)
);

const regularPlayers = availablePlayers.filter((p) => p.type === "regular");
const nonRegularPlayers = availablePlayers.filter((p) => p.type !== "regular");

  return (
    <div className="bg-slate-500 p-3 rounded-3xl">
     <div className="flex justify-between items-center mb-4">
  <h2 className="text-2xl font-black">Player Pool</h2>
  <span className="bg-slate-800 px-3 py-1 rounded-full font-bold">
    {playerPool.length}
  </span>
</div>

      <div className="grid md:grid-cols-[1fr_auto] gap-2 mb-2">
        <input
          value={playerInput}
          onChange={(e) => setPlayerInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayerToPool()}
          placeholder="Add player name"
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700"
        />

        <button
          onClick={addPlayerToPool}
          className="bg-green-500 px-5 rounded-xl font-bold"
        >
          Add
        </button>
      </div>


      <PoolSection
        title="Players List"
        players={regularPlayers}
        addToTeam={addToTeam}
        removePlayerFromPool={removePlayerFromPool}
        teamAIds={teamAIds}
        teamBIds={teamBIds}
      />

    </div>
  );
}

function PoolSection({
  title,
  players,
  addToTeam,
  removePlayerFromPool,
  teamAIds,
  teamBIds,
}) {
  return (
    <div className="mb-2">
      <h3 className="font-bold text-slate-300 mb-2">{title}</h3>

      <div className="space-y-1">
        {players.length === 0 ? (
          <p className="text-slate-500 bg-slate-800 p-3 rounded-xl">
            No players here.
          </p>
        ) : (
          players.map((player) => (
            <div key={player.id} className="bg-slate-800 p-3 rounded-xl">
              <div className="flex justify-between items-center gap-3">
                <div>
                  <p className="font-bold">{player.name}</p>
                  <p className="text-xs text-slate-400">
                    {teamAIds.includes(player.id)
                      ? "In Team A"
                      : teamBIds.includes(player.id)
                      ? "In Team B"
                      : "Not selected"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => addToTeam("A", player.id)}
                    className="bg-yellow-500 px-3 py-2 rounded-lg font-bold"
                  >
                    ← A
                  </button>

                  <button
                    onClick={() => addToTeam("B", player.id)}
                    className="bg-blue-500 px-3 py-2 rounded-lg font-bold"
                  >
                    B →
                  </button>

                  <button
                    onClick={() => removePlayerFromPool(player.id)}
                    className="bg-red-500 px-3 py-2 rounded-lg font-bold"
                  >
                    X
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LivePlayerManager({
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  latePlayerInput,
  setLatePlayerInput,
  latePlayerTeam,
  setLatePlayerTeam,
  addLateNewPlayer,
  removeFromTeam,
  strikerId,
  nonStrikerId,
  battingTeam,
  giveStrikeToPlayer,
}) {
  function PlayerList({ title, team, players }) {
    return (
      <div className={`p-3 rounded-2xl border ${team === "A" ? "bg-yellow-500 border-white-500" : "bg-blue-500 border-white-500"}`}>
       <h4 className={`font-bold mb-2 ${team === "A" ? "text-white-500" : "text-white-500"}`}>{title}</h4>
        <div className="space-y-1">
          {players.map((player) => (
<div
  key={player.id}
  className="flex justify-between items-center bg-slate-800 p-3 rounded-xl"
>
  <span>{player.name}</span>

  <div className="flex items-center gap-3">
    <button
      onClick={() => giveStrikeToPlayer(player, team)}
      className="bg-green-800 text-white px-3 py-1 rounded-lg font-bold"
    >
      Give Strike*
    </button>

    <button
      onClick={() => {
        if (player.id === strikerId || player.id === nonStrikerId) {
          alert("Can't remove active batter.");
          return;
        }

        removeFromTeam(team, player.id);
      }}
      className="text-red-400 text-xl font-bold"
    >
      X
    </button>
  </div>
</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-4 rounded-2xl mt-3 mb-2">
      <h3 className="font-bold mb-3">Manage Players During Match</h3>

      <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 mb-3">
        <input
          value={latePlayerInput}
          onChange={(e) => setLatePlayerInput(e.target.value)}
          placeholder="Add new late player"
          className="p-3 rounded-xl bg-slate-900"
        />

        <select
          value={latePlayerTeam}
          onChange={(e) => setLatePlayerTeam(e.target.value)}
          className="p-3 rounded-xl bg-slate-900"
        >
          <option value="A">{teamAName}</option>
          <option value="B">{teamBName}</option>
        </select>

        <button
          onClick={addLateNewPlayer}
          className="bg-green-500 px-5 rounded-xl font-bold"
        >
          Add
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <PlayerList title={teamAName} team="A" players={teamAPlayers} />
        <PlayerList title={teamBName} team="B" players={teamBPlayers} />
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
          <div key={player.id} className="bg-slate-800 p-2 rounded-xl">
            <div className="flex justify-between">
              <span
                className={
                  player.id === strikerId ? "font-bold text-green-400" : ""
                }
              >
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

          <p className="text-xs text-slate-500">
            Bowl: {formatOvers(player.ballsBowled || 0)} | Runs: {player.runsConceded || 0} | Wkts: {player.wicketsTaken || 0}
          </p>
          </div>
        ))}
      </div>

      <h3 className="text-xl font-bold mt-3 mb-3">Timeline</h3>

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

function BowlingCard({ players }) {
  return (
    <div className="bg-slate-900 p-4 rounded-3xl mt-3">
      <h3 className="text-2xl font-bold mb-3">Bowling</h3>

      <div className="grid grid-cols-[1fr_auto] text-slate-400 text-sm font-bold px-3 mb-2">
        <span>Bowler</span>
        <span>O - R - W</span>
      </div>

      <div className="space-y-2">
        {players.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[1fr_auto] bg-slate-800 p-3 rounded-xl"
          >
            <span>{p.name}</span>

            <span className="text-sm font-bold">
              {Math.floor((p.ballsBowled || 0) / 6)}.
              {(p.ballsBowled || 0) % 6} - {p.runsConceded || 0} -{" "}
              {p.wicketsTaken || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryBox({ title, score, wickets, balls, extras, players }) {
  return (
    <div className="bg-slate-800 p-3 rounded-3xl">
      <h3 className="text-2xl font-bold mb-2">{title}</h3>

      <p className="text-4xl font-black mb-2">
        {score}/{wickets}
      </p>

      <p className="text-slate-300 mb-2">
        Overs: {formatOvers(balls)} | Extras: {extras}
      </p>

      <div className="space-y-1">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex justify-between bg-slate-900 p-3 rounded-xl"
          >
            <span>{player.name}</span>
          <div className="text-right">
            <p>{player.runs} ({player.balls})</p>
            <p className="text-xs text-slate-400">
              Bowl: {formatOvers(player.ballsBowled || 0)} | Runs:{" "}
              {player.runsConceded || 0} | Wkts: {player.wicketsTaken || 0}
            </p>
          </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchHistory({ matchHistory, reloadHistory, deleteMatch }) {
  const groupedMatches = matchHistory.reduce((groups, match) => {
    const date = match.date || "Unknown date";

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(match);
    return groups;
  }, {});

  return (
    <div className="bg-slate-900 p-3 rounded-3xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h2 className="text-3xl font-black">Match History</h2>

        <button
          onClick={reloadHistory}
          className="bg-slate-800 px-5 py-3 rounded-xl font-bold"
        >
          Refresh
        </button>
      </div>

      {matchHistory.length === 0 ? (
        <p className="text-slate-400">No matches saved yet.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedMatches).map(([date, matches]) => {
            const teamAWins = matches.filter(
              (m) => m.winner === m.teamAName
            ).length;
            const teamBWins = matches.filter(
              (m) => m.winner === m.teamBName
            ).length;
            const ties = matches.filter((m) => m.winner === "Tie").length;

            return (
              <div key={date}>
                <div className="mb-2 bg-slate-800 p-4 rounded-2xl">
                  <h3 className="text-2xl font-black">{date}</h3>
                  <p className="text-slate-300">
                    {matches.length} match(es) played | Team A wins:{" "}
                    {teamAWins} | Team B wins: {teamBWins} | Ties: {ties}
                  </p>
                </div>

                <div className="space-y-4">
                  {matches.map((match, index) => (
                    <div key={match.id} className="bg-slate-800 p-5 rounded-2xl">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                        <div>
                          <h4 className="text-xl font-bold">
                            Match {matches.length - index}
                          </h4>
                          <p className="text-green-400 font-bold">
                            {match.result}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <p className="text-slate-300">
                            Overs: {match.overs}
                          </p>

                          <button
                            onClick={() => deleteMatch(match.id)}
                            className="bg-red-500 px-4 py-2 rounded-xl font-bold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mt-2">
                        <HistoryInningsBox innings={match.firstInnings} />
                        <HistoryInningsBox innings={match.secondInnings} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryInningsBox({ innings }) {
  if (!innings) return null;

  return (
    <div className="bg-slate-900 p-4 rounded-xl">
      <h4 className="font-bold">{innings.teamName}</h4>

      <p className="text-2xl font-black">
        {innings.score}/{innings.wickets}
      </p>

      <p className="text-slate-400">
        Overs: {formatOvers(innings.balls)} | Extras: {innings.extras}
      </p>
    </div>
  );
}