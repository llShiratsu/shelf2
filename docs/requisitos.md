# Requisitos do Shelf

## Visão

O Shelf é uma estante digital simples. O usuário cadastra livros e acompanha o status de leitura.

O sistema não terá login na primeira versão. Também não terá seguidores, feed, comentários, resenhas públicas ou busca automática de livros.

## Público-alvo

Pessoas que gostam de ler e querem organizar seus próprios livros de forma rápida.

## MVP

- Cadastrar livro
- Listar livros
- Editar livro
- Excluir livro
- Alterar status de leitura
- Filtrar por status
- Dar nota de 1 a 5

## Requisitos funcionais

- RF01 - Cadastrar livro com título, autor e status.
- RF02 - Listar livros cadastrados.
- RF03 - Editar livro.
- RF04 - Alterar status de leitura.
- RF05 - Excluir livro.
- RF06 - Filtrar livros por status.
- RF07 - Informar nota de 1 a 5.

## Histórias de usuário

- HU01 - Como leitor, quero cadastrar um livro, para montar minha estante.
  - Aceite: o livro só salva com título, autor e status.
- HU02 - Como leitor, quero ver meus livros, para saber o que tenho cadastrado.
  - Aceite: a lista mostra título, autor e status.
- HU03 - Como leitor, quero mudar o status, para acompanhar minha leitura.
  - Aceite: o status fica salvo depois da alteração.
- HU04 - Como leitor, quero editar ou excluir um livro, para corrigir a estante.
  - Aceite: a edição aparece na lista e a exclusão remove o livro.
- HU05 - Como leitor, quero dar uma nota para um livro, para lembrar se gostei dele.
  - Aceite: a nota é opcional e deve ficar entre 1 e 5.
- HU06 - Como leitor, quero filtrar por status, para achar livros mais rápido.
  - Aceite: o filtro mostra só os livros do status escolhido.

## Casos de uso

### CU01 Cadastrar livro

Ator: leitor.

Fluxo principal: o leitor abre o formulário, preenche os dados e salva.

Exceção: se faltar título, autor ou status, o sistema não salva.

Resultado: o livro aparece na estante.

### CU02 Consultar estante

Ator: leitor.

Fluxo principal: o leitor abre a página inicial e visualiza os livros cadastrados.

Exceção: se não houver livros, o sistema mostra que a estante está vazia.

Resultado: o leitor consegue consultar sua lista.

### CU03 Atualizar livro

Ator: leitor.

Fluxo principal: o leitor edita um livro ou muda o status.

Exceção: nota fora de 1 a 5 ou data final antes da inicial não é aceita.

Resultado: as mudanças ficam salvas.

### CU04 Excluir livro

Ator: leitor.

Fluxo principal: o leitor escolhe um livro e confirma a exclusão.

Exceção: se cancelar, o livro continua cadastrado.

Resultado: o livro sai da lista.

## Regras de negócio

- RN01 - Título e autor são obrigatórios.
- RN02 - O status só pode ser quero ler, lendo ou lido.
- RN03 - A nota, se informada, deve estar entre 1 e 5.
- RN04 - A data de fim não pode ser anterior à data de início.
- RN05 - Livro excluído não deve aparecer na listagem.
- RN06 - Login não faz parte do MVP.

## Requisitos não funcionais

- RNF01 - Funcionar em navegador de computador e celular.
- RNF02 - Salvar dados no Supabase.
- RNF03 - Responder cadastro, edição, listagem e exclusão em tempo aceitável.
- RNF04 - Ter interface simples.
- RNF05 - Ficar versionado no GitHub.
- RNF06 - Ser publicado na Vercel.
- RNF07 - Ter testes básicos para as funções principais.

## Rastreabilidade

| História | Requisito | Teste futuro |
| --- | --- | --- |
| HU01 | RF01 | Cadastrar livro válido e tentar salvar sem obrigatórios |
| HU02 | RF02 | Ver lista com livros e estante vazia |
| HU03 | RF04 | Alterar status e conferir se ficou salvo |
| HU04 | RF03 RF05 | Editar e excluir livro |
| HU05 | RF07 | Salvar nota válida e bloquear nota inválida |
| HU06 | RF06 | Filtrar por cada status |
