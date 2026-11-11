// Receitas típicas: pratos comuns que a TACO não traz prontos. As calorias são a soma dos
// ingredientes, com valores da TACO; as quantidades são de uma receita típica, então o resultado
// é uma ESTIMATIVA, sempre mostrada como tal. Funções puras.

/**
 * name: nome mostrado; alias: outros jeitos de pedir (entram na busca);
 * serving: [medida, gramas da porção pronta]; items: [nome exato na TACO, gramas, observação?].
 * Leite líquido: a TACO só traz leite em pó, então 13 g de pó equivalem a 100 ml de leite.
 */
export const RECIPES = [
  { id: 'sand-nat-frango', name: 'Sanduíche natural de frango', alias: 'lanche natural frango desfiado', serving: ['unidade', 160],
    items: [['Pão, trigo, forma, integral', 50, '2 fatias'], ['Frango, peito, sem pele, cozido', 50, 'desfiado'], ['Maionese, tradicional com ovos', 10, '1 colher de chá cheia'],
      ['Cenoura, crua', 15, 'ralada'], ['Alface, crespa, crua', 10], ['Tomate, com semente, cru', 25]] },
  { id: 'sand-nat-atum', name: 'Sanduíche natural de atum', alias: 'lanche natural', serving: ['unidade', 160],
    items: [['Pão, trigo, forma, integral', 50, '2 fatias'], ['Atum, conserva em óleo', 40], ['Maionese, tradicional com ovos', 10],
      ['Cenoura, crua', 15], ['Alface, crespa, crua', 10], ['Tomate, com semente, cru', 25]] },
  { id: 'misto', name: 'Misto quente', alias: 'queijo e presunto torrado', serving: ['unidade', 90],
    items: [['Pão, trigo, francês', 50, '1 pão'], ['Queijo, mozarela', 20, '1 fatia'], ['Presunto, sem capa de gordura', 15, '1 fatia'], ['Manteiga, com sal', 5]] },
  { id: 'pao-ovo', name: 'Pão com ovo', alias: 'pao ovo frito', serving: ['unidade', 100],
    items: [['Pão, trigo, francês', 50, '1 pão'], ['Ovo, de galinha, inteiro, frito', 50, '1 ovo']] },
  { id: 'pao-manteiga', name: 'Pão na chapa com manteiga', alias: 'pao com manteiga', serving: ['unidade', 58],
    items: [['Pão, trigo, francês', 50, '1 pão'], ['Manteiga, com sal', 8]] },
  { id: 'x-burguer', name: 'X-burguer', alias: 'xis burguer cheeseburguer hamburguer lanche x salada', serving: ['unidade', 200],
    items: [['Pão, trigo, sovado', 70, '1 pão de hambúrguer'], ['Hambúrguer, bovino, grelhado', 90], ['Queijo, prato', 20, '1 fatia'],
      ['Maionese, tradicional com ovos', 10], ['Tomate, com semente, cru', 15], ['Alface, crespa, crua', 5]] },
  { id: 'pizza-mussarela', name: 'Pizza de mussarela', alias: 'pizza muçarela queijo', serving: ['fatia', 110],
    items: [['Farinha, de trigo', 40, 'massa'], ['Queijo, mozarela', 35], ['Tomate, com semente, cru', 25, 'molho'], ['Azeite, de oliva, extra virgem', 3]] },
  { id: 'pizza-calabresa', name: 'Pizza de calabresa', alias: 'pizza linguica', serving: ['fatia', 115],
    items: [['Farinha, de trigo', 40, 'massa'], ['Lingüiça, porco, grelhada', 25, 'calabresa'], ['Queijo, mozarela', 20], ['Cebola, crua', 10], ['Tomate, com semente, cru', 20, 'molho']] },
  { id: 'lasanha', name: 'Lasanha à bolonhesa', alias: 'lasanha carne presunto queijo', serving: ['porção', 250],
    items: [['Lasanha, massa fresca, cozida', 80], ['Carne, bovina, acém, moído, cozido', 70], ['Queijo, mozarela', 40], ['Presunto, sem capa de gordura', 20], ['Tomate, com semente, cru', 40, 'molho']] },
  { id: 'escondidinho', name: 'Escondidinho de carne', alias: 'escondidinho mandioca aipim carne moida', serving: ['porção', 250],
    items: [['Mandioca, cozida', 150, 'purê'], ['Carne, bovina, acém, moído, cozido', 70], ['Queijo, mozarela', 25], ['Manteiga, com sal', 5]] },
  { id: 'pf', name: 'Prato feito (arroz, feijão, bife e salada)', alias: 'pf marmita comercial almoco executivo', serving: ['porção', 400],
    items: [['Arroz, tipo 1, cozido', 150, '6 colheres de sopa'], ['Feijão, carioca, cozido', 100, '1 concha pequena'], ['Carne, bovina, patinho, sem gordura, grelhado', 100, '1 bife'],
      ['Alface, crespa, crua', 20], ['Tomate, com semente, cru', 30]] },
  { id: 'pf-frango', name: 'Prato feito com frango grelhado', alias: 'pf marmita frango arroz feijao', serving: ['porção', 400],
    items: [['Arroz, tipo 1, cozido', 150], ['Feijão, carioca, cozido', 100], ['Frango, peito, sem pele, grelhado', 100, '1 filé'], ['Alface, crespa, crua', 20], ['Tomate, com semente, cru', 30]] },
  { id: 'marmita-fit', name: 'Marmita fit (frango, batata-doce e brócolis)', alias: 'marmita fit', serving: ['porção', 350],
    items: [['Frango, peito, sem pele, grelhado', 150], ['Batata, doce, cozida', 150], ['Brócolis, cozido', 50]] },
  { id: 'salada-frango', name: 'Salada com frango grelhado', alias: 'salada verde frango', serving: ['porção', 300],
    items: [['Alface, crespa, crua', 50], ['Tomate, com semente, cru', 50], ['Cenoura, crua', 30], ['Frango, peito, sem pele, grelhado', 120], ['Azeite, de oliva, extra virgem', 8, '1 colher de sopa']] },
  { id: 'acai-tigela', name: 'Açaí na tigela', alias: 'acai copo 300 banana leite condensado', serving: ['porção', 320],
    items: [['Açaí, polpa, com xarope de guaraná e glucose', 250, '300 ml'], ['Banana, prata, crua', 50, 'meia banana'], ['Leite, condensado', 20, '1 colher de sopa']] },
  { id: 'tapioca-queijo', name: 'Tapioca com queijo', alias: 'tapioca queijo coalho mussarela', serving: ['unidade', 100],
    items: [['Fécula, de mandioca', 50, 'goma'], ['Queijo, mozarela', 30], ['Manteiga, com sal', 5]] },
  { id: 'tapioca-frango', name: 'Tapioca de frango com queijo', alias: 'tapioca frango', serving: ['unidade', 140],
    items: [['Fécula, de mandioca', 50, 'goma'], ['Frango, peito, sem pele, cozido', 40, 'desfiado'], ['Queijo, mozarela', 25], ['Manteiga, com sal', 5]] },
  { id: 'crepioca', name: 'Crepioca com queijo', alias: 'crepioca', serving: ['unidade', 100],
    items: [['Ovo, de galinha, inteiro, cru', 50, '1 ovo'], ['Fécula, de mandioca', 20, 'goma'], ['Queijo, minas, frescal', 30]] },
  { id: 'cuscuz-ovo', name: 'Cuscuz com ovo', alias: 'cuscuz nordestino ovo', serving: ['porção', 200],
    items: [['Cuscuz, de milho, cozido com sal', 150], ['Ovo, de galinha, inteiro, frito', 50, '1 ovo']] },
  { id: 'panqueca', name: 'Panqueca de carne', alias: 'panqueca carne moida', serving: ['unidade', 120],
    items: [['Farinha, de trigo', 20], ['Ovo, de galinha, inteiro, cru', 12], ['Leite, de vaca, integral, pó', 5, '≈ 40 ml de leite'], ['Carne, bovina, acém, moído, cozido', 40], ['Tomate, com semente, cru', 20, 'molho'], ['Queijo, mozarela', 10]] },
  { id: 'esfiha', name: 'Esfiha de carne', alias: 'esfirra esfiha aberta', serving: ['unidade', 80],
    items: [['Farinha, de trigo', 35, 'massa'], ['Carne, bovina, acém, moído, cozido', 25], ['Cebola, crua', 8], ['Tomate, com semente, cru', 8], ['Óleo, de soja', 4]] },
  { id: 'sushi', name: 'Sushi de salmão (10 peças)', alias: 'sushi combinado niguiri uramaki hossomaki', serving: ['porção', 250],
    items: [['Arroz, tipo 1, cozido', 180, 'arroz de sushi'], ['Salmão, sem pele, fresco, cru', 55], ['Açúcar, refinado', 6, 'no tempero do arroz'], ['Shoyu', 10]] },
  { id: 'temaki', name: 'Temaki de salmão', alias: 'temaki', serving: ['unidade', 150],
    items: [['Arroz, tipo 1, cozido', 90], ['Salmão, sem pele, fresco, cru', 50], ['Açúcar, refinado', 3], ['Shoyu', 5]] },
  { id: 'poke', name: 'Poke de salmão', alias: 'poke bowl', serving: ['porção', 350],
    items: [['Arroz, tipo 1, cozido', 150], ['Salmão, sem pele, fresco, cru', 100], ['Abacate, cru', 50], ['Pepino, cru', 30], ['Shoyu', 10]] },
  { id: 'vitamina-banana', name: 'Vitamina de banana', alias: 'vitamina banana leite batida', serving: ['copo', 300],
    items: [['Leite, de vaca, integral, pó', 30, '≈ 230 ml de leite'], ['Banana, prata, crua', 100, '1 banana'], ['Aveia, flocos, crua', 10], ['Açúcar, refinado', 10]] },
  { id: 'cafe-leite', name: 'Café com leite', alias: 'pingado cafe leite', serving: ['xícara', 200],
    items: [['Café, infusão 10%', 100], ['Leite, de vaca, integral, pó', 13, '≈ 100 ml de leite'], ['Açúcar, refinado', 5, '1 colher de chá']] },
  { id: 'mingau-aveia', name: 'Mingau de aveia', alias: 'mingau aveia leite', serving: ['porção', 250],
    items: [['Leite, de vaca, integral, pó', 26, '≈ 200 ml de leite'], ['Aveia, flocos, crua', 30], ['Açúcar, refinado', 10]] },
  { id: 'salada-frutas', name: 'Salada de frutas', alias: 'salada frutas', serving: ['porção', 200],
    items: [['Banana, prata, crua', 50], ['Maçã, Fuji, com casca, crua', 50], ['Mamão, Papaia, cru', 50], ['Laranja, pêra, crua', 50]] },
  { id: 'bolo-cenoura', name: 'Bolo de cenoura com cobertura', alias: 'bolo cenoura chocolate', serving: ['fatia', 80],
    items: [['Farinha, de trigo', 20], ['Açúcar, refinado', 20], ['Óleo, de soja', 10], ['Ovo, de galinha, inteiro, cru', 12], ['Cenoura, crua', 15], ['Chocolate, meio amargo', 5, 'cobertura']] },
  { id: 'brigadeiro', name: 'Brigadeiro', alias: 'brigadeiro docinho', serving: ['unidade', 20],
    items: [['Leite, condensado', 15], ['Achocolatado, pó', 3], ['Manteiga, com sal', 1], ['Chocolate, ao leite', 1, 'granulado']] },
  { id: 'pudim', name: 'Pudim de leite condensado', alias: 'pudim leite', serving: ['fatia', 100],
    items: [['Leite, condensado', 40], ['Leite, de vaca, integral, pó', 10, '≈ 80 ml de leite'], ['Ovo, de galinha, inteiro, cru', 25], ['Açúcar, refinado', 15, 'calda']] },
  { id: 'omelete', name: 'Omelete de 2 ovos', alias: 'omelete simples ovos mexidos', serving: ['unidade', 130],
    items: [['Ovo, de galinha, inteiro, cru', 100, '2 ovos'], ['Tomate, com semente, cru', 20], ['Óleo, de soja', 3]] },
];

