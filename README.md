# MGA Restaurante

Sistema web de gestão para restaurante (PDV), feito para uso durante o atendimento em
computadores e totens. Roda direto no navegador, em português e com valores em R$.

## Menu

- Dashboard: vendas, contas do dia e do mês, ticket médio, gráficos e atalhos (nova venda, abrir/fechar caixa)
- Cardápio: tamanhos com preço próprio (P/M/G, 300/500 ml), adicionais e etapas (ex.: ponto da carne obrigatório,
  extras com limite), promoções por dia da semana, horário e período, insumos e ficha técnica (a venda baixa os
  insumos e o custo sai da ficha) e embalagens cobradas no delivery
- Cadastros: produtos (código, categoria, preço, custo, estoque, unidade, foto, descrição), categorias (com a opção
  "vai para a cozinha"),
  mesas, clientes, fornecedores (usados na entrada de estoque e nas contas a pagar), funcionários (cargo,
  admissão, salário e vínculo com o usuário do sistema), entregadores, regiões de entrega (cidade, bairros e
  taxa: o delivery preenche a taxa pelo bairro do cliente), formas de pagamento e usuários
- Financeiro: contas a pagar, contas a receber, contas bancárias e movimento de conta (extrato, lançamentos e
  transferências; baixas e sangrias podem cair numa conta) e categorias financeiras
- Caixa: no fechamento, além do dinheiro, confere cartões, PIX e outras formas (esperado × conferido)
- Vendas:
  - Mesas (vendas das mesas do salão): mapa visual (livre, ocupada, conta pedida), pedido aberto,
    transferência, taxa de serviço e fechamento da conta inteira, dividida por pessoas ou por itens
  - Delivery (pedidos pelo WhatsApp ou telefone) e encomendas: dados do cliente e da entrega, taxa de
    entrega, troco, status (recebido → preparação → pronto → saiu → entregue), envio de vários pedidos
    com o mesmo entregador e tempo em verde/amarelo/vermelho
  - Venda balcão, caixa (abertura, suprimento, sangria, fechamento e impressão), vendas realizadas
    (com cancelamento e estorno) e caixas anteriores
- Fila de produção (cozinha): itens lançados no balcão, nas mesas e no delivery em colunas Na fila → Preparando →
  Pronto, com o tempo de espera em cores; aberta em outra aba ou monitor, recebe os pedidos sozinha. Mesas: editar
  o item (quantidade, preço unitário e desconto, com auditoria). Recebimento com atalhos F2 a F8
- Delivery: aplicativo de origem (iFood, 99Food...) com a comissão de cada um
- Estoque: Dashboard do estoque (o que entrou, o que saiu e o saldo no período, o que mais saiu e o que
  precisa repor), Entrada de estoque (nota com vários itens de produtos do cadastro; atualiza o custo médio
  e pode lançar a conta a pagar ao fornecedor) e Saída de estoque (vendas com baixa automática, perdas,
  consumo e insumos da produção). Pelo dashboard: posição (mínimo, ajuste de inventário, zerar, produção
  pela ficha técnica) e histórico de movimentações de cada produto. Só controla
  estoque o produto marcado para isso (bebidas e itens comprados prontos). A venda baixa o estoque ao
  ser finalizada e devolve se for cancelada; a falta de saldo não trava a venda (fica negativo)
- Relatórios (por período, com atalhos de hoje a este ano, e por operador; cada tabela exporta CSV para o Excel
  e a tela imprime ou salva em PDF):
  - Vendas: total com comparação ao período anterior, ticket médio, descontos, canceladas, vendas por dia
    (ou por mês) e por hora, por forma de pagamento, por tipo de venda e por operador
  - Produtos: ranking com curva ABC, quantidade, faturamento, custo, lucro bruto e margem; por categoria
  - Caixa: cada caixa do período com vendas, sangrias, dinheiro esperado, contado e sobra/falta
  - Delivery: pedidos entregues, taxas de entrega, tempo médio, % no prazo, por entregador, bairro, região,
    aplicativo (com comissão) e tipo
  - Engenharia de cardápio (CMV): cada produto como Estrela, Burro de carga, Quebra-cabeça ou Cão
  - Financeiro: DRE (receita, CMV, lucro bruto, despesas, resultado), despesas por categoria, mês a mês,
    contas a pagar e a receber e sangrias/suprimentos
- Configurações: restaurante (taxa de serviço e delivery), empresa (razão social, CNPJ, endereço e telefone, que saem
  nas impressões), impressão (bobina 58/80 mm, cupom e comanda automáticos, vias e rodapé), auditoria e dados do
  sistema (backup, demonstração e limpeza)
- Impressão: cupom não fiscal da venda, comanda da cozinha (na mesa só os itens novos), conferência de conta
  (com valor por pessoa) e pedido para entrega. O navegador mostra a janela de impressão; para imprimir direto
  na térmica, abra o Chrome com `--kiosk-printing`. Emissão de nota fiscal (NFC-e) não faz parte: exige servidor

## Usuários e permissões

