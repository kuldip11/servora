import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
const require = createRequire(
  new URL("../../apps/website/package.json", import.meta.url),
);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const root = new URL("../../apps/website/", import.meta.url);
const mark =
  '<circle cx="128" cy="128" r="58" fill="none" stroke="white" stroke-width="14"/><path d="M105 30h46M105 226h46M30 105v46M226 105v46" stroke="white" stroke-width="14" stroke-linecap="round"/>';
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="52" fill="#1f2de6"/>${mark}</svg>`;
await writeFile(new URL("public/favicon.svg", root), icon);
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-icon-512.png", 512],
  ["apple-touch-icon.png", 180],
])
  await sharp(Buffer.from(icon))
    .resize(size, size)
    .png()
    .toFile(new URL("public/" + name, root).pathname);
const png = await sharp(Buffer.from(icon)).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(
  new URL("public/favicon.ico", root),
  Buffer.concat([header, png]),
);
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#eef0f3"/><circle cx="1050" cy="340" r="350" fill="#1f2de6"/><g transform="translate(900 200) scale(1.05)">${mark}</g><g font-family="Arial,sans-serif" fill="#0b0c0e"><text x="64" y="100" font-size="32" font-weight="700">Servora</text><text x="64" y="270" font-size="76" font-weight="700">Restaurant POS.</text><text x="64" y="357" font-size="76" font-weight="700">One shared shift.</text><text x="64" y="492" font-size="27">Orders, kitchen, floor and management.</text></g></svg>`;
for (const name of ["opengraph-image.png", "twitter-image.png"])
  await sharp(Buffer.from(og))
    .png()
    .toFile(new URL("app/" + name, root).pathname);
