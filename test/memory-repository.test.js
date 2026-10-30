const test = require("node:test");
const assert = require("node:assert/strict");
const { MemoryBookRepository } = require("../src/memory-repository");

test("cria e lista livros", () => {
  const repo = new MemoryBookRepository();

  repo.create({
    title: "O Hobbit",
    author: "J. R. R. Tolkien",
    status: "lendo",
  });

  const books = repo.list();
  assert.equal(books.length, 1);
  assert.equal(books[0].title, "O Hobbit");
});

test("filtra livros por status", () => {
  const repo = new MemoryBookRepository();

  repo.create({ title: "Livro 1", author: "Autor", status: "quero_ler" });
  repo.create({ title: "Livro 2", author: "Autor", status: "lido" });

  assert.equal(repo.list("quero_ler").length, 1);
  assert.equal(repo.list("lido").length, 1);
});

test("edita livro existente", () => {
  const repo = new MemoryBookRepository();
  const created = repo.create({ title: "Livro", author: "Autor", status: "lendo" });

  const updated = repo.update(created.id, {
    title: "Livro Atualizado",
    author: "Autor",
    status: "lido",
    rating: 5,
  });

  assert.equal(updated.title, "Livro Atualizado");
  assert.equal(updated.status, "lido");
  assert.equal(updated.rating, 5);
});

test("exclui livro", () => {
  const repo = new MemoryBookRepository();
  const created = repo.create({ title: "Livro", author: "Autor", status: "lendo" });

  repo.remove(created.id);

  assert.equal(repo.list().length, 0);
});
