type Base<T, K> = { type: T } & K;

type ValueType<T, K> = Base<T, { value: K }>;

export type Expression = Base<
  'expression',
  {
    options: Token[][];
    captureIdx: number | null;
  }
>;

export type Lookahead = Base<
  'lookahead',
  {
    options: Token[][];
    not: boolean;
  }
>;

export type Lookbehind = Base<
  'lookbehind',
  {
    options: Token[][];
    not: boolean;
  }
>;

export type Group = Expression | Lookahead | Lookbehind;

export type Set = Base<
  'set',
  {
    set: SetTokens;
    not: boolean;
  }
>;

export type Range = Base<
  'range',
  {
    from: number;
    to: number;
  }
>;

export type Repetition = Base<
  'repetition',
  {
    min: number;
    max: number;
    value: Token;
  }
>;

export type Position = ValueType<'position', '$' | '^' | 'b' | 'B'>;
export type Reference = ValueType<'reference', number>;
export type Char = ValueType<'char', number>;

export type Token =
  | Expression
  | Lookahead
  | Lookbehind
  | Position
  | Set
  | Range
  | Repetition
  | Reference
  | Char;

export type SetTokens = (Range | Char | Set)[];
