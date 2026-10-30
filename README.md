# Shelf

Shelf é um aplicativo web simples para organizar leituras.

A ideia é permitir que uma pessoa cadastre livros e acompanhe o status de cada um: quero ler, lendo ou lido. O projeto não tenta ser uma rede social. Cada pessoa cria uma conta e só vê a própria estante.

## Integrantes

- Barbara Souza: backend e product owner
- Luiza Gomes: frontend
- Leonardo Shiratsu: qualidade

## Funcionalidades do MVP

- Criar conta e entrar (e-mail e senha)
- Cadastrar livro
- Listar livros cadastrados
- Editar livro
- Excluir livro
- Alterar status de leitura
- Filtrar por status
- Registrar gênero, datas e nota de 1 a 5

## Tecnologias

- Frontend: HTML, CSS e JavaScript
- Backend/API: Node.js em função serverless da Vercel
- Banco: Supabase PostgreSQL
- Versionamento: GitHub
- Deploy: Vercel, via GitHub Actions
- Testes: Node.js test runner

## Como rodar localmente

1. Copie `.env.example` para `.env`.
2. Preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `AUTH_SECRET` (o comando para gerar o `AUTH_SECRET` está no `.env.example`).
3. No Supabase, execute `database/schema.sql` (banco novo) ou `database/migracao-login.sql` (banco que já tinha a tabela `books`).
4. Rode:

```bash
npm start
```

5. Abra `http://localhost:3000`.

## Como rodar os testes

Requisito: Node.js 22 ou superior. Não precisa de `npm install`, `.env` nem Supabase.

```bash
npm run check
npm test
npm run test:security
```

- `npm test`: 15 testes funcionais (validação, repositório em memória e fluxo completo por HTTP).
- `npm run test:security`: 29 testes de segurança, todos passando. Cobrem IDOR, criptografia/senhas, injeção de código e bots.

Para rodar um tema por vez: `npm run test:security:idor`, `:crypto`, `:injection` ou `:bots`.

## Atividade de segurança

Os testes sobem o `server.js` real numa porta local e trocam só o Supabase por um banco em memória. A primeira versão do Shelf não tinha login e falhou em 10 de 18 testes. Depois das correções, todos os 29 passam:

| Tema |
|---|---|
| IDOR | Login obrigatório; cada livro tem dono (`user_id`) e toda consulta filtra por id e dono |
| Senhas | Hash `scrypt` com salt aleatório e comparação em tempo constante |
| Criptografia | Token de sessão assinado com HMAC; Supabase só por https; erros genéricos para o usuário |
| Injeção | Parâmetros codificados, lista de campos permitidos, dados no frontend só via `textContent`, JSON inválido retorna 400 |
| Bots | Limite de 20 escritas/min e 10 logins/min por IP; corpo até 64 KiB; título até 120 caracteres |

Explicação de cada teste, evidências de antes e depois e limitações: [docs/atividade-seguranca.md](docs/atividade-seguranca.md) e pasta `evidencias/`.

## CI/CD (GitHub Actions)

- `.github/workflows/ci.yml` (**Shelf - testes**): em todo Pull Request roda sintaxe, testes funcionais e testes de segurança.
- `.github/workflows/deploy.yml` (**Shelf - deploy**): a cada push na `main` roda os mesmos testes e, se passarem, publica na Vercel.

## Branch principal

A branch principal deve ser protegida no GitHub:

- exigir Pull Request antes do merge;
- exigir pelo menos uma aprovação;
- exigir checks de CI passando;
- bloquear push direto na main.

## Validação com cliente real

Para a entrega, uma pessoa que não participou do desenvolvimento deve usar o sistema. A tarefa sugerida é:

1. criar uma conta;
2. cadastrar um livro;
3. alterar o status;
4. consultar a estante;
5. excluir ou editar um livro.

## Evidências

<img width="960" height="912" alt="Execuções no GitHub Actions" src="https://github.com/user-attachments/assets/090b3806-6c81-4389-96fa-d7a0ec882d1a" />

<img width="1251" height="886" alt="Evidência" src="https://github.com/user-attachments/assets/108b7d71-50a5-4781-8652-58abd6a12845" />