export const RECIPE_GROUP = 'Receitas típicas (estimativa)';

/** Transforma as receitas em alimentos com valores por 100 g, calculados da TACO. */
export function buildRecipeFoods(taco) {
  const byName = new Map(taco.map(f => [f.n, f]));
  const r1 = n => Math.round(n * 10) / 10;
  return RECIPES.map(r => {
    const items = r.items.map(([n, grams, note]) => {
      const f = byName.get(n);
      if (!f) throw new Error(`Ingrediente fora da TACO: ${n}`);
      const k = grams / 100;
      return { n, grams, note, kcal: f.k * k, p: f.p * k, c: f.c * k, f: f.f * k };
    });
    const [unit, grams] = r.serving;
    const sum = key => items.reduce((s, it) => s + it[key], 0);
    const per100 = v => (v * 100) / grams;
    return {
      id: 'r-' + r.id, n: r.name, alias: r.alias, g: RECIPE_GROUP, source: 'receita',
      k: Math.round(per100(sum('kcal'))), p: r1(per100(sum('p'))), c: r1(per100(sum('c'))), f: r1(per100(sum('f'))),
      serving: grams, servingUnit: unit, servingKcal: Math.round(sum('kcal')),
      ingredients: items.map(it => ({ n: it.n, grams: it.grams, note: it.note, kcal: Math.round(it.kcal) })),
    };
  });
}
