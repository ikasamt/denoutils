import {gen} from "./mods.ts"

import { parse } from "https://deno.land/std@0.175.0/flags/mod.ts";

const flags = parse(Deno.args, {
    string: "size",
    default: { size: "32" },
});

// deno run pwdgen/main.ts --size 12
console.log(gen(parseInt(flags.size)))