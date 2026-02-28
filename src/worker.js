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

async function deleteUser(env, username) {
  if (env.vpsai) {
    await env.vpsai.delete(`users/${username}.json`);
    return;
  }
  memStore.users.delete(username);
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

const appHtml = `<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Relay Pro - Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                        primary: {
                            50: '#eff6ff',
                            100: '#dbeafe',
                            500: '#3b82f6',
                            600: '#2563eb',
                            700: '#1d4ed8',
                            900: '#1e3a8a',
                        },
                        dark: {
                            800: '#1e293b',
                            900: '#0f172a',
                            950: '#020617',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        .glass-effect {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .gradient-text {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .status-dot {
            box-shadow: 0 0 10px currentColor;
        }
        .hover-lift {
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .hover-lift:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .hidden { display: none !important; }
        .tag { padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
        .tag-approved { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .tag-pending { background: rgba(234, 179, 8, 0.2); color: #fde047; }
        .tag-rejected { background: rgba(239, 68, 68, 0.2); color: #f87171; }

        @media (max-width: 768px) {
            .sidebar-compact { height: auto !important; max-height: 200px; overflow-y: auto; }
            .main-content-mobile { height: calc(100vh - 200px); }
        }
    </style>
</head>
<body class="bg-dark-950 text-gray-100 font-sans antialiased overflow-hidden">

    <!-- Auth View -->
    <div id="authView" class="fixed inset-0 z-50 flex items-center justify-center bg-dark-950 bg-opacity-95 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="w-full max-w-md p-8 glass-effect rounded-2xl shadow-2xl">
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary-500 bg-opacity-20">
                    <i data-lucide="shield" class="w-8 h-8 text-primary-500"></i>
                </div>
                <h1 class="text-2xl font-bold gradient-text">API Relay Pro</h1>
                <p class="text-gray-400 mt-2" id="authSubtitle">Secure API Management Dashboard</p>
            </div>

            <!-- Login Form -->
            <div id="loginFormContainer" class="space-y-4">
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-300">Username</label>
                    <input type="text" id="l-user" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Username">
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-300">Password</label>
                    <input type="password" id="l-pass" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="••••••••">
                </div>
                <button onclick="doLogin()" class="w-full py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 rounded-lg font-semibold transition-all">
                    Login
                </button>
                <button onclick="toggleAuth()" class="w-full py-2 text-sm text-primary-400 hover:text-primary-300">Daftar Akun Baru</button>
                <div class="relative py-4"><div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-800"></div></div><div class="relative flex justify-center text-xs uppercase"><span class="bg-dark-900 px-2 text-gray-500">Admin Only</span></div></div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-300">Admin Token</label>
                    <input type="password" id="a-token" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Admin access token">
                </div>
                <button onclick="doAdminLogin()" class="w-full py-3 bg-dark-800 hover:bg-gray-700 rounded-lg font-semibold transition-all">
                    Admin Access
                </button>
            </div>

            <!-- Register Form -->
            <div id="regFormContainer" class="hidden space-y-4">
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-300">Username</label>
                    <input type="text" id="r-user" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Username">
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-300">Password</label>
                    <input type="password" id="r-pass" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="••••••••">
                </div>
                <button onclick="doRegister()" class="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-lg font-semibold transition-all">
                    Register
                </button>
                <button onclick="toggleAuth()" class="w-full py-2 text-sm text-primary-400 hover:text-primary-300">Sudah punya akun? Login</button>
            </div>

            <p id="auth-msg" class="mt-4 text-center text-sm font-medium"></p>
        </div>
    </div>

    <!-- Main App -->
    <div id="mainApp" class="hidden h-screen flex flex-col md:flex-row">
        <!-- Sidebar -->
        <aside id="sidebar" class="w-full md:w-64 bg-dark-900 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col sidebar-compact md:max-h-screen shrink-0">
            <div class="p-6 border-b border-gray-800">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                        <i data-lucide="zap" class="w-6 h-6 text-white"></i>
                    </div>
                    <div>
                        <h1 class="font-bold text-lg">Nexus API</h1>
                        <p class="text-xs text-gray-400">Pro Platform</p>
                    </div>
                </div>
            </div>

            <nav class="flex-1 p-4 space-y-2">
                <!-- User Nav -->
                <div id="userNav" class="space-y-2">
                    <button onclick="showView('user-dash')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors">
                        <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                        <span>APIs Catalog</span>
                    </button>
                    <button onclick="showView('user-keys')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors">
                        <i data-lucide="key" class="w-5 h-5"></i>
                        <span>My API Keys</span>
                    </button>
                </div>

                <!-- Admin Nav -->
                <div id="adminNav" class="hidden space-y-2">
                    <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin Panel</div>
                    <button onclick="showView('admin-users')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors">
                        <i data-lucide="users" class="w-5 h-5"></i>
                        <span>Users Approval</span>
                    </button>
                    <button onclick="showView('admin-svcs')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors">
                        <i data-lucide="route" class="w-5 h-5"></i>
                        <span>API Services</span>
                    </button>
                    <button onclick="showView('admin-logs')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors">
                        <i data-lucide="scroll-text" class="w-5 h-5"></i>
                        <span>System Logs</span>
                    </button>
                </div>
            </nav>

            <div class="p-4 border-t border-gray-800">
                <button onclick="logout()" class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500 hover:bg-opacity-10 transition-colors">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                    <span>Logout</span>
                </button>
            </div>
        </aside>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-hidden flex flex-col">
            <!-- Header -->
            <header class="h-16 bg-dark-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
                <h2 id="pageTitle" class="text-xl font-semibold">Dashboard</h2>
                <div class="flex items-center gap-4">
                    <button onclick="refreshCurrentView()" class="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Refresh">
                        <i data-lucide="refresh-cw" class="w-5 h-5 text-gray-400"></i>
                    </button>
                </div>
            </header>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-6 scrollbar-hide bg-dark-950">

                <!-- User Dash: API Catalog -->
                <div id="user-dash" class="view hidden space-y-6">
                    <h3 class="text-lg font-medium">Katalog API Publik</h3>
                    <div id="svc-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                </div>

                <!-- User Dash: Keys -->
                <div id="user-keys" class="view hidden space-y-6">
                    <h3 class="text-lg font-medium">API Key Saya</h3>
                    <div class="glass-effect rounded-xl overflow-hidden overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-dark-800 border-b border-gray-700">
                                <tr>
                                    <th class="px-6 py-4 text-sm font-medium text-gray-400">Name</th>
                                    <th class="px-6 py-4 text-sm font-medium text-gray-400">Service ID</th>
                                    <th class="px-6 py-4 text-sm font-medium text-gray-400">API Key</th>
                                </tr>
                            </thead>
                            <tbody id="keys-body" class="divide-y divide-gray-800"></tbody>
                        </table>
                    </div>
                </div>

                <!-- Admin View: Users -->
                <div id="admin-users" class="view hidden space-y-6">
                    <h3 class="text-lg font-medium">Persetujuan User</h3>
                    <div class="glass-effect rounded-xl overflow-hidden overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-dark-800 border-b border-gray-700">
                                <tr>
                                    <th class="px-6 py-4 font-medium text-gray-400">Username</th>
                                    <th class="px-6 py-4 font-medium text-gray-400">Status</th>
                                    <th class="px-6 py-4 font-medium text-gray-400">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="users-body" class="divide-y divide-gray-800 text-gray-300"></tbody>
                        </table>
                    </div>
                </div>

                <!-- Admin View: Services -->
                <div id="admin-svcs" class="view hidden space-y-8">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <!-- Create Svc -->
                        <div class="lg:col-span-1 space-y-4">
                            <div class="glass-effect rounded-xl p-6 space-y-4">
                                <h3 class="text-lg font-semibold">Tambah API Baru</h3>
                                <input id="s-name" placeholder="Nama Service" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg">
                                <input id="s-target" placeholder="Target URL" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg">
                                <input id="s-limit" type="number" placeholder="Limit" value="1000" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg">
                                <textarea id="s-docs" placeholder="Dokumentasi" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg h-32"></textarea>
                                <button onclick="createSvc()" class="w-full py-2 bg-primary-600 rounded-lg font-medium">Publikasikan API</button>
                            </div>
                        </div>
                        <!-- Usage Monitor -->
                        <div class="lg:col-span-2 space-y-4">
                            <div class="glass-effect rounded-xl p-6">
                                <h3 class="text-lg font-semibold mb-4">Monitoring Penggunaan API</h3>
                                <div id="usage-content" class="space-y-4 divide-y divide-gray-800"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Admin View: Logs -->
                <div id="admin-logs" class="view hidden space-y-6">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-medium text-gray-300">System Activity Logs</h3>
                        <button onclick="clearLogs()" class="px-4 py-2 bg-red-500 bg-opacity-10 text-red-400 rounded-lg hover:bg-opacity-20 text-sm">Clear Logs</button>
                    </div>
                    <div class="glass-effect rounded-xl overflow-hidden overflow-x-auto" id="logs-container">
                        <table class="w-full text-sm">
                             <thead class="bg-dark-800 border-b border-gray-700">
                                <tr>
                                    <th class="px-6 py-4 font-medium text-gray-400">Timestamp</th>
                                    <th class="px-6 py-4 font-medium text-gray-400">Service</th>
                                    <th class="px-6 py-4 font-medium text-gray-400">Status</th>
                                    <th class="px-6 py-4 font-medium text-gray-400">Message</th>
                                </tr>
                            </thead>
                            <tbody id="logs-body" class="divide-y divide-gray-800 text-gray-400"></tbody>
                        </table>
                    </div>
                </div>

            </div>
        </main>
    </div>

    <!-- Modal Documentation -->
    <div id="modal" class="fixed inset-0 z-[60] hidden flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black bg-opacity-80 backdrop-blur-sm" onclick="closeModal()"></div>
        <div class="relative w-full max-w-2xl glass-effect rounded-2xl shadow-2xl p-8 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h2 id="m-title" class="text-2xl font-bold gradient-text"></h2>
                <button onclick="closeModal()" class="text-gray-500 hover:text-white">&times;</button>
            </div>
            <div id="m-body" class="mb-8"></div>

            <div class="pt-6 border-t border-gray-800 space-y-4">
                <h4 class="font-semibold text-gray-200">Generate API Key Baru</h4>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input id="k-name" placeholder="Nama Key (e.g. Mobile App)" class="flex-1 px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg outline-none">
                    <button onclick="genKey()" class="px-6 py-2 bg-primary-600 rounded-lg font-medium whitespace-nowrap">Buat Key</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const $ = id => document.getElementById(id);
        const esc = str => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        let state = { token: localStorage.getItem('tok'), adminToken: sessionStorage.getItem('atok'), curSvc: null, curView: 'user-dash' };

        // Init icons
        const initIcons = () => lucide.createIcons();

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
            document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
            $(id).classList.remove('hidden');

            // Sidebar active state
            document.querySelectorAll('.nav-item').forEach(btn => {
                const btnAction = btn.getAttribute('onclick');
                if (btnAction && btnAction.includes(id)) {
                    btn.classList.add('bg-primary-500', 'bg-opacity-10', 'text-primary-400', 'border', 'border-primary-500', 'border-opacity-20');
                } else {
                    btn.classList.remove('bg-primary-500', 'bg-opacity-10', 'text-primary-400', 'border', 'border-primary-500', 'border-opacity-20');
                }
            });

            const titles = {
                'user-dash': 'APIs Catalog',
                'user-keys': 'My API Keys',
                'admin-users': 'Users Approval',
                'admin-svcs': 'API Services Management',
                'admin-logs': 'System Activity Logs'
            };
            $('pageTitle').innerText = titles[id] || 'Dashboard';

            if (id.startsWith('user')) loadUser();
            if (id.startsWith('admin')) loadAdmin();
        }

        function refreshCurrentView() {
            if (state.curView.startsWith('user')) loadUser();
            else loadAdmin();
        }

        function toggleAuth() {
            $('loginFormContainer').classList.toggle('hidden');
            $('regFormContainer').classList.toggle('hidden');
            $('auth-msg').innerText = '';
        }

        async function doLogin() {
            try {
                const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: $('l-user').value, password: $('l-pass').value }) });
                state.token = res.token;
                localStorage.setItem('tok', res.token);
                $('authView').classList.add('hidden');
                $('mainApp').classList.remove('hidden');
                $('adminNav').classList.add('hidden');
                showView('user-dash');
            } catch (e) { $('auth-msg').className = 'mt-4 text-center text-sm text-red-400'; $('auth-msg').innerText = '❌ ' + e.message; }
        }

        async function doRegister() {
            try {
                const res = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: $('r-user').value, password: $('r-pass').value }) });
                $('auth-msg').className = 'mt-4 text-center text-sm text-green-400';
                $('auth-msg').innerText = '✅ ' + res.message;
                setTimeout(toggleAuth, 2000);
            } catch (e) { $('auth-msg').className = 'mt-4 text-center text-sm text-red-400'; $('auth-msg').innerText = '❌ ' + e.message; }
        }

        function doAdminLogin() {
            state.adminToken = $('a-token').value;
            if(!state.adminToken) return;
            sessionStorage.setItem('atok', state.adminToken);
            $('authView').classList.add('hidden');
            $('mainApp').classList.remove('hidden');
            $('adminNav').classList.remove('hidden');
            showView('admin-users');
        }

        function logout() {
            localStorage.clear(); sessionStorage.clear(); location.reload();
        }

        async function loadUser() {
            try {
                const [svcs, keys] = await Promise.all([api('/api/user/services'), api('/api/user/keys')]);
                $('svc-list').innerHTML = svcs.items.map(s => \`
                    <div class="glass-effect rounded-xl p-6 hover-lift">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="p-2 bg-primary-500 bg-opacity-10 rounded-lg text-primary-400"><i data-lucide="package"></i></div>
                            <h4 class="font-bold">\${esc(s.name)}</h4>
                        </div>
                        <div class="text-sm text-gray-400 mb-4">
                            <div class="flex justify-between mb-1"><span>Usage</span><span>\${esc(s.userUsage)} / \${esc(s.limit || '∞')}</span></div>
                            <div class="w-full bg-gray-800 rounded-full h-1.5"><div class="bg-primary-500 h-1.5 rounded-full" style="width: \${Math.min(100, (s.userUsage / (s.limit || 1000000)) * 100)}%"></div></div>
                        </div>
                        <button onclick="openDocs('\${s.id}')" class="w-full py-2 border border-primary-500 border-opacity-30 text-primary-400 rounded-lg hover:bg-primary-500 hover:bg-opacity-10 text-sm transition-all">
                            Docs & Get Key
                        </button>
                    </div>
                \`).join('') || '<div class="col-span-full p-8 text-center text-gray-500">Belum ada API yang tersedia.</div>';

                $('keys-body').innerHTML = keys.items.map(k => \`
                    <tr class="hover:bg-dark-800">
                        <td class="px-6 py-4 font-medium">\${esc(k.name)}</td>
                        <td class="px-6 py-4 text-gray-400 text-xs">\${esc(k.serviceId)}</td>
                        <td class="px-6 py-4 font-mono text-primary-400 text-xs">\${esc(k.key)}</td>
                    </tr>
                \`).join('') || '<tr><td colspan="3" class="px-6 py-8 text-center text-gray-500">No keys generated.</td></tr>';
                initIcons();
            } catch (e) { console.error(e); }
        }

        async function openDocs(id) {
            const svcs = await api('/api/user/services');
            const s = svcs.items.find(x => x.id === id);
            state.curSvc = s;
            $('m-title').innerText = s.name;
            $('m-body').innerHTML = \`
                <div class="space-y-4">
                    <div class="p-4 bg-dark-800 rounded-lg border border-gray-700">
                        <p class="text-xs text-gray-500 uppercase font-bold mb-1">Target Endpoint</p>
                        <code class="text-sm text-primary-400">\${location.origin}/u/\${s.id}</code>
                    </div>
                    <div class="p-4 bg-dark-800 rounded-lg border border-gray-700">
                        <p class="text-xs text-gray-500 uppercase font-bold mb-1">Documentation</p>
                        <p class="text-sm text-gray-300 whitespace-pre-wrap">\${esc(s.documentation || 'Tidak ada petunjuk tambahan.')}</p>
                    </div>
                </div>
            \`;
            $('modal').classList.remove('hidden');
        }

        async function genKey() {
            try {
                await api('/api/user/keys', { method: 'POST', body: JSON.stringify({ serviceId: state.curSvc.id, name: $('k-name').value }) });
                closeModal(); showView('user-keys');
            } catch (e) { alert(e.message); }
        }

        function closeModal() { $('modal').classList.add('hidden'); }

        async function loadAdmin() {
            try {
                const [uRes, sRes, lRes] = await Promise.all([api('/api/admin/users'), api('/api/admin/services'), api('/api/admin/logs?limit=50')]);

                // Render Users
                $('users-body').innerHTML = uRes.items.map(u => {
                    const status = u.status || 'UNKNOWN';
                    let btns = '<button onclick="delUser(\\''+u.username+'\\')" class="p-2 text-red-400 hover:bg-red-500 hover:bg-opacity-10 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>';
                    if (status === 'PENDING') {
                        btns = \`
                            <button onclick="approve('\${u.username}')" class="px-3 py-1 bg-green-500 bg-opacity-10 text-green-400 text-xs rounded-md border border-green-500 border-opacity-20">Setujui</button>
                            <button onclick="reject('\${u.username}')" class="px-3 py-1 bg-yellow-500 bg-opacity-10 text-yellow-400 text-xs rounded-md border border-yellow-500 border-opacity-20">Tolak</button>
                        \` + btns;
                    }
                    return \`
                        <tr class="hover:bg-dark-800">
                            <td class="px-6 py-4 font-medium">\${esc(u.username)}</td>
                            <td class="px-6 py-4"><span class="tag tag-\${status.toLowerCase()}">\${status}</span></td>
                            <td class="px-6 py-4 flex gap-2">\${btns}</td>
                        </tr>
                    \`;
                }).join('') || '<tr><td colspan="3" class="px-6 py-8 text-center text-gray-500">Belum ada pendaftaran.</td></tr>';

                // Render Service Usage
                $('usage-content').innerHTML = sRes.items.map(s => {
                    const uList = s.usages && s.usages.length ?
                        '<div class="mt-2 space-y-1">' + s.usages.map(u => \`
                            <div class="flex justify-between text-xs text-gray-400 bg-dark-950 p-2 rounded">
                                <span>\${esc(u.username)}</span>
                                <span class="font-mono">\${esc(u.count)} / \${esc(s.limit || '∞')}</span>
                            </div>
                        \`).join('') + '</div>' :
                        '<p class="text-xs text-gray-600 italic mt-2">Belum ada penggunaan oleh user.</p>';
                    return \`
                        <div class="py-4 first:pt-0 last:pb-0">
                            <div class="flex justify-between items-center mb-1">
                                <span class="font-semibold text-primary-400">\${esc(s.name)}</span>
                                <span class="text-[10px] text-gray-600 font-mono">\${esc(s.id)}</span>
                            </div>
                            \${uList}
                        </div>
                    \`;
                }).join('') || '<p class="text-center text-gray-600 py-8">Belum ada service.</p>';

                // Render Logs
                $('logs-body').innerHTML = lRes.items.map(l => \`
                    <tr class="hover:bg-dark-800">
                        <td class="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">\${new Date(l.timestamp).toLocaleString()}</td>
                        <td class="px-6 py-3 text-xs font-mono">\${esc(l.routeId || '-')}</td>
                        <td class="px-6 py-3 text-xs font-bold \${l.status >= 400 ? 'text-red-400' : 'text-green-400'}">\${l.status}</td>
                        <td class="px-6 py-3 text-xs text-gray-300 truncate max-w-xs">\${esc(l.message)}</td>
                    </tr>
                \`).join('') || '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">Tidak ada log sistem.</td></tr>';

                initIcons();
            } catch (e) { console.error(e); }
        }

        async function approve(u) { await api('/api/admin/users/' + u, { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) }); loadAdmin(); }
        async function reject(u) { if(!confirm('Tolak user '+u+'?')) return; await api('/api/admin/users/' + u, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) }); loadAdmin(); }
        async function delUser(u) { if(!confirm('Hapus permanen user '+u+'?')) return; await api('/api/admin/users/' + u, { method: 'DELETE' }); loadAdmin(); }
        async function clearLogs() { if(!confirm('Hapus semua log?')) return; await api('/api/admin/logs', { method: 'DELETE' }); loadAdmin(); }

        async function createSvc() {
            try {
                await api('/api/admin/services', { method: 'POST', body: JSON.stringify({ name: $('s-name').value, targetUrl: $('s-target').value, limit: $('s-limit').value, documentation: $('s-docs').value }) });
                $('s-name').value = ''; $('s-target').value = ''; $('s-docs').value = '';
                loadAdmin();
            } catch (e) { alert(e.message); }
        }

        // Init
        initIcons();
        if (state.token || state.adminToken) {
            $('authView').classList.add('hidden');
            $('mainApp').classList.remove('hidden');
            if(state.adminToken) $('adminNav').classList.remove('hidden');
            showView(state.adminToken ? 'admin-users' : 'user-dash');
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

        if (request.method === "DELETE" && url.pathname.startsWith("/api/admin/users/")) {
          const username = url.pathname.split("/").pop();
          await deleteUser(env, username);
          return withCors(json({ ok: true }));
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

        if (request.method === "GET" && url.pathname === "/api/admin/stats") {
          const [services, usage] = await Promise.all([
            listServices(env),
            listAllUsage(env)
          ]);

          const totalRequests = usage.reduce((sum, u) => sum + (u.count || 0), 0);

          return withCors(json({
            ok: true,
            stats: {
              activeRoutes: services.filter(s => s.active).length,
              totalRequests,
              errorRate: "0.0%",
              avgLatency: "145ms"
            }
          }));
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
