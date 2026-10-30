const VALID_STATUS = ["quero_ler", "lendo", "lido"];
// Mesmos limites do HTML, aplicados também no backend (o HTML pode ser contornado).
const MAX_LENGTH = { title: 120, author: 100, genre: 60 };
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function emptyToNull(value) {
  const cleaned = cleanText(value);
  return cleaned === "" ? null : cleaned;
}

function normalizeBookPayload(input = {}) {
  const ratingText = cleanText(input.rating);
  const rating = ratingText === "" ? null : Number(ratingText);

  return {
    title: cleanText(input.title),
    author: cleanText(input.author),
    status: cleanText(input.status),
    genre: emptyToNull(input.genre),
    start_date: emptyToNull(input.start_date),
    end_date: emptyToNull(input.end_date),
    rating,
  };
}

function validateBookInput(input = {}) {
  const book = normalizeBookPayload(input);
  const errors = [];

  if (!book.title) errors.push("Informe o título do livro.");
  if (!book.author) errors.push("Informe o autor do livro.");
  if (book.title.length > MAX_LENGTH.title) errors.push(`O título deve ter no máximo ${MAX_LENGTH.title} caracteres.`);
  if (book.author.length > MAX_LENGTH.author) errors.push(`O autor deve ter no máximo ${MAX_LENGTH.author} caracteres.`);
  if (book.genre && book.genre.length > MAX_LENGTH.genre) errors.push(`O gênero deve ter no máximo ${MAX_LENGTH.genre} caracteres.`);
  for (const field of ["start_date", "end_date"]) {
    if (book[field] && !DATE_PATTERN.test(book[field])) errors.push("Use datas no formato AAAA-MM-DD.");
  }
  if (!VALID_STATUS.includes(book.status)) {
    errors.push("Escolha um status válido.");
  }

  if (book.rating !== null && (!Number.isInteger(book.rating) || book.rating < 1 || book.rating > 5)) {
    errors.push("A nota deve ser um número de 1 a 5.");
  }

  if (book.start_date && book.end_date && book.end_date < book.start_date) {
    errors.push("A data de fim não pode ser anterior à data de início.");
  }

  return {
    ok: errors.length === 0,
    errors,
    book,
  };
}

function formatStatus(status) {
  const labels = {
    quero_ler: "Quero ler",
    lendo: "Lendo",
    lido: "Lido",
  };
  return labels[status] || status;
}

module.exports = {
  VALID_STATUS,
  MAX_LENGTH,
  normalizeBookPayload,
  validateBookInput,
  formatStatus,
};
