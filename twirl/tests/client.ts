import { Ping, setEndpoint as setEndpointExample } from "./example.proto.ts";

import "https://deno.land/x/dotenv@v3.2.0/load.ts";

setEndpointExample(
  Deno.env.get("ENDPOINT_URL")!,
  Deno.env.get("ENDPOINT_TOKEN")!
);

const r = await Ping({});
console.log(r);
