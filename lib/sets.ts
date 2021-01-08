import { Set, Range, Char } from './token-types';

type SetsFunc = () => (Range | Char)[]
export type SetFunc = () => Set

const INTS: SetsFunc = () => [{ type: 'range', from: 48, to: 57 }];

const WORDS: SetsFunc = () => [
  { type: 'char', value: 95 },
  { type: 'range', from: 97, to: 122 },
  { type: 'range', from: 65, to: 90 },
  { type: 'range', from: 48, to: 57 },
];

const WHITESPACE: SetsFunc = () => [
  { type: 'char', value: 9 },
  { type: 'char', value: 10 },
  { type: 'char', value: 11 },
  { type: 'char', value: 12 },
  { type: 'char', value: 13 },
  { type: 'char', value: 32 },
  { type: 'char', value: 160 },
  { type: 'char', value: 5760 },
  { type: 'range', from: 8192, to: 8202 },
  { type: 'char', value: 8232 },
  { type: 'char', value: 8233 },
  { type: 'char', value: 8239 },
  { type: 'char', value: 8287 },
  { type: 'char', value: 12288 },
  { type: 'char', value: 65279 },
];

const NOTANYCHAR: SetsFunc = () => [
  { type: 'char', value: 10 },
  { type: 'char', value: 13 },
  { type: 'char', value: 8232 },
  { type: 'char', value: 8233 },
];

// Predefined class objects.
export const words: SetFunc = () => ({ type: 'set', set: WORDS(), not: false });
export const notWords: SetFunc = () => ({ type: 'set', set: WORDS(), not: true });
export const ints: SetFunc = () => ({ type: 'set', set: INTS(), not: false });
export const notInts: SetFunc = () => ({ type: 'set', set: INTS(), not: true });
export const whitespace: SetFunc = () => ({ type: 'set', set: WHITESPACE(), not: false });
export const notWhitespace: SetFunc = () => ({ type: 'set', set: WHITESPACE(), not: true });
export const anyChar: SetFunc = () => ({ type: 'set', set: NOTANYCHAR(), not: true });
