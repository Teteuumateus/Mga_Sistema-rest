// Teste no navegador (Chrome sem janela): abre o sistema em modo local (sem Supabase), gera a
// demonstração e confere todas as telas e as correções principais. Rodar: node testes/navegador.js
// Chrome em outro lugar: defina a variável CHROME com o caminho do chrome.exe.
const {spawn} = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const PORTA = 9399;
const URL0 = 'file:///' + path.join(__dirname, '..', 'mga-sistema.html').replace(/\\/g, '/');
const PERFIL = path.join(os.tmpdir(), 'mga-teste-navegador');
fs.rmSync(PERFIL, {recursive: true, force: true});
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORTA, '--user-data-dir=' + PERFIL, '--window-size=1400,900', '--allow-file-access-from-files', 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let falhas = 0;
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALHOU: ') + m); if (!c) falhas++; };
let ev, cmd, takeErrors;
const LOGIN = `localStorage.clear(); sessionStorage.clear(); localStorage.setItem('mga_restUsuarios', JSON.stringify([{id:'u1',nome:'Mateus Teste',login:'admin',perfil:'ADMIN',ativo:true,hash:'x',sal:'y',modulos:[]}])); localStorage.setItem('mga_sessao', JSON.stringify({usuarioId:'u1'})); 1`;

