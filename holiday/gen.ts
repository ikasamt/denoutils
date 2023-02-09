import { walk } from "https://deno.land/std/fs/walk.ts";

const RE_HOLIDAY = /(.+)\s(\d+)月(\d+)日/
const RE_YEAR = /(\d+).txt/

let HolidayJSON = {};

async function generateHolidayJSON() {
    const result = {}
    for await (const f of walk("./data/")) {
        if (f.isDirectory){
            continue
        }

        const tmp = f.name.match(RE_YEAR)
        if (tmp == null) {
            continue
        }

        const year = tmp[1]
        const res = await fetch(new URL(f.path, import.meta.url));
        const contents = await res.text()
        const lines = contents.split("\n")
        for (const idx in lines) {
            const line = lines[idx]
            const tmp = line.match(RE_HOLIDAY)
            if (tmp){
                const title = tmp[1]
                const month = tmp[2]
                const day = tmp[3]
                const key = `${year}-${month}-${day}`;
                result[key] = title
            }
        }
    }
    return result
}

HolidayJSON = await generateHolidayJSON()

try {
    Deno.writeTextFile("jp-holiday.json", JSON.stringify(HolidayJSON));
} catch(e) {
    console.log(e);
}