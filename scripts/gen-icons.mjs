// Génère les icônes PWA (public/icons + app/apple-icon.png). Usage : npm run icons
import sharp from "sharp";

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#fbbf24"/>
  </linearGradient></defs>
  <rect width="512" height="512" fill="#0b0d17"/>
  <g transform="translate(256 256) scale(${1 - pad}) translate(-256 -256)">
    <path d="M256 70 L420 130 V270 C420 360 350 420 256 450 C162 420 92 360 92 270 V130 Z"
          fill="#141829" stroke="url(#g)" stroke-width="22" stroke-linejoin="round"/>
    <path d="M256 150 L284 232 H370 L300 282 L326 366 L256 316 L186 366 L212 282 L142 232 H228 Z"
          fill="url(#g)"/>
  </g>
</svg>`;

const out = async (pad, size, file) =>
  sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(file);

await out(0, 192, "public/icons/icon-192.png");
await out(0, 512, "public/icons/icon-512.png");
await out(0.2, 512, "public/icons/maskable-512.png");
await out(0, 180, "app/apple-icon.png");
console.log("icônes générées");
