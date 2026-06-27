import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const packageRoot = path.resolve(new URL("..", import.meta.url).pathname);
const buildDir = path.join(packageRoot, "build");

await rm(buildDir, { recursive: true, force: true });
await mkdir(buildDir, { recursive: true });

const { stdout } = await run("npm", ["pack", "--pack-destination", "build", "--json"], {
  cwd: packageRoot,
});
const [packResult] = JSON.parse(stdout);
const filename = path.basename(packResult.filename);

await writeFile(
  path.join(buildDir, "latest.json"),
  `${JSON.stringify(
    {
      package: packResult.name,
      version: packResult.version,
      filename,
      integrity: packResult.integrity,
      shasum: packResult.shasum,
      size: packResult.size,
      unpackedSize: packResult.unpackedSize,
      builtAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);

console.log(`Built ${filename}`);
