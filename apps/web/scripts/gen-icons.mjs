import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "src/assets/Logo.png";
const OUT = "public/icons";
const BG = { r: 246, g: 247, b: 244, alpha: 1 }; // matches manifest background_color #f6f7f4

mkdirSync(OUT, { recursive: true });

async function squareIcon(size, padFrac, outPath) {
  const inner = Math.round(size * (1 - padFrac * 2));
  const logo = await sharp(SRC).resize(inner, inner, { fit: "contain" }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(outPath);
  console.log("wrote", outPath);
}

await squareIcon(192, 0.06, `${OUT}/icon-192.png`);
await squareIcon(512, 0.06, `${OUT}/icon-512.png`);
// Maskable: OS crops to a shape, so keep the mark inside the ~80% safe zone.
await squareIcon(512, 0.12, `${OUT}/icon-512-maskable.png`);
await squareIcon(64, 0.08, `${OUT}/favicon.png`);
await squareIcon(32, 0.08, `${OUT}/favicon-32.png`);

// Small transparent mark for inline UI use (TopBar, etc.) - the 2000x2000
// source is ~730KB, far too heavy to ship for a 32px on-screen icon.
await sharp(SRC).resize(128, 128, { fit: "contain" }).png({ compressionLevel: 9 }).toFile("src/assets/logo-mark.png");
console.log("wrote src/assets/logo-mark.png");
