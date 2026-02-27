const memStore = {
  routes: new Map(),
  logs: [],
  tokens: new Map()
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

const nowIso = () => new Date().toISOString();

const generateId = (prefix = "r") =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

const generateUserToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const routeKey = (id) => `route/${id}.json`;
const tokenKey = (id) => `token/${id}.json`;
const logKey = () => `log/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.json`;

function normalizeTarget(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Protocol target wajib http/https");
    return parsed.toString();
  } catch {
    throw new Error("targetUrl tidak valid");
  }
}

async function saveJsonObject(env, key, value) {
  if (env.STORAGE_R2) {
    await env.STORAGE_R2.put(key, JSON.stringify(value), { httpMetadata: { contentType: "application/json" } });
    return;
  }
  if (key.startsWith("route/")) memStore.routes.set(value.id, value);
  if (key.startsWith("token/")) memStore.tokens.set(value.routeId, value);
  if (key.startsWith("log/")) {
    memStore.logs.unshift(value);
    memStore.logs = memStore.logs.slice(0, 1000);
  }
}

async function readJsonObject(env, key) {
  if (env.STORAGE_R2) {
    const object = await env.STORAGE_R2.get(key);
    if (!object) return null;
    const raw = await object.text();
    return raw ? JSON.parse(raw) : null;
  }
  if (key.startsWith("route/")) {
    const id = key.replace("route/", "").replace(".json", "");
    return memStore.routes.get(id) || null;
  }
  if (key.startsWith("token/")) {
    const id = key.replace("token/", "").replace(".json", "");
    return memStore.tokens.get(id) || null;
  }
  return null;
}

async function listJsonByPrefix(env, prefix, limit = 500) {
  if (env.STORAGE_R2) {
    const listed = await env.STORAGE_R2.list({ prefix, limit });
    const rows = await Promise.all(
      listed.objects.map(async (obj) => {
        const payload = await readJsonObject(env, obj.key);
        return payload;
      })
    );
    return rows.filter(Boolean);
  }

  if (prefix === "route/") return Array.from(memStore.routes.values());
  if (prefix === "log/") return memStore.logs.slice(0, limit);
  if (prefix === "token/") return Array.from(memStore.tokens.values());
  return [];
}

async function deleteObject(env, key) {
  if (env.STORAGE_R2) {
    await env.STORAGE_R2.delete(key);
    return;
  }
  if (key.startsWith("route/")) {
    const id = key.replace("route/", "").replace(".json", "");
    memStore.routes.delete(id);
  }
  if (key.startsWith("token/")) {
    const id = key.replace("token/", "").replace(".json", "");
    memStore.tokens.delete(id);
  }
}

async function saveRoute(env, route) {
  await saveJsonObject(env, routeKey(route.id), route);
}

async function getRoute(env, id) {
  return readJsonObject(env, routeKey(id));
}

async function listRoutes(env) {
  const routes = await listJsonByPrefix(env, "route/", 1000);
  return routes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

async function deleteRoute(env, id) {
  await deleteObject(env, routeKey(id));
}

async function saveUserToken(env, routeId, token) {
  await saveJsonObject(env, tokenKey(routeId), { routeId, token, updatedAt: nowIso() });
}

async function getUserToken(env, routeId) {
  const row = await readJsonObject(env, tokenKey(routeId));
  return row ? row.token : null;
}

async function deleteUserToken(env, routeId) {
  await deleteObject(env, tokenKey(routeId));
}

async function addLog(env, log) {
  await saveJsonObject(env, logKey(), log);
}

async function listLogs(env, limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const logs = await listJsonByPrefix(env, "log/", safeLimit);
  return logs.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, safeLimit);
}

function requireAdmin(request, env) {
  const token = request.headers.get("x-admin-token") || "";
  const expected = env.ADMIN_TOKEN || "";
  return expected && token === expected;
}

async function parseBody(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Body JSON tidak valid");
  }
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,x-admin-token,x-user-token"
  };
}

