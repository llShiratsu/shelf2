const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const handler = require("../api/books");
const { installFakeSupabase } = require("./helpers/fake-supabase");
const { setAuthEnv, clearAuthEnv, authHeader } = require("./helpers/auth");

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
          resolve({
            status: res.statusCode,
            body: raw ? JSON.parse(raw) : null,
          });
        });
      },
    );

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

test("POST com livro valido cria no Supabase", async () => {
  setSupabaseEnv();
  const fake = installFakeSupabase();
  const server = http.createServer(handler);
  const port = await listen(server);

  try {
    const res = await request(port, "POST", "/api/books", {
      title: "Dom Casmurro",
      author: "Machado de Assis",
      status: "quero_ler",
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.title, "Dom Casmurro");
    assert.equal(res.body.author, "Machado de Assis");
    assert.equal(res.body.status, "quero_ler");
    assert.equal(fake.calls.length, 1);
    assert.equal(fake.calls[0].method, "POST");
    assert.match(fake.calls[0].url, /\/rest\/v1\/books$/);
  } finally {
    await close(server);
    fake.restore();
    clearSupabaseEnv();
  }
});

test("POST sem titulo devolve 400 sem chamar o Supabase", async () => {
  setSupabaseEnv();
  const fake = installFakeSupabase();
  const server = http.createServer(handler);
  const port = await listen(server);

  try {
    const res = await request(port, "POST", "/api/books", {
      title: "",
      author: "Machado de Assis",
      status: "quero_ler",
    });

    assert.equal(res.status, 400);
    assert.equal(fake.calls.length, 0);
  } finally {
    await close(server);
    fake.restore();
    clearSupabaseEnv();
  }
});
