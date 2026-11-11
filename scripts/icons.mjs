// Gera os PNGs a partir de icons/icon.svg. Requer o pacote "sharp" (só para quem quiser refazer os ícones).
import sharp from 'sharp';
const src = new URL('../icons/icon.svg', import.meta.url).pathname;
const out = n => new URL(`../icons/${n}`, import.meta.url).pathname;
await sharp(src).resize(192).png().toFile(out('icon-192.png'));
await sharp(src).resize(512).png().toFile(out('icon-512.png'));
await sharp(src).resize(180).png().toFile(out('apple-touch-icon.png'));
console.log('ícones gerados');
