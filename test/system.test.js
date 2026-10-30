const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const booksHandler = require("../api/books");
const { installFakeSupabase } = require("./helpers/fake-supabase");
const { setAuthEnv, clearAuthEnv, authHeader } = require("./helpers/auth");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

function setSupabaseEnv() {
  process.env.SUPABASE_URL = "https://fake.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
  setAuthEnv();
}

function clearSupabaseEnv() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  clearAuthEnv();
}

function contentType(filePath) {
  const ext = path.extname(filePath);
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
  }[ext] || "application/octet-stream";
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Acesso negado.");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Arquivo nao encontrado.");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(data);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.url.startsWith("/api/books")) {
      booksHandler(req, res);
      return;
    }

    serveStatic(req, res);
  });
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function request(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : "";
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          ...authHeader(),
          ...(data
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data),
              }
            : {}),
        },
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let bodyResult = raw;
          try {
            bodyResult = raw ? JSON.parse(raw) : null;
          } catch (_) {
            bodyResult = raw;
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: bodyResult,
            text: raw,
          });
        });
      },
    );

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

test("fluxo completo do usuario por HTTP", async () => {
  setSupabaseEnv();
  const fake = installFakeSupabase();
  const server = createServer();
  const port = await listen(server);

  try {
    let res = await request(port, "GET", "/api/books");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);

    res = await request(port, "POST", "/api/books", {
      title: "Capitaes da Areia",
      author: "Jorge Amado",
      status: "quero_ler",
    });
    assert.equal(res.status, 201);
    const created = res.body;
    assert.equal(created.title, "Capitaes da Areia");

    res = await request(port, "GET", "/api/books");
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);

    res = await request(port, "PUT", `/api/books?id=${created.id}`, {
      title: "Capitaes da Areia",
      author: "Jorge Amado",
      status: "lido",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "lido");

    res = await request(port, "GET", "/api/books?status=lido");
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].id, created.id);

    res = await request(port, "DELETE", `/api/books?id=${created.id}`);
    assert.equal(res.status, 200);

    res = await request(port, "GET", "/api/books");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, []);
    assert.ok(fake.calls.length >= 6);
  } finally {
    await close(server);
    fake.restore();
    clearSupabaseEnv();
  }
});

test("GET / devolve o HTML da pagina inicial", async () => {
  setSupabaseEnv();
  const fake = installFakeSupabase();
  const server = createServer();
  const port = await listen(server);

  try {
    const res = await request(port, "GET", "/");

    assert.equal(res.status, 200);
    assert.match(res.headers["content-type"], /text\/html/);
    assert.match(res.text, /<title>Shelf<\/title>/);
  } finally {
    await close(server);
    fake.restore();
    clearSupabaseEnv();
  }
});
