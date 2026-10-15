import { describe, expect, it } from "vitest";
import {
  createPlayer,
  formatOvers,
  inningsEnd,
  isEndOfOver,
  isExtraBall,
  resetPlayerStats,
  statsByDate,
  strikeRate,
} from "./cricket";

describe("overs", () => {
  it("writes balls in cricket notation", () => {
    expect(formatOvers(0)).toBe("0.0");
    expect(formatOvers(14)).toBe("2.2");
    expect(formatOvers(36)).toBe("6.0");
    expect(formatOvers(undefined)).toBe("0.0");
  });

  it("ends an over after six legal balls only", () => {
    expect(isEndOfOver(6)).toBe(true);
    expect(isEndOfOver(12)).toBe(true);
    expect(isEndOfOver(0)).toBe(false);
    expect(isEndOfOver(7)).toBe(false);
  });

  it("treats wides and no-balls as extras", () => {
    expect(isExtraBall("WD")).toBe(true);
    expect(isExtraBall("NB")).toBe(true);
    expect(isExtraBall(4)).toBe(false);
    expect(isExtraBall("W")).toBe(false);
  });
});

describe("players", () => {
  it("start with clean figures and a unique id", () => {
    const a = createPlayer("Asad");
    const b = createPlayer("Bilal", "nonRegular");
    expect(a).toMatchObject({
      name: "Asad",
      type: "regular",
      runs: 0,
      balls: 0,
      wicketsTaken: 0,
      out: false,
    });
    expect(b.type).toBe("nonRegular");
    expect(a.id).not.toBe(b.id);
  });

  it("keep their names and ids when figures are reset for a new match", () => {
    const p = { ...createPlayer("Asad"), runs: 42, balls: 30, out: true, wicketsTaken: 2 };
    const [r] = resetPlayerStats([p]);
    expect(r).toMatchObject({
      id: p.id,
      name: "Asad",
      runs: 0,
      balls: 0,
      out: false,
      wicketsTaken: 0,
    });
  });

  it("have a strike rate per 100 balls", () => {
    expect(strikeRate(30, 20)).toBe("150.00");
    expect(strikeRate(0, 0)).toBe("0.00");
  });
});

describe("end of innings", () => {
  const base = {
    score: 50,
    balls: 20,
    wickets: 2,
    playerCount: 6,
    maxBalls: 36,
    inningsNumber: 1,
    target: null,
    lastManStanding: false,
  };

  it("is all out one wicket earlier without last man standing", () => {
    expect(inningsEnd({ ...base, wickets: 5 }).allOut).toBe(true);
    expect(inningsEnd({ ...base, wickets: 5, lastManStanding: true }).allOut).toBe(false);
    expect(inningsEnd({ ...base, wickets: 6, lastManStanding: true }).allOut).toBe(true);
  });

  it("ends when the overs run out", () => {
    expect(inningsEnd({ ...base, balls: 36 })).toMatchObject({ oversFinished: true, over: true });
    expect(inningsEnd(base).over).toBe(false);
  });

  it("ends the chase once the target is reached", () => {
    expect(inningsEnd({ ...base, inningsNumber: 2, target: 51, score: 51 }).targetReached).toBe(
      true,
    );
    expect(inningsEnd({ ...base, inningsNumber: 2, target: 51, score: 50 }).targetReached).toBe(
      false,
    );
    expect(inningsEnd({ ...base, inningsNumber: 1, target: 51, score: 80 }).targetReached).toBe(
      false,
    );
  });
});

describe("player stats by date", () => {
  const match = (date, players) => ({
    date,
    teamAPlayers: players.slice(0, 1),
    teamBPlayers: players.slice(1),
  });

  it("adds up each player's figures per day, newest day first, top scorer first", () => {
    const history = [
      match("2026-05-03", [
        { name: "Asad", runs: 20, balls: 15, ballsBowled: 12, wicketsTaken: 1 },
        { name: "Bilal", runs: 35, balls: 20 },
      ]),
      match("2026-05-03", [
        { name: "Asad", runs: 10, balls: 5, ballsBowled: 6, wicketsTaken: 2 },
        { name: "Bilal", runs: 0, balls: 2 },
      ]),
      match("2026-05-10", [
        { name: "Asad", runs: 5, balls: 4 },
        { name: "Bilal", runs: 8, balls: 9 },
      ]),
    ];
    const [[latest], [day, players]] = statsByDate(history);
    expect(latest).toBe("2026-05-10");
    expect(day).toBe("2026-05-03");
    expect(players.map((p) => p.name)).toEqual(["Bilal", "Asad"]);
    expect(players[1]).toMatchObject({
      runs: 30,
      balls: 20,
      ballsBowled: 18,
      wicketsTaken: 3,
      matches: 2,
    });
  });

  it("reads older saved matches that stored players per innings", () => {
    const old = [
      {
        date: "2026-04-26",
        firstInnings: { players: [{ name: "Asad", runs: 12 }] },
        secondInnings: { players: [{ name: "Bilal", runs: 3 }] },
      },
    ];
    const [[, players]] = statsByDate(old);
    expect(players.map((p) => [p.name, p.runs])).toEqual([
      ["Asad", 12],
      ["Bilal", 3],
    ]);
  });
});
