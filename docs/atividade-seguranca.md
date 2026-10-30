# Atividade — testes de segurança no Shelf

O Shelf é usado no lugar do TCC porque o TCC do grupo é um artigo, sem código-fonte.

## Como rodar

Node.js 22 ou superior, num terminal na pasta do projeto:

```sh
npm run check
npm test
npm run test:security
```

Não precisa de `npm install`, `.env` nem Supabase: os testes sobem o `server.js` real numa porta local e trocam só o Supabase por um banco em memória. No PowerShell, se o `npm` for bloqueado, use `npm.cmd`.

Para mostrar um tema de cada vez:

```sh
npm run test:security:idor
npm run test:security:crypto
npm run test:security:injection
npm run test:security:bots
```

Os resultados ficam em `reports/` (`security-results.md` é o mais fácil de ler).

## Antes e depois

A primeira versão do Shelf não tinha login. Rodando os testes nela, 10 de 18 casos falharam (evidências em `evidencias/antes-das-correcoes/`). O grupo então corrigiu o código e ampliou os testes. Resultado atual: **29 de 29 casos passando**.

| Tema | Falha encontrada | Correção |
|---|---|---|
| IDOR | Qualquer pessoa editava ou excluía qualquer livro pelo id | Login obrigatório; cada livro tem `user_id`; toda consulta filtra por id **e** dono |
| Senhas | Não existiam | Cadastro e login com `scrypt` + salt aleatório e comparação em tempo constante |
| Criptografia | Chave do Supabase podia ir por HTTP; erros do banco chegavam ao usuário | `SUPABASE_URL` só com https; erro genérico para o cliente |
| Injeção | JSON malformado gerava erro 500 com a mensagem do parser | Retorna 400 "JSON inválido" |
| Bots | Sem limite de requisições, tamanho do corpo ou do título | 20 escritas/min por IP, 10 logins/min por IP, corpo até 64 KiB, título até 120 caracteres |

## O que cada teste verifica

**IDOR (`test/security/idor.test.js`)**: sem login a API responde 401 e nem consulta o banco; token falso dá 401; o usuário A só lista os próprios livros; A recebe 404 ao tentar editar ou excluir o livro de B trocando o id; o dono consegue editar o próprio livro (controle).

**Criptografia/Senhas (`test/security/crypto.test.js`)**: hash no formato `scrypt$...` com salt diferente a cada cadastro; o banco recebe só o hash, nunca a senha; senha errada e e-mail inexistente dão a mesma resposta (não revela quais e-mails existem); senha com menos de 8 caracteres é recusada; a chave do Supabase não aparece em nenhuma resposta; `.env` não é servido; URL com http é recusada; token adulterado, expirado ou assinado com outra chave é recusado; sem `AUTH_SECRET` o servidor não emite tokens.

**Injeção (`test/security/injection.test.js`)**: texto com SQL vai como dado no JSON; id e e-mail com `&or=...` não acrescentam filtros na URL do Supabase; status fora da lista é recusado; campos extras como `user_id`, `is_admin` e `__proto__` são ignorados (o dono vem do token); payloads de XSS vão para `textContent`, nunca para `innerHTML`; JSON malformado dá 400.

**Bots (`test/security/bots.test.js`)**: 30 cadastros seguidos → a partir do 21º recebem 429 com `Retry-After`; título de 121 caracteres dá 400; corpo de 70 KiB dá 413; 15 tentativas de senha → as 5 últimas recebem 429.

## Limitações (falar na apresentação)

- O banco nos testes é simulado: os testes provam como a API monta as requisições, não testam o PostgreSQL de verdade.
- O teste de XSS roda o `app.js` com um DOM simulado, sem navegador.
- O limite de requisições fica em memória. Na Vercel cada instância tem o próprio contador; em produção o ideal seria um armazenamento compartilhado (ex.: Redis).
- O token fica no `localStorage`. Isso é aceitável aqui porque o front não usa `innerHTML` com dados do usuário, mas cookies `HttpOnly` seriam mais seguros.

## Extras (GitHub Actions)

- `.github/workflows/ci.yml`: roda sintaxe, testes funcionais e testes de segurança em todo Pull Request, mostra o resumo na página do Actions e guarda os relatórios.
- `.github/workflows/deploy.yml`: a cada push na `main`, roda os mesmos testes e, se passarem, publica na Vercel.

Configuração necessária para o deploy:

1. Na Vercel, em Settings → Environment Variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `AUTH_SECRET`.
2. No GitHub, em Settings → Secrets and variables → Actions: `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` (os dois IDs estão em `.vercel/project.json` depois de rodar `vercel link`).
3. Se a integração automática Vercel ↔ GitHub estiver ligada, ela também publica sozinha; para o deploy passar só pelo pipeline, desligue-a no painel da Vercel.
