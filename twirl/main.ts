import { generateProto } from "./generateProto.ts";

for (const fn of Deno.args) {
  const outFn = `${fn}.ts`;
  Deno.writeTextFileSync(outFn, await generateProto(fn));
}