No primeiro acesso o sistema pede para criar o administrador. Perfis: Administrador (tudo),
Gerente, Operador/Caixa e Garçom; o administrador ajusta os módulos de cada usuário em
Cadastros › Usuários. As senhas são guardadas como hash, mas tudo roda no navegador: não há
servidor protegendo os dados.

## Estrutura

- `login.html` — login e primeiro acesso
- `mga-sistema.html` — página do sistema (só carrega os scripts; a tela é montada pelo React)
- `style.css` — estilos globais e layout (menu, barra superior, formulários, tabelas)
- `restaurante.css` — estilos das telas (PDV, caixa, cards, gráficos, financeiro)
- `theme.js` — tema claro/escuro (compartilhado entre login e sistema)
- `restaurante-dados.js` — dados e regras de negócio, sem tela: usuários, cadastros, caixa, vendas,
  financeiro, dashboard, auditoria e backup
- `restaurante-ui.js` — peças de tela compartilhadas (formulários, tabelas, avisos, janelas)
- `restaurante-impressao.js` — cupom, comanda da cozinha, conferência de conta e pedido para entrega
- `restaurante-pessoas.js` — fornecedores, funcionários e regiões de entrega
- `restaurante-cardapio.js` — adicionais e etapas, promoções, embalagens e aplicativos de delivery
- `restaurante-cozinha.js` — fila de produção da cozinha
- `restaurante-contas.js` — contas bancárias e movimento de conta (extrato)
- `restaurante-pdv.js` — venda balcão e pagamento
- `restaurante-caixa.js` — caixa, fechamento, vendas realizadas e caixas anteriores
- `restaurante-mesas.js` — mapa de mesas, pedido da mesa e fechamento da conta
- `restaurante-delivery.js` — delivery e encomenda: novo pedido, lista com tempo e status, envio ao entregador
- `restaurante-estoque.js` — posição do estoque, entrada, saída, ajuste de inventário e movimentações
- `restaurante-relatorios.js` — relatórios de vendas, produtos, caixa e delivery (CSV e impressão)
- `restaurante-cadastros.js`, `restaurante-financeiro.js`, `restaurante-dashboard.js`, `restaurante-config.js` — demais telas
- `restaurante.js` — aplicação: menu lateral, barra superior, rotas e permissões

## Como abrir

Abra `login.html` no navegador. É preciso internet: React 18, htm e Recharts são carregados
por CDN, sem instalar nada.

## Atalhos do PDV

F2 ou / — busca · Enter na busca — adiciona o primeiro produto · F4 — finalizar · F11 — transformar em delivery · Enter no
pagamento — adiciona o valor e, quando quitado, conclui a venda · Esc — fecha janelas.

## Cardápio digital

- O cliente abre `cardapio.html?e=<código>` (o link e os QR Codes das mesas ficam em **Cardápio digital**), escolhe a
  mesa, vê os produtos do cadastro (com tamanhos e adicionais), faz o pedido, acompanha o andamento, chama o garçom e
  pede a conta. A página não tem login: só usa as funções públicas do banco (`cardapio_*`), que não expõem custo,
  estoque nem dados de outras empresas, e o preço é sempre calculado pelo banco.
- O pedido entra sozinho na conta da mesa (vai para a fila da cozinha e baixa o estoque ao fechar a conta) e aparece em
  **Vendas › Pedidos do cardápio** com aviso sonoro, junto com os chamados de garçom e os pedidos de conta.
- O link só funciona para os clientes com o sistema publicado na internet (https).

## Dados e acesso

- Cada restaurante é uma empresa no mesmo banco (Supabase/PostgreSQL); cada uma só enxerga os próprios
  dados (RLS). A estrutura completa do banco está em `supabase/schema.sql` (só para montar um banco novo).
- O sistema trabalha com os dados na memória e grava no banco a cada alteração; o que for feito sem
  internet fica guardado no navegador e é enviado quando a conexão volta.
- Painel master (`master.html`): cria empresas e administradores e entra numa empresa para dar suporte.
- Funções do servidor em `supabase/functions` (`usuarios` e `master`). Publicar:
  `npx supabase functions deploy usuarios master --project-ref pmrlintqicsfohqyirhh --use-api`

## Testes

Na pasta `testes` (Node 22+; o teste do navegador usa o Google Chrome):

- `node testes/rodar.js` — roda tudo e mostra o resumo
- `node testes/rodar.js rapido` — só regras e nuvem (sem Chrome e sem banco)
- `node testes/banco.mjs` — monta `supabase/schema.sql` num PostgreSQL de teste (antes: `cd testes && npm install`)
- `node testes/navegador.js` — abre o sistema no Chrome sem janela e confere todas as telas
- `node testes/banco-cardapio.mjs` — funções públicas do cardápio digital (o que o cliente sem login pode fazer)
- `node testes/navegador-cardapio.js` e `navegador-cardapio-equipe.js` — página do cliente e telas da equipe do cardápio
- `node testes/navegador-importar.js` — importação por planilha de produtos e de entrada de estoque
