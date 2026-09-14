# MVP de estoque — como rodar

O projeto continua com React/JSX/CSS no frontend e Fastify + pg no backend.
O caminho é: tela → routes → controller → repository → Neon.
Não usamos TypeScript, ORM ou uma arquitetura complicada.

O sistema agora possui login simples. O acesso inicial é `adm` / `adm1`. A senha é armazenada como hash na tabela `usuarios`, nunca como texto puro.

## Rodar no computador

1. Abra um terminal na pasta **Dashboard de Controle de Estoque BACK**.
2. Rode `npm install` caso tenha acabado de baixar o projeto.
3. Crie o `.env` usando o `.env.example` como modelo e coloque a conexão do seu Neon em DATABASE_URL. Não envie esse arquivo ao Git.
4. Rode `npm run dev`. A API usa a porta 3000.
5. Abra outro terminal na pasta **Dashboard de Controle de Estoque**.
6. Rode `npm install` e `npm run dev`.
7. Abra http://localhost:5173.

O Vite encaminha /api para a API local. Não é preciso colocar a senha do Neon no frontend.
Se aparecer porta 3000 em uso, já existe outro servidor rodando nessa porta: use esse terminal ou encerre a execução antiga antes de iniciar outra.

## O que está conectado

- Cadastro e edição de produto com categoria, unidade, fornecedor e localização digitados no formulário.
- Lote inicial e entrada do saldo aproveitável: 100 recebidos menos 2 perdidos = entrada de 98. O backend faz isso automaticamente.
- Entrada, saída e reposição, com saldo calculado pelas movimentações.
- Importação de PDF usando o parser já existente. Cada item é salvo por inteiro; se um falhar, a mensagem informa quantos foram salvos. Não selecione novamente os que já foram importados.
- Exclusão individual e em grupo com confirmação. Exclui também lotes e movimentações desses produtos, guardando cópia no histórico.
- Histórico persistido e desfazer da atividade mais recente para a mais antiga.
- Alertas e relatórios usam os saldos carregados do banco.

A câmera continua preenchendo o SKU. Não foi trocada a biblioteca nem o som.
Ao atualizar a página, os dados cadastrados continuam no Neon.

## Rotas

| Endereço | Métodos |
| --- | --- |
| /produtos | GET, POST |
| /produtos/:id | GET, PUT, DELETE |
| /produtos/sku/:sku | GET |
| /produtos/excluir-selecionados | POST com {"ids":[1,2]} |
| /categorias | GET, POST |
| /unidades-medida | GET, POST |
| /fornecedores | GET, POST |
| /locais-estoque | GET, POST |
| /lotes | GET, POST |
| /movimentacoes-estoque | GET, POST |
| /historico-atividades | GET |
| /historico-atividades/:id/desfazer | POST |
| /health | GET |
| /login | POST com {"login":"adm","senha":"sua senha"} |

Categorias, unidades, fornecedores, locais e lotes também têm GET, PUT e DELETE em /:id. Cadastros de apoio em uso não podem ser apagados. Lotes com movimentações não podem ser apagados isoladamente.
Listagens também aceitam /listar.

## Exemplo de movimentação no Thunder

POST http://localhost:3000/movimentacoes-estoque

```json
{"produto_id":1,"tipo":"Entrada","quantidade":10}
```

Use um produto existente. Tipo pode ser Entrada ou Saída. lote_id e data_movimentacao são opcionais. A data usa AAAA-MM-DD.
Não registre outra entrada para o recebimento que POST /lotes ou POST /produtos com lote já contabilizou.

## Partes novas para estudar

- **BEGIN, COMMIT e ROLLBACK**: salvam tudo junto; se algo falhar, cancelam a operação inteira.
- **JSONB no histórico**: guarda uma cópia de produtos, lotes e movimentações envolvidos.
- **LOCK TABLE**: faz uma alteração de estoque aguardar a outra neste MVP. Evita duas pessoas gastarem o mesmo saldo ou desfazer enquanto outra gravação acontece.
- **OVERRIDING SYSTEM VALUE**: usado somente para recuperar os IDs antigos ao desfazer.
- **CORS**: permite ao navegador conversar com o endereço do backend publicado.

Dados históricos anteriores a esta integração, sem cópia completa, ficam apenas para consulta. Desfazer não remove categorias/unidades/fornecedores/locais criados no formulário; eles são cadastros de apoio reutilizáveis.
A cópia é conferida antes de restaurar: se o produto foi alterado por fora, o backend recusa desfazer.

## Publicação

O código foi integrado e testado localmente. Isso não atualiza sozinho o site já publicado na Vercel.
Publique o backend em um serviço que execute Node, com `npm start`, DATABASE_URL e FRONTEND_URL configurados.
No frontend da Vercel, configure VITE_API_URL com a URL HTTPS desse backend e faça um novo deploy.
FRONTEND_URL no backend deve ser a URL exata do frontend, sem barra final. Pode usar uma lista separada por vírgulas.
Nunca coloque DATABASE_URL na Vercel do frontend ou em variável que começa com VITE_.

O backend usa `JWT_SECRET` para assinar as sessões. Para facilitar o primeiro deploy, se essa variável não existir ele usa a própria `DATABASE_URL`, que já é secreta. Depois, vocês podem adicionar no Render uma `JWT_SECRET` longa e aleatória; isso desconectará as sessões antigas uma única vez.

## Observações do banco existente

O campo de validade na tabela lotes está escrito **espirationDate** no Neon. Mantivemos esse nome no SQL e traduzimos para expirationDate no formulário, sem alterar a tabela.
O detalhe do produto mostra o lote mais recente. O saldo soma todas as movimentações do produto.
Os dados antigos que já estavam no banco não foram corrigidos ou excluídos automaticamente.
