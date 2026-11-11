// Converte o TACO.json (github.com/marcelosanto/tabela_taco, MIT) em um arquivo compacto.
// Uso: node scripts/build-taco.mjs caminho/TACO.json
// Não altera valores: apenas seleciona campos e arredonda a 1 casa decimal.
import { readFileSync, writeFileSync } from 'node:fs';
const src = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const num = v => (typeof v === 'number' ? Math.round(v * 10) / 10 : v === 'Tr' ? 0 : null);
const out = [];
for (const f of src) {
  const kcal = num(f.energy_kcal);
  if (kcal == null) continue; // sem energia na tabela: fica de fora
  out.push({ id: 't' + f.id, n: f.description.trim(), g: f.category, k: Math.round(kcal),
    p: num(f.protein_g) ?? 0, c: num(f.carbohydrate_g) ?? 0, f: num(f.lipid_g) ?? 0, fb: num(f.fiber_g) ?? 0 });
}
writeFileSync(new URL('../data/taco.json', import.meta.url), JSON.stringify(out));
console.log(out.length, 'alimentos de', src.length);
