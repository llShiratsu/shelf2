# Checklist da entrega

Preencher os links antes de enviar:

- Repositório GitHub:
- Deploy Vercel:
- Vídeo do cliente:
- Pull Request aprovado:

## Critérios do professor

- Sistema coerente com o documento de requisitos.
  - Evidência: `docs/requisitos.md`
- Funcionalidades essenciais do MVP funcionando.
  - Evidência: cadastro, listagem, edição, exclusão, status, filtro e nota.
- Persistência em Supabase.
  - Evidência: `database/schema.sql` e variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
- Deploy público.
  - Evidência: link da Vercel.
- Testes de unidade, integração e sistema.
  - Evidência: pasta `test` e comando `npm test`.
- CI automático.
  - Evidência: `.github/workflows/ci.yml`.
- Ambiente documentado.
  - Evidência: `README.md`, `.env.example` e `database/schema.sql`.
- Branch principal protegida.
  - Evidência: configuração no GitHub exigindo PR, aprovação e checks.
- Cliente real usando o sistema.
  - Evidência: vídeo curto e impressão final da pessoa.

## Roteiro curto para o vídeo do cliente

1. Pedir para a pessoa abrir o link da Vercel.
2. Pedir para cadastrar um livro.
3. Pedir para mudar o status do livro.
4. Pedir para filtrar a estante.
5. Pedir para editar ou excluir um livro.
6. No final, perguntar se a pessoa entendeu o sistema sem ajuda.
