/**
 * The state and command shapes exist twice, in TypeScript (what the phone sends and reads) and in
 * Swift (what the watch decodes and encodes). Nothing at build time connects them: a field added on
 * one side decodes to nothing on the other, silently. This does, by comparing the field names.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { WATCH_PROTOCOL_VERSION, decodeCommand, encodeState, IDLE_STATE } from './watchProtocol';

const APP = join(__dirname, '..', '..');
const ts = readFileSync(join(APP, 'src/lib/watchProtocol.ts'), 'utf8');
const swift = readFileSync(join(APP, 'targets/watch/WatchProtocol.swift'), 'utf8');

/** Field names of `export interface Name { ... }` (top level of its body only). */
function tsFields(name: string): string[] {
  const start = ts.indexOf(`export interface ${name} {`);
  expect(start).toBeGreaterThan(-1);
  const body = ts.slice(start, ts.indexOf('\n}', start));
  return [...body.matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]).sort();
}

/** Stored property names of `struct Name: ... {`; computed properties and statics are skipped. */
function swiftFields(name: string): string[] {
  const start = swift.indexOf(`struct ${name}:`);
  expect(start).toBeGreaterThan(-1);
  const body = swift.slice(start, swift.indexOf('\n}', start));
  return [...body.matchAll(/^ {2}var (\w+): [\w?]+( = .+)?$/gm)].map((m) => m[1]).sort();
}

describe('the TypeScript and Swift protocols agree', () => {
  it.each([
    'WatchSet',
    'WatchRest',
    'WatchHold',
    'WatchFeedback',
    'WatchActive',
    'WatchReady',
    'WatchState',
  ])('%s has the same fields', (name) => {
    expect(swiftFields(name)).toEqual(tsFields(name));
  });

  it('WatchCommand has every field any command body carries, plus the envelope', () => {
    const body = ts
      .slice(ts.indexOf('export type WatchCommandBody ='), ts.indexOf('export type WatchCommand ='))
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const fromBodies = [...body.matchAll(/(\w+)\??: [^;,}]+/g)].map((m) => m[1]);
    const expected = [...new Set([...fromBodies, 'v', 'id', 'atMs'])].sort();
    expect(swiftFields('WatchCommand')).toEqual(expected);
  });

  it('the Swift protocol version is the TypeScript one', () => {
    expect(swift).toContain(`let watchProtocolVersion = ${WATCH_PROTOCOL_VERSION}`);
  });
});

describe('decodeCommand', () => {
  it('accepts a command of this version and rejects the rest', () => {
    const good = JSON.stringify({ v: WATCH_PROTOCOL_VERSION, id: 'a', atMs: 1, type: 'pause' });
    expect(decodeCommand(good)?.type).toBe('pause');
    expect(decodeCommand(JSON.stringify({ v: 2, id: 'a', type: 'pause' }))).toBeNull();
    expect(decodeCommand('{')).toBeNull();
    expect(decodeCommand('null')).toBeNull();
  });
});

it('encodes a state the watch can read', () => {
  const state = JSON.parse(encodeState({ ...IDLE_STATE, rev: 5 }));
  expect(state).toEqual({
    v: WATCH_PROTOCOL_VERSION,
    rev: 5,
    mode: 'idle',
    ready: null,
    active: null,
  });
});
