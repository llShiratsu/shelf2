const test = require("node:test");
const assert = require("node:assert/strict");
const { MemoryBookRepository } = require("../src/memory-repository");

test("fluxo principal do usuário", () => {
  const repo = new MemoryBookRepository();

  const created = repo.create({
    title: "Capitães da Areia",
    author: "Jorge Amado",
    status: "quero_ler",
    genre: "romance",
  });

  assert.equal(repo.list().length, 1);

  repo.update(created.id, {
    title: "Capitães da Areia",
    author: "Jorge Amado",
    status: "lendo",
    genre: "romance",
  });

  assert.equal(repo.list("lendo").length, 1);
  assert.equal(repo.list("quero_ler").length, 0);

  repo.update(created.id, {
    title: "Capitães da Areia",
    author: "Jorge Amado",
    status: "lido",
    genre: "romance",
    rating: 5,
  });

  const lidos = repo.list("lido");
  assert.equal(lidos.length, 1);
  assert.equal(lidos[0].rating, 5);

  repo.remove(created.id);
  assert.equal(repo.list().length, 0);
});
