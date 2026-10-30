# Resultado executado — segurança do Shelf

Data UTC: 2026-10-30T00:46:01.772Z. Node: v22.21.1. Ambiente: win32/x64.

Base: `f9db6a795de3bda478dd6db88c0908c349541297`. Código local do Shelf; HTTP 127.0.0.1; Supabase substituído por adaptador em memória.

**18 casos: 7 passaram, 10 falharam, 1 não aplicável(is).**

Falha significa que o comportamento seguro esperado não foi atendido. Não equivale a defeito do executor.

| Caso | Resultado | Motivo |
|---|---|---|
| [BOTS-01] rajada de 30 cadastros deve acionar limite e Retry-After | FALHOU | Nenhuma política de 20 escritas/minuto impediu a rajada de cadastros. |
| [BOTS-02] API deve respeitar o limite de 120 caracteres do título da interface | FALHOU | maxlength do HTML pode ser contornado com chamada direta à API.  201 !== 400  |
| [BOTS-03] corpo acima do orçamento de 64 KiB deve receber 413 | FALHOU | API não limita o tamanho do corpo antes de processá-lo (orçamento proposto: 64 KiB).  201 !== 413  |
| [CRIPTO-01] chave de serviço não aparece nos arquivos públicos nem na resposta normal | PASSOU |  |
| [CRIPTO-02] arquivo .env não deve ser servido por HTTP | PASSOU |  |
| [CRIPTO-03] configuração HTTP do Supabase deve ser recusada antes de enviar a chave | FALHOU | Backend não valida HTTPS e encaminharia a chave por HTTP em uma configuração incorreta.  1 !== 0  |
| [CRIPTO-04] erro do serviço externo não deve revelar um segredo ao cliente | FALHOU | Corpo de erro externo é repassado integralmente ao usuário. O cenário de vazamento é simulado. |
| [SENHAS-01] hash, salt e validação de senha | NAO_APLICAVEL | Não aplicável ao MVP: não há login, senha ou tabela de usuários. Não foi criada uma implementação fictícia para obter aprovação. |
| [IDOR-01] visitante sem autenticação não deve listar a estante pessoal | FALHOU | Esperado 401/403; recebido 200. IDs e dados da estante ficaram acessíveis. |
| [IDOR-02] trocar o ID da URL não deve permitir edição anônima | FALHOU | A API aceitou editar um livro pelo ID sem autenticação/autorização. |
| [IDOR-03] trocar o ID da URL não deve permitir exclusão anônima | FALHOU | A API aceitou excluir um livro pelo ID sem autenticação/autorização. |
| [IDOR-04] token inválido não deve conceder permissão de escrita | FALHOU | O cabeçalho de autenticação é ignorado e a alteração foi aceita. |
| [INJECAO-01] texto semelhante a SQL permanece como dado no JSON enviado ao Supabase | PASSOU |  |
| [INJECAO-02] ID com separadores não pode acrescentar filtros ao PostgREST | PASSOU |  |
| [INJECAO-03] filtro de status manipulado deve ser recusado antes do banco | PASSOU |  |
| [INJECAO-04] campos extras e __proto__ não podem ser atribuídos ao registro | PASSOU |  |
| [INJECAO-05] renderização do frontend mantém payloads XSS em textContent | PASSOU |  |
| [INJECAO-06] JSON malformado deve retornar 400 sem detalhes internos | FALHOU | Erro de entrada do cliente foi tratado como erro interno 500.  500 !== 400  |

## Evidências emitidas durante a execução

- 30 requisições sequenciais em 88 ms; HTTP: {"201":30}; registros: 30.
- Título com 121 caracteres: HTTP 201; chamadas ao banco: 1.
- JSON enviado: 71759 bytes; HTTP 201; chamadas ao banco: 1.
- Chave fictícia usada pelo backend e ausente nas quatro respostas públicas verificadas.
- Quatro caminhos de configuração/traversal retornaram 403 ou 404. Limite: não é uma varredura exaustiva.
- SUPABASE_URL com http: HTTP 200; tentativas de envio da chave sem TLS: 1. Transporte externo foi interceptado, sem rede real.
- Falha externa simulada: HTTP 500; marcador secreto refletido: true.
- GET anônimo: HTTP 200; livros retornados: 2.
- ID B enviado diretamente; HTTP 200; livro B alterado: true; livro A preservado: true.
- DELETE anônimo: HTTP 200; livro B excluído: true; livro A presente: true.
- Bearer inválido: HTTP 200; alteração persistida no adaptador: true.
- Payload preservado no corpo JSON e ausente da URL. Escopo: construção da requisição; não executa SQL no PostgreSQL real.
- Separadores escapados: um único parâmetro id; ambos os registros fictícios preservados.
- Status fora da lista permitida retornou 400, sem acesso ao adaptador de banco.
- Somente campos permitidos chegaram ao banco. Não foi atribuída propriedade/role enviada pelo cliente.
- Três payloads percorreram o renderizador real: dados em textContent; innerHTML recebeu apenas template estático. Ensaio de componente, sem navegador real.
- JSON truncado: HTTP 500; corpo: {"error":"Unexpected end of JSON input"}.
- tests 18
- suites 0
- pass 7
- fail 10
- cancelled 0
- skipped 1
- todo 0
- duration_ms 2990.5048

## Limites

O adaptador não implementa PostgreSQL, RLS ou TLS. O teste XSS instrumenta as APIs DOM do frontend em VM, sem navegador. Não foram testados serviços em produção, tráfego real sem TLS, força de senhas inexistentes ou permissões entre usuários autenticados inexistentes.
