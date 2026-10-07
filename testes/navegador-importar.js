// Teste no navegador da importação por planilha: produtos (Cadastros) e entrada de estoque. Baixa os modelos,
// escolhe o arquivo pelo botão "Importar planilha", confere a prévia e importa.
// Precisa de internet (React e a biblioteca do Excel vêm da internet). Rodar: node testes/navegador-importar.js
const {spawn} = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const PORTA = 9398;
const URL0 = 'file:///' + path.join(__dirname, '..', 'mga-sistema.html').replace(/\\/g, '/');
const PERFIL = path.join(os.tmpdir(), 'mga-teste-importar');
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
  await cmd('Page.navigate', {url: URL0 + '#/cad/produtos'}); await cmd('Page.reload'); await sleep(3000);

  // 1. Baixar modelo
  ok(await clicar('Baixar modelo'), 'botão "Baixar modelo (Excel)" na tela de Produtos');
  let arquivo = null;
  for (let i = 0; i < 40 && !arquivo; i++) { await sleep(250); arquivo = fs.readdirSync(DOWNLOADS).find(f => f.endsWith('.xlsx')); }
  ok(arquivo === 'modelo-importar-produtos.xlsx', 'modelo baixado: ' + arquivo);
  const abas = await ev(`(async () => { const X = window.XLSX; const wb = X.read(${JSON.stringify([...fs.readFileSync(path.join(DOWNLOADS, arquivo))])}, {type: 'array'});
    return {abas: wb.SheetNames, titulos: X.utils.sheet_to_json(wb.Sheets.Produtos, {header: 1})[0]}; })()`);
  ok(abas.abas.join('|') === 'Produtos|Instruções|Categorias e unidades', 'modelo com as abas Produtos, Instruções e Categorias');
  ok(abas.titulos[1] === 'Nome *' && abas.titulos.length === 12, 'modelo com as 12 colunas');

  // 2. Planilha preenchida (como alguém faria no Excel) e escolhida pelo botão Importar
  const antes = await ev(`RestDados.produtos().length`);
  const b64 = await ev(`(() => { const X = window.XLSX;
    const linhas = [${JSON.stringify(abas.titulos)},
      ['', 'Pastel de Queijo', 'Salgados', 'Venda', 8.5, 3, 'UN', 'Não', '', '', 'Massa crocante', 'Sim'],
      ['', 'Água Mineral 500ml', '', '', 5.5, '', '', '', '', '', '', ''],
      ['', 'Guaraná 2L', 'Bebidas', '', 13.9, 7, 'UN', 'Sim', 24, 6, '', 'Sim'],
      ['', 'Sem categoria nem preço', '', '', '', '', '', '', '', '', '', '']];
    const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(linhas), 'Produtos');
    return X.write(wb, {type: 'base64', bookType: 'xlsx'}); })()`);
  const preenchida = path.join(DOWNLOADS, 'preenchida.xlsx');
  fs.writeFileSync(preenchida, Buffer.from(b64, 'base64'));
  const {root} = (await cmd('DOM.getDocument', {depth: -1})).result;
  const {nodeId} = (await cmd('DOM.querySelector', {nodeId: root.nodeId, selector: 'input[type=file][accept*=".xlsx"]'})).result;
  await cmd('DOM.setFileInputFiles', {nodeId, files: [preenchida]});
  await sleep(1500);
  const previa = await ev(`document.querySelector('.rest-imp-kpis')?.innerText.replace(/\\s+/g, ' ') || ''`);
  ok(/Novos 2 .*Atualizados 1 .*Com erro 1 .*Categorias novas 1/.test(previa), 'prévia: 2 novos, 1 atualizado, 1 erro, 1 categoria nova (' + previa + ')');
  ok(await ev(`RestDados.produtos().length`) === antes, 'prévia ainda não gravou nada');
  ok((await ev(`document.querySelector('.rest-imp-erro')?.innerText || ''`)).includes('preço'), 'linha com erro mostra o motivo');

  // 3. Importar
  ok(await clicar('Importar 3 produtos'), 'botão "Importar 3 produtos"');
  await sleep(800);
  const r = await ev(`(() => { const D = RestDados; const p = n => D.produtos().find(x => x.nome === n);
    return {total: D.produtos().length, pastel: p('Pastel de Queijo') && D.grupoPorId(p('Pastel de Queijo').grupoId).nome, agua: p('Água Mineral 500ml').preco,
      guarana: [p('Guaraná 2L').estoque, p('Guaraná 2L').controlaEstoque], aviso: document.querySelector('.rest-toast')?.innerText || '', tela: document.querySelector('main').innerText.includes('Pastel de Queijo')}; })()`);
  ok(r.total === antes + 2, 'dois produtos novos cadastrados');
  ok(r.pastel === 'Salgados', 'pastel na categoria nova Salgados');
  ok(r.agua === 5.5, 'água mineral atualizada para R$ 5,50');
  ok(r.guarana[0] === 24 && r.guarana[1], 'guaraná com 24 em estoque');
  ok(r.tela, 'produto importado já aparece na tela de Produtos');
  ok(/Importação concluída/.test(r.aviso), 'aviso de conclusão: ' + r.aviso);

  // 3b. CSV do Excel brasileiro (UTF-8 sem BOM, ";" e vírgula decimal): números e acentos certos
  const csv = path.join(DOWNLOADS, 'produtos.csv');
  fs.writeFileSync(csv, ['Código;Nome *;Categoria *;Tipo;Preço de venda *;Custo;Unidade', ';Pão de Queijo Mineiro;Salgados;Venda;6,50;2,35;UN', ';Açaí 500 ml;Sobremesas;Venda;1.234,56;;UN'].join(String.fromCharCode(13, 10)) + String.fromCharCode(13, 10), 'utf8');
  const docC = (await cmd('DOM.getDocument', {depth: -1})).result.root;
  const inputC = (await cmd('DOM.querySelector', {nodeId: docC.nodeId, selector: 'input[type=file][accept*=".xlsx"]'})).result.nodeId;
  await cmd('DOM.setFileInputFiles', {nodeId: inputC, files: [csv]});
  await sleep(1500);
  ok((await ev(`document.querySelector('.rest-imp-kpis')?.innerText || ''`)).replace(/\s+/g, ' ').includes('Novos 2'), 'CSV: prévia com 2 produtos novos');
  await clicar('Importar 2 produtos'); await sleep(800);
  const doCsv = await ev(`(() => { const p = n => RestDados.produtos().find(x => x.nome === n); return [p('Pão de Queijo Mineiro')?.preco, p('Pão de Queijo Mineiro')?.custo, p('Açaí 500 ml')?.preco]; })()`);
  ok(doCsv[0] === 6.5 && doCsv[1] === 2.35 && doCsv[2] === 1234.56, 'CSV: 6,50 · 2,35 · 1.234,56 lidos certo e acentos mantidos (' + doCsv + ')');

  // 4. Entrada de estoque: o modelo lista os produtos; preenche a quantidade de dois e importa
  await ev(`location.hash = '/estoque/entradas'; 1`); await sleep(1200);
  ok(await clicar('Baixar modelo'), 'botão "Baixar modelo (Excel)" na Entrada de estoque');
  let modeloEntrada = null;
  for (let i = 0; i < 40 && !modeloEntrada; i++) { await sleep(250); modeloEntrada = fs.readdirSync(DOWNLOADS).find(f => f.startsWith('entrada-estoque-')); }
  ok(!!modeloEntrada, 'modelo de entrada baixado: ' + modeloEntrada);
  const b64e = await ev(`(() => { const X = window.XLSX; const wb = X.read(${JSON.stringify([...fs.readFileSync(path.join(DOWNLOADS, modeloEntrada))])}, {type: 'array'});
    const linhas = X.utils.sheet_to_json(wb.Sheets.Entrada, {header: 1, defval: ''});
    window.__qtdModelo = linhas.length - 1;
    linhas.forEach((l, k) => { if (l[1] === 'Coca-Cola Lata 350ml') { l[4] = 24; l[5] = 3.5; l[7] = 'NF 77'; } if (l[1] === 'Guaraná 2L') { l[4] = 6; l[5] = 7; l[7] = 'NF 77'; } });
    const novo = X.utils.book_new(); X.utils.book_append_sheet(novo, X.utils.aoa_to_sheet(linhas), 'Entrada');
    return X.write(novo, {type: 'base64', bookType: 'xlsx'}); })()`);
  ok(await ev(`window.__qtdModelo === RestDados.produtos().filter(p => p.ativo).length`), 'modelo de entrada lista todos os produtos ativos');
  const preenchidaE = path.join(DOWNLOADS, 'entrada-preenchida.xlsx');
  fs.writeFileSync(preenchidaE, Buffer.from(b64e, 'base64'));
  const docE = (await cmd('DOM.getDocument', {depth: -1})).result.root;
  const inputE = (await cmd('DOM.querySelector', {nodeId: docE.nodeId, selector: 'input[type=file][accept*=".xlsx"]'})).result.nodeId;
  const cocaAntes = await ev(`RestDados.produtos().find(p => p.nome === 'Coca-Cola Lata 350ml').estoque || 0`);
  await cmd('DOM.setFileInputFiles', {nodeId: inputE, files: [preenchidaE]});
  await sleep(1500);
  const previaE = await ev(`document.querySelector('.rest-imp-kpis')?.innerText.replace(/\\s+/g, ' ') || ''`);
  ok(/Itens 2 .*Compras 1 .*Valor R\$ 126,00 .*Com erro 0/.test(previaE), 'prévia da entrada: 2 itens, 1 compra, R$ 126,00 (' + previaE + ')');
  ok(await clicar('Dar entrada em 2 itens'), 'botão "Dar entrada em 2 itens"');
  await sleep(800);
  const e = await ev(`(() => { const p = n => RestDados.produtos().find(x => x.nome === n);
    return {coca: p('Coca-Cola Lata 350ml').estoque, guarana: p('Guaraná 2L').estoque, aviso: document.querySelector('.rest-toast')?.innerText || '',
      tela: document.querySelector('main').innerText.includes('NF 77')}; })()`);
  ok(e.coca === cocaAntes + 24, 'coca: +24 no estoque');
  ok(e.guarana === 24 + 6, 'guaraná: +6 no estoque (30)');
  ok(e.tela, 'entrada aparece na lista com a nota NF 77');
  ok(/Entrada registrada/.test(e.aviso), 'aviso: ' + e.aviso);
  ok(!erros.length, 'sem erros no console ' + (erros.length ? JSON.stringify(erros).slice(0, 300) : ''));
  console.log(falhas ? `${falhas} FALHA(S)` : 'TUDO OK');
  chrome.kill(); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
