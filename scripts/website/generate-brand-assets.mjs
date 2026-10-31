import sharp from "sharp";
import { writeFile } from "node:fs/promises";
const root = new URL("../../apps/website/", import.meta.url);
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0f1f10"/><path d="M340 150H215c-40 0-65 22-65 57s25 52 65 52h70c40 0 65 20 65 55s-25 55-65 55H160" fill="none" stroke="#c6f19d" stroke-width="48"/><path d="M319 99h94v94M413 99l-88 88" fill="none" stroke="#c6f19d" stroke-width="22"/></svg>`;
await writeFile(new URL("public/favicon.svg", root), icon);
for (const [name, size] of [
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["maskable-icon-512.png", 512],
])
  await sharp(Buffer.from(icon))
    .resize(size, size)
    .png()
    .toFile(new URL("public/" + name, root).pathname);
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0f1f10"/><rect x="755" y="35" width="410" height="560" fill="#c6f19d"/><text x="55" y="115" fill="#c6f19d" font-family="Arial,sans-serif" font-size="72" font-weight="700">servora ↗</text><text x="55" y="290" fill="white" font-family="Arial,sans-serif" font-size="100" font-weight="700">Service,</text><text x="55" y="398" fill="white" font-family="Arial,sans-serif" font-size="100" font-weight="700">in sync.</text><text x="55" y="545" fill="white" font-family="Arial,sans-serif" font-size="29">Restaurant management software</text><rect x="790" y="130" width="340" height="380" fill="white"/><text x="815" y="190" fill="#172019" font-family="Arial,sans-serif" font-size="30" font-weight="700">Table 12</text><text x="815" y="245" fill="#172019" font-family="Arial,sans-serif" font-size="22">Guest ordering</text><text x="815" y="300" fill="#172019" font-family="Arial,sans-serif" font-size="22">Floor service</text><text x="815" y="355" fill="#172019" font-family="Arial,sans-serif" font-size="22">Kitchen tickets</text><text x="815" y="410" fill="#172019" font-family="Arial,sans-serif" font-size="22">Management &amp; POS</text><text x="815" y="470" fill="#566052" font-family="Arial,sans-serif" font-size="16">Connected around the order.</text></svg>`;
await writeFile(new URL("public/social-brand.svg", root), social);
for (const name of ["opengraph-image.png", "twitter-image.png"])
  await sharp(Buffer.from(social))
    .png()
    .toFile(new URL("app/" + name, root).pathname);
// ICO wrapping a PNG is supported by modern browsers; retain the existing icon route.
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
console.log("Website brand assets regenerated.");
