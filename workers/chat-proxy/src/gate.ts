// When a request must prove it comes from a person, decided in one place.
//
// This is a usage quota, not a per-request switch. The first questions of a
// conversation are answered with no verification at all; only a conversation
// that keeps going — or one that has already pulled a lot of generated text
// through the prompt — is asked for a Turnstile token.
//
// Why not gate every request: the widget can only issue a token where the
// challenge can actually complete, and on some of the networks this blog is read
// from it never does (the site's own .cn deployment is one). A gate on the first
// message therefore makes the chat unusable for those readers while adding
// almost nothing against abuse: a script that wants to burn tokens can hold a
// conversation open as easily as a reader can. Charging verification at the
// point where the cost has already started accumulating keeps the endpoint
// useful for a curious reader and still bounds what an unattended script gets
// for free.
//
// `ChatWidget.svelte` in the site repo carries the same rule (its own copy, in
// src/utils/chat-gate.ts) so it can hide the widget until it is needed. Both
// count the same payload, so they agree without either trusting the other.

import type { ChatMessage } from './request.ts';

/** Exchanges answered before a challenge is required. */
export const GATE_FREE_TURNS = 3;

/**
 * Assistant text (in characters) a conversation may accumulate before a
 * challenge is required. Long answers count even when the reader has only asked
 * once or twice, because they are what costs tokens upstream.
 */
export const GATE_FREE_OUTPUT_CHARS = 4000;

/**
 * Whether the turns that will be sent — including the question being asked now —
 * need a Turnstile token.
 */
export function needsTurnstile(messages: readonly ChatMessage[]): boolean {
  let userTurns = 0;
  let assistantChars = 0;
  for (const message of messages) {
    if (message.role === 'user') {
      userTurns += 1;
    } else if (message.role === 'assistant') {
      assistantChars += message.content.length;
    }
  }
  return userTurns > GATE_FREE_TURNS || assistantChars >= GATE_FREE_OUTPUT_CHARS;
}
