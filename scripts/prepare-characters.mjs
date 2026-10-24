import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDir = "docs/superpowers/specs/2026-10-23-redesign-festa-mipo/personagens";
const targetDir = "assets/characters";

const groups = [
  ["carta", 1, 5],
  ["moeda", 6, 10],
  ["monstro", 11, 15],
  ["quebraCabeca", 16, 21],
  ["dado", 22, 24],
  ["pocao", 25, 27],
  ["trofeu", 28, 33],
  ["peao", 34, 47],
];

function nameForPrancheta(number) {
  for (const [kind, first, last] of groups) {
    if (number >= first && number <= last) return `${kind}${number - first + 1}`;
  }
  throw new Error(`Prancheta ${number} sem grupo`);
}

await mkdir(targetDir, { recursive: true });
const files = (await readdir(sourceDir)).filter((file) => /^p\d+\.png$/.test(file));

for (const file of files) {
  const number = Number(file.match(/\d+/)[0]);
  const trimmed = await sharp(path.join(sourceDir, file)).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  const pad = Math.round(Math.max(trimmed.info.width, trimmed.info.height) * 0.04);
  await sharp(trimmed.data)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ width: 512, height: 512, fit: "inside" })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(targetDir, `${nameForPrancheta(number)}.png`));
}

console.log(`${files.length} personagens gerados em ${targetDir}`);
