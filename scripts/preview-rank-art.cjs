// A review board rendered from the same tokens and anatomy adapter as the app.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: (id) => {
      if (id.endsWith('anatomy.json'))
        return JSON.parse(fs.readFileSync('assets/body/anatomy.json', 'utf8'));
      throw new Error(`Unexpected dependency ${id}`);
    },
  });
  return module.exports;
}
const { palette, rankColors, rankTiers, spacing, radius, typography } = load('src/theme/tokens.ts');
const { BODY_PATHS, VIEW_BOXES } = load('src/components/body/paths.ts');
const keys = [
  ...new Set(
    Object.values(BODY_PATHS.male)
      .flat()
      .map((p) => p.muscle)
      .filter(Boolean),
  ),
];
const muscleColor = Object.fromEntries(
  keys.map((key, i) => [key, rankColors[rankTiers[i % 8]].base]),
);
const name = (s) => s.replaceAll('_', ' ');
function body(outline, side, scheme) {
  const parts = BODY_PATHS[outline][side];
  const id = `${scheme}-${outline}-${side}`;
  return `<figure><figcaption>${name(outline)} · ${side}</figcaption><svg viewBox="${VIEW_BOXES[outline][side]}" role="img" aria-label="${outline} ${side} anatomy"><defs>${parts.map((p, i) => (p.clip ? `<clipPath id="${id}-${i}"><path d="${p.clip}"/></clipPath>` : '')).join('')}</defs>${parts.map((p, i) => `<path d="${p.d}" ${p.clip ? `clip-path="url(#${id}-${i})"` : ''} fill="${p.muscle ? muscleColor[p.muscle] : palette[scheme].surfaceRaised}" stroke="${palette[scheme].surface}" stroke-width="1.5" data-muscle="${p.muscle ?? ''}"><title>${name(p.muscle ?? p.source)}</title></path>`).join('')}</svg></figure>`;
}
function badges(kind, items) {
  return `<div class="badges">${items.map((item) => `<figure><img width="112" height="112" src="../../../assets/${kind}/${item}.png" alt="${item}"/><figcaption>${item}</figcaption><div class="sizes">${[24, 32, 48].map((size) => `<img width="${size}" height="${size}" src="../../../assets/${kind}/${item}.png" alt="${item} at ${size}px"/>`).join('')}</div></figure>`).join('')}</div>`;
}
const css = Object.entries(palette)
  .map(
    ([scheme, colors]) =>
      `.${scheme}{${Object.entries(colors)
        .map(([key, value]) => `--${key}:${value}`)
        .join(';')}}`,
  )
  .join('');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ranked Gym · Artwork review</title><style>
@font-face{font-family:Instrument;src:url('../../../node_modules/@expo-google-fonts/instrument-sans/400Regular/InstrumentSans_400Regular.ttf')}
${css}
*{box-sizing:border-box}body{margin:0;font-family:Instrument,system-ui}section{padding:${spacing.xxl}px;background:var(--background);color:var(--text)}h1{font-size:${typography.title.fontSize}px;margin:0 0 ${spacing.sm}px}h2{font-size:${typography.heading.fontSize}px;margin:${spacing.xl}px 0 ${spacing.md}px}p,figcaption{color:var(--textMuted);font-size:${typography.label.fontSize}px}figure{margin:0;text-align:center;text-transform:capitalize}.badges{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:${spacing.md}px}.badges figure{padding:${spacing.md}px;border-radius:${radius.lg}px;background:var(--surface)}.sizes{display:flex;align-items:center;justify-content:center;gap:${spacing.sm}px;margin-top:${spacing.md}px}.bodies{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:${spacing.lg}px;background:var(--surface);border-radius:${radius.lg}px;padding:${spacing.lg}px}svg{width:100%;max-height:520px}svg path[data-muscle]:hover{stroke:var(--text);stroke-width:5}.legend{display:flex;flex-wrap:wrap;gap:${spacing.md}px;margin-top:${spacing.lg}px}.legend span{font-size:${typography.caption.fontSize}px}.legend i{display:inline-block;width:8px;height:8px;border-radius:${radius.sm}px;margin-right:${spacing.xs}px}output{display:block;margin-top:${spacing.md}px;color:var(--textMuted)}@media(max-width:650px){section{padding:${spacing.lg}px}.bodies{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>${['dark', 'light'].map((scheme) => `<section class="${scheme}"><h1>Ranked Gym · Artwork review</h1><p>${scheme} theme · original emblems + MIT anatomy · small samples at 24 / 32 / 48 px</p><h2>Strength ranks</h2>${badges('ranks', rankTiers)}<h2>Weekly leagues</h2>${badges('leagues', ['rookie', 'contender', 'elite', 'legend'])}<h2>Canonical muscle mapping</h2><p>Diagnostic colours cycle through rank tokens. Hover or tap a contour to inspect its canonical key. Actual app colours come from rank data.</p><div class="bodies">${['male', 'female'].flatMap((outline) => ['front', 'back'].map((side) => body(outline, side, scheme))).join('')}</div><div class="legend">${keys.map((key) => `<span><i style="background:${muscleColor[key]}"></i>${name(key)}</span>`).join('')}</div><output>Choose a muscle to inspect its mapping.</output></section>`).join('')}<script>document.querySelectorAll('svg path').forEach(p=>p.addEventListener('click',()=>p.closest('section').querySelector('output').textContent=p.dataset.muscle||'Neutral outline'))</script></html>`;
fs.mkdirSync('docs/design/artwork', { recursive: true });
require('prettier')
  .format(html, { parser: 'html' })
  .then((formatted) => {
    fs.writeFileSync('docs/design/artwork/preview.html', formatted);
  });
const figures = ['male', 'female'].flatMap((outline) =>
  ['front', 'back'].map((side) => {
    const content = body(outline, side, 'dark').match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
    return { outline, side, content };
  }),
);
fs.writeFileSync(
  'docs/design/artwork/anatomy-review.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="760" viewBox="0 0 1440 760"><rect width="1440" height="760" fill="${palette.dark.surface}"/>${figures.map((figure, i) => `<text x="${i * 360 + 180}" y="32" text-anchor="middle" font-family="sans-serif" font-size="20" fill="${palette.dark.text}">${figure.outline} · ${figure.side}</text><svg x="${i * 360}" y="50" width="360" height="680" viewBox="${VIEW_BOXES[figure.outline][figure.side]}">${figure.content}</svg>`).join('')}</svg>`,
);
console.log('Wrote docs/design/artwork/preview.html');
