// Teste no navegador da página do cliente (cardapio.html). As chamadas ao Supabase são interceptadas e
// respondidas com um cardápio de exemplo (nada vai para o banco real); o teste confere o que a página envia.
// Rodar: node testes/navegador-cardapio.js
const {spawn} = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const PORTA = 9397;
const PAGINA = 'file:///' + path.join(__dirname, '..', 'cardapio.html').replace(/\\/g, '/');
const PERFIL = path.join(os.tmpdir(), 'mga-teste-cardapio');
fs.rmSync(PERFIL, {recursive: true, force: true});
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORTA, '--user-data-dir=' + PERFIL, '--window-size=420,900', '--allow-file-access-from-files', 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let falhas = 0;
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALHOU: ') + m); if (!c) falhas++; };
const FOTOS = process.argv.includes('--fotos') ? process.argv[process.argv.indexOf('--fotos') + 1] : null;

// ---- Cardápio de exemplo devolvido pelas funções do banco ----
const ids = {lanches: 'c1', bebidas: 'c2', burger: 'p1', suco: 'p2', agua: 'p3', ponto: 'g1', extras: 'g2', aoPonto: 'o1', bemPassada: 'o2', bacon: 'o3', ovo: 'o4', p300: 't1', p500: 't2'};
const mesas = ['01', '02', '03', '04', '05'].map((n, k) => ({id: 'm' + (k + 1), numero: n}));
let aberto = true;
const publico = () => ({
  empresa: {nome: 'MGA Restaurante', aberto, mensagem: 'Cozinha aberta até 23h', telefone: '', taxaServico: 10},
  categorias: [{id: ids.lanches, nome: 'Lanches', ordem: 1}, {id: ids.bebidas, nome: 'Bebidas', ordem: 2}],
  produtos: [
    {id: ids.burger, nome: 'X-Burger', descricao: 'Pão, carne 180 g e queijo', preco: 25, foto: null, categoriaId: ids.lanches, unidade: 'UN', ordem: 1, tamanhos: [], adicionais: [ids.ponto, ids.extras]},
    {id: ids.suco, nome: 'Suco de laranja', descricao: null, preco: 8, foto: null, categoriaId: ids.bebidas, unidade: 'UN', ordem: 1, tamanhos: [{id: ids.p300, nome: '300 ml', preco: 8}, {id: ids.p500, nome: '500 ml', preco: 11}], adicionais: []},
    {id: ids.agua, nome: 'Água mineral', descricao: 'Sem gás', preco: 4, foto: null, categoriaId: ids.bebidas, unidade: 'UN', ordem: 2, tamanhos: [], adicionais: []}],
  adicionais: [{id: ids.ponto, nome: 'Ponto da carne', min: 1, max: 1, opcoes: [{id: ids.aoPonto, nome: 'Ao ponto', preco: 0}, {id: ids.bemPassada, nome: 'Bem passada', preco: 0}]},
    {id: ids.extras, nome: 'Extras', min: 0, max: 2, opcoes: [{id: ids.bacon, nome: 'Bacon', preco: 4}, {id: ids.ovo, nome: 'Ovo', preco: 2}]}],
  mesas
});
const enviados = [];
function responder(nome, corpo){
  enviados.push({nome, corpo});
  if (nome === 'cardapio_publico') return corpo.p_codigo === 'abc123' ? [200, publico()] : [400, {message: 'Cardápio não encontrado.'}];
  if (nome === 'cardapio_pedir') return [200, {id: 'x', numero: 1025, mesa: '05', total: 69}];
  if (nome === 'cardapio_chamar') return [200, {id: 'y', mesa: '05', tipo: corpo.p_tipo, total: corpo.p_tipo === 'CONTA' ? 69 : null, repetido: false}];
  if (nome === 'cardapio_meus_pedidos') return [200, enviados.some(e => e.nome === 'cardapio_pedir') ? [{id: 'x', numero: 1025, mesa: '05', status: 'PREPARANDO', total: 69, obs: 'Capricha',
    criadoEm: new Date().toISOString(), itens: [{nome: 'X-Burger', quantidade: 2, preco: 29, adicionais: [{nome: 'Bacon'}], observacao: 'sem cebola'}, {nome: 'Suco de laranja', quantidade: 1, tamanho: '500 ml', preco: 11, adicionais: []}]}] : []];
  return [404, {message: 'desconhecida'}];
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
      const cors = [{name: 'Access-Control-Allow-Origin', value: '*'}, {name: 'Access-Control-Allow-Headers', value: '*'}, {name: 'Access-Control-Allow-Methods', value: 'POST, GET, OPTIONS'}];
      if (request.method === 'OPTIONS') return cmd('Fetch.fulfillRequest', {requestId, responseCode: 204, responseHeaders: cors});
      const nome = request.url.split('/rpc/')[1]?.split('?')[0];
      const [status, corpo] = responder(nome, JSON.parse(request.postData || '{}'));
      cmd('Fetch.fulfillRequest', {requestId, responseCode: status, responseHeaders: [...cors, {name: 'Content-Type', value: 'application/json'}], body: Buffer.from(JSON.stringify(corpo)).toString('base64')});
    }
  };
  const ev = async expr => { const r = await cmd('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
  const clicar = async (sel, texto) => { const r = await ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(sel)})].find(b => ${texto ? `b.innerText.includes(${JSON.stringify(texto)})` : 'true'}); if (!b) return false; b.click(); return true; })()`); await sleep(250); return r; };
  const texto = sel => ev(`document.querySelector(${JSON.stringify(sel)})?.innerText || ''`);
  const foto = async nome => { if (!FOTOS) return; const r = await cmd('Page.captureScreenshot', {format: 'png'}); fs.writeFileSync(path.join(FOTOS, nome + '.png'), Buffer.from(r.result.data, 'base64')); };
  await cmd('Runtime.enable'); await cmd('Page.enable');
  await cmd('Fetch.enable', {patterns: [{urlPattern: '*/rest/v1/rpc/*'}]});
  await cmd('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 2, mobile: true});

  // 1. Link sem mesa: escolher a mesa
  await cmd('Page.navigate', {url: PAGINA + '?e=abc123'}); await sleep(2500);
  ok((await texto('.app')).includes('Em qual mesa você está?'), 'sem mesa no link: pede para escolher a mesa');
  ok(await clicar('.mesas-grade button', '05'), 'escolhe a mesa 05');
  ok((await texto('.mesa-chip')) === 'Mesa 05', 'topo mostra "Mesa 05"');
  ok((await texto('.app')).includes('Cozinha aberta até 23h'), 'recado do restaurante aparece');
  ok((await ev(`[...document.querySelectorAll('.chips button')].map(b => b.innerText).join('|')`)) === 'Lanches|Bebidas', 'categorias na ordem');
  await foto('cliente-1-cardapio');

  // 2. Produto com etapa obrigatória e extras
  await clicar('.produto', 'X-Burger');
  await clicar('[data-acao=adicionar]');
  ok((await texto('.erro-form')).includes('Ponto da carne'), 'sem escolher o ponto: avisa');
  await ev(`document.querySelector('input[value="${ids.aoPonto}"]').click(); 1`); await sleep(150);
  await ev(`document.querySelector('input[value="${ids.bacon}"]').click(); 1`); await sleep(150);
  await clicar('[data-acao=qtd][data-d="1"]');
  ok((await texto('[data-acao=adicionar]')).includes('R$ 58,00'), 'preço com bacon x2: R$ 58,00');
  await ev(`(() => { const t = document.querySelector('[data-campo=obs-item]'); t.value = 'sem cebola'; t.dispatchEvent(new Event('input', {bubbles: true})); return 1; })()`);
  await foto('cliente-2-produto');
  await clicar('[data-acao=adicionar]');
  ok((await texto('.barra')).includes('2') && (await texto('.barra')).includes('R$ 58,00'), 'barra do pedido: 2 itens, R$ 58,00');

  // 3. Produto com tamanho
  await clicar('.produto', 'Suco');
  await clicar('[data-acao=adicionar]');
  ok((await texto('.erro-form')).includes('tamanho'), 'sem tamanho: avisa');
  await ev(`document.querySelector('input[value="${ids.p500}"]').click(); 1`); await sleep(150);
  await clicar('[data-acao=adicionar]');
  ok((await texto('.barra')).includes('R$ 69,00'), 'pedido com suco 500 ml: R$ 69,00');

  // 4. Revisar e enviar
  await clicar('[data-acao=abrir-carrinho]');
  ok((await texto('.janela')).includes('Mesa 05') && (await texto('.janela')).includes('Bacon'), 'revisão do pedido mostra mesa e adicionais');
  await ev(`(() => { const t = document.querySelector('[data-campo=obs-pedido]'); t.value = 'Capricha'; t.dispatchEvent(new Event('input', {bubbles: true})); return 1; })()`);
  await foto('cliente-3-revisao');
  await clicar('[data-acao=enviar]'); await sleep(600);
  const pedido = enviados.find(e => e.nome === 'cardapio_pedir')?.corpo;
  ok(pedido && pedido.p_mesa === 'm5' && pedido.p_codigo === 'abc123' && pedido.p_obs === 'Capricha', 'enviou para a mesa 05 com a observação');
  ok(pedido && pedido.p_itens.length === 2 && pedido.p_itens[0].quantidade === 2 && pedido.p_itens[0].adicionais.join() === [ids.aoPonto, ids.bacon].join()
    && pedido.p_itens[0].observacao === 'sem cebola' && pedido.p_itens[1].tamanhoId === ids.p500, 'itens, quantidades, adicionais, tamanho e observação enviados');
  ok(pedido && !JSON.stringify(pedido.p_itens).includes('preco'), 'o celular não manda preço (o banco calcula)');
  ok(pedido && pedido.p_token.length >= 16, 'pedido identifica o celular (para acompanhar)');
  const sucesso = await texto('.janela');
  ok(/Pedido enviado com sucesso!/.test(sucesso) && sucesso.includes('#1025') && sucesso.includes('05') && sucesso.includes('R$ 69,00'), 'confirmação: pedido #1025, mesa 05, R$ 69,00');
  await foto('cliente-4-sucesso');
  await clicar('[data-acao=ver-pedidos]'); await sleep(800);
  ok((await texto('.app')).includes('Em preparação') && (await texto('.app')).includes('Pedido #1025'), '"Meus pedidos" mostra o andamento');
  await foto('cliente-5-meus-pedidos');
  ok(!(await ev(`!!document.querySelector('.barra')`)), 'carrinho esvaziou depois de enviar');

  // 5. Chamar garçom e pedir a conta
  await clicar('[data-acao=chamar][data-tipo=GARCOM]');
  await clicar('[data-acao=confirmar-chamado]'); await sleep(500);
  ok(enviados.some(e => e.nome === 'cardapio_chamar' && e.corpo.p_tipo === 'GARCOM' && e.corpo.p_mesa === 'm5'), 'chamar garçom envia a mesa 05');
  ok((await texto('.toast')).includes('Garçom chamado'), 'aviso: garçom chamado');
  await clicar('[data-acao=chamar][data-tipo=CONTA]');
  await clicar('[data-acao=confirmar-chamado]'); await sleep(500);
  ok((await texto('.janela')).includes('Conta solicitada') && (await texto('.janela')).includes('R$ 69,00'), 'pedir a conta: confirmação com o total dos pedidos');
  await foto('cliente-6-conta');
  await clicar('[data-acao=fechar]');
  ok(await ev(`document.documentElement.scrollWidth <= 391`), 'celular sem rolagem lateral');

  // 6. Mesa pelo link (QR Code) e cardápio fechado para pedidos
  aberto = false;
  await cmd('Page.navigate', {url: PAGINA + '?e=abc123&m=5'}); await sleep(2000);
  ok((await texto('.mesa-chip')) === 'Mesa 05', 'link da mesa (QR Code): já entra na mesa 05');
  aberto = true;
  await cmd('Page.navigate', {url: PAGINA + '?e=abc123&m=m5&k=chave-secreta'}); await sleep(2000);
  await clicar('[data-acao=chamar][data-tipo=GARCOM]'); await clicar('[data-acao=confirmar-chamado]'); await sleep(500);
  ok(enviados.filter(e => e.nome === 'cardapio_chamar').slice(-1)[0]?.corpo.p_chave === 'chave-secreta', 'QR Code da mesa: manda a chave secreta junto');
  aberto = false;
  await cmd('Page.navigate', {url: PAGINA + '?e=abc123&m=5'}); await sleep(2000);
  ok((await texto('.faixa.fechado')).includes('não estamos recebendo pedidos'), 'cardápio fechado: avisa o cliente');
  await clicar('.produto', 'Água');
  ok(await ev(`document.querySelector('[data-acao=adicionar]').disabled`), 'cardápio fechado: não deixa adicionar');
  // 7. Prévia e link errado
  aberto = true;
  const antes = enviados.length;
  await cmd('Page.navigate', {url: PAGINA + '?e=abc123&m=m2&previa=1'}); await sleep(2000);
  ok((await texto('.faixa.previa')).includes('Prévia'), 'prévia avisa que nada é enviado');
  await clicar('[data-acao=chamar][data-tipo=GARCOM]'); await clicar('[data-acao=confirmar-chamado]');
  ok(!enviados.slice(antes).some(e => e.nome === 'cardapio_chamar'), 'prévia não chama o garçom de verdade');
  await cmd('Page.navigate', {url: PAGINA + '?e=errado'}); await sleep(1800);
  ok((await texto('.app')).includes('Cardápio não encontrado'), 'link errado: cardápio não encontrado');
  ok(!erros.length, 'sem erros no console ' + (erros.length ? JSON.stringify(erros).slice(0, 300) : ''));
  console.log(falhas ? `${falhas} FALHA(S)` : 'TUDO OK');
  chrome.kill(); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
