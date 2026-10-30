const test = require("node:test");
const assert = require("node:assert/strict");
const { validateBookInput, formatStatus } = require("../src/book-validation");

test("aceita livro com dados obrigatórios", () => {
  const result = validateBookInput({
    title: "Dom Casmurro",
    author: "Machado de Assis",
    status: "quero_ler",
  });

  assert.equal(result.ok, true);
  assert.equal(result.book.title, "Dom Casmurro");
});

test("bloqueia cadastro sem título", () => {
  const result = validateBookInput({
    title: "",
    author: "Machado de Assis",
    status: "quero_ler",
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /título/i);
});

test("bloqueia status inválido", () => {
  const result = validateBookInput({
    title: "Livro",
    author: "Autor",
    status: "favorito",
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /status/i);
});

test("bloqueia nota fora de 1 a 5", () => {
  const result = validateBookInput({
    title: "Livro",
    author: "Autor",
    status: "lido",
    rating: "6",
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /nota/i);
});

test("bloqueia data final anterior à inicial", () => {
  const result = validateBookInput({
    title: "Livro",
    author: "Autor",
    status: "lendo",
    start_date: "2026-09-07",
    end_date: "2026-09-01",
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /data de fim/i);
});

test("formata status para exibição", () => {
  assert.equal(formatStatus("quero_ler"), "Quero ler");
  assert.equal(formatStatus("lendo"), "Lendo");
  assert.equal(formatStatus("lido"), "Lido");
});
