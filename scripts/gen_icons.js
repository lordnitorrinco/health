// Genera los iconos de Android (Ludus) a partir de la silueta del casco
// espartano (assets/ludus-helmet.png: negro sobre blanco). Se extrae el
// alfa de la luminancia y se recolorea para verse sobre el fondo oscuro.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'assets');
const SRC = path.join(ASSETS, 'ludus-helmet.png');
const BG = { r: 0x11, g: 0x18, b: 0x27 }; // #111827
const HELMET = { r: 0xe8, g: 0xed, b: 0xf4 }; // #e8edf4

// Devuelve un casco coloreado (RGBA) de tamaño `inner`, fondo transparente.
async function tintedHelmet(inner, color) {
  // Alfa: opaco donde la silueta es oscura, transparente donde es clara.
  const alpha = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .grayscale()
    .negate()
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  return sharp({ create: { width: inner, height: inner, channels: 3, background: color } })
    .joinChannel(alpha, { raw: { width: inner, height: inner, channels: 1 } })
    .png()
    .toBuffer();
}

async function placeOnCanvas(size, scale, bg, color) {
  const inner = Math.round(size * scale);
  const helmet = await tintedHelmet(inner, color);
  const base = bg
    ? sharp({ create: { width: size, height: size, channels: 4, background: { ...bg, alpha: 1 } } })
    : sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const off = Math.round((size - inner) / 2);
  return base.composite([{ input: helmet, top: off, left: off }]).png().toBuffer();
}

async function main() {
  fs.writeFileSync(path.join(ASSETS, 'icon.png'), await placeOnCanvas(1024, 0.78, BG, HELMET));
  fs.writeFileSync(path.join(ASSETS, 'android-icon-foreground.png'), await placeOnCanvas(1024, 0.6, null, HELMET));
  fs.writeFileSync(
    path.join(ASSETS, 'android-icon-background.png'),
    await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { ...BG, alpha: 1 } } }).png().toBuffer(),
  );
  fs.writeFileSync(path.join(ASSETS, 'android-icon-monochrome.png'), await placeOnCanvas(1024, 0.6, null, { r: 255, g: 255, b: 255 }));
  fs.writeFileSync(path.join(ASSETS, 'splash-icon.png'), await placeOnCanvas(1024, 0.45, null, HELMET));
  fs.writeFileSync(path.join(ASSETS, 'favicon.png'), await placeOnCanvas(196, 0.78, BG, HELMET));
  fs.writeFileSync(path.join(ASSETS, 'icon-preview.png'), await placeOnCanvas(512, 0.78, BG, HELMET));
  console.log('iconos generados');
}

main().catch((e) => { console.error(e); process.exit(1); });
