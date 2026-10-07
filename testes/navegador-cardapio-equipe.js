// Teste no navegador da parte da equipe do cardápio digital: pedido chega → entra sozinho na conta da mesa,
// status, chamado de garçom, pedido de conta, finalizar a mesa e a tela de configuração (link, ordem, edição).
// O modo nuvem é simulado: as chamadas ao Supabase são interceptadas (nada vai para o banco real).
// Rodar: node testes/navegador-cardapio-equipe.js
const {spawn} = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const PORTA = 9396;
const URL0 = 'file:///' + path.join(__dirname, '..', 'mga-sistema.html').replace(/\\/g, '/');
const PERFIL = path.join(os.tmpdir(), 'mga-teste-cardapio-equipe');
fs.rmSync(PERFIL, {recursive: true, force: true});
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORTA, '--user-data-dir=' + PERFIL, '--window-size=1400,900', '--allow-file-access-from-files', 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let falhas = 0;
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALHOU: ') + m); if (!c) falhas++; };
const FOTOS = process.argv.includes('--fotos') ? process.argv[process.argv.indexOf('--fotos') + 1] : null;

// ---- Supabase simulado ----
const chamadas = [];
let aceitar = true;
function responder(metodo, url, corpo){
  const u = new URL(url), caminho = u.pathname.replace('/rest/v1/', '');
  chamadas.push({metodo, caminho, busca: u.search, corpo});
  if (caminho === 'rpc/cardapio_aceitar') return [200, aceitar];
  if (caminho === 'rpc/cardapio_ativar') return [200, 'abc123'];
  if (metodo === 'GET' && (caminho === 'cardapio_pedidos' || caminho === 'cardapio_chamados')) return [200, []];
  if (metodo === 'PATCH') return [204, null];
  return [200, []];
}