(async () => {
  let tgt;
  for (let i = 0; i < 120 && !tgt; i++) { await sleep(250); try { tgt = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find(t => t.type === 'page'); } catch (e) { /* Chrome subindo */ } }
  const ws = new WebSocket(tgt.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; let erros = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
    if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') erros.push(m.params.args.map(a => a.value || a.description).join(' ').slice(0, 400)); };
  cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
  ev = async expr => { const r = await cmd('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
  takeErrors = () => { const e = erros; erros = []; return e; };
  await cmd('Runtime.enable'); await cmd('Page.enable');
  // Login local: administrador de teste
  await cmd('Page.navigate', {url: URL0}); await sleep(1500);
  await ev(LOGIN);
  await cmd('Page.navigate', {url: URL0 + '#/dashboard'}); await sleep(2500);

  const ir = async (rota, espera = 900) => { await ev(`location.hash = '/${rota}'; 1`); await sleep(espera); };
  const setv = (sel, v) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', {bubbles: true})); return 1; })()`);
  const D = 'RestDados';

  // Demonstração + caixa aberto (recarrega: o estado em memória vem do armazenamento limpo)
  await cmd('Page.reload'); await sleep(2500);
  await ev(`${D}.temDemo() ? 1 : (${D}.gerarDemonstracao(), 1)`);
  ok(await ev(`!${D}.caixaAberto()`), 'demonstração não abre caixa');
  await ev(`${D}.caixaAberto() || ${D}.abrirCaixa({valorInicial: "100"}); 1`);

  // 1. Todas as rotas sem erro
  const rotas = await ev(`Object.keys(window.RestUI.telas)`);
  takeErrors();
  for (const r of rotas) { if (r === 'mesas/pedido') continue; await ir(r, 700); }
  const e1 = takeErrors();
  ok(!e1.length, `${rotas.length} telas abertas sem erro no console ${e1.length ? JSON.stringify(e1).slice(0, 500) : ''}`);

  // 2. Estoque 1.250 não some ao editar o produto
  const r2 = await ev(`(() => { const p = ${D}.produtos().find(p => p.nome.startsWith('Coca-Cola Lata'));
    ${D}.configurarEstoque(p.id, {controla: true, minimo: '1000'}); ${D}.ajustarEstoque({produtoId: p.id, contado: '1250', motivo: 'teste'});
    const f = {...p, preco: ${D}.valorBR(p.preco + 1), custo: '', estoque: ${D}.qtdBR(p.estoque), estoqueAberto: ${D}.qtdBR(p.estoque), estoqueMinimo: ${D}.qtdBR(p.estoqueMinimo)};
    ${D}.salvarProduto(f, p.id); const q = ${D}.produtoPorId(p.id); return [q.estoque, q.estoqueMinimo, ${D}.lerValor('1.250'), ${D}.lerValor('0.355')]; })()`);
  ok(r2[0] === 1250 && r2[1] === 1000 && r2[2] === 1250 && r2[3] === 0.355, 'editar produto mantém estoque 1.250 e mínimo 1.000 (' + r2 + ')');

  // 3. Garçom não recebe pagamento nem finaliza; sem sessão não passa
  const r3 = await ev(`(() => { const out = []; const usu = JSON.parse(localStorage.getItem('mga_restUsuarios'));
    const g = {id: 'g1', nome: 'Garçom', login: 'garcom', perfil: 'GARCOM', ativo: true, hash: 'x', sal: 'y', modulos: ['mesas']};
    localStorage.setItem('mga_restUsuarios', JSON.stringify([...usu, g])); ${D}.substituirCadastros({usuarios: [...${D}.usuarios(), g]});
    const m = ${D}.mesas()[0]; const v = ${D}.novaVenda({tipo: 'MESA', mesaId: m.id}); const p = ${D}.produtos().find(x => x.ativo && !x.tamanhos?.length && !(x.gruposAdicionais||[]).length);
    ${D}.adicionarItem(v.id, p.id, {quantidade: 1});
    localStorage.setItem('mga_sessao', JSON.stringify({usuarioId: 'g1'}));
    try { ${D}.adicionarPagamento(v.id, {formaId: ${D}.formasAtivas()[0].id, valor: '100'}); out.push('pagou'); } catch (e) { out.push('bloq:' + e.message.slice(0, 30)); }
    try { ${D}.salvarConta({tipo: 'PAGAR', descricao: 'x', categoria: 'Aluguel', valor: '10', vencimento: ${D}.hojeISO()}); out.push('conta'); } catch (e) { out.push('bloq'); }
    localStorage.removeItem('mga_sessao'); sessionStorage.removeItem('mga_sessao');
    try { ${D}.movimentarCaixa('SUPRIMENTO', {valor: '5', motivo: 'teste'}); out.push('sem sessão passou'); } catch (e) { out.push('bloq'); }
    localStorage.setItem('mga_sessao', JSON.stringify({usuarioId: 'u1'}));
    try { ${D}.cancelarVenda(v.id, 'teste'); } catch (e) {}
    return out; })()`);
  ok(r3[0].startsWith('bloq') && r3[1] === 'bloq' && r3[2] === 'bloq', 'garçom não recebe nem lança conta; sem login nada passa (' + r3 + ')');

  // 4. Data inválida e quantidade 0,355 kg
  const r4 = await ev(`(() => { let a; try { ${D}.salvarConta({tipo: 'PAGAR', descricao: 'x', categoria: 'Aluguel', valor: '10', vencimento: '2026-02-31'}); a = 'aceitou'; } catch (e) { a = 'recusou'; }
    return a; })()`);
  ok(r4 === 'recusou', 'vencimento 31/02 recusado');

  // 5. Balcão: quantidade "1,5" no carrinho
  await ir('vendas/pdv', 1200);
  await ev(`document.querySelector('.rest-pdv-produtos button, .rest-prod-card, [data-produto]') ? 1 : 0`);
  const r5 = await ev(`(async () => { const p = ${D}.produtos().find(x => x.ativo && !x.tamanhos?.length && !(x.gruposAdicionais||[]).length && x.tipo !== 'INSUMO');
    sessionStorage.setItem('mga_pdvCarrinho', JSON.stringify({itens: [{key: 1, produtoId: p.id, quantidade: 1, observacao: '', tamanhoId: null, adicionais: []}], desconto: '', acrescimo: '', obs: ''})); return 1; })()`);
  await cmd('Page.reload'); await sleep(2500);
  const temCampo = await ev(`!!document.querySelector('.rest-car-acoes input')`);
  if (temCampo) {
    await ev(`(() => { const i = document.querySelector('.rest-car-acoes input'); i.focus(); return 1; })()`);
    await setv('.rest-car-acoes input', '1,5'); await sleep(150);
    ok(await ev(`document.querySelector('.rest-car-acoes input').value`) === '1,5', 'digitando "1,5" o campo mostra 1,5');
    await ev(`document.querySelector('.rest-car-acoes input').blur(); 1`); await sleep(300);
    ok(await ev(`document.querySelector('.rest-car-acoes input').value`) === '1,5', 'ao sair do campo a quantidade fica 1,5');
    await setv('.rest-car-acoes input', '0'); await ev(`document.querySelector('.rest-car-acoes input').blur(); 1`); await sleep(300);
    ok(await ev(`document.querySelectorAll('.rest-car-acoes input').length`) === 1, 'digitar 0 não apaga a linha');
  } else ok(false, 'carrinho do balcão não apareceu (chave do carrinho diferente?)');

  // 6. Mesa: divisão por pessoas continua depois de fechar a janela
  const r6 = await ev(`(() => { const m = ${D}.mesas()[1]; const v = ${D}.novaVenda({tipo: 'MESA', mesaId: m.id});
    const p = ${D}.produtos().find(x => x.ativo && !x.tamanhos?.length && !(x.gruposAdicionais||[]).length && x.tipo !== 'INSUMO');
    ${D}.adicionarItem(v.id, p.id, {quantidade: 2}); ${D}.definirServico(v.id, false);
    const t = ${D}.totaisVenda(v); const f = ${D}.formasAtivas().find(x => x.tipo === 'PIX');
    const metade = Math.floor(t.total / 2 * 100) / 100;
    ${D}.receberParcial(v.id, {valor: metade, parte: 'Pessoa 1/2', pagamentos: [{formaId: f.id, valor: metade}]});
    return {id: v.id, resta: ${D}.totaisVenda(v).restante}; })()`);
  await ir('mesas/pedido?id=' + r6.id, 1200);
  await ev(`[...document.querySelectorAll('button')].find(b => /Fechar conta/i.test(b.innerText))?.click(); 1`); await sleep(500);
  const t6 = await ev(`document.querySelector('.rest-partes')?.innerText || ''`);
  ok(/Recebido/.test(t6) && t6.includes('Pessoa 2'), 'reabrindo a conta, a divisão mostra pessoa 1 recebida (' + t6.replace(/\s+/g, ' ').slice(0, 90) + ')');
  

  // 7. Categoria: editar mantém "não vai para a cozinha"
  const r7 = await ev(`(() => { const g = ${D}.grupos().find(x => x.nome === 'Bebidas'); return g ? g.cozinha : 'sem'; })()`);
  await ir('cad/grupos', 900);
  await ev(`(() => { const tr = [...document.querySelectorAll('tbody tr')].find(t => t.innerText.includes('Bebidas')); tr.querySelector('button.edit, button[aria-label^="Editar"]')?.click(); return 1; })()`); await sleep(400);
  const marcado = await ev(`[...document.querySelectorAll('form input[type=checkbox]')].map(c => c.parentElement.innerText.trim() + '=' + c.checked).join('|')`);
  ok(r7 !== false || /cozinha[^|]*=false/i.test(marcado), 'editar categoria Bebidas mantém a opção da cozinha (' + r7 + ' · ' + marcado + ')');

  // 8. Comanda da cozinha não leva bebida
  const r8 = await ev(`(() => { const agua = ${D}.produtos().find(p => ${D}.grupoPorId(p.grupoId)?.cozinha === false && !p.tamanhos?.length && !(p.gruposAdicionais||[]).length);
    if (!agua) return 'sem produto de bebida';
    const m = ${D}.mesas()[2]; const v = ${D}.novaVenda({tipo: 'MESA', mesaId: m.id}); ${D}.adicionarItem(v.id, agua.id, {quantidade: 1});
    return window.RestUI.impressao.pendentes(${D}.vendaPorId(v.id)).length; })()`);
  ok(r8 === 0, 'comanda da cozinha ignora item de categoria sem cozinha (' + r8 + ')');

  // 9. Duas abas: cliente criado na outra aba não é apagado
  const r9 = await ev(`(() => { const lista = JSON.parse(localStorage.getItem('mga_clientes') || '[]'); const novo = {id: 'cli-outra-aba', nome: 'Cliente Outra Aba', telefone: '(71) 99999-0000'};
    const valor = JSON.stringify([...lista, novo]); localStorage.setItem('mga_clientes', valor);
    window.dispatchEvent(new StorageEvent('storage', {key: 'mga_clientes', newValue: valor}));
    return ${D}.clientes().some(c => c.id === 'cli-outra-aba'); })()`);
  ok(r9, 'cliente criado em outra aba aparece nesta (não é sobrescrito)');

  // 10. Celular: menu escondido ao abrir e sem rolagem lateral em Configurações
  await cmd('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  await cmd('Page.reload'); await sleep(2500);
  ok(await ev(`!document.querySelector('#sidebar')`), 'celular: abre com o menu escondido');
  await ir('config/restaurante', 900);
  ok(await ev(`document.documentElement.scrollWidth <= 392`), 'celular: Configurações › Restaurante sem rolagem lateral (' + await ev(`document.documentElement.scrollWidth`) + 'px)');
  await cmd('Emulation.setDeviceMetricsOverride', {width: 1400, height: 900, deviceScaleFactor: 1, mobile: false});

  // 11. Remover demonstração não apaga caixa real
  const r11 = await ev(`(() => { ${D}.removerDemonstracao(); return !!${D}.caixaAberto(); })()`);
  ok(r11, 'remover demonstração mantém o caixa real aberto');

  // Telas de estoque: entrada (produto do cadastro passa a controlar), venda baixa sozinha, dashboard
  await ev(LOGIN);
  await cmd('Page.reload'); await sleep(2500);
  await ir('estoque/entradas', 1200);
  const coca = await ev(`(() => { const p = RestDados.produtos().find(p => p.nome.startsWith('Coca-Cola Lata')); return {id: p.id, controla: !!p.controlaEstoque}; })()`);
  await ev(`[...document.querySelectorAll('button')].find(b => b.innerText === '+ Nova entrada').click(); 1`); await sleep(400);
  await setv('.rest-compra-linha select', coca.id); await sleep(200);
  await setv('.rest-compra-linha input[aria-label="Quantidade"]', '24'); await sleep(100);
  await setv('.rest-compra-linha input[aria-label="Custo unitário"]', '3,50'); await sleep(200);
  ok(!coca.controla && (await ev(`document.querySelector('.rest-compra-aviso')?.innerText || ''`)).includes('passa a controlar'), 'entrada: avisa que o produto passa a controlar estoque');
  await ev(`document.querySelector('.rest-compra').requestSubmit(); 1`); await sleep(500);
  const depois = await ev(`(() => { const p = RestDados.produtoPorId(${JSON.stringify(coca.id)}); return {controla: p.controlaEstoque, estoque: p.estoque, custo: p.custo}; })()`);
  ok(depois.controla && depois.estoque === 24 && depois.custo === 3.5, 'entrada gravada: controla, saldo 24, custo 3,50');
  await ev(`(() => { const D = RestDados; D.abrirCaixa({valorInicial: '100'}); const f = D.formasAtivas()[0];
    D.registrarVenda({itens: [{produtoId: ${JSON.stringify(coca.id)}, quantidade: 5}], pagamentos: [{formaId: f.id, valor: '100'}]});
    D.saidaEstoque({produtoId: ${JSON.stringify(coca.id)}, quantidade: '2', motivo: 'Perda / quebra'}); return 1; })()`);
  await ir('estoque/saidas', 1200);
  const tSaidas = await ev(`document.querySelector('main').innerText`);
  ok(tSaidas.includes('−5') && tSaidas.includes('Saída manual') && tSaidas.includes('−2'), 'saídas: venda baixou 5 sozinha e a perda de 2 aparece');
  await ir('estoque/dashboard', 1200);
  const linha = await ev(`[...document.querySelectorAll('tbody tr')].find(tr => tr.innerText.includes('Coca-Cola Lata'))?.innerText || ''`);
  ok(/0 UN[\s\S]*24 UN[\s\S]*7 UN[\s\S]*17 UN/.test(linha), 'dashboard do estoque: 0 + 24 − 7 = 17');
  ok((await ev(`[...document.querySelectorAll('.nav-grupo:not(.recolhido) .nav-itens button')].map(b => b.innerText).join('|')`)) === 'Dashboard do estoque|Entrada de estoque|Saída de estoque', 'menu Estoque com as 3 telas');

  const e2 = takeErrors().filter(x => !/Supabase|favicon/.test(x));
  ok(!e2.length, 'sem erros no console ' + (e2.length ? JSON.stringify(e2).slice(0, 400) : ''));
  console.log(falhas ? `${falhas} FALHA(S)` : 'TUDO OK');
  chrome.kill(); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
