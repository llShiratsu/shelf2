<img width="960" height="912" alt="image" src="https://github.com/user-attachments/assets/4006fa9a-b11c-4eb6-9aa2-ca55aef391e6" /># Shelf

## Atividade de segurança

Esta cópia inclui testes executáveis de IDOR/autorização, criptografia/segredos,
injeção e bots. Use Node.js 22+ e rode `npm run test:security`.
O [guia da atividade](docs/atividade-seguranca.md) explica os cenários, resultados,
limites, os dois workflows extras e o roteiro da apresentação presencial.
As falhas de segurança encontradas na base produzem saída 1; o caso de senhas
fica como não aplicável porque este MVP não possui login.

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
- Deploy: Vercel
- Testes: Node.js test runner

## Como rodar localmente

1. Copie `.env.example` para `.env`.
2. Preencha `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `AUTH_SECRET` (veja o comando para gerar no `.env.example`).
3. No Supabase, execute `database/schema.sql` (banco novo) ou `database/migracao-login.sql` (banco que já tinha a tabela `books`).
4. Rode:

```bash
npm start
```

5. Abra `http://localhost:3000`.

## Como rodar os testes

```bash
npm test
```

Os testes cobrem validação de dados, repositório em memória e fluxo principal do sistema.

Testes de segurança (IDOR, senhas/criptografia, injeção e bots):

```
npm run test:security
```

Detalhes em `docs/atividade-seguranca.md`.

## Branch principal

A branch principal deve ser protegida no GitHub:

- exigir Pull Request antes do merge;
- exigir pelo menos uma aprovação;
- exigir checks de CI passando;
- bloquear push direto na main.

## Validação com cliente real

1. cadastrar um livro;
2. alterar o status;
3. consultar a estante;
4. excluir ou editar um livro.

<img width="960" height="912" alt="image" src="https://github.com/user-attachments/assets/090b3806-6c81-4389-96fa-d7a0ec882d1a" />