(async () => {
  let tgt;
  for (let i = 0; i < 120 && !tgt; i++) { await sleep(250); try { tgt = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find(t => t.type === 'page'); } catch (e) { /* Chrome subindo */ } }
  const ws = new WebSocket(tgt.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; const erros = [];
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
    if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Fetch.requestPaused') {
      const {requestId, request} = m.params;
      const cors = [{name: 'Access-Control-Allow-Origin', value: '*'}, {name: 'Access-Control-Allow-Headers', value: '*'}, {name: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, OPTIONS'}];
      if (request.method === 'OPTIONS') return cmd('Fetch.fulfillRequest', {requestId, responseCode: 204, responseHeaders: cors});
      const [status, corpo] = responder(request.method, request.url, request.postData ? JSON.parse(request.postData) : null);
      cmd('Fetch.fulfillRequest', {requestId, responseCode: status, responseHeaders: [...cors, {name: 'Content-Type', value: 'application/json'}],
        ...(corpo === null ? {} : {body: Buffer.from(JSON.stringify(corpo)).toString('base64')})});
    }
  };
  const ev = async expr => { const r = await cmd('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
  const clicar = async (texto, sel = 'button') => { const r = await ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find(b => b.innerText.trim() === ${JSON.stringify(texto)} || b.innerText.includes(${JSON.stringify(texto)})); if (!b) return false; b.click(); return true; })()`); await sleep(400); return r; };
  const foto = async nome => { if (!FOTOS) return; const r = await cmd('Page.captureScreenshot', {format: 'png'}); fs.writeFileSync(path.join(FOTOS, nome + '.png'), Buffer.from(r.result.data, 'base64')); };
  const ir = async rota => { await ev(`location.hash = '/${rota}'; 1`); await sleep(900); };
  await cmd('Runtime.enable'); await cmd('Page.enable');
  await cmd('Fetch.enable', {patterns: [{urlPattern: '*supabase.co/rest/v1/*'}]});
  await cmd('Page.navigate', {url: URL0}); await sleep(1500);
  await ev(`localStorage.clear(); localStorage.setItem('mga_restUsuarios', JSON.stringify([{id:'u1',nome:'Mateus Teste',login:'admin',perfil:'ADMIN',ativo:true,hash:'x',sal:'y',modulos:[]}])); localStorage.setItem('mga_sessao', JSON.stringify({usuarioId:'u1'})); 1`);
  await cmd('Page.navigate', {url: URL0 + '#/dashboard'}); await sleep(3000);
  // Modo nuvem simulado
  await ev(`(async () => { window.MGA_NUVEM.ativa = true; const u = RestDados.sessaoAtual(); u.empresaId = 'E1'; await window.RestCardapio._iniciar(); return 1; })()`);
  await sleep(500);
  ok(chamadas.some(c => c.caminho === 'cardapio_pedidos') && chamadas.some(c => c.caminho === 'cardapio_chamados'), 'carrega pedidos e chamados do banco');
  await ev(`RestDados.abrirCaixa({valorInicial: '100'}); 1`);

  // 1. Pedido novo chega pelo tempo real → entra na conta da mesa 03
  const mesa = await ev(`(() => { const m = RestDados.mesas()[2]; return {id: m.id, numero: m.numero}; })()`);
  const prod = await ev(`(() => { const p = RestDados.produtos().find(x => x.ativo && !(x.tamanhos||[]).length && !(x.gruposAdicionais||[]).length && x.tipo !== 'INSUMO' && RestDados.grupoPorId(x.grupoId)?.cozinha !== false); return {id: p.id, nome: p.nome, preco: p.preco}; })()`);
  const pedido = {id: 'ped-1', numero: 1025, mesa_id: mesa.id, mesa_numero: mesa.numero, status: 'NOVO', total: prod.preco * 2, obs: 'sem cebola', criado_em: new Date().toISOString(),
    itens: [{produtoId: prod.id, nome: prod.nome, quantidade: 2, adicionais: [], observacao: ''}], aceito_em: null, venda_id: null, erro: null};
  await ev(`window.RestCardapio._receber('cardapio_pedidos', {new: ${JSON.stringify(pedido)}}); 1`);
  await sleep(1500);
  ok((await ev(`document.querySelector('.rest-cd-aviso')?.innerText || ''`)).includes(`Mesa ${mesa.numero} · novo pedido #1025`), 'aviso na tela: novo pedido #1025');
  ok(chamadas.some(c => c.caminho === 'rpc/cardapio_aceitar' && c.corpo.p_pedido === 'ped-1'), 'pega o pedido no banco (só um computador lança)');
  const conta = await ev(`(() => { const v = RestDados.vendaDaMesa(${JSON.stringify(mesa.id)}); return v ? {id: v.id, itens: v.itens.map(i => [i.quantidade, i.produtoId, i.cardapio, i.observacao, !!i.preparo])} : null; })()`);
  ok(conta && conta.itens.length === 1 && conta.itens[0][0] === 2 && conta.itens[0][2] === 1025, `pedido entrou na conta da mesa ${mesa.numero} (2x ${prod.nome})`);
  ok(conta && conta.itens[0][3].includes('sem cebola') && conta.itens[0][4], 'observação do pedido no item e item na fila da cozinha');
  ok(chamadas.some(c => c.metodo === 'PATCH' && c.caminho === 'cardapio_pedidos' && c.corpo.venda_id === conta.id), 'pedido ligado à conta da mesa no banco');

  // 2. Tela de pedidos: status
  await ir('vendas/cardapio');
  const card = await ev(`document.querySelector('.rest-cd-pedido')?.innerText || ''`);
  ok(card.includes('#1025') && card.includes('Mesa ' + mesa.numero) && card.includes('Novo pedido') && card.includes('na conta da mesa'), 'cartão do pedido: número, mesa, status e "na conta da mesa"');
  ok((await ev(`document.querySelector('.nav-grupo .nav-badge')?.innerText || ''`)) === '1', 'menu Vendas com 1 pendente');
  await foto('equipe-1-pedidos');
  await clicar('Em preparação');
  ok(chamadas.some(c => c.metodo === 'PATCH' && c.corpo?.status === 'PREPARANDO'), 'botão "Em preparação" muda o status no banco');

  // 3. Chamados
  await ev(`window.RestCardapio._receber('cardapio_chamados', {new: {id: 'ch-1', mesa_id: ${JSON.stringify(mesa.id)}, mesa_numero: ${JSON.stringify(mesa.numero)}, tipo: 'GARCOM', status: 'PENDENTE', criado_em: new Date().toISOString()}}); 1`);
  await ev(`window.RestCardapio._receber('cardapio_chamados', {new: {id: 'ch-2', mesa_id: ${JSON.stringify(mesa.id)}, mesa_numero: ${JSON.stringify(mesa.numero)}, tipo: 'CONTA', status: 'PENDENTE', total: 20, criado_em: new Date().toISOString()}}); 1`);
  await sleep(600);
  const ch = await ev(`document.querySelector('.rest-cd-chamados')?.innerText || ''`);
  ok(ch.includes('chamou o garçom') && ch.includes('pediu a conta'), 'chamados aparecem: garçom e conta');
  ok(await ev(`RestDados.vendaDaMesa(${JSON.stringify(mesa.id)}).contaPedida === true`), 'pedido de conta marca "conta pedida" na mesa');
  await foto('equipe-2-chamados');
  await clicar('Atendido');
  ok(chamadas.some(c => c.metodo === 'PATCH' && c.caminho === 'cardapio_chamados' && c.corpo.status === 'ATENDIDO'), '"Atendido" registra no banco');

  // 4. Outro computador pegou o pedido: este não lança
  aceitar = false;
  await ev(`window.RestCardapio._receber('cardapio_pedidos', {new: ${JSON.stringify({...pedido, id: 'ped-2', numero: 1026})}}); 1`);
  await sleep(1200);
  ok((await ev(`RestDados.vendaDaMesa(${JSON.stringify(mesa.id)}).itens.length`)) === 1, 'pedido pego por outro computador não entra em dobro');

  // 4b. Pedido pelo link geral (sem o QR da mesa): espera a equipe confirmar
  aceitar = true;
  const mesa2 = await ev(`(() => { const m = RestDados.mesas()[5]; return {id: m.id, numero: m.numero}; })()`);
  await ev(`window.RestCardapio._receber('cardapio_pedidos', {new: ${JSON.stringify({...pedido, id: 'ped-3', numero: 1027, mesa_id: mesa2.id, mesa_numero: mesa2.numero, confirmar: true})}}); 1`);
  await sleep(1200);
  ok(!(await ev(`!!RestDados.vendaDaMesa(${JSON.stringify(mesa2.id)})`)), 'pedido sem QR da mesa não entra sozinho na conta');
  await ir('vendas/cardapio');
  const card3 = await ev(`[...document.querySelectorAll('.rest-cd-pedido')].find(c => c.innerText.includes('#1027'))?.innerText || ''`);
  ok(card3.includes('Confirmar e lançar') && !card3.includes('Em preparação'), 'cartão mostra "Confirmar e lançar na mesa" (e não muda status antes)');
  await ev(`[...document.querySelectorAll('.rest-cd-pedido')].find(c => c.innerText.includes('#1027')).querySelector('.btn').click(); 1`);
  await sleep(1500);
  ok(await ev(`(RestDados.vendaDaMesa(${JSON.stringify(mesa2.id)})?.itens || []).some(i => i.cardapio === 1027)`), 'ao confirmar, o pedido entra na conta da mesa');

  // 5. Fechar a conta da mesa → pedido finalizado
  await ev(`(() => { const D = RestDados, v = D.vendaDaMesa(${JSON.stringify(mesa.id)}); const t = D.totaisVenda(v); const f = D.formasAtivas().find(x => x.tipo === 'PIX');
    D.receberParcial(v.id, {valor: t.restante, pagamentos: [{formaId: f.id, valor: t.restante}]}); return 1; })()`);
  await sleep(1200);
  ok(chamadas.some(c => c.metodo === 'PATCH' && c.caminho === 'cardapio_pedidos' && c.corpo.status === 'FINALIZADO'), 'mesa paga: pedido vira "Finalizado"');

  // 6. Tela de configuração do cardápio
  await ir('cardapio'); await sleep(800);
  ok((await ev(`document.querySelector('.rest-cd-link input')?.value || ''`)).endsWith('cardapio.html?e=abc123'), 'link do cardápio com o código da empresa');
  await clicar('Abrir para pedidos');
  ok(await ev(`RestDados.config().cardapio?.ativo === true`), '"Abrir para pedidos" liga o cardápio');
  const primeiro = await ev(`document.querySelector('.rest-cd-produtos li .rest-cd-nome b').innerText`);
  await ev(`document.querySelector('.rest-cd-produtos li input[type=checkbox]').click(); 1`); await sleep(400);
  ok(await ev(`!RestDados.noCardapio(RestDados.produtos().find(p => p.nome === ${JSON.stringify(primeiro)}))`), `"${primeiro}" saiu do cardápio pelo checkbox`);
  await ev(`document.querySelector('.rest-cd-produtos li .rest-cd-setas button[aria-label^="Descer"]').click(); 1`); await sleep(400);
  ok((await ev(`document.querySelectorAll('.rest-cd-produtos')[0].querySelectorAll('li .rest-cd-nome b')[1].innerText`)) === primeiro, 'seta "descer" muda a ordem');
  await ev(`[...document.querySelectorAll('.rest-cd-produtos li')].find(li => li.innerText.includes(${JSON.stringify(primeiro)})).querySelector('.btn').click(); 1`); await sleep(400);
  await ev(`(() => { const t = document.querySelector('.conferencia-box textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(t, 'Descrição nova'); t.dispatchEvent(new Event('input', {bubbles: true})); return 1; })()`);
  await clicar('Salvar', '.conferencia-box button'); await sleep(300);
  ok(await ev(`RestDados.produtos().find(p => p.nome === ${JSON.stringify(primeiro)}).descricao === 'Descrição nova'`), 'editar no cardápio altera a descrição do produto');
  await foto('equipe-3-config');
  await clicar('Mesa 01', '.rest-cd-mesas-lista button'); await sleep(1500);
  const qr = await ev(`!!document.querySelector('.rest-cd-qr svg')`);
  ok(qr, 'QR Code da mesa gerado (precisa de internet)');
  // 7. Botão "Cardápio" na barra de vendas abre o cardápio do cliente numa aba nova
  await ev(`document.querySelector('.conferencia-overlay')?.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'})); 1`);
  await ir('vendas/pdv');
  const clique = await cmd('Runtime.evaluate', {expression: `(() => { const b = document.querySelector('.rest-atalhos button[title^="Abrir o cardápio"]'); if (!b) return false; b.click(); return true; })()`, userGesture: true, returnByValue: true});
  ok(clique.result.result.value === true, 'botão 📱 Cardápio junto dos atalhos de vendas');
  await sleep(1500);
  const abas = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).filter(t => t.type === 'page').map(t => t.url);
  ok(abas.some(u => u.includes('cardapio.html?e=abc123')), 'abriu o cardápio do cliente numa aba nova');
  await ir('vendas/cardapio');
  ok(await ev(`[...document.querySelectorAll('button')].some(b => b.innerText.includes('Abrir cardápio'))`), 'botão "Abrir cardápio" na tela de pedidos');
  ok(!erros.length, 'sem erros no console ' + (erros.length ? JSON.stringify(erros).slice(0, 300) : ''));
  console.log(falhas ? `${falhas} FALHA(S)` : 'TUDO OK');
  chrome.kill(); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
