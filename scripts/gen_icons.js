// Genera los iconos de Android (Ludus) a partir del SVG del casco.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'assets');
const SVG = fs.readFileSync(path.join(ASSETS, 'ludus-helmet.svg'));
const BG = '#111827';

function svgColored(hex) {
  return Buffer.from(SVG.toString().replace('#e8edf4', hex));
}

async function renderHelmet(size, color) {
  return sharp(svgColored(color), { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// Coloca el casco centrado en un lienzo size x size, escalado a `scale`.
async function placeOnCanvas(size, scale, bg, color) {
  const inner = Math.round(size * scale);
  const helmet = await renderHelmet(inner, color);
  const base = bg
    ? sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    : sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const off = Math.round((size - inner) / 2);
  return base.composite([{ input: helmet, top: off, left: off }]).png().toBuffer();
}

async function main() {
  // icon.png (legacy / tienda): fondo oscuro + casco grande
  fs.writeFileSync(path.join(ASSETS, 'icon.png'), await placeOnCanvas(1024, 0.82, BG, '#e8edf4'));

  // adaptive foreground: casco dentro de la zona segura (~64%), fondo transparente
  fs.writeFileSync(path.join(ASSETS, 'android-icon-foreground.png'), await placeOnCanvas(1024, 0.62, null, '#e8edf4'));

  // adaptive background: color sólido
  fs.writeFileSync(
    path.join(ASSETS, 'android-icon-background.png'),
    await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } }).png().toBuffer(),
  );

  // monochrome (themed icons Android 13+): silueta blanca en zona segura
  fs.writeFileSync(path.join(ASSETS, 'android-icon-monochrome.png'), await placeOnCanvas(1024, 0.62, null, '#ffffff'));

  // splash: casco mediano sobre transparente
  fs.writeFileSync(path.join(ASSETS, 'splash-icon.png'), await placeOnCanvas(1024, 0.5, null, '#e8edf4'));

  // favicon
  fs.writeFileSync(path.join(ASSETS, 'favicon.png'), await placeOnCanvas(196, 0.8, BG, '#e8edf4'));

  // preview para revisar
  fs.writeFileSync(path.join(ASSETS, 'icon-preview.png'), await placeOnCanvas(512, 0.82, BG, '#e8edf4'));
  console.log('iconos generados');
}

main().catch((e) => { console.error(e); process.exit(1); });
