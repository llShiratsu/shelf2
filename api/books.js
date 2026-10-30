const { validateBookInput, VALID_STATUS } = require("../src/book-validation");
const {
  HttpError, send, sendError, readBody, clientIp, createRateLimiter, requireUser, requestSupabase,
} = require("../src/http");

const FIELDS = "id,title,author,status,genre,start_date,end_date,rating,created_at,updated_at";
// Até 20 escritas (POST/PUT/DELETE) por minuto por IP.
const writeLimit = createRateLimiter({ limit: 20, windowMs: 60 * 1000 });

function parseUrl(req) {
  return new URL(req.url, "http://localhost");
}

// Todo acesso a um livro filtra pelo id E pelo dono. Um id de outro usuário
// simplesmente não é encontrado (404), então trocar o id na URL não funciona (IDOR).
function ownedBookPath(id, userId) {
  return `books?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    send(res, 200, { ok: true });
    return;
  }

  try {
    const userId = requireUser(req);
    const url = parseUrl(req);
    const id = url.searchParams.get("id");

    if (req.method === "GET") {
      const status = url.searchParams.get("status") || "";
      if (status && !VALID_STATUS.includes(status)) throw new HttpError(400, "Status inválido.");

      const filter = status ? `&status=eq.${encodeURIComponent(status)}` : "";
      const books = await requestSupabase(
        `books?select=${FIELDS}&user_id=eq.${encodeURIComponent(userId)}${filter}&order=created_at.desc`,
        { method: "GET" },
      );
      send(res, 200, books);
      return;
    }

    if (!["POST", "PUT", "DELETE"].includes(req.method)) throw new HttpError(405, "Método não permitido.");

    writeLimit(clientIp(req));

    if (req.method === "POST") {
      const validation = validateBookInput(await readBody(req));
      if (!validation.ok) throw new HttpError(400, validation.errors.join(" "));

      // user_id vem sempre do token, nunca do corpo enviado pelo cliente.
      const created = await requestSupabase("books", {
        method: "POST",
        body: JSON.stringify({ ...validation.book, user_id: userId }),
      });
      send(res, 201, created[0]);
      return;
    }

    if (!id) throw new HttpError(400, "Informe o id do livro.");

    if (req.method === "PUT") {
      const validation = validateBookInput(await readBody(req));
      if (!validation.ok) throw new HttpError(400, validation.errors.join(" "));

      const updated = await requestSupabase(`${ownedBookPath(id, userId)}&select=${FIELDS}`, {
        method: "PATCH",
        body: JSON.stringify(validation.book),
      });
      if (!updated || updated.length === 0) throw new HttpError(404, "Livro não encontrado.");
      send(res, 200, updated[0]);
      return;
    }

    const deleted = await requestSupabase(`${ownedBookPath(id, userId)}&select=id`, { method: "DELETE" });
    if (!deleted || deleted.length === 0) throw new HttpError(404, "Livro não encontrado.");
    send(res, 200, { ok: true });
  } catch (error) {
    sendError(res, error);
  }
};
