import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  // Bundle the workspace package (its `exports` point at TS sources).
  noExternal: [/^@mgmt\//],
  // Native modules must stay external so their platform binaries resolve at runtime.
  external: ["better-sqlite3", "sqlite-vec"],
});
