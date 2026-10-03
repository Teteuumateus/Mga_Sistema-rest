// Cópia única: categorias, produtos e tamanhos do navegador (localStorage) para o Supabase.
// Pode rodar de novo: atualiza o que já existe (pelo nome da categoria e pelo código do produto).
(async () => {
  const L = k => JSON.parse(localStorage.getItem('mga_' + k) || '[]');
  const grupos = L('restGrupos'), produtos = L('restProdutos');

  // Categorias
  const { data: cats, error: e1 } = await supa.from('categorias').upsert(
    grupos.map(g => ({ nome: g.nome, ordem: g.ordem || 0, cozinha: g.cozinha !== false, ativo: g.ativo !== false })),
    { onConflict: 'empresa_id,nome' }).select('id, nome');
  if (e1) return console.error('Categorias:', e1.message);
  const catId = Object.fromEntries(cats.map(c => [c.nome, c.id]));
  const grupoNome = Object.fromEntries(grupos.map(g => [g.id, g.nome]));

  // Produtos
  const linhas = produtos.filter(p => catId[grupoNome[p.grupoId]]).map(p => ({
    categoria_id: catId[grupoNome[p.grupoId]], codigo: p.codigo, nome: p.nome,
    tipo: p.tipo === 'INSUMO' ? 'INSUMO' : 'VENDA', preco: p.preco || 0, custo: p.custo || 0,
    unidade: p.unidade || 'UN', controla_estoque: !!p.controlaEstoque, estoque: p.estoque || 0,
    estoque_minimo: p.estoqueMinimo || 0, foto_url: p.foto || null, descricao: p.descricao || null, ativo: p.ativo !== false
  }));
  const { data: prods, error: e2 } = await supa.from('produtos').upsert(linhas, { onConflict: 'empresa_id,codigo' }).select('id, codigo');
  if (e2) return console.error('Produtos:', e2.message);

  // Tamanhos (P/M/G, 300 ml/500 ml...)
  const prodId = Object.fromEntries(prods.map(p => [p.codigo, p.id]));
  const tamanhos = produtos.filter(p => prodId[p.codigo]).flatMap(p => (p.tamanhos || [])
    .map((t, k) => ({ produto_id: prodId[p.codigo], nome: t.nome, preco: t.preco, ordem: k })));
  if (tamanhos.length) {
    const { error: e3 } = await supa.from('produto_tamanhos').upsert(tamanhos, { onConflict: 'produto_id,nome' });
    if (e3) return console.error('Tamanhos:', e3.message);
  }

  // Próximo código de produto continua do maior importado
  const maior = Math.max(0, ...linhas.map(p => parseInt(p.codigo, 10) || 0));
  await supa.from('sequencias').update({ valor: maior }).eq('nome', 'produto');

  console.log(`Importado: ${cats.length} categorias, ${prods.length} de ${produtos.length} produtos, ${tamanhos.length} tamanhos.`);
})();
