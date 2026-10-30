# Resultado executado — segurança do Shelf

Data UTC: 2026-10-30T05:12:48.472Z. Node: v22.22.2. Ambiente: linux/x64.

Código local do Shelf; HTTP 127.0.0.1; Supabase substituído por adaptador em memória.

**29 casos: 29 passaram, 0 falharam, 0 não aplicável(is).**

Falha significa que o comportamento seguro esperado não foi atendido. Não equivale a defeito do executor.

| Caso | Resultado | Motivo |
|---|---|---|
| [BOTS-01] rajada de 30 cadastros deve acionar limite e Retry-After | PASSOU |  |
| [BOTS-02] API deve respeitar o limite de 120 caracteres do título da interface | PASSOU |  |
| [BOTS-03] corpo acima do orçamento de 64 KiB deve receber 413 | PASSOU |  |
| [BOTS-04] força bruta no login é bloqueada após 10 tentativas por minuto | PASSOU |  |
| [SENHAS-01] hash com scrypt e salt aleatório; a senha não aparece no hash | PASSOU |  |
| [SENHAS-02] cadastro guarda só o hash e não devolve senha nem hash | PASSOU |  |
| [SENHAS-03] login certo funciona; senha errada e e-mail inexistente dão a mesma resposta | PASSOU |  |
| [SENHAS-04] senha com menos de 8 caracteres é recusada | PASSOU |  |
| [CRIPTO-01] chave de serviço não aparece nos arquivos públicos nem nas respostas | PASSOU |  |
| [CRIPTO-02] arquivo .env não é servido por HTTP | PASSOU |  |
| [CRIPTO-03] SUPABASE_URL com http é recusada antes de enviar a chave | PASSOU |  |
| [CRIPTO-04] erro do serviço externo não vaza detalhes ao cliente | PASSOU |  |
| [CRIPTO-05] token adulterado ou expirado é recusado | PASSOU |  |
| [CRIPTO-06] sem AUTH_SECRET configurado o servidor não emite tokens | PASSOU |  |
| [IDOR-01] visitante sem login não lista livros | PASSOU |  |
| [IDOR-02] visitante sem login não edita livro pelo id | PASSOU |  |
| [IDOR-03] visitante sem login não exclui livro pelo id | PASSOU |  |
| [IDOR-04] token inválido não concede acesso | PASSOU |  |
| [IDOR-05] usuário A só vê os próprios livros | PASSOU |  |
| [IDOR-06] usuário A não edita o livro do usuário B trocando o id | PASSOU |  |
| [IDOR-07] usuário A não exclui o livro do usuário B trocando o id | PASSOU |  |
| [IDOR-08] controle: o dono consegue editar o próprio livro | PASSOU |  |
| [INJECAO-01] texto semelhante a SQL permanece como dado no JSON enviado ao Supabase | PASSOU |  |
| [INJECAO-02] ID com separadores não pode acrescentar filtros ao PostgREST | PASSOU |  |
| [INJECAO-03] filtro de status manipulado deve ser recusado antes do banco | PASSOU |  |
| [INJECAO-04] campos extras e __proto__ não podem ser atribuídos ao registro | PASSOU |  |
| [INJECAO-05] renderização do frontend mantém payloads XSS em textContent | PASSOU |  |
| [INJECAO-06] JSON malformado deve retornar 400 sem detalhes internos | PASSOU |  |
| [INJECAO-07] e-mail com separadores no login não acrescenta filtros | PASSOU |  |

## Evidências emitidas durante a execução

- 30 requisições sequenciais em 59 ms; HTTP: {"201":20,"429":10}; registros: 20.
- Título com 121 caracteres: HTTP 400; chamadas ao banco: 0.
- JSON enviado: 71759 bytes; HTTP 413; chamadas ao banco: 0.
- 15 tentativas de senha: [401,401,401,401,401,401,401,401,401,401,429,429,429,429,429].
- Formato do hash: scrypt$16384$8$1$<salt>$<hash>.
- Cadastro: HTTP 201; campos salvos: id, email, password_hash, created_at.
- Login correto: 200; senha errada: 401; e-mail inexistente: 401.
- Senha de 7 caracteres: HTTP 400; usuários criados: 0.
- Chave usada só pelo backend e ausente das quatro respostas públicas.
- Quatro caminhos para o .env retornaram 403 ou 404.
- SUPABASE_URL com http: HTTP 500; tentativas de envio da chave: 0.
- Falha externa simulada: HTTP 500; corpo: {"error":"Erro interno. Tente novamente mais tarde."}.
- Payload trocado / expirado / outra chave: HTTP 401 / 401 / 401; livro B presente: true.
- Sem AUTH_SECRET: HTTP 500; token emitido: false.
- GET anônimo: HTTP 401; chamadas ao banco: 0.
- PUT anônimo: HTTP 401; livro B alterado: false.
- DELETE anônimo: HTTP 401; livro B excluído: false.
- Bearer inválido: HTTP 401; alteração persistida: false.
- Usuário A listou: ["11111111-1111-4111-8111-111111111111"].
- A tentou editar o livro de B: HTTP 404; livro B alterado: false.
- A tentou excluir o livro de B: HTTP 404; livro B excluído: false.
- Dona editou o próprio livro: HTTP 200.
- Payload preservado no corpo JSON e ausente da URL. Escopo: construção da requisição; não executa SQL no PostgreSQL real.
- Separadores escapados: um único parâmetro id; ambos os registros fictícios preservados.
- Status fora da lista permitida retornou 400, sem acesso ao adaptador de banco.
- Somente campos permitidos chegaram ao banco. user_id veio do token; user_id, owner_id e is_admin enviados pelo cliente foram ignorados.
- Três payloads percorreram o renderizador real: dados em textContent; innerHTML recebeu apenas template estático. Ensaio de componente, sem navegador real.
- JSON truncado: HTTP 400; corpo: {"error":"JSON inválido."}.
- E-mail manipulado: HTTP 401; chamadas ao banco: 1.
- tests 29
- suites 0
- pass 29
- fail 0
- cancelled 0
- skipped 0
- todo 0
- duration_ms 3025.873727

## Limites

O Supabase é substituído por um adaptador em memória (não executa PostgreSQL, RLS ou TLS de verdade). O teste de XSS roda o app.js em uma VM com o DOM simulado, sem navegador. O limite de requisições fica em memória, então em serverless cada instância tem o próprio contador.
