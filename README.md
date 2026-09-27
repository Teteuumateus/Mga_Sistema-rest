# MGA Sistema

Projeto de interface web para gestão de operações com módulos de:

- Gestão
- PDV
- Food
- Financeiro
- Help Desk

## Estrutura

- `mga-sistema.html` — estrutura principal da interface
- `style.css` — estilos globais e layout
- `script.js` — lógica de interação, cadastros, PDV e movimentações de estoque
- `theme.js` — alternância de tema claro/escuro (compartilhado entre login e sistema)

## Organização

A separação entre HTML, CSS e JavaScript foi feita para facilitar manutenção e futuras evoluções do sistema.

- HTML: mantém marcação e estrutura
- CSS: mantém visual e responsividade
- JS: mantém comportamento, estados e regras do sistema

## Como abrir

Basta abrir o arquivo `mga-sistema.html` em um navegador.

## Observação

Este projeto usa `localStorage` para persistir alguns dados locais do sistema, como produtos, caixa e cadastros.
