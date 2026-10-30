const { validateBookInput } = require("./book-validation");

class MemoryBookRepository {
  constructor() {
    this.books = [];
    this.nextId = 1;
  }

  list(status = "") {
    const books = status ? this.books.filter((book) => book.status === status) : this.books;
    return books.map((book) => ({ ...book }));
  }

  create(input) {
    const validation = validateBookInput(input);
    if (!validation.ok) {
      const error = new Error(validation.errors.join(" "));
      error.errors = validation.errors;
      throw error;
    }

    const book = {
      id: String(this.nextId++),
      ...validation.book,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.books.unshift(book);
    return { ...book };
  }

  update(id, input) {
    const index = this.books.findIndex((book) => book.id === String(id));
    if (index === -1) {
      throw new Error("Livro não encontrado.");
    }

    const current = this.books[index];
    const validation = validateBookInput({ ...current, ...input });
    if (!validation.ok) {
      const error = new Error(validation.errors.join(" "));
      error.errors = validation.errors;
      throw error;
    }

    const updated = {
      ...current,
      ...validation.book,
      updated_at: new Date().toISOString(),
    };

    this.books[index] = updated;
    return { ...updated };
  }

  remove(id) {
    const index = this.books.findIndex((book) => book.id === String(id));
    if (index === -1) {
      throw new Error("Livro não encontrado.");
    }

    this.books.splice(index, 1);
    return true;
  }
}

module.exports = { MemoryBookRepository };
