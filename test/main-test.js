const vows = require('vows');
const assert = require('assert');
const sets = require('../dist/sets');
const ret = require('../dist');
const { EXPRESSION, LOOKAHEAD, POSITION, SET, RANGE, REPETITION, REFERENCE, CHAR } = ret.types;

const char = (c) => ({ type: CHAR, value: c.charCodeAt(0) });

const charStr = (str) => str.split('').map(char);

vows
  .describe('Regexp Tokenizer')
  .addBatch({
    'No special characters': {
      topic: ret('walnuts'),

      'List of char tokens': (t) => {
        assert.deepStrictEqual(t, {
          type: EXPRESSION,
          captureIdx: 0,
          options: [charStr('walnuts')],
        });
      },
    },

    Positionals: {
      '^ and $ in': {
        'one liner': {
          topic: ret('^yes$'),
          'Positionals at beginning and end': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  { type: POSITION, value: '^' },
                  char('y'),
                  char('e'),
                  char('s'),
                  { type: POSITION, value: '$' },
                ],
              ],
            });
          },
        },
      },

      '\\b and \\B': {
        topic: ret('\\bbeginning\\B'),
        'Word boundary at beginning': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              [
                { type: POSITION, value: 'b' },
                char('b'),
                char('e'),
                char('g'),
                char('i'),
                char('n'),
                char('n'),
                char('i'),
                char('n'),
                char('g'),
                { type: POSITION, value: 'B' },
              ],
            ],
          });
        },
      },
    },

    'Predefined sets': {
      topic: ret('\\w\\W\\d\\D\\s\\S.'),

      'Words set': (t) => {
        assert.isArray(t.options[0]);
        assert.deepStrictEqual(t.options[0][0], sets.words());
      },

      'Non-Words set': (t) => {
        assert.isArray(t.options[0]);
        assert.deepStrictEqual(t.options[0][1], sets.notWords());
      },

      'Integer set': (t) => {
        assert.isArray(t.options[0]);
        assert.deepStrictEqual(t.options[0][2], sets.ints());
      },

      'Non-Integer set': (t) => {
        assert.isArray(t.options[0]);
        assert.deepStrictEqual(t.options[0][3], sets.notInts());
      },

      'Whitespace set': (t) => {
        assert.isArray(t.options[0]);
        assert.deepStrictEqual(t.options[0][4], sets.whitespace());
      },

      'Non-Whitespace set': (t) => {
        assert.isArray(t.options[0]);
        assert.deepStrictEqual(t.options[0][5], sets.notWhitespace());
      },

      'Any character set': (t) => {
        assert.isArray(t.options[0]);
        assert.deepStrictEqual(t.options[0][6], sets.anyChar());
      },
    },

    'Custom sets': {
      topic: ret('[$!a-z123] thing [^0-9]'),

      'Class contains all characters and range': (t) => {
        assert.deepStrictEqual(t, {
          type: EXPRESSION,
          captureIdx: 0,
          options: [
            [
              {
                type: SET,
                set: [
                  char('$'),
                  char('!'),
                  { type: RANGE, from: 'a'.charCodeAt(0), to: 'z'.charCodeAt(0) },
                  char('1'),
                  char('2'),
                  char('3'),
                ],
                not: false,
              },

              char(' '),
              char('t'),
              char('h'),
              char('i'),
              char('n'),
              char('g'),
              char(' '),

              {
                type: SET,
                set: [
                  {
                    type: RANGE,
                    from: '0'.charCodeAt(0),
                    to: '9'.charCodeAt(0),
                  },
                ],
                not: true,
              },
            ],
          ],
        });
      },
      'Whitespace characters': {
        topic: ret('[\t\r\n\u2028\u2029 ]'),

        'Class contains some whitespace characters (not included in .)': (t) => {
          const LINE_SEPARATOR = '\u2028';
          const PAGE_SEPARATOR = '\u2029';

          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              [
                {
                  type: SET,
                  set: [
                    char('\t'),
                    char('\r'),
                    char('\n'),
                    char(LINE_SEPARATOR),
                    char(PAGE_SEPARATOR),
                    char(' '),
                  ],
                  not: false,
                },
              ],
            ],
          });
        },
      },
    },

    'Two sets in a row with dash in between': {
      topic: ret('[01]-[ab]'),
      'Contains both classes and no range': (t) => {
        assert.deepStrictEqual(t, {
          type: EXPRESSION,
          captureIdx: 0,
          options: [
            [
              { type: SET, set: charStr('01'), not: false },
              char('-'),
              { type: SET, set: charStr('ab'), not: false },
            ],
          ],
        });
      },
    },

    '| (Pipe)': {
      topic: ret('foo|bar|za'),

      'Returns root object with options': (t) => {
        assert.deepStrictEqual(t, {
          type: EXPRESSION,
          captureIdx: 0,
          options: [charStr('foo'), charStr('bar'), charStr('za')],
        });
      },
    },

    Group: {
      'with no special characters': {
        topic: ret('hey (there)'),

        'Token list contains group token': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              [
                char('h'),
                char('e'),
                char('y'),
                char(' '),
                { type: EXPRESSION, captureIdx: 1, options: [charStr('there')] },
              ],
            ],
          });
        },
      },

      'that is not remembered': {
        topic: ret('(?:loner)'),

        'Remember is false on the group object': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              [
                {
                  type: EXPRESSION,
                  captureIdx: null,
                  options: [charStr('loner')],
                },
              ],
            ],
          });
        },
      },

      'matched previous clause if not followed by this': {
        topic: ret('what(?!ever)'),

        'Returns a group': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              [
                char('w'),
                char('h'),
                char('a'),
                char('t'),
                {
                  type: LOOKAHEAD,
                  not: true,
                  options: [charStr('ever')],
                },
              ],
            ],
          });
        },
      },

      'matched next clause': {
        topic: ret('hello(?= there)'),

        'Returns a group': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              [
                char('h'),
                char('e'),
                char('l'),
                char('l'),
                char('o'),
                {
                  type: LOOKAHEAD,
                  not: false,
                  options: [charStr(' there')],
                },
              ],
            ],
          });
        },
      },

      'with subgroup': {
        topic: ret('a(b(c|(?:d))fg) @_@'),

        'Groups within groups': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              [
                char('a'),
                {
                  type: EXPRESSION,
                  captureIdx: 1,
                  options: [
                    [
                      char('b'),
                      {
                        type: EXPRESSION,
                        captureIdx: 2,
                        options: [
                          [char('c')],
                          [{ type: EXPRESSION, captureIdx: null, options: [charStr('d')] }],
                        ],
                      },
                      char('f'),
                      char('g'),
                    ],
                  ],
                },

                char(' '),
                char('@'),
                char('_'),
                char('@'),
              ],
            ],
          });
        },
      },
    },

    'Custom repetition with': {
      'exact amount': {
        topic: ret('(?:pika){2}'),

        'Min and max are the same': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              [
                {
                  type: REPETITION,
                  min: 2,
                  max: 2,
                  value: {
                    type: EXPRESSION,
                    captureIdx: null,
                    options: [charStr('pika')],
                  },
                },
              ],
            ],
          });
        },
      },

      'minimum amount only': {
        topic: ret('NO{6,}'),

        'To infinity': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [[char('N'), { type: REPETITION, min: 6, max: Infinity, value: char('O') }]],
          });
        },
      },

      'both minimum and maximum': {
        topic: ret('pika\\.\\.\\. chu{3,20}!{1,2}'),

        'Min and max differ and min < max': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              charStr('pika... ch').concat([
                { type: REPETITION, min: 3, max: 20, value: char('u') },
                { type: REPETITION, min: 1, max: 2, value: char('!') },
              ]),
            ],
          });
        },
      },

      'Brackets around a non-repetitional': {
        topic: ret('a{mustache}'),

        'Returns a non-repetitional': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [charStr('a{mustache}')],
          });
        },
      },
    },

    'Predefined repetitional': {
      '? (Optional)': {
        topic: ret('hey(?: you)?'),

        'Get back correct min and max': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              charStr('hey').concat([
                {
                  type: REPETITION,
                  min: 0,
                  max: 1,
                  value: {
                    type: EXPRESSION,
                    captureIdx: null,
                    options: [charStr(' you')],
                  },
                },
              ]),
            ],
          });
        },
      },

      '+ (At least one)': {
        topic: ret('(no )+'),

        'Correct min and max': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              [
                {
                  type: REPETITION,
                  min: 1,
                  max: Infinity,
                  value: {
                    type: EXPRESSION,
                    captureIdx: 1,
                    options: [charStr('no ')],
                  },
                },
              ],
            ],
          });
        },
      },

      '* (Any amount)': {
        topic: ret('XF*D'),

        '0 to Infinity': (t) => {
          assert.deepStrictEqual(t, {
            type: EXPRESSION,
            captureIdx: 0,
            options: [
              [char('X'), { type: REPETITION, min: 0, max: Infinity, value: char('F') }, char('D')],
            ],
          });
        },
      },
    },

    Reference: {
      topic: ret('<(\\w+)>\\w*<\\1>'),

      'Reference a group': (t) => {
        assert.deepStrictEqual(t, {
          type: EXPRESSION,
          captureIdx: 0,
          options: [
            [
              char('<'),
              {
                type: EXPRESSION,
                captureIdx: 1,
                options: [
                  [
                    {
                      type: REPETITION,
                      min: 1,
                      max: Infinity,
                      value: sets.words(),
                    },
                  ],
                ],
              },
              char('>'),
              { type: REPETITION, min: 0, max: Infinity, value: sets.words() },
              char('<'),
              { type: REFERENCE, value: 1 },
              char('>'),
            ],
          ],
        });
      },
    },

    'Range (in set) test cases': {
      'Testing complex range cases': {
        'token.from is a hyphen and the range is preceded by a single character [a\\--\\-]': {
          topic: ret('[a\\--\\-]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [
                      { type: CHAR, value: 97 },
                      { type: RANGE, from: 45, to: 45 },
                    ],
                  },
                ],
              ],
            });
          },
        },
        'token.from is a hyphen and the range is preceded by a single character [a\\--\\/]': {
          topic: ret('[a\\--\\/]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [
                      { type: CHAR, value: 97 },
                      { type: RANGE, from: 45, to: 47 },
                    ],
                  },
                ],
              ],
            });
          },
        },
        'token.from is a hyphen and the range is preceded by a single character [c\\--a]': {
          topic: ret('[c\\--a]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [
                      { type: CHAR, value: 99 },
                      { type: RANGE, from: 45, to: 97 },
                    ],
                  },
                ],
              ],
            });
          },
        },
        'token.from is a hyphen and the range is preceded by a single character [\\-\\--\\-]': {
          topic: ret('[\\-\\--\\-]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [
                      { type: CHAR, value: 45 },
                      { type: RANGE, from: 45, to: 45 },
                    ],
                  },
                ],
              ],
            });
          },
        },
        'token.from is a hyphen and the range is preceded by a predefined set [\\w\\--\\-]': {
          topic: ret('[\\w\\--\\-]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [
                      {
                        type: SET,
                        not: false,
                        set: [
                          { type: CHAR, value: 95 },
                          { type: RANGE, from: 97, to: 122 },
                          { type: RANGE, from: 65, to: 90 },
                          { type: RANGE, from: 48, to: 57 },
                        ],
                      },
                      { type: RANGE, from: 45, to: 45 },
                    ],
                  },
                ],
              ],
            });
          },
        },
        'token.from is a caret and the range is the first item of the set [9-\\^]': {
          topic: ret('[9-\\^]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [{ type: RANGE, from: 57, to: 94 }],
                  },
                ],
              ],
            });
          },
        },
        'token.to is a closing square bracket [2-\\]]': {
          topic: ret('[2-\\]]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [{ type: RANGE, from: 50, to: 93 }],
                  },
                ],
              ],
            });
          },
        },
        'token.to is a closing square bracket [\\]-\\^]': {
          topic: ret('[\\]-\\^]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [{ type: RANGE, from: 93, to: 94 }],
                  },
                ],
              ],
            });
          },
        },
        'token.to is a closing square bracket [[-\\]]': {
          topic: ret('[[-\\]]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [{ type: RANGE, from: 91, to: 93 }],
                  },
                ],
              ],
            });
          },
        },
        'token.to is a closing square bracket [[-]]': {
          topic: ret('[[-]]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [
                      { type: CHAR, value: 91 },
                      { type: CHAR, value: 45 },
                    ],
                  },
                  {
                    type: CHAR,
                    value: 93,
                  },
                ],
              ],
            });
          },
        },
        'token.from is a caret [\\^-_]': {
          topic: ret('[\\^-_]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [{ type: RANGE, from: 94, to: 95 }],
                  },
                ],
              ],
            });
          },
        },
        'token.from is a caret [\\^-^]': {
          topic: ret('[\\^-^]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [{ type: RANGE, from: 94, to: 94 }],
                  },
                ],
              ],
            });
          },
        },
        'token.from is a caret and set is negated [^\\^-_]': {
          topic: ret('[^\\^-_]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: true,
                    set: [{ type: RANGE, from: 94, to: 95 }],
                  },
                ],
              ],
            });
          },
        },
        'token.from is a caret [\\^-^] and set is negated': {
          topic: ret('[^\\^-^]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: true,
                    set: [{ type: RANGE, from: 94, to: 94 }],
                  },
                ],
              ],
            });
          },
        },
        'Contains emtpy set': {
          topic: ret('[]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              captureIdx: 0,
              options: [
                [
                  {
                    type: SET,
                    not: false,
                    set: [],
                  },
                ],
              ],
            });
          },
        },
        'Contains emtpy negated set': {
          topic: ret('[^]'),
          'Tokenizes correctly': (t) => {
            assert.deepStrictEqual(t, {
              type: EXPRESSION,
              options: [
                [
                  {
                    type: SET,
                    not: true,
                    set: [],
                  },
                ],
              ],
              captureIdx: 0,
            });
          },
        },
      },
    },
  })
  .export(module);
