// ---------------------------------------------------------------------------
// One Line, One Laugh — v2 entry generator
//
// What this script does, in one sentence: it materialises a single joke
// (one line, no trailing newline) as `$MAKEFUN_OUTPUT_DIR/entry.txt`.
//
// Design notes
//   * Runtime: Node 22, standard library only. No network, no randomness,
//     no clock reads, no environment reads beyond the output directory.
//   * The joke is assembled from its four clauses so the line breaks in
//     the source never leak into the output: the clauses are joined with
//     single spaces, which is exactly how the sentence is punctuated.
//   * Validation is done on the assembled string, in a strict pipeline:
//     shape first (one line), then size (1..200 code points), then a
//     byte-level round-trip check (UTF-8 encode -> decode must be the
//     identity). Any failure aborts before anything is written.
//   * The file is written with an explicit file descriptor and fsync so a
//     partial write cannot leave a truncated entry behind.
// ---------------------------------------------------------------------------

import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeSync,
} from "node:fs";
import { resolve } from "node:path";
import { TextDecoder, TextEncoder } from "node:util";

// --- the joke, clause by clause -------------------------------------------

const CLAUSES: readonly string[] = [
  "I told my GPS to take the scenic route,",
  "so it drove me past my ex's house,",
  "my student loans,",
  "and every bad decision of 2019.",
];

function assemble(clauses: readonly string[]): string {
  return clauses.join(" ");
}

// --- validation ------------------------------------------------------------
// Each check throws a descriptive error; main() catches nothing, so a bad
// entry fails loudly instead of producing a wrong file.

const SINGLE_LINE = /^[^\r\n]+$/u;
const MAX_CODE_POINTS = 200;

function checkShape(text: string): void {
  if (!SINGLE_LINE.test(text)) {
    throw new Error("entry must be exactly one line (no CR or LF)");
  }
  if (text !== text.trim()) {
    throw new Error("entry must not start or end with whitespace");
  }
}

function checkSize(text: string): void {
  const n = Array.from(text).length;
  if (n < 1 || n > MAX_CODE_POINTS) {
    throw new Error(`entry must be 1-${MAX_CODE_POINTS} chars, got ${n}`);
  }
}

function checkRoundTrip(text: string): void {
  const bytes = new TextEncoder().encode(text);
  const back = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (back !== text) {
    throw new Error("entry is not cleanly representable as UTF-8");
  }
}

function validate(text: string): string {
  checkShape(text);
  checkSize(text);
  checkRoundTrip(text);
  return text;
}

// --- output ----------------------------------------------------------------

function outputDir(): string {
  const dir = process.env.MAKEFUN_OUTPUT_DIR;
  if (dir === undefined || dir === "") {
    return "/output";
  }
  return dir;
}

function writeExactlyOneLine(dir: string, text: string): void {
  mkdirSync(dir, { recursive: true });
  const target = resolve(dir, "entry.txt");
  const fd = openSync(target, "w");
  try {
    const bytes = new TextEncoder().encode(text);
    let written = 0;
    while (written < bytes.length) {
      written += writeSync(fd, bytes, written, bytes.length - written);
    }
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  // Read-back check: the file on disk must be byte-identical to the entry.
  // If it is not, fail now rather than handing the scorer a wrong file.
  const onDisk = readFileSync(target, "utf8");
  if (onDisk !== text) {
    throw new Error("entry.txt read-back mismatch after write");
  }
}

// --- entry point -----------------------------------------------------------

function main(): void {
  const entry = validate(assemble(CLAUSES));
  writeExactlyOneLine(outputDir(), entry);
  process.stdout.write(`${entry}\n`);
}

main();
