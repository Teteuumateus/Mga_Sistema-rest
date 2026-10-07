// Teste no navegador do financeiro: fluxo de caixa previsto (gráfico, avisos, dias) e conta parcelada.
// escolhe o arquivo pelo botão "Importar planilha", confere a prévia e importa.
// Precisa de internet (React e a biblioteca do Excel vêm da internet). Rodar: node testes/navegador-importar.js
const {spawn} = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const PORTA = 9395;
const URL0 = 'file:///' + path.join(__dirname, '..', 'mga-sistema.html').replace(/\\/g, '/');
const PERFIL = path.join(os.tmpdir(), 'mga-teste-financeiro');
const DOWNLOADS = path.join(PERFIL, 'downloads');
fs.rmSync(PERFIL, {recursive: true, force: true});
fs.mkdirSync(DOWNLOADS, {recursive: true});
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORTA, '--user-data-dir=' + path.join(PERFIL, 'perfil'), '--window-size=1400,900', '--allow-file-access-from-files', 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let falhas = 0;
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALHOU: ') + m); if (!c) falhas++; };

(async () => {
  let tgt;
  for (let i = 0; i < 120 && !tgt; i++) { await sleep(250); try { tgt = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find(t => t.type === 'page'); } catch (e) { /* Chrome subindo */ } }
  const ws = new WebSocket(tgt.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}; const erros = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
    if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
  const ev = async expr => { const r = await cmd('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true}); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
  const clicar = texto => ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.innerText.includes(${JSON.stringify(texto)})); if (!b) return false; b.click(); return true; })()`);
  await cmd('Runtime.enable'); await cmd('Page.enable'); await cmd('DOM.enable');
  await cmd('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: DOWNLOADS});
  await cmd('Page.navigate', {url: URL0}); await sleep(1500);
  await ev(`localStorage.clear(); localStorage.setItem('mga_restUsuarios', JSON.stringify([{id:'u1',nome:'Mateus Teste',login:'admin',perfil:'ADMIN',ativo:true,hash:'x',sal:'y',modulos:[]}])); localStorage.setItem('mga_sessao', JSON.stringify({usuarioId:'u1'})); 1`);
  await cmd('Page.navigate', {url: URL0 + '#/dashboard'}); await cmd('Page.reload'); await sleep(3000);

  const FOTOS = process.argv.includes('--fotos') ? process.argv[process.argv.indexOf('--fotos') + 1] : null;
  const foto = async (nome, w = 1400, h = 900, mobile = false) => { if (!FOTOS) return; await cmd('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: 1, mobile}); await sleep(500);
    const r = await cmd('Page.captureScreenshot', {format: 'png'}); fs.writeFileSync(path.join(FOTOS, nome + '.png'), Buffer.from(r.result.data, 'base64')); };
  const ir = async rota => { await ev(`location.hash = '/${rota}'; 1`); await sleep(1200); };
  const mais = n => `RestDados.diaISO(new Date(Date.now() + ${n} * 86400000))`;
  await ev(`(() => { const D = RestDados; D.salvarContaBancaria({nome: 'Banco do Brasil', tipo: 'BANCO', saldoInicial: '5000'});
    const P = D.categorias().PAGAR, R = D.categorias().RECEBER;
    D.salvarConta({tipo: 'PAGAR', descricao: 'Aluguel', categoria: P[0], valor: '3500', vencimento: ${mais(6)}});
    D.salvarConta({tipo: 'PAGAR', descricao: 'Folha de pagamento', categoria: P[0], valor: '6800', vencimento: ${mais(12)}});
    D.salvarConta({tipo: 'RECEBER', descricao: 'Evento corporativo', categoria: R[0], valor: '4200', vencimento: ${mais(9)}});
    D.salvarConta({tipo: 'RECEBER', descricao: 'Encomenda de festa', categoria: R[0], valor: '2500', vencimento: ${mais(20)}});
    D.salvarConta({tipo: 'PAGAR', descricao: 'Conta de luz', categoria: P[0], valor: '780', vencimento: ${mais(-2)}}); return 1; })()`);
  await ir('fin/fluxo');
  ok((await ev(`[...document.querySelectorAll('.nav-itens button')].map(b => b.innerText).join('|')`)).includes('Fluxo de caixa'), 'menu Financeiro com "Fluxo de caixa"');
  const t = await ev(`document.querySelector('main').innerText`);
  ok(t.includes('R$ 5.000,00') && t.includes('Vai entrar') && t.includes('R$ 6.700,00'), 'saldo de hoje R$ 5.000 e R$ 6.700 a receber');
  ok(/saldo previsto fica\s+negativo/.test(t), 'avisa que o saldo fica negativo (folha de pagamento)');
  ok(await ev(`!!document.querySelector('.recharts-line-curve')`), 'gráfico do saldo previsto desenhado');
  await foto('fin-fluxo-claro');
  await ev(`document.documentElement.setAttribute('data-theme','dark'); 1`); await sleep(400);
  await foto('fin-fluxo-escuro');
  await cmd('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true}); await sleep(500);
  await foto('fin-fluxo-celular', 390, 844, true);
  ok(await ev(`document.documentElement.scrollWidth <= 392`), 'celular sem rolagem lateral');
  await cmd('Emulation.setDeviceMetricsOverride', {width: 1400, height: 900, deviceScaleFactor: 1, mobile: false});
  await ev(`document.documentElement.setAttribute('data-theme','light'); 1`);
  // Conta parcelada pelo formulário
  await ir('fin/pagar');
  await clicar('+ Nova conta a pagar'); await sleep(300);
  const setv = (sel, v) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', {bubbles: true})); return 1; })()`);
  await setv('main form input[type=text]', 'Freezer novo'); await sleep(100);
  await ev(`(() => { const i = [...document.querySelectorAll('main form .field')].find(f => f.innerText.includes('Valor')).querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, '1.200,00'); i.dispatchEvent(new Event('input', {bubbles: true})); i.dispatchEvent(new Event('change', {bubbles: true})); return 1; })()`); await sleep(100);
  await ev(`(() => { const s = [...document.querySelectorAll('main form select')].find(x => [...x.options].some(o => o.value === 'parcelas')); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, 'parcelas'); s.dispatchEvent(new Event('change', {bubbles: true})); return 1; })()`); await sleep(100);
  await setv('main form input[type=number]', '4'); await sleep(300);
  ok((await ev(`document.querySelector('main').innerText`)).includes('4 parcelas de R$ 300,00'), 'formulário mostra "4 parcelas de R$ 300,00"');
  await foto('fin-parcelas');
  await ev(`[...document.querySelectorAll('main form button')].find(b => /Salvar/.test(b.innerText)).click(); 1`); await sleep(500);
  ok(await ev(`RestDados.contas().filter(c => c.descricao.startsWith('Freezer novo (') && c.descricao.endsWith('/4)')).length === 4`), '4 parcelas lançadas');
  ok(!erros.length, 'sem erros no console ' + (erros.length ? JSON.stringify(erros).slice(0, 300) : ''));
  console.log(falhas ? `${falhas} FALHA(S)` : 'TUDO OK');
  chrome.kill(); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
