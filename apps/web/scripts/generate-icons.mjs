import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const iconsDirectory = resolve("public/icons");
const source = await readFile(resolve(iconsDirectory, "icon.svg"));

await Promise.all([
  sharp(source).resize(192, 192).png().toFile(resolve(iconsDirectory, "icon-192.png")),
  sharp(source).resize(512, 512).png().toFile(resolve(iconsDirectory, "icon-512.png")),
  sharp(source)
    .resize(410, 410)
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#173f5f" })
    .png()
    .toFile(resolve(iconsDirectory, "icon-512-maskable.png")),
]);
