// One Line, One Laugh — make.fun entry (program/v1, Node 22, stdlib only).
// One line, one laugh: the program prints the joke and writes it, byte for
// byte, to $MAKEFUN_OUTPUT_DIR/entry.txt with no trailing newline. The gate
// wants 1-200 characters of UTF-8, a single line, and nothing but the joke.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ENTRY =
  "My therapist said I use humor to deflect, so I told her my childhood was a subscription I forgot to cancel.";

const MAX_CHARS = 200;

// Count characters the way a reader does, not bytes: one code point each.
const charCount = [...ENTRY].length;

if (charCount === 0 || charCount > MAX_CHARS) {
  throw new Error(`entry must be 1-${MAX_CHARS} characters, got ${charCount}`);
}
if (ENTRY.trim().length === 0 || ENTRY.includes("\n") || ENTRY.includes("\r")) {
  throw new Error("entry must be a single non-blank line");
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outDir, { recursive: true });
// Same text, every run, no trailing newline: the scorer reads this file.
writeFileSync(join(outDir, "entry.txt"), ENTRY, "utf8");
process.stdout.write(ENTRY + "\n");