function withCors(response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

function notFound() {
  return json({ error: "Endpoint tidak ditemukan" }, 404);
}

const appHtml = `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>API Relay Control Center</title>
  <style>
    :root { --bg:#030712; --card:rgba(15,23,42,.72); --accent:#60a5fa; --accent2:#a78bfa; --text:#dbeafe; --muted:#9ca3af; --danger:#fb7185; --ok:#34d399; font-family:Inter,system-ui,sans-serif; }
    *{box-sizing:border-box} body{margin:0;min-height:100vh;color:var(--text);background:radial-gradient(circle at 10% 20%,#312e81 0%,transparent 45%),radial-gradient(circle at 80% 0%,#0f766e 0%,transparent 35%),var(--bg);padding:2rem}
    .container{max-width:1150px;margin:0 auto}.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(290px,1fr))}
    .card{background:var(--card);border:1px solid rgba(148,163,184,.2);border-radius:20px;padding:1rem;backdrop-filter:blur(20px);box-shadow:0 14px 35px rgba(2,6,23,.45)}
    input,select,button{width:100%;border-radius:12px;border:1px solid rgba(96,165,250,.2);background:rgba(15,23,42,.75);color:var(--text);padding:.68rem .8rem}
    button{background:linear-gradient(90deg,var(--accent),var(--accent2));border:none;color:#0b1020;font-weight:700;cursor:pointer;margin-top:.8rem}
    table{width:100%;border-collapse:collapse;font-size:.85rem} th,td{padding:.52rem;border-bottom:1px solid rgba(148,163,184,.2);text-align:left;vertical-align:top}
    .mono{font-family:ui-monospace,monospace;word-break:break-all}.danger{color:var(--danger)}
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 API Relay Control Center</h1>
    <p style="color:var(--muted)">Admin buat route API user, token random tersimpan di R2, dan log error juga di R2.</p>
    <div class="grid">
      <section class="card">
        <h3>Admin Token</h3>
        <input id="adminToken" type="password" placeholder="x-admin-token" />
      </section>
      <section class="card">
        <h3>Buat API User</h3>
        <input id="routeName" placeholder="Nama API" />
        <input id="targetUrl" placeholder="https://api.tujuan.com/endpoint" style="margin-top:.5rem" />
        <select id="method" style="margin-top:.5rem"><option>ANY</option><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select>
        <button id="createBtn">Generate</button>
        <div id="createResult"></div>
      </section>
    </div>
    <section class="card" style="margin-top:1rem">
      <h3>Daftar API User</h3><button id="refreshRoutes">Refresh</button>
      <table><thead><tr><th>Nama</th><th>Endpoint</th><th>Token</th><th>Target</th><th>Aksi</th></tr></thead><tbody id="routeBody"></tbody></table>
    </section>
    <section class="card" style="margin-top:1rem">
      <h3>Log Error</h3><button id="refreshLogs">Refresh</button>
      <table><thead><tr><th>Waktu</th><th>Route</th><th>Status</th><th>Pesan</th></tr></thead><tbody id="logBody"></tbody></table>
    </section>
  </div>
  <script>
    const $ = (id) => document.getElementById(id);
    const api = async (url, opts = {}) => {
      const adminToken = sessionStorage.getItem('adminToken') || '';
      const headers = { 'content-type': 'application/json', 'x-admin-token': adminToken, ...(opts.headers || {}) };
      const res = await fetch(url, { ...opts, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Request gagal');
      return data;
    };
    $('adminToken').value = sessionStorage.getItem('adminToken') || '';
    $('adminToken').addEventListener('change', (e) => sessionStorage.setItem('adminToken', e.target.value.trim()));

    async function loadRoutes() {
      const routes = await api('/api/admin/routes');
      $('routeBody').innerHTML = routes.items.map((r) => '<tr><td>' + r.name + '</td><td class="mono">' + location.origin + '/u/' + r.id + '</td><td class="mono">' + (r.userToken || '-') + '</td><td class="mono">' + r.targetUrl + '</td><td><button data-id="' + r.id + '" class="del">Hapus</button></td></tr>').join('') || '<tr><td colspan="5">Belum ada route</td></tr>';
      document.querySelectorAll('.del').forEach((btn) => btn.onclick = async () => { await api('/api/admin/routes/' + btn.dataset.id, { method: 'DELETE' }); await loadRoutes(); });
    }

    async function loadLogs() {
      const logs = await api('/api/admin/logs?limit=100');
      $('logBody').innerHTML = logs.items.map((l) => '<tr><td>' + l.timestamp + '</td><td class="mono">' + (l.routeId || '-') + '</td><td class="danger">' + (l.status || '-') + '</td><td>' + l.message + '</td></tr>').join('') || '<tr><td colspan="4">Belum ada error</td></tr>';
    }

    $('createBtn').onclick = async () => {
      try {
        const payload = { name: $('routeName').value.trim(), targetUrl: $('targetUrl').value.trim(), method: $('method').value };
        const result = await api('/api/admin/routes', { method: 'POST', body: JSON.stringify(payload) });
        $('createResult').innerHTML = '✅ Endpoint: <span class="mono">' + location.origin + '/u/' + result.item.id + '</span><br/>Token: <span class="mono">' + result.item.userToken + '</span>';
        await loadRoutes();
      } catch (err) { $('createResult').textContent = '❌ ' + err.message; }
    };

    $('refreshRoutes').onclick = () => loadRoutes();
    $('refreshLogs').onclick = () => loadLogs();
    Promise.all([loadRoutes(), loadLogs()]).catch((e) => alert('Gagal load: ' + e.message));
  </script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204, headers: corsHeaders() }));

    const url = new URL(request.url);

    try {
      if (url.pathname === "/") return withCors(new Response(appHtml, { headers: { "content-type": "text/html; charset=utf-8" } }));

      if (url.pathname.startsWith("/api/admin")) {
        if (!requireAdmin(request, env)) return withCors(json({ error: "Unauthorized admin" }, 401));

        if (request.method === "POST" && url.pathname === "/api/admin/routes") {
          const body = await parseBody(request);
          const name = (body.name || "").trim();
          const targetUrl = normalizeTarget(body.targetUrl || "");
          const method = (body.method || "ANY").toUpperCase();
          if (!name) return withCors(json({ error: "name wajib diisi" }, 400));
          if (!["ANY", "GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) return withCors(json({ error: "method tidak valid" }, 400));

          const item = { id: generateId("api"), name, targetUrl, method, active: true, createdAt: nowIso() };
          const userToken = generateUserToken();
          await saveRoute(env, item);
          await saveUserToken(env, item.id, userToken);
          return withCors(json({ ok: true, item: { ...item, userToken } }, 201));
        }

        if (request.method === "GET" && url.pathname === "/api/admin/routes") {
          const items = await listRoutes(env);
          const withToken = await Promise.all(items.map(async (route) => ({ ...route, userToken: await getUserToken(env, route.id) })));
          return withCors(json({ ok: true, items: withToken }));
        }

        if (request.method === "DELETE" && url.pathname.startsWith("/api/admin/routes/")) {
          const id = url.pathname.split("/").pop();
          await deleteRoute(env, id);
          await deleteUserToken(env, id);
          return withCors(json({ ok: true }));
        }

        if (request.method === "GET" && url.pathname === "/api/admin/logs") {
          const limit = Number(url.searchParams.get("limit") || 50);
          const items = await listLogs(env, limit);
          return withCors(json({ ok: true, items }));
        }

        return withCors(notFound());
      }

      if (url.pathname.startsWith("/u/")) {
        const id = url.pathname.split("/")[2];
        const route = await getRoute(env, id);
        if (!route || !route.active) return withCors(json({ error: "Route user tidak ditemukan" }, 404));

        const expectedUserToken = await getUserToken(env, id);
        const userToken = request.headers.get("x-user-token") || "";
        if (!expectedUserToken || !userToken || userToken !== expectedUserToken) return withCors(json({ error: "Unauthorized user token" }, 401));
        if (route.method !== "ANY" && request.method !== route.method) return withCors(json({ error: `Method harus ${route.method}` }, 405));

        const outgoingHeaders = new Headers(request.headers);
        outgoingHeaders.delete("host");
        outgoingHeaders.delete("x-user-token");

        try {
          const upstream = await fetch(route.targetUrl, {
            method: request.method,
            headers: outgoingHeaders,
            body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
            redirect: "follow"
          });

          if (!upstream.ok) {
            await addLog(env, { timestamp: nowIso(), routeId: route.id, targetUrl: route.targetUrl, status: upstream.status, message: `Upstream returned ${upstream.status}` });
          }

          const proxyHeaders = new Headers(upstream.headers);
          Object.entries(corsHeaders()).forEach(([k, v]) => proxyHeaders.set(k, v));
          return new Response(upstream.body, { status: upstream.status, headers: proxyHeaders });
        } catch (err) {
          await addLog(env, { timestamp: nowIso(), routeId: route.id, targetUrl: route.targetUrl, status: 502, message: err.message || "Upstream connection failed" });
          return withCors(json({ error: "Gagal terhubung ke API tujuan" }, 502));
        }
      }

      return withCors(notFound());
    } catch (err) {
      await addLog(env, { timestamp: nowIso(), routeId: null, targetUrl: null, status: 500, message: err.message || "Unexpected internal error" });
      return withCors(json({ error: err.message || "Internal Server Error" }, 500));
    }
  }
};
