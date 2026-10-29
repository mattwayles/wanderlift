/**
 * Renders nothing. Mounted by the Workout screen for as long as a workout is on screen: it shows
 * the workout on the Apple Watch (`state`, deduped by `publishActive`) and hands the watch's
 * commands to the screen's own handler. Its own component rather than hooks in the screen because
 * the screen returns early while loading, and hooks cannot follow an early return.
 *
 * The handler is read through a ref, so a command is always applied by the render's latest
 * closure (the set on deck as it is now), never by one captured when the bridge mounted.
 */
import { useEffect, useRef } from 'react';
import {
  clearWatchActive,
  dispatchWatchCommands,
  publishActive,
  registerWatchHandler,
  type WatchActiveInput,
} from '../lib/workoutWatch';
import type { WatchCommand } from '../lib/watchProtocol';

export default function WatchBridge({
  sessionId,
  state,
  onCommand,
}: {
  sessionId: string;
  state: WatchActiveInput;
  onCommand: (command: WatchCommand) => void;
}): null {
  const latest = useRef(onCommand);
  latest.current = onCommand;

  // No deps array: it re-checks every render, and an unchanged state sends nothing.
  useEffect(() => {
    publishActive(state);
  });

  useEffect(() => {
    const unregister = registerWatchHandler((command) => {
      if ('sessionId' in command && command.sessionId !== sessionId) return;
      latest.current(command);
    });
    // A command that arrived while this screen was not yet listening.
    dispatchWatchCommands();
    return () => {
      unregister();
      clearWatchActive(sessionId, false);
    };
  }, [sessionId]);

  return null;
}
