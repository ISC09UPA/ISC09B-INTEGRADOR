/**
 * Imágenes de ejemplo generadas localmente (SVG) para las fotos dudosas del modo demo.
 * Simulan la cámara cenital del comedero: plato, sujeto y sello de tiempo.
 */
import type { ClaseDetectada } from '../src/api/types';

function variar(id: number, n: number, rango: number) {
  return ((id * 9301 + n * 49297) % 233280) / 233280 * rango;
}

function perro(dx: number, dy: number, color: string) {
  return `
  <g transform="translate(${dx} ${dy})">
    <ellipse cx="320" cy="250" rx="150" ry="78" fill="${color}"/>
    <path d="M178 238 q-50 -40 -30 -95" stroke="${color}" stroke-width="22" fill="none" stroke-linecap="round"/>
    <circle cx="470" cy="206" r="64" fill="${color}"/>
    <ellipse cx="438" cy="160" rx="24" ry="44" fill="#5b3a1f" transform="rotate(-25 438 160)"/>
    <ellipse cx="506" cy="160" rx="24" ry="44" fill="#5b3a1f" transform="rotate(25 506 160)"/>
    <ellipse cx="500" cy="236" rx="30" ry="22" fill="#e9cfa9"/>
    <circle cx="512" cy="228" r="8" fill="#222"/>
    <circle cx="452" cy="196" r="7" fill="#222"/><circle cx="492" cy="196" r="7" fill="#222"/>
  </g>`;
}

function gato(dx: number, dy: number, color: string) {
  return `
  <g transform="translate(${dx} ${dy})">
    <ellipse cx="300" cy="260" rx="118" ry="64" fill="${color}"/>
    <path d="M190 280 q-70 10 -60 -70" stroke="${color}" stroke-width="16" fill="none" stroke-linecap="round"/>
    <circle cx="420" cy="220" r="52" fill="${color}"/>
    <path d="M382 186 l8 -56 l34 36 z" fill="${color}"/><path d="M458 186 l-8 -56 l-34 36 z" fill="${color}"/>
    <circle cx="402" cy="214" r="7" fill="#c8e06a"/><circle cx="438" cy="214" r="7" fill="#c8e06a"/>
    <path d="M410 236 l10 8 l10 -8" stroke="#333" stroke-width="3" fill="none"/>
  </g>`;
}

function paloma(dx: number, dy: number) {
  return `
  <g transform="translate(${dx} ${dy})">
    <ellipse cx="330" cy="230" rx="74" ry="44" fill="#8d96a3"/>
    <path d="M262 230 l-60 -22 l14 40 z" fill="#6c7480"/>
    <circle cx="398" cy="196" r="28" fill="#7d8794"/>
    <path d="M424 196 l20 6 l-20 6 z" fill="#d9a54a"/>
    <circle cx="404" cy="190" r="5" fill="#d23"/>
    <path d="M300 214 q30 -30 70 -6" stroke="#6b8f7c" stroke-width="8" fill="none"/>
  </g>`;
}

export function svgFoto(id: number, clase: ClaseDetectada, codigo: string, tomadaEn: number): string {
  const dx = Math.round(variar(id, 1, 120) - 60);
  const dy = Math.round(variar(id, 2, 60) - 30);
  const pisos = ['#c9b79c', '#b8a58a', '#a9b3a0', '#cfc3ad'];
  const piso = pisos[id % pisos.length];
  const pelajePerro = ['#a8743f', '#d9b382', '#3f2f25', '#c48a4a'][id % 4]!;
  const pelajeGato = ['#7a7a7a', '#d08a3c', '#2f2f2f', '#bfb5a8'][id % 4]!;
  const sujeto =
    clase === 'Perro' ? perro(dx, dy, pelajePerro) : clase === 'Gato' ? gato(dx, dy, pelajeGato) : clase === 'Paloma' ? paloma(dx, dy) : '';
  const fecha = new Date(tomadaEn).toISOString().replace('T', ' ').slice(0, 19);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480">
  <defs>
    <radialGradient id="luz" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#fff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.45"/>
    </radialGradient>
    <filter id="grano"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${id}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.18"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter>
  </defs>
  <g filter="url(#grano)">
    <rect width="640" height="480" fill="${piso}"/>
    <path d="M0 360 L640 330 L640 480 L0 480 Z" fill="#000" opacity="0.08"/>
    <ellipse cx="320" cy="410" rx="150" ry="44" fill="#5d6b7a"/>
    <ellipse cx="320" cy="402" rx="120" ry="30" fill="#8796a6"/>
    <ellipse cx="320" cy="404" rx="80" ry="16" fill="#7a5a3a" opacity="${clase === 'Nada' ? 0.9 : 0.6}"/>
    ${sujeto}
    <rect width="640" height="480" fill="url(#luz)"/>
  </g>
  <rect x="12" y="12" width="228" height="28" rx="4" fill="#000" opacity="0.55"/>
  <text x="22" y="32" font-family="monospace" font-size="15" fill="#fff">CAM ${codigo} #${id}</text>
  <rect x="384" y="440" width="244" height="28" rx="4" fill="#000" opacity="0.55"/>
  <text x="394" y="460" font-family="monospace" font-size="15" fill="#fff">${fecha} UTC</text>
</svg>`;
}
