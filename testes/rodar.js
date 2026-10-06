// Roda todos os testes e mostra um resumo. Rodar: node testes/rodar.js
//   node testes/rodar.js rapido   → só as regras e a nuvem (sem Chrome e sem banco)
const {spawnSync} = require('child_process');
const fs = require('fs'), path = require('path');
const rapido = process.argv.includes('rapido');
const testes = fs.readdirSync(__dirname).filter(f => /^teste-.*\.js$/.test(f)).sort();
if (!rapido) testes.push('banco.mjs', 'navegador.js');
let total = 0, falhas = 0;
for (const t of testes) {
  if (t === 'banco.mjs' && !fs.existsSync(path.join(__dirname, 'node_modules', '@electric-sql', 'pglite'))) {
    console.log(`${t.padEnd(30)} pulado (rode "npm install" dentro da pasta testes)`);
    continue;
  }
  const r = spawnSync(process.execPath, [path.join(__dirname, t)], {encoding: 'utf8', timeout: 300000});
  const saida = (r.stdout || '') + (r.stderr || '');
  const oks = (saida.match(/^ok /gm) || []).length, erros = saida.split('\n').filter(l => l.startsWith('FALHOU'));
  total += oks; falhas += erros.length + (r.status && !erros.length ? 1 : 0);
  console.log(`${t.padEnd(30)} ${String(oks).padStart(3)} ok${erros.length || r.status ? `  ✗ ${erros.length || 'erro ao rodar'}` : ''}`);
  erros.forEach(l => console.log('   ' + l));
  if (r.status && !erros.length) console.log('   ' + saida.trim().split('\n').slice(-3).join('\n   '));
}
console.log(`\n${total} verificações ok · ${falhas ? falhas + ' falha(s)' : 'nenhuma falha'}`);
process.exit(falhas ? 1 : 0);
