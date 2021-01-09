type Base<T, K> = { type: T } & K;

type ValueType<T, K> = Base<T, { value: K }>;

export type Root = Base<
  'root',
  {
    stack?: Token[];
    options?: Token[][];
    flags?: string[];
  }
>;

export type Group = Base<
  'group',
  {
    stack?: Token[];
    options?: Token[][];
    remember: boolean;
    followedBy?: boolean;
    notFollowedBy?: boolean;
    lookBehind?: boolean;
  }
>;

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

export type Token = Group | Position | Set | Range | Repetition | Reference | Char;
export type Tokens = Root | Token;

export type SetTokens = (Range | Char | Set)[];
