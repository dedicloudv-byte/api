const memStore = {
  routes: new Map(),
  logs: [],
  tokens: new Map(),
  users: new Map(),
  services: new Map(),
  apikeys: new Map(),
  sessions: new Map(),
  usage: new Map()
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

async function hashPassword(password, salt) {
  const salted = salt + password;
  const msgUint8 = new TextEncoder().encode(salted);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizeTarget(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Protocol target wajib http/https");
    }
    return parsed.toString();
  } catch {
    throw new Error("targetUrl tidak valid");
  }
}

async function saveRoute(env, route) {
  if (env.vpsai) {
    await env.vpsai.put(`routes/${route.id}.json`, JSON.stringify(route), {
      httpMetadata: { contentType: "application/json" }
    });
    return;
  }
  memStore.routes.set(route.id, route);
}

async function getRoute(env, id) {
  if (env.vpsai) {
    const object = await env.vpsai.get(`routes/${id}.json`);
    if (!object) return null;
    const raw = await object.text();
    return raw ? JSON.parse(raw) : null;
  }
  return memStore.routes.get(id) || null;
}

async function listRoutes(env) {
  if (env.vpsai) {
    const listed = await env.vpsai.list({ prefix: "routes/" });
    const routes = await Promise.all(
      listed.objects.map(async (obj) => {
        const item = await env.vpsai.get(obj.key);
        if (!item) return null;
        const raw = await item.text();
        return raw ? JSON.parse(raw) : null;
      })
    );
    return routes.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  return Array.from(memStore.routes.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

async function deleteRoute(env, id) {
  if (env.vpsai) {
    await env.vpsai.delete(`routes/${id}.json`);
    return;
  }
  memStore.routes.delete(id);
}

async function saveUserToken(env, routeId, token) {
  const payload = JSON.stringify({ token, updatedAt: nowIso() });
  if (env.vpsai) {
    await env.vpsai.put(`token/${routeId}.json`, payload, {
      httpMetadata: { contentType: "application/json" }
    });
    return;
  }
  memStore.tokens.set(routeId, payload);
}

async function getUserToken(env, routeId) {
  if (env.vpsai) {
    const object = await env.vpsai.get(`token/${routeId}.json`);
    if (!object) return null;
    const raw = await object.text();
    return raw ? JSON.parse(raw).token : null;
  }
  const raw = memStore.tokens.get(routeId);
  return raw ? JSON.parse(raw).token : null;
}

async function deleteUserToken(env, routeId) {
  if (env.vpsai) {
    await env.vpsai.delete(`token/${routeId}.json`);
    return;
  }
  memStore.tokens.delete(routeId);
}

async function saveUser(env, user) {
  if (env.vpsai) {
    await env.vpsai.put(`users/${user.username}.json`, JSON.stringify(user), {
      httpMetadata: { contentType: "application/json" }
    });
    return;
  }
  memStore.users.set(user.username, user);
}

async function getUser(env, username) {
  if (env.vpsai) {
    const object = await env.vpsai.get(`users/${username}.json`);
    if (!object) return null;
    const raw = await object.text();
    return raw ? JSON.parse(raw) : null;
  }
  return memStore.users.get(username) || null;
}

async function listUsers(env) {
  if (env.vpsai) {
    const listed = await env.vpsai.list({ prefix: "users/" });
    const users = await Promise.all(
      listed.objects.map(async (obj) => {
        const item = await env.vpsai.get(obj.key);
        if (!item) return null;
        const raw = await item.text();
        return raw ? JSON.parse(raw) : null;
      })
    );
    return users.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  return Array.from(memStore.users.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

async function saveService(env, service) {
  if (env.vpsai) {
    await env.vpsai.put(`services/${service.id}.json`, JSON.stringify(service), {
      httpMetadata: { contentType: "application/json" }
    });
    return;
  }
  memStore.services.set(service.id, service);
}

async function getService(env, id) {
  if (env.vpsai) {
    const object = await env.vpsai.get(`services/${id}.json`);
    if (!object) return null;
    const raw = await object.text();
    return raw ? JSON.parse(raw) : null;
  }
  return memStore.services.get(id) || null;
}

async function listServices(env) {
  if (env.vpsai) {
    const listed = await env.vpsai.list({ prefix: "services/" });
    const services = await Promise.all(
      listed.objects.map(async (obj) => {
        const item = await env.vpsai.get(obj.key);
        if (!item) return null;
        const raw = await item.text();
        return raw ? JSON.parse(raw) : null;
      })
    );
    return services.filter(Boolean).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  return Array.from(memStore.services.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

async function deleteService(env, id) {
  if (env.vpsai) {
    await env.vpsai.delete(`services/${id}.json`);
    return;
  }
  memStore.services.delete(id);
}

async function saveApiKey(env, apiKeyObj) {
  if (env.vpsai) {
    await env.vpsai.put(`apikeys/${apiKeyObj.key}.json`, JSON.stringify(apiKeyObj), {
      httpMetadata: { contentType: "application/json" }
    });
    return;
  }
  memStore.apikeys.set(apiKeyObj.key, apiKeyObj);
}

async function getApiKey(env, key) {
  if (env.vpsai) {
    const object = await env.vpsai.get(`apikeys/${key}.json`);
    if (!object) return null;
    const raw = await object.text();
    return raw ? JSON.parse(raw) : null;
  }
  return memStore.apikeys.get(key) || null;
}

async function listUserApiKeys(env, username) {
  if (env.vpsai) {
    const listed = await env.vpsai.list({ prefix: "apikeys/" });
    const keys = await Promise.all(
      listed.objects.map(async (obj) => {
        const item = await env.vpsai.get(obj.key);
        if (!item) return null;
        const raw = await item.text();
        return raw ? JSON.parse(raw) : null;
      })
    );
    return keys.filter((k) => k && k.username === username);
  }
  return Array.from(memStore.apikeys.values()).filter((k) => k.username === username);
}

async function saveSession(env, session) {
  if (env.vpsai) {
    await env.vpsai.put(`sessions/${session.token}.json`, JSON.stringify(session), {
      httpMetadata: { contentType: "application/json" }
    });
    return;
  }
  memStore.sessions.set(session.token, session);
}

async function getSession(env, token) {
  if (env.vpsai) {
    const object = await env.vpsai.get(`sessions/${token}.json`);
    if (!object) return null;
    const raw = await object.text();
    return raw ? JSON.parse(raw) : null;
  }
  return memStore.sessions.get(token) || null;
}

async function getUsage(env, serviceId, username) {
  const storageKey = `${serviceId}___${username}`;
  const r2Key = `usage/${storageKey}.json`;
  if (env.vpsai) {
    const object = await env.vpsai.get(r2Key);
    if (!object) return { count: 0 };
    const raw = await object.text();
    return raw ? JSON.parse(raw) : { count: 0 };
  }
  return memStore.usage.get(storageKey) || { count: 0 };
}

async function incrementUsage(env, serviceId, username) {
  const usage = await getUsage(env, serviceId, username);
  usage.count = (usage.count || 0) + 1;
  usage.lastRequest = nowIso();
  const storageKey = `${serviceId}___${username}`;
  const r2Key = `usage/${storageKey}.json`;
  if (env.vpsai) {
    await env.vpsai.put(r2Key, JSON.stringify(usage), {
      httpMetadata: { contentType: "application/json" }
    });
    return;
  }
  memStore.usage.set(storageKey, usage);
}

async function listAllUsage(env) {
  if (env.vpsai) {
    const listed = await env.vpsai.list({ prefix: "usage/" });
    const items = await Promise.all(
      listed.objects.map(async (obj) => {
        const item = await env.vpsai.get(obj.key);
        if (!item) return null;
        const raw = await item.text();
        const data = raw ? JSON.parse(raw) : null;
        const namePart = obj.key.replace("usage/", "").replace(".json", "");
        const parts = namePart.split("___");
        return { ...data, serviceId: parts[0], username: parts[1] };
      })
    );
    return items.filter(Boolean);
  }
  const result = [];
  for (const [k, v] of memStore.usage.entries()) {
    const parts = k.split("___");
    result.push({ ...v, serviceId: parts[0], username: parts[1] });
  }
  return result;
}

async function addLog(env, log) {
  if (env.vpsai) {
    const key = `logs/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.json`;
    await env.vpsai.put(key, JSON.stringify(log), {
      httpMetadata: { contentType: "application/json" }
    });
    return;
  }
  memStore.logs.unshift(log);
  memStore.logs = memStore.logs.slice(0, 500);
}

async function listLogs(env, limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  if (env.vpsai) {
    const listed = await env.vpsai.list({ prefix: "logs/", limit: safeLimit });
    const logs = await Promise.all(
      listed.objects.map(async (obj) => {
        const item = await env.vpsai.get(obj.key);
        if (!item) return null;
        const raw = await item.text();
        return raw ? JSON.parse(raw) : null;
      })
    );
    return logs.filter(Boolean).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }
  return memStore.logs.slice(0, safeLimit);
}

async function deleteLogs(env) {
  if (env.vpsai) {
    const listed = await env.vpsai.list({ prefix: "logs/" });
    await Promise.all(listed.objects.map((obj) => env.vpsai.delete(obj.key)));
    return;
  }
  memStore.logs = [];
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
    "access-control-allow-headers": "content-type,x-admin-token,x-user-token,authorization,x-api-key"
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
  <title>API Nexus Platform</title>
  <style>
    :root {
      --bg: #030712;
      --card: rgba(15, 23, 42, 0.72);
      --accent: #60a5fa;
      --accent-2: #a78bfa;
      --text: #dbeafe;
      --muted: #9ca3af;
      --danger: #fb7185;
      --success: #34d399;
      font-family: Inter, system-ui, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; color: var(--text);
      background: radial-gradient(circle at 10% 20%, #312e81 0%, transparent 45%), var(--bg);
      padding: 0;
    }
    .hidden { display: none !important; }
    .pre { white-space: pre-wrap; font-family: monospace; background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid #1e293b; margin: 1rem 0; }
    .container { max-width: 1100px; margin: 0 auto; padding: 2rem; }
    header { background: rgba(15,23,42,0.6); backdrop-filter: blur(10px); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .card { background: var(--card); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; }
    input, textarea, button { width: 100%; padding: 0.8rem; border-radius: 10px; margin: 0.5rem 0; font-size: 0.95rem; }
    input, textarea { background: rgba(15,23,42,0.8); color: white; border: 1px solid rgba(96, 165, 250, 0.2); }
    button { background: linear-gradient(90deg, var(--accent), var(--accent-2)); color: #0b1020; border: none; font-weight: bold; cursor: pointer; }
    nav button { width: auto; display: inline-block; margin-left: 0.5rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 1rem; border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
    .tag { padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: bold; }
    .tag-pending { background: #b4530933; color: #fbbf24; }
    .tag-approved { background: #065f4633; color: #34d399; }
    .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #0f172a; padding: 2rem; border-radius: 20px; width: 90%; max-width: 700px; border: 1px solid var(--accent); }
    .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
  </style>
</head>
<body>
  <header>
    <h2 style="margin:0; color:var(--accent);">🌌 Nexus API</h2>
    <nav id="mainNav" class="hidden">
      <button onclick="refreshCurrentView()" style="background:#10b981;">Refresh Data</button>
      <button onclick="showView('user-dash')">User Dashboard</button>
      <button id="adminBtn" class="hidden" onclick="showView('admin-dash')">Admin Dashboard</button>
      <button onclick="logout()" style="background: #ef4444;">Logout</button>
    </nav>
  </header>

  <main class="container">
    <div id="auth-view">
      <div id="login-form">
        <div class="card" style="max-width: 450px; margin: 2rem auto;">
          <h2>Masuk ke Platform</h2>
          <input id="l-user" placeholder="Username">
          <input id="l-pass" type="password" placeholder="Password">
          <button onclick="doLogin()">Login</button>
          <button onclick="toggleAuth()" style="background:transparent; color:var(--accent); border:1px solid var(--accent);">Daftar Akun Baru</button>
          <hr style="margin: 1.5rem 0; border: 0; border-top: 1px solid #334155;">
          <input id="a-token" type="password" placeholder="Admin Token untuk Akses Admin">
          <button onclick="doAdminLogin()" style="background:#6366f1;">Admin Login</button>
        </div>
      </div>
      <div id="reg-form" class="hidden">
        <div class="card" style="max-width: 450px; margin: 2rem auto;">
          <h2>Registrasi User</h2>
          <input id="r-user" placeholder="Pilih Username">
          <input id="r-pass" type="password" placeholder="Pilih Password">
          <button onclick="doRegister()">Daftar</button>
          <button onclick="toggleAuth()" style="background:transparent; color:var(--accent); border:1px solid var(--accent);">Sudah punya akun? Login</button>
        </div>
      </div>
      <p id="auth-msg" style="text-align: center; font-weight: bold;"></p>
    </div>

    <div id="user-dash" class="view hidden">
      <h3>Katalog API Publik</h3>
      <div id="svc-list" class="grid"></div>

      <h3 style="margin-top: 2.5rem;">API Key Saya</h3>
      <div class="card">
        <table>
          <thead><tr><th>Nama</th><th>Service ID</th><th>Key</th></tr></thead>
          <tbody id="keys-body"></tbody>
        </table>
      </div>
    </div>

    <div id="admin-dash" class="view hidden">
      <h3>Panel Administrasi</h3>
      <div class="card">
        <h4>Persetujuan User Baru</h4>
        <table>
          <thead><tr><th>Username</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody id="users-body"></tbody>
        </table>
      </div>
      <div class="card">
        <h4>Tambah Katalog API Baru</h4>
        <input id="s-name" placeholder="Nama Service (e.g. Film Drama API)">
        <input id="s-target" placeholder="Target Upstream URL">
        <input id="s-limit" type="number" placeholder="Request Limit (0 = No Limit)" value="1000">
        <textarea id="s-docs" placeholder="Dokumentasi API (Markdown)"></textarea>
        <button onclick="createSvc()">Publikasikan API</button>
      </div>
    </div>
  </main>

  <div id="modal" class="modal hidden">
    <div class="modal-content">
      <h2 id="m-title"></h2>
      <div id="m-body" style="background:#020617; padding:1.5rem; border-radius:12px; margin-bottom:1.5rem; white-space:pre-wrap; border:1px solid #1e293b;"></div>
      <div class="card" style="margin:0; background:rgba(255,255,255,0.05);">
        <h4>Generate API Key Baru</h4>
        <input id="k-name" placeholder="Nama Key (e.g. Production)">
        <button onclick="genKey()">Buat Key Sekarang</button>
      </div>
      <button onclick="closeModal()" style="background:transparent; color:var(--muted); margin-top:1rem;">Tutup</button>
    </div>
  </div>

  <script>
    const $ = id => document.getElementById(id);
    let state = { token: localStorage.getItem('tok'), adminToken: sessionStorage.getItem('atok'), curSvc: null };

    async function api(path, opts = {}) {
      const headers = { 'content-type': 'application/json' };
      if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
      if (state.adminToken) headers['x-admin-token'] = state.adminToken;
      const res = await fetch(path, { ...opts, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request gagal');
      return data;
    }

    function showView(id) {
      state.curView = id;
      document.querySelectorAll('.view, #auth-view').forEach(v => v.classList.add('hidden'));
      $(id).classList.remove('hidden');
      if (id === 'user-dash') loadUser();
      if (id === 'admin-dash') loadAdmin();
    }

    function refreshCurrentView() {
      if (state.curView === 'user-dash') loadUser();
      else if (state.curView === 'admin-dash') loadAdmin();
      else alert('Halaman ini tidak mendukung refresh.');
    }

    function toggleAuth() {
      $('login-form').classList.toggle('hidden');
      $('reg-form').classList.toggle('hidden');
      $('auth-msg').innerText = '';
    }

    async function doLogin() {
      try {
        const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: $('l-user').value, password: $('l-pass').value }) });
        state.token = res.token;
        localStorage.setItem('tok', res.token);
        $('mainNav').classList.remove('hidden');
        showView('user-dash');
      } catch (e) { $('auth-msg').innerText = '❌ ' + e.message; }
    }

    async function doRegister() {
      try {
        const res = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: $('r-user').value, password: $('r-pass').value }) });
        $('auth-msg').innerText = '✅ ' + res.message;
        setTimeout(toggleAuth, 2000);
      } catch (e) { $('auth-msg').innerText = '❌ ' + e.message; }
    }

    function doAdminLogin() {
      state.adminToken = $('a-token').value;
      sessionStorage.setItem('atok', state.adminToken);
      $('mainNav').classList.remove('hidden');
      $('adminBtn').classList.remove('hidden');
      showView('admin-dash');
    }

    function logout() {
      localStorage.clear(); sessionStorage.clear(); location.reload();
    }

    async function loadUser() {
      try {
        const [svcs, keys] = await Promise.all([api('/api/user/services'), api('/api/user/keys')]);
        $('svc-list').innerHTML = svcs.items.map(s =>
          '<div class="card">' +
            '<h4>' + s.name + '</h4>' +
            '<p class="small">Usage: ' + s.userUsage + ' / ' + (s.limit || '∞') + '</p>' +
            '<button onclick="openDocs(\\'' + s.id + '\\')">Lihat Dokumentasi</button>' +
          '</div>'
        ).join('') || '<p>Belum ada API yang tersedia.</p>';
        $('keys-body').innerHTML = keys.items.map(k =>
          '<tr><td>' + k.name + '</td><td>' + k.serviceId + '</td><td><code>' + k.key + '</code></td></tr>'
        ).join('') || '<tr><td colspan="3">Anda belum memiliki API Key.</td></tr>';
      } catch (e) { console.error(e); }
    }

    async function openDocs(id) {
      const svcs = await api('/api/user/services');
      const s = svcs.items.find(x => x.id === id);
      state.curSvc = s;
      $('m-title').innerText = 'Dokumentasi: ' + s.name;
      $('m-body').innerHTML = '<div class="pre"><strong>Proxy Endpoint:</strong> ' + location.origin + '/u/' + s.id + '</div>' +
                              '<div class="pre">' + (s.documentation || 'Tidak ada petunjuk tambahan.') + '</div>';
      $('modal').classList.remove('hidden');
    }

    async function genKey() {
      try {
        await api('/api/user/keys', { method: 'POST', body: JSON.stringify({ serviceId: state.curSvc.id, name: $('k-name').value }) });
        closeModal(); loadUser();
      } catch (e) { alert(e.message); }
    }

    function closeModal() { $('modal').classList.add('hidden'); }

    async function loadAdmin() {
      try {
        const [uRes, sRes] = await Promise.all([api('/api/admin/users'), api('/api/admin/services')]);

        $('users-body').innerHTML = uRes.items.map(u =>
          '<tr><td>' + u.username + '</td><td><span class="tag tag-' + u.status.toLowerCase() + '">' + u.status + '</span></td><td>' +
          (u.status === 'PENDING' ?
            '<button onclick="approve(\\'' + u.username + '\\')" style="width:auto; padding:0.4rem 1rem;">Setujui</button> <button onclick="reject(\\'' + u.username + '\\')" style="width:auto; padding:0.4rem 1rem; background:#ef4444;">Tolak</button>' :
            '-') +
          '</td></tr>'
        ).join('') || '<tr><td colspan="3" style="text-align:center;">Belum ada pendaftaran user.</td></tr>';

        let oldSec = $('usage-section');
        if(!oldSec) {
          $('admin-dash').insertAdjacentHTML('beforeend', '<div id="usage-section" class="card"><h4>Monitoring Penggunaan API</h4><div id="usage-content"></div></div>');
          oldSec = $('usage-section');
        }

        $('usage-content').innerHTML = sRes.items.map(s => {
          const uList = s.usages && s.usages.length ?
            '<ul>' + s.usages.map(u => '<li>' + u.username + ': <strong>' + u.count + '</strong> / ' + (s.limit || '∞') + '</li>').join('') + '</ul>' :
            '<p class="small">Belum ada penggunaan.</p>';
          return '<div style="border-bottom:1px solid #334155; padding:0.5rem 0;"><strong>' + s.name + '</strong>' + uList + '</div>';
        }).join('') || '<p>Belum ada service.</p>';

      } catch (e) { alert('Gagal memuat data admin: ' + e.message); }
    }

    async function approve(username) {
      console.log('Approving user:', username);
      await api('/api/admin/users/' + username, { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) });
      console.log('User approved, reloading admin data');
      loadAdmin();
    }

    async function reject(username) {
      if(!confirm('Tolak user ' + username + '?')) return;
      await api('/api/admin/users/' + username, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) });
      loadAdmin();
    }

    async function createSvc() {
      try {
        await api('/api/admin/services', {
          method: 'POST',
          body: JSON.stringify({
            name: $('s-name').value,
            targetUrl: $('s-target').value,
            limit: $('s-limit').value,
            documentation: $('s-docs').value
          })
        });
        alert('API Berhasil dibuat!');
        $('s-name').value = ''; $('s-target').value = ''; $('s-docs').value = ''; $('s-limit').value = '1000';
        loadAdmin();
      } catch (e) { alert(e.message); }
    }

    if (state.token || state.adminToken) {
      $('mainNav').classList.remove('hidden');
      if (state.adminToken) $('adminBtn').classList.remove('hidden');
      showView(state.adminToken ? 'admin-dash' : 'user-dash');
    }
  </script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204, headers: corsHeaders() }));
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/") {
        return withCors(new Response(appHtml, { headers: { "content-type": "text/html; charset=utf-8" } }));
      }

      if (request.method === "POST" && url.pathname === "/api/auth/register") {
        const body = await parseBody(request);
        const { username, password } = body;
        if (!username || !password) return withCors(json({ error: "Username dan password wajib diisi" }, 400));
        const existing = await getUser(env, username);
        if (existing) return withCors(json({ error: "Username sudah digunakan" }, 400));

        const salt = generateSalt();
        const hashedPassword = await hashPassword(password, salt);
        const user = { username, password: hashedPassword, salt, status: "PENDING", createdAt: nowIso() };
        await saveUser(env, user);
        return withCors(json({ ok: true, message: "Pendaftaran berhasil, menunggu persetujuan admin" }, 201));
      }

      if (request.method === "POST" && url.pathname === "/api/auth/login") {
        const body = await parseBody(request);
        const { username, password } = body;
        const user = await getUser(env, username);
        if (!user) return withCors(json({ error: "Username atau password salah" }, 401));

        const hashedPassword = await hashPassword(password, user.salt || "");
        if (user.password !== hashedPassword) return withCors(json({ error: "Username atau password salah" }, 401));
        if (user.status !== "APPROVED") return withCors(json({ error: "Akun Anda belum disetujui Admin" }, 403));
        const token = crypto.randomUUID();
        const session = { token, username, expiresAt: Date.now() + 86400000 };
        await saveSession(env, session);
        return withCors(json({ ok: true, token, user: { username: user.username } }));
      }

      let authedUsername = null;
      if (url.pathname.startsWith("/api/")) {
        const authHeader = request.headers.get("Authorization") || "";
        const sessionToken = authHeader.replace("Bearer ", "");
        const session = await getSession(env, sessionToken);
        if (session && session.expiresAt > Date.now()) {
          authedUsername = session.username;
        }
      }

      if (url.pathname.startsWith("/api/admin")) {
        if (!requireAdmin(request, env)) {
          return withCors(json({ error: "Unauthorized admin" }, 401));
        }

        if (request.method === "GET" && url.pathname === "/api/admin/users") {
          const items = await listUsers(env);
          return withCors(json({ ok: true, items }));
        }

        if (request.method === "PATCH" && url.pathname.startsWith("/api/admin/users/")) {
          const username = url.pathname.split("/").pop();
          const user = await getUser(env, username);
          if (!user) return withCors(json({ error: "User tidak ditemukan" }, 404));
          const body = await parseBody(request);
          if (body.status) user.status = body.status;
          await saveUser(env, user);
          return withCors(json({ ok: true, user }));
        }

        if (request.method === "POST" && url.pathname === "/api/admin/services") {
          const body = await parseBody(request);
          const name = (body.name || "").trim();
          const targetUrl = normalizeTarget(body.targetUrl || "");
          const documentation = (body.documentation || "").trim();

          if (!name) return withCors(json({ error: "Nama API wajib diisi" }, 400));

        const limit = Number(body.limit) || 0;

          const item = {
            id: generateId("api"),
            name,
            targetUrl,
            method: "ANY",
            documentation,
          limit,
            active: true,
            createdAt: nowIso()
          };

          await saveService(env, item);
          return withCors(json({ ok: true, item }, 201));
        }

        if (request.method === "GET" && url.pathname === "/api/admin/services") {
          const items = await listServices(env);
          const usageData = await listAllUsage(env);
          const withUsage = items.map(s => {
            const usages = usageData.filter(u => u.serviceId === s.id);
            return { ...s, usages };
          });
          return withCors(json({ ok: true, items: withUsage }));
        }

        return withCors(notFound());
      }

      if (url.pathname.startsWith("/api/user")) {
        if (!authedUsername) return withCors(json({ error: "Silahkan login" }, 401));

        if (request.method === "GET" && url.pathname === "/api/user/services") {
          const items = await listServices(env);
          const services = items.filter(s => s.active);
          const withUsage = await Promise.all(services.map(async (s) => {
            const usage = await getUsage(env, s.id, authedUsername);
            return { ...s, userUsage: usage.count || 0 };
          }));
          return withCors(json({ ok: true, items: withUsage }));
        }

        if (request.method === "POST" && url.pathname === "/api/user/keys") {
          const body = await parseBody(request);
          const { serviceId, name } = body;
          const service = await getService(env, serviceId);
          if (!service) return withCors(json({ error: "API tidak ditemukan" }, 404));
          const key = `ak_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
          const apiKeyObj = {
            key,
            name: name || service.name,
            serviceId,
            username: authedUsername,
            createdAt: nowIso()
          };
          await saveApiKey(env, apiKeyObj);
          return withCors(json({ ok: true, item: apiKeyObj }, 201));
        }

        if (request.method === "GET" && url.pathname === "/api/user/keys") {
          const items = await listUserApiKeys(env, authedUsername);
          return withCors(json({ ok: true, items }));
        }

        return withCors(notFound());
      }

      if (url.pathname.startsWith("/u/")) {
        const id = url.pathname.split("/")[2];
        const route = await getService(env, id);
        if (!route || !route.active) {
          return withCors(json({ error: "API tidak ditemukan atau tidak aktif" }, 404));
        }

        const apiKeyHeader = request.headers.get("x-api-key");
        if (!apiKeyHeader) return withCors(json({ error: "x-api-key wajib diisi" }, 401));

        const keyData = await getApiKey(env, apiKeyHeader);
        if (!keyData || keyData.serviceId !== id) {
          return withCors(json({ error: "API Key tidak valid untuk service ini" }, 401));
        }

        const authedUser = await getUser(env, keyData.username);
        if (!authedUser || authedUser.status !== "APPROVED") {
          return withCors(json({ error: "User belum disetujui Admin" }, 403));
        }

        if (route.limit > 0) {
          const usage = await getUsage(env, id, keyData.username);
          if (usage.count >= route.limit) {
            return withCors(json({ error: "Batas penggunaan API tercapai" }, 429));
          }
        }

        const outgoingHeaders = new Headers(request.headers);
        outgoingHeaders.delete("host");
        outgoingHeaders.delete("x-api-key");

        const targetUrl = new URL(route.targetUrl);
        url.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));

        try {
          const upstream = await fetch(targetUrl.toString(), {
            method: request.method,
            headers: outgoingHeaders,
            body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
            redirect: "follow"
          });

          const proxyHeaders = new Headers(upstream.headers);
          Object.entries(corsHeaders()).forEach(([k, v]) => proxyHeaders.set(k, v));

          if (upstream.ok) {
            await incrementUsage(env, id, keyData.username);
          }

          return new Response(upstream.body, {
            status: upstream.status,
            headers: proxyHeaders
          });
        } catch (err) {
          return withCors(json({ error: "Gagal terhubung ke API tujuan" }, 502));
        }
      }

      return withCors(notFound());
    } catch (err) {
      return withCors(json({ error: err.message || "Internal Server Error" }, 500));
    }
  }
};
