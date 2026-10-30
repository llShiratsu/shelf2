// Supabase falso para os testes funcionais: guarda users e books em memória
// e entende os filtros eq. usados pela API (id, user_id, status, email).
function clone(value) {
  return { ...value };
}

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return data;
    },
    async text() {
      return typeof data === "string" ? data : JSON.stringify(data);
    },
  };
}

function eqFilters(searchParams) {
  const filters = {};
  for (const [key, value] of searchParams) {
    if (["select", "order", "limit"].includes(key)) continue;
    if (value.startsWith("eq.")) filters[key] = value.slice(3);
  }
  return filters;
}

const matches = (row, filters) => Object.entries(filters).every(([key, value]) => String(row[key]) === value);

function installFakeSupabase() {
  const hadFetch = Object.prototype.hasOwnProperty.call(global, "fetch");
  const originalFetch = global.fetch;
  const calls = [];
  const tables = { books: [], users: [] };
  let nextId = 1;

  function seed(nextBooks, nextUsers = []) {
    tables.books = nextBooks.map(clone);
    tables.users = nextUsers.map(clone);
    nextId = tables.books.reduce((max, book) => Math.max(max, Number(book.id) || 0), 0) + 1;
  }

  global.fetch = async function fakeFetch(url, options = {}) {
    const requestUrl = new URL(String(url));
    const method = (options.method || "GET").toUpperCase();
    calls.push({ url: String(url), method, body: options.body });

    const table = requestUrl.pathname.split("/rest/v1/")[1];
    if (!tables[table]) return response("Nao encontrado.", 404);
    const filters = eqFilters(requestUrl.searchParams);

    if (method === "GET") {
      return response(tables[table].filter((row) => matches(row, filters)).map(clone));
    }

    if (method === "POST") {
      const input = JSON.parse(options.body || "{}");
      if (table === "users" && tables.users.some((user) => user.email === input.email)) {
        return response("duplicate key", 409);
      }
      const now = new Date().toISOString();
      const row = { id: String(nextId++), ...input, created_at: now, updated_at: now };
      tables[table].push(row);
      return response([clone(row)], 201);
    }

    if (method === "PATCH") {
      const updated = [];
      tables[table] = tables[table].map((row) => {
        if (!matches(row, filters)) return row;
        const next = { ...row, ...JSON.parse(options.body || "{}"), updated_at: new Date().toISOString() };
        updated.push(clone(next));
        return next;
      });
      return response(updated);
    }

    if (method === "DELETE") {
      const deleted = tables[table].filter((row) => matches(row, filters));
      tables[table] = tables[table].filter((row) => !matches(row, filters));
      return response(deleted.map(clone));
    }

    return response("Metodo nao permitido.", 405);
  };

  function restore() {
    if (hadFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }
  }

  return { restore, calls, seed, tables };
}

module.exports = { installFakeSupabase };
