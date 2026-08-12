import { EventEmitter } from "node:events";

/**
 * In-process fan-out for the Crew chat. A POST to the messages endpoint
 * publishes here and every open SSE stream for that listing wakes up
 * immediately instead of waiting for its next poll.
 *
 * The SSE handler still polls the database on a timer, so correctness does not
 * depend on this bus: if the app is ever run behind more than one Node process,
 * messages still arrive, just up to one poll interval later.
 */
const globalForBus = globalThis as unknown as {
  __squadFinderBus?: EventEmitter;
};

const bus = (globalForBus.__squadFinderBus ??= (() => {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  return emitter;
})());

export function publishCrewMessage(listingId: string): void {
  bus.emit(`crew:${listingId}`);
}

export function subscribeCrew(listingId: string, onEvent: () => void): () => void {
  const channel = `crew:${listingId}`;
  bus.on(channel, onEvent);
  return () => bus.off(channel, onEvent);
}
