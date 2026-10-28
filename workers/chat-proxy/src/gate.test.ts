import { describe, expect, it } from "vitest";
import { GATE_FREE_OUTPUT_CHARS, GATE_FREE_TURNS, needsTurnstile } from "./gate.ts";
import type { ChatMessage } from "./request.ts";

const user = (content = "question"): ChatMessage => ({ role: "user", content });
const assistant = (content: string): ChatMessage => ({ role: "assistant", content });

/** A conversation of `turns` questions, each answered with `answerChars` text. */
function conversation(turns: number, answerChars = 100): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (let i = 0; i < turns; i++) {
    messages.push(user(), assistant("a".repeat(answerChars)));
  }
  return messages;
}

describe("needsTurnstile", () => {
  it("leaves the first questions ungated", () => {
    for (let turns = 1; turns <= GATE_FREE_TURNS; turns++) {
      expect(needsTurnstile(conversation(turns))).toBe(false);
    }
  });

  it("gates the question after the free exchanges are used up", () => {
    expect(needsTurnstile([...conversation(GATE_FREE_TURNS), user()])).toBe(true);
  });

  it("gates a conversation that has produced a lot of answer text", () => {
    const long = assistant("a".repeat(GATE_FREE_OUTPUT_CHARS));
    expect(needsTurnstile([user(), long, user()])).toBe(true);
  });

  it("does not gate a short first question, whatever it contains", () => {
    expect(needsTurnstile([user("why is the sky blue?")])).toBe(false);
  });

  it("counts only assistant text toward the output quota", () => {
    // A long *question* is the caller's own text, not generated output.
    expect(needsTurnstile([user("q".repeat(GATE_FREE_OUTPUT_CHARS * 2))])).toBe(false);
  });

  it("treats an empty history as ungated", () => {
    expect(needsTurnstile([])).toBe(false);
  });

  it("ignores the order of the messages when counting", () => {
    expect(
      needsTurnstile([assistant("a".repeat(GATE_FREE_OUTPUT_CHARS)), user(), user()]),
    ).toBe(true);
  });
});
