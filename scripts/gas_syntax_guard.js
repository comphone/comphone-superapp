const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT, 'clasp-ready');

function stripStringsAndComments(source) {
  let out = '';
  let state = 'code';
  let quote = '';

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1] || '';

    if (state === 'line-comment') {
      if (ch === '\n') {
        state = 'code';
        out += '\n';
      } else {
        out += ' ';
      }
      continue;
    }

    if (state === 'block-comment') {
      if (ch === '*' && next === '/') {
        out += '  ';
        i += 1;
        state = 'code';
      } else {
        out += ch === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (state === 'string') {
      if (ch === '\\') {
        out += ' ';
        if (i + 1 < source.length) {
          out += source[i + 1] === '\n' ? '\n' : ' ';
          i += 1;
        }
        continue;
      }
      if (ch === quote) {
        out += ' ';
        state = 'code';
        quote = '';
      } else {
        out += ch === '\n' ? '\n' : ' ';
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      out += '  ';
      i += 1;
      state = 'line-comment';
      continue;
    }
    if (ch === '/' && next === '*') {
      out += '  ';
      i += 1;
      state = 'block-comment';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      out += ' ';
      state = 'string';
      quote = ch;
      continue;
    }
    out += ch;
  }

  return out;
}

function lineCol(source, index) {
  const before = source.slice(0, index);
  const lines = before.split(/\r?\n/);
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function checkFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  if (!original.trim()) return `${path.relative(ROOT, file)} is empty`;
  if (/^<{7}|^={7}|^>{7}/m.test(original)) return `${path.relative(ROOT, file)} contains merge-conflict markers`;

  const withoutLineComments = original.replace(/\/\/.*$/gm, '');
  const openBlockComments = (withoutLineComments.match(/\/\*/g) || []).length;
  const closeBlockComments = (withoutLineComments.match(/\*\//g) || []).length;
  if (openBlockComments !== closeBlockComments) {
    return `${path.relative(ROOT, file)} has unbalanced block comments`;
  }

  const stripped = stripStringsAndComments(original);
  const functionMatches = stripped.match(/\bfunction\s+[A-Za-z0-9_$]+\s*\(/g) || [];
  if (/\bfunction\b/.test(stripped) && functionMatches.length === 0) {
    return `${path.relative(ROOT, file)} has a malformed function declaration`;
  }
  return '';
}

function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error('[GAS Syntax Guard] Missing clasp-ready directory');
    process.exit(1);
  }
  const files = fs.readdirSync(TARGET_DIR)
    .filter(name => name.endsWith('.gs'))
    .map(name => path.join(TARGET_DIR, name))
    .sort();
  const failures = files.map(checkFile).filter(Boolean);

  if (failures.length) {
    console.error('[GAS Syntax Guard] FAILED');
    failures.forEach(item => console.error(`- ${item}`));
    process.exit(1);
  }

  console.log(`[GAS Syntax Guard] OK files=${files.length}`);
}

main();
