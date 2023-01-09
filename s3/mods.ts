import { S3Client } from "https://deno.land/x/s3_lite_client@0.2.0/mod.ts";
import "https://deno.land/x/dotenv@v3.2.0/load.ts";

export const s3client = new S3Client({
  useSSL: true,
  region: "dummy",
  endPoint: Deno.env.get("S3_ENDPOINT_URL")!,
  accessKey: Deno.env.get("AWS_ACCESS_KEY_ID")!,
  secretKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
});

export default s3client;
