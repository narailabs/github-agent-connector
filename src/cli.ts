#!/usr/bin/env node
/**
 * Thin bin entry. Library code lives in index.ts.
 */
import connector from "./index.js";

void connector.main(process.argv.slice(2)).then((code) => {
  process.exit(code);
});
