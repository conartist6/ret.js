import * as util from './util';
import { Group, Root, Token } from './token-types';
import * as sets from './sets';

/**
 * Tokenizes a regular expression (that is currently a string)
 * @param {string} regexpStr String of regular expression to be tokenized
 *
 * @returns {Root}
 */
export const tokenizer = (regexpStr: string): Root => {
  let i = 0,
    c: string;
  const start: Root = { type: 'root', stack: [] };

  // Keep track of last clause/group and stack.
  let lastGroup: Group | Root = start;
  let last: Token[] = start.stack;
  const groupStack: (Group | Root)[] = [];

  const repeatErr = (col: number) => {
    throw new SyntaxError(
      `Invalid regular expression: /${regexpStr}/: Nothing to repeat at column ${col - 1}`,
    );
  };

  // Decode a few escaped characters.
  const str = util.strToChars(regexpStr);

  // Iterate through each character in string.
  while (i < str.length) {
    switch ((c = str[i++])) {
      // Handle escaped characters, inclues a few sets.
      case '\\':
        switch ((c = str[i++])) {
          case 'b':
            last.push({ type: 'position', value: 'b' });
            break;

          case 'B':
            last.push({ type: 'position', value: 'B' });
            break;

          case 'w':
            last.push(sets.words());
            break;

          case 'W':
            last.push(sets.notWords());
            break;

          case 'd':
            last.push(sets.ints());
            break;

          case 'D':
            last.push(sets.notInts());
            break;

          case 's':
            last.push(sets.whitespace());
            break;

          case 'S':
            last.push(sets.notWhitespace());
            break;

          default:
            // Check if c is integer.
            // In which case it's a reference.
            if (/\d/.test(c)) {
              last.push({ type: 'reference', value: parseInt(c, 10) });

              // Escaped character.
            } else {
              last.push({ type: 'char', value: c.charCodeAt(0) });
            }
        }

        break;

      // Positionals.
      case '^':
        last.push({ type: 'position', value: '^' });
        break;

      case '$':
        last.push({ type: 'position', value: '$' });
        break;

      // Handle custom sets.
      case '[': {
        // Check if this class is 'anti' i.e. [^abc].
        let not;
        if (str[i] === '^') {
          not = true;
          i++;
        } else {
          not = false;
        }

        // Get all the characters in class.
        const classTokens = util.tokenizeClass(str.slice(i), regexpStr);

        // Increase index by length of class.
        i += classTokens[1];
        last.push({
          type: 'set',
          set: classTokens[0],
          not,
        });

        break;
      }

      // Class of any character except \n.
      case '.':
        last.push(sets.anyChar());
        break;

      // Push group onto stack.
      case '(': {
        // Create group.
        const group: Group = {
          type: 'group',
          stack: [],
          remember: true,
        };

        // If if this is a special kind of group.
        if (str[i] === '?') {
          c = str[i + 1];
          i += 2;

          // Match if followed by.
          if (c === '=') {
            group.followedBy = true;

            // Match if not followed by.
          } else if (c === '!') {
            group.notFollowedBy = true;
          } else if (c !== ':') {
            throw new SyntaxError(
              `Invalid regular expression: /${regexpStr}/: Invalid group, character '${c}'` +
                ` after '?' at column ${i - 1}`,
            );
          }

          group.remember = false;
        }

        // Insert subgroup into current group stack.
        last.push(group);

        // Remember the current group for when the group closes.
        groupStack.push(lastGroup);

        // Make this new group the current group.
        lastGroup = group;
        last = group.stack;

        break;
      }

      // Pop group out of stack.
      case ')':
        if (groupStack.length === 0) {
          throw new SyntaxError(
            `Invalid regular expression: /${regexpStr}/: Unmatched ) at column ${i - 1}`,
          );
        }
        lastGroup = groupStack.pop();

        // Check if this group has a PIPE.
        // To get back the correct last stack.
        last = lastGroup.options
          ? lastGroup.options[lastGroup.options.length - 1]
          : lastGroup.stack;

        break;

      // Use pipe character to give more choices.
      case '|': {
        // Create array where options are if this is the first PIPE
        // in this clause.
        if (!lastGroup.options) {
          lastGroup.options = [lastGroup.stack];
          delete lastGroup.stack;
        }
        // Create a new stack and add to options for rest of clause.
        const stack: Token[] = [];
        lastGroup.options.push(stack);
        last = stack;

        break;
      }

      // Repetition.
      // For every repetition, remove last element from last stack
      // then insert back a RANGE object.
      // This design is chosen because there could be more than
      // one repetition symbols in a regex i.e. `a?+{2,3}`.
      case '{': {
        const rs = /^(\d+)(,(\d+)?)?\}/.exec(str.slice(i));
        let min, max;
        if (rs !== null) {
          if (last.length === 0) {
            repeatErr(i);
          }
          min = parseInt(rs[1], 10);
          max = rs[2] ? (rs[3] ? parseInt(rs[3], 10) : Infinity) : min;
          i += rs[0].length;

          last.push({
            type: 'repetition',
            min,
            max,
            value: last.pop(),
          });
        } else {
          last.push({
            type: 'char',
            value: 123,
          });
        }

        break;
      }

      case '?':
        if (last.length === 0) {
          repeatErr(i);
        }
        last.push({
          type: 'repetition',
          min: 0,
          max: 1,
          value: last.pop(),
        });
        break;

      case '+':
        if (last.length === 0) {
          repeatErr(i);
        }
        last.push({
          type: 'repetition',
          min: 1,
          max: Infinity,
          value: last.pop(),
        });

        break;

      case '*':
        if (last.length === 0) {
          repeatErr(i);
        }
        last.push({
          type: 'repetition',
          min: 0,
          max: Infinity,
          value: last.pop(),
        });

        break;

      // Default is a character that is not `\[](){}?+*^$`.
      default:
        last.push({
          type: 'char',
          value: c.charCodeAt(0),
        });
    }
  }

  // Check if any groups have not been closed.
  if (groupStack.length !== 0) {
    throw new SyntaxError(`Invalid regular expression: /${regexpStr}/: Unterminated group`);
  }

  return start;
};
