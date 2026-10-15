// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Firebase is replaced by stubs: a signed-in scorer and an empty match history.
vi.mock("./firebase", () => ({ auth: {}, db: {} }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth, callback) => {
    callback({ uid: "u1", email: "scorer@example.com" });
    return () => {};
  },
  signOut: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
  addDoc: vi.fn(async () => ({ id: "m1" })),
  deleteDoc: vi.fn(),
}));

const { default: App } = await import("./App");

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function addPlayer(name) {
  fireEvent.change(screen.getByPlaceholderText("Add player name"), { target: { value: name } });
  fireEvent.click(screen.getAllByRole("button", { name: "Add" })[0]);
}

function setUpMatch() {
  render(<App />);
  for (const name of ["Asad", "Bilal", "Chris", "Dev"]) addPlayer(name);
  // Two players to each team; a player leaves the pool list once picked.
  fireEvent.click(screen.getAllByRole("button", { name: "← A" })[0]);
  fireEvent.click(screen.getAllByRole("button", { name: "← A" })[0]);
  fireEvent.click(screen.getAllByRole("button", { name: "B →" })[0]);
  fireEvent.click(screen.getAllByRole("button", { name: "B →" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Start Match" }));
}

describe("scoring a match", () => {
  it("starts with an empty scoreboard", () => {
    setUpMatch();
    expect(screen.getByText("0/0")).toBeTruthy();
    expect(screen.getByText(/Overs: 0\.0 \/ 6/)).toBeTruthy();
  });

  it("asks for a bowler before the first ball", () => {
    setUpMatch();
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(window.alert).toHaveBeenCalledWith("Select a bowler first");
    expect(screen.getByText("0/0")).toBeTruthy();
  });

  it("adds runs, counts legal balls and wides separately", () => {
    setUpMatch();
    const bowler = screen.getByDisplayValue("Select Bowler");
    const option = within(bowler).getAllByRole("option")[1];
    fireEvent.change(bowler, { target: { value: option.value } });

    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(screen.getByText("4/0")).toBeTruthy();
    expect(screen.getByText(/Overs: 0\.1 \/ 6/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Wide" }));
    expect(screen.getByText("5/0")).toBeTruthy();
    expect(screen.getByText(/Overs: 0\.1 \/ 6/)).toBeTruthy();
  });
});
