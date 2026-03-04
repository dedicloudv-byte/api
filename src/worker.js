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
  const logEntry = {
    timestamp: nowIso(),
    ...log
  };
  if (env.vpsai) {
    const key = `logs/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.json`;
    await env.vpsai.put(key, JSON.stringify(logEntry), {
      httpMetadata: { contentType: "application/json" }
    });
    return;
  }
  memStore.logs.unshift(logEntry);
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
    <title>API Relay - User Portal</title>
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
                    },
                    animation: {
                        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        'slide-in': 'slideIn 0.3s ease-out',
                        'fade-in': 'fadeIn 0.5s ease-out',
                        'float': 'float 6s ease-in-out infinite',
                    },
                    keyframes: {
                        slideIn: {
                            '0%': { transform: 'translateX(-100%)', opacity: '0' },
                            '100%': { transform: 'translateX(0)', opacity: '1' },
                        },
                        fadeIn: {
                            '0%': { opacity: '0', transform: 'translateY(10px)' },
                            '100%': { opacity: '1', transform: 'translateY(0)' },
                        },
                        float: {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-20px)' },
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
        .glass-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .gradient-text {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .gradient-border {
            position: relative;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
        }
        .gradient-border::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            padding: 1px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
        }
        .code-block {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .sidebar-transition {
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .content-transition {
            transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-text {
            transition: opacity 0.2s, width 0.2s;
            white-space: nowrap;
        }
        .sidebar-collapsed .nav-text {
            opacity: 0;
            width: 0;
            display: none;
        }
        .sidebar-collapsed .logo-text {
            opacity: 0;
            width: 0;
            display: none;
        }
        .tooltip {
            position: relative;
        }
        .tooltip:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            margin-left: 10px;
            padding: 6px 12px;
            background: rgba(15, 23, 42, 0.95);
            color: white;
            font-size: 12px;
            border-radius: 6px;
            white-space: nowrap;
            z-index: 50;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .mobile-overlay {
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
        }
        .glow {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }
        .api-key-blur {
            filter: blur(4px);
            transition: filter 0.3s;
        }
        .api-key-blur:hover {
            filter: blur(0);
        }
        .hidden { display: none !important; }
        .tag { padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
        .tag-approved { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .tag-pending { background: rgba(234, 179, 8, 0.2); color: #fde047; }
        .tag-rejected { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    </style>
<base target="_blank">
</head>
<body class="bg-dark-950 text-gray-100 font-sans antialiased overflow-hidden">

    <!-- Login Overlay -->
    <div id="loginOverlay" class="fixed inset-0 z-50 flex items-center justify-center bg-dark-950 bg-opacity-95 backdrop-blur-sm">
        <div class="w-full max-w-md p-8 glass-effect rounded-2xl shadow-2xl animate-fade-in relative overflow-hidden">
            <!-- Decorative elements -->
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-600"></div>
            <div class="absolute -top-20 -right-20 w-40 h-40 bg-primary-500 opacity-10 rounded-full blur-3xl"></div>
            <div class="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500 opacity-10 rounded-full blur-3xl"></div>

            <div class="text-center mb-8 relative z-10">
                <div class="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg animate-float">
                    <i data-lucide="zap" class="w-8 h-8 text-white"></i>
                </div>
                <h1 class="text-2xl font-bold gradient-text" id="auth-title">API Relay Portal</h1>
                <p class="text-gray-400 mt-2" id="auth-subtitle">Access your API dashboard</p>
            </div>

            <!-- Login Form -->
            <form id="loginForm" class="space-y-4 relative z-10">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <input type="text" id="l-user" class="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm" placeholder="Your username...">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <div class="relative">
                        <input type="password" id="l-pass" class="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all font-mono text-sm" placeholder="Your password...">
                        <button type="button" onclick="togglePass('l-pass')" class="absolute right-3 top-3 text-gray-400 hover:text-white">
                            <i data-lucide="eye" class="w-5 h-5"></i>
                        </button>
                    </div>
                </div>
                <button type="submit" class="w-full py-3 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 rounded-lg font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary-500/25">
                    Access Dashboard
                </button>
                <div class="text-center">
                   <button type="button" onclick="toggleAuth('register')" class="text-sm text-primary-400 hover:text-primary-300">Don't have an account? Register</button>
                </div>
                <div class="relative py-2"><div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-800"></div></div><div class="relative flex justify-center text-xs uppercase"><span class="bg-dark-900 px-2 text-gray-500">Or</span></div></div>
                <button type="button" onclick="toggleAuth('admin')" class="w-full py-2 bg-dark-800 border border-gray-700 rounded-lg text-sm hover:bg-gray-700 transition-colors">Admin Access</button>
            </form>

            <!-- Register Form -->
            <form id="registerForm" class="hidden space-y-4 relative z-10">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <input type="text" id="r-user" class="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm" placeholder="Choose username...">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <div class="relative">
                        <input type="password" id="r-pass" class="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all font-mono text-sm" placeholder="Choose password...">
                        <button type="button" onclick="togglePass('r-pass')" class="absolute right-3 top-3 text-gray-400 hover:text-white">
                            <i data-lucide="eye" class="w-5 h-5"></i>
                        </button>
                    </div>
                </div>
                <button type="submit" class="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-lg font-semibold transition-all">
                    Create Account
                </button>
                <div class="text-center">
                    <button type="button" onclick="toggleAuth('login')" class="text-sm text-primary-400 hover:text-primary-300">Already have an account? Login</button>
                </div>
            </form>

            <!-- Admin Form -->
            <form id="adminForm" class="hidden space-y-4 relative z-10">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">Admin Token</label>
                    <input type="password" id="a-token" class="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all font-mono text-sm" placeholder="Enter admin token...">
                </div>
                <button type="submit" class="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-all">
                    Admin Login
                </button>
                <div class="text-center">
                    <button type="button" onclick="toggleAuth('login')" class="text-sm text-primary-400 hover:text-primary-300">Back to User Login</button>
                </div>
            </form>

            <p id="auth-msg" class="mt-6 text-center text-sm font-medium"></p>
        </div>
    </div>

    <!-- Mobile Overlay -->
    <div id="mobileOverlay" class="fixed inset-0 z-30 mobile-overlay hidden lg:hidden" onclick="toggleMobileSidebar()"></div>

    <!-- Main App -->
    <div id="mainApp" class="hidden h-screen flex relative">

        <!-- Sidebar -->
        <aside id="sidebar" class="sidebar-transition fixed lg:relative z-40 h-full bg-dark-900 border-r border-gray-800 flex flex-col w-64 -translate-x-full lg:translate-x-0">
            <!-- Toggle Button (Desktop) -->
            <button id="sidebarToggle" onclick="toggleSidebar()" class="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-primary-600 rounded-full items-center justify-center shadow-lg hover:bg-primary-500 transition-colors z-50 border-2 border-dark-900">
                <i data-lucide="chevron-left" class="w-4 h-4 text-white transition-transform duration-300" id="toggleIcon"></i>
            </button>

            <div class="p-6 border-b border-gray-800 flex items-center justify-between overflow-hidden">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                        <i data-lucide="zap" class="w-6 h-6 text-white"></i>
                    </div>
                    <div class="logo-text overflow-hidden">
                        <h1 class="font-bold text-lg whitespace-nowrap">API Relay</h1>
                        <p class="text-xs text-gray-400 whitespace-nowrap" id="user-role-display">User Portal</p>
                    </div>
                </div>
                <button onclick="toggleMobileSidebar()" class="lg:hidden p-2 hover:bg-gray-800 rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <nav class="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-hide">
                <div id="user-nav" class="space-y-2">
                    <button onclick="switchTab('overview')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-primary-500 bg-opacity-10 text-primary-400 border border-primary-500 border-opacity-20 tooltip" data-tooltip="Overview">
                        <i data-lucide="layout-dashboard" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="nav-text">Overview</span>
                    </button>
                    <button onclick="switchTab('services')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors tooltip" data-tooltip="API Catalog">
                        <i data-lucide="package" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="nav-text">API Catalog</span>
                    </button>
                    <button onclick="switchTab('credentials')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors tooltip" data-tooltip="API Credentials">
                        <i data-lucide="key" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="nav-text">API Credentials</span>
                    </button>
                    <button onclick="switchTab('usage')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors tooltip" data-tooltip="Usage Stats">
                        <i data-lucide="bar-chart-2" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="nav-text">Usage Statistics</span>
                    </button>
                    <button onclick="switchTab('logs')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors tooltip" data-tooltip="Request Logs">
                        <i data-lucide="file-text" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="nav-text">Request Logs</span>
                    </button>
                </div>

                <div id="admin-nav" class="hidden space-y-2 pt-4">
                    <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider nav-text">Admin Panel</div>
                    <button onclick="switchTab('admin-users')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors tooltip" data-tooltip="Users Approval">
                        <i data-lucide="users" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="nav-text">Users Approval</span>
                    </button>
                    <button onclick="switchTab('admin-svcs')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors tooltip" data-tooltip="API Services">
                        <i data-lucide="route" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="nav-text">API Services</span>
                    </button>
                    <button onclick="switchTab('admin-logs')" class="nav-item w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors tooltip" data-tooltip="System Logs">
                        <i data-lucide="scroll-text" class="w-5 h-5 flex-shrink-0"></i>
                        <span class="nav-text">System Logs</span>
                    </button>
                </div>
            </nav>

            <div class="p-4 border-t border-gray-800">
                <div class="glass-effect rounded-xl p-4 overflow-hidden">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                            <span class="text-sm font-bold text-white" id="user-initials">U</span>
                        </div>
                        <div class="nav-text overflow-hidden">
                            <p class="font-medium text-sm truncate" id="display-username">User</p>
                            <p class="text-xs text-gray-400 truncate" id="display-plan">Free Plan</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col content-transition lg:ml-0 overflow-hidden">
            <!-- Header -->
            <header class="h-16 bg-dark-900/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-20">
                <div class="flex items-center gap-4">
                    <button onclick="toggleMobileSidebar()" class="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors">
                        <i data-lucide="menu" class="w-5 h-5 text-gray-400"></i>
                    </button>

                    <button onclick="toggleSidebar()" class="hidden lg:flex p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Toggle Sidebar">
                        <i data-lucide="panel-left" class="w-5 h-5 text-gray-400"></i>
                    </button>

                    <h2 id="pageTitle" class="text-xl font-semibold">Overview</h2>
                </div>
                <div class="flex items-center gap-2 sm:gap-4">
                    <button onclick="refreshCurrentView()" class="p-2 hover:bg-gray-800 rounded-lg transition-colors relative" title="Refresh">
                        <i data-lucide="refresh-cw" class="w-5 h-5 text-gray-400"></i>
                    </button>
                    <button onclick="toggleTheme()" class="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                        <i data-lucide="moon" class="w-5 h-5 text-gray-400"></i>
                    </button>
                    <div class="hidden sm:block h-8 w-px bg-gray-700"></div>
                    <button onclick="logout()" class="flex items-center gap-2 px-3 sm:px-4 py-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400">
                        <i data-lucide="log-out" class="w-4 h-4"></i>
                        <span class="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </header>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">

                <!-- Overview Tab -->
                <div id="overviewTab" class="tab-content space-y-6">
                    <div class="glass-card rounded-2xl p-6 sm:p-8 relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-64 h-64 bg-primary-500 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div class="relative z-10">
                            <h2 class="text-2xl sm:text-3xl font-bold mb-2">Welcome back, <span class="gradient-text" id="welcome-name">User!</span></h2>
                            <p class="text-gray-400 mb-6">Here's what's happening with your API usage today.</p>

                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div class="bg-dark-800/50 rounded-xl p-4 border border-gray-700">
                                    <p class="text-sm text-gray-400 mb-1">Today's Requests</p>
                                    <p class="text-2xl font-bold text-white" id="stat-today-req">0</p>
                                </div>
                                <div class="bg-dark-800/50 rounded-xl p-4 border border-gray-700">
                                    <p class="text-sm text-gray-400 mb-1">Success Rate</p>
                                    <p class="text-2xl font-bold text-green-400" id="stat-success-rate">0%</p>
                                </div>
                                <div class="bg-dark-800/50 rounded-xl p-4 border border-gray-700">
                                    <p class="text-sm text-gray-400 mb-1">Avg Latency</p>
                                    <p class="text-2xl font-bold text-blue-400" id="stat-avg-latency">0ms</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                         <div class="glass-effect rounded-xl p-6 border border-gray-800">
                            <h3 class="font-semibold text-lg mb-4">Quick Links</h3>
                            <div class="grid grid-cols-2 gap-4">
                                <button onclick="switchTab('services')" class="p-4 bg-dark-800/50 rounded-xl border border-gray-700 hover:border-primary-500 transition-all text-left group">
                                    <i data-lucide="package" class="w-6 h-6 text-primary-400 mb-2 group-hover:scale-110 transition-transform"></i>
                                    <p class="font-medium">Browse APIs</p>
                                </button>
                                <button onclick="switchTab('credentials')" class="p-4 bg-dark-800/50 rounded-xl border border-gray-700 hover:border-primary-500 transition-all text-left group">
                                    <i data-lucide="key" class="w-6 h-6 text-purple-400 mb-2 group-hover:scale-110 transition-transform"></i>
                                    <p class="font-medium">My Keys</p>
                                </button>
                            </div>
                        </div>
                        <div class="glass-effect rounded-xl p-6 border border-gray-800">
                            <h3 class="font-semibold text-lg mb-4">Usage Chart</h3>
                            <div class="relative h-[200px]">
                                <canvas id="usageChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Services Tab -->
                <div id="servicesTab" class="tab-content hidden space-y-6">
                    <h2 class="text-2xl font-bold">Available APIs</h2>
                    <div id="svc-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                </div>

                <!-- Credentials Tab -->
                <div id="credentialsTab" class="tab-content hidden space-y-6">
                    <h2 class="text-2xl font-bold">My API Keys</h2>
                    <div class="glass-effect rounded-xl overflow-hidden border border-gray-800">
                        <table class="w-full">
                            <thead class="bg-dark-800">
                                <tr>
                                    <th class="px-6 py-4 text-left text-sm text-gray-400">Name</th>
                                    <th class="px-6 py-4 text-left text-sm text-gray-400">Service ID</th>
                                    <th class="px-6 py-4 text-left text-sm text-gray-400">API Key</th>
                                </tr>
                            </thead>
                            <tbody id="keys-body" class="divide-y divide-gray-800"></tbody>
                        </table>
                    </div>
                </div>

                <!-- Usage Tab -->
                <div id="usageTab" class="tab-content hidden space-y-6">
                    <h2 class="text-2xl font-bold">Usage Statistics</h2>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="glass-effect rounded-xl p-6 border border-gray-800">
                            <h3 class="font-semibold mb-4">Requests by Endpoint</h3>
                            <div class="relative h-[300px]">
                                <canvas id="endpointChart"></canvas>
                            </div>
                        </div>
                        <div class="glass-effect rounded-xl p-6 border border-gray-800">
                            <h3 class="font-semibold mb-4">Status Code Distribution</h3>
                            <div class="relative h-[300px]">
                                <canvas id="statusDistChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Logs Tab -->
                <div id="logsTab" class="tab-content hidden space-y-6">
                    <h2 class="text-2xl font-bold">Request Logs</h2>
                    <div class="glass-effect rounded-xl overflow-hidden border border-gray-800">
                        <div class="overflow-x-auto">
                            <table class="w-full min-w-[600px]">
                                <thead class="bg-dark-800 border-b border-gray-700">
                                    <tr>
                                        <th class="text-left px-6 py-4 text-sm font-medium text-gray-400">Timestamp</th>
                                        <th class="text-left px-6 py-4 text-sm font-medium text-gray-400">Method</th>
                                        <th class="text-left px-6 py-4 text-sm font-medium text-gray-400">Endpoint</th>
                                        <th class="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                                        <th class="text-left px-6 py-4 text-sm font-medium text-gray-400">Latency</th>
                                    </tr>
                                </thead>
                                <tbody id="logsTable" class="divide-y divide-gray-800"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Admin: Users Tab -->
                <div id="admin-usersTab" class="tab-content hidden space-y-6">
                    <h2 class="text-2xl font-bold">User Approvals</h2>
                    <div class="glass-effect rounded-xl overflow-hidden border border-gray-800">
                        <table class="w-full">
                            <thead class="bg-dark-800">
                                <tr>
                                    <th class="px-6 py-4 text-left text-sm text-gray-400">Username</th>
                                    <th class="px-6 py-4 text-left text-sm text-gray-400">Status</th>
                                    <th class="px-6 py-4 text-left text-sm text-gray-400">Action</th>
                                </tr>
                            </thead>
                            <tbody id="admin-users-body" class="divide-y divide-gray-800"></tbody>
                        </table>
                    </div>
                </div>

                <!-- Admin: Services Tab -->
                <div id="admin-svcsTab" class="tab-content hidden space-y-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold">API Services</h2>
                        <button onclick="openCreateSvcModal()" class="px-4 py-2 bg-primary-600 rounded-lg text-sm">Add Service</button>
                    </div>
                    <div id="admin-svc-list" class="space-y-4"></div>
                </div>

                <!-- Admin: Logs Tab -->
                <div id="admin-logsTab" class="tab-content hidden space-y-6">
                    <div class="flex justify-between items-center">
                        <h2 class="text-2xl font-bold">System Logs</h2>
                        <button onclick="clearAllLogs()" class="px-4 py-2 bg-red-600 rounded-lg text-sm">Clear All Logs</button>
                    </div>
                    <div class="glass-effect rounded-xl overflow-hidden border border-gray-800">
                        <table class="w-full">
                            <thead class="bg-dark-800">
                                <tr>
                                    <th class="px-6 py-4 text-left text-sm text-gray-400">Time</th>
                                    <th class="px-6 py-4 text-left text-sm text-gray-400">User</th>
                                    <th class="px-6 py-4 text-left text-sm text-gray-400">Action</th>
                                    <th class="px-6 py-4 text-left text-sm text-gray-400">Status</th>
                                </tr>
                            </thead>
                            <tbody id="admin-logs-body" class="divide-y divide-gray-800"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Modal -->
    <div id="modal" class="fixed inset-0 z-[60] hidden flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="closeModal()"></div>
        <div class="relative w-full max-w-2xl glass-effect rounded-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h2 id="modal-title" class="text-2xl font-bold gradient-text mb-6"></h2>
            <div id="modal-body"></div>
            <div id="modal-footer" class="mt-8 pt-6 border-t border-gray-800"></div>
        </div>
    </div>

    <!-- Toast -->
    <div id="toast" class="fixed bottom-6 right-6 transform translate-y-20 opacity-0 transition-all duration-300 z-[70]">
        <div class="glass-effect rounded-lg px-6 py-4 flex items-center gap-3 border-l-4 border-primary-500">
            <i data-lucide="check-circle" class="w-5 h-5 text-primary-400"></i>
            <span id="toastMessage"></span>
        </div>
    </div>

    <script>
        window.toggleAuth = function(mode) {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById('adminForm').classList.add('hidden');
            document.getElementById('auth-msg').innerText = '';

            if (mode === 'login') {
                document.getElementById('loginForm').classList.remove('hidden');
                document.getElementById('auth-title').innerText = 'API Relay Portal';
                document.getElementById('auth-subtitle').innerText = 'Access your API dashboard';
            } else if (mode === 'register') {
                document.getElementById('registerForm').classList.remove('hidden');
                document.getElementById('auth-title').innerText = 'Create Account';
                document.getElementById('auth-subtitle').innerText = 'Join our API community';
            } else if (mode === 'admin') {
                document.getElementById('adminForm').classList.remove('hidden');
                document.getElementById('auth-title').innerText = 'Admin Access';
                document.getElementById('auth-subtitle').innerText = 'Secure administrator panel';
            }
        };

        lucide.createIcons();
        let state = {
            token: localStorage.getItem('tok'),
            adminToken: sessionStorage.getItem('atok'),
            currentTab: 'overview',
            charts: {},
            sidebarCollapsed: false
        };

        const \$ = id => document.getElementById(id);
        const esc = str => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

        async function api(path, opts = {}) {
            const headers = { 'content-type': 'application/json' };
            if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
            if (state.adminToken) headers['x-admin-token'] = state.adminToken;
            const res = await fetch(path, { ...opts, headers });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            return data;
        }

        function showToast(msg) {
            \$('toastMessage').innerText = msg;
            \$('toast').classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => \$('toast').classList.add('translate-y-20', 'opacity-0'), 3000);
        }

        function togglePass(id) {
            const input = \$(id);
            input.type = input.type === 'password' ? 'text' : 'password';
        }


        \$('loginForm').onsubmit = async (e) => {
            e.preventDefault();
            try {
                const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: \$('l-user').value, password: \$('l-pass').value }) });
                state.token = res.token;
                localStorage.setItem('tok', res.token);
                \$('display-username').innerText = res.user.username;
                \$('welcome-name').innerText = res.user.username + '!';
                \$('user-initials').innerText = res.user.username.slice(0,2).toUpperCase();
                \$('loginOverlay').classList.add('hidden');
                \$('mainApp').classList.remove('hidden');
                initDashboard();
            } catch (e) {
                \$('auth-msg').className = 'mt-6 text-center text-sm text-red-400';
                \$('auth-msg').innerText = '❌ ' + e.message;
            }
        };

        \$('registerForm').onsubmit = async (e) => {
            e.preventDefault();
            try {
                const res = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: \$('r-user').value, password: \$('r-pass').value }) });
                \$('auth-msg').className = 'mt-6 text-center text-sm text-green-400';
                \$('auth-msg').innerText = '✅ ' + res.message;
                setTimeout(() => toggleAuth('login'), 2000);
            } catch (e) {
                \$('auth-msg').className = 'mt-6 text-center text-sm text-red-400';
                \$('auth-msg').innerText = '❌ ' + e.message;
            }
        };

        \$('adminForm').onsubmit = async (e) => {
            e.preventDefault();
            const token = \$('a-token').value;
            if (!token) return;
            try {
                // Validate admin token by calling the API
                const res = await fetch('/api/admin/services', {
                    headers: { 'x-admin-token': token }
                });
                if (!res.ok) {
                    throw new Error('Invalid admin token');
                }
                state.adminToken = token;
                sessionStorage.setItem('atok', token);
                \$('user-role-display').innerText = 'Admin Panel';
                \$('admin-nav').classList.remove('hidden');
                \$('loginOverlay').classList.add('hidden');
                \$('mainApp').classList.remove('hidden');
                switchTab('admin-users');
            } catch (e) {
                \$('auth-msg').className = 'mt-6 text-center text-sm text-red-400';
                \$('auth-msg').innerText = '❌ ' + (e.message || 'Invalid admin token');
            }
        };

        function logout() {
            localStorage.clear(); sessionStorage.clear(); location.reload();
        }

        function switchTab(tab) {
            document.querySelectorAll('.nav-item').forEach(el => {
                el.classList.remove('bg-primary-500', 'bg-opacity-10', 'text-primary-400', 'border', 'border-primary-500', 'border-opacity-20');
                el.classList.add('hover:bg-gray-800', 'text-gray-300');
            });

            let target = null;
            if (typeof event !== 'undefined' && event?.currentTarget) {
                target = event.currentTarget;
            } else {
                target = document.querySelector('.nav-item[onclick*="switchTab(\'' + tab + '\')"]');
            }

            if (target) {
                target.classList.add('bg-primary-500', 'bg-opacity-10', 'text-primary-400', 'border', 'border-primary-500', 'border-opacity-20');
                target.classList.remove('hover:bg-gray-800', 'text-gray-300');
            }

            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            const tabEl = $(tab + 'Tab');
            if (tabEl) {
                tabEl.classList.remove('hidden');
                state.currentTab = tab;
                localStorage.setItem('activeTab', tab);
            } else {
                $('overviewTab').classList.remove('hidden');
                state.currentTab = 'overview';
                localStorage.setItem('activeTab', 'overview');
            }

            const titles = {
                overview: 'Overview',
                services: 'API Catalog',
                credentials: 'API Credentials',
                usage: 'Usage Statistics',
                logs: 'Request Logs',
                'admin-users': 'User Approvals',
                'admin-svcs': 'API Services',
                'admin-logs': 'System Logs'
            };
            $('pageTitle').textContent = titles[state.currentTab] || 'Dashboard';

            if (state.currentTab === 'overview') initDashboard();
            if (state.currentTab === 'services') loadServices();
            if (state.currentTab === 'credentials') loadKeys();
            if (state.currentTab === 'logs') loadLogs();
            if (state.currentTab === 'usage') initUsageCharts();
            if (state.currentTab.startsWith('admin')) loadAdminData(state.currentTab);
        }

        async function initDashboard() {
            try {
                const res = await api('/api/user/stats');
                \$('stat-today-req').innerText = res.stats.todayRequests;
                \$('stat-success-rate').innerText = res.stats.successRate;
                \$('stat-avg-latency').innerText = res.stats.avgLatency;
                initOverviewChart();
            } catch (e) { console.error(e); }
        }

        async function loadServices() {
            try {
                const res = await api('/api/user/services');
                \$('svc-list').innerHTML = res.items.map(s => \`
                    <div class="glass-effect rounded-xl p-6 hover:border-primary-500/50 transition-all border border-gray-800">
                        <div class="flex items-center gap-3 mb-4">
                            <div class="p-2 bg-primary-500/10 rounded-lg text-primary-400"><i data-lucide="package"></i></div>
                            <h4 class="font-bold">\${esc(s.name)}</h4>
                        </div>
                        <p class="text-sm text-gray-400 mb-4 line-clamp-2">\${esc(s.documentation || 'No description.')}</p>
                        <div class="text-xs text-gray-500 mb-4">
                           <div class="flex justify-between mb-1"><span>Usage</span><span>\${s.userUsage} / \${s.limit || '∞'}</span></div>
                           <div class="w-full bg-gray-800 h-1.5 rounded-full"><div class="bg-primary-500 h-1.5 rounded-full" style="width: \${Math.min(100, (s.userUsage/(s.limit||10000))*100)}%"></div></div>
                        </div>
                        <button onclick="openSvcDocs('\${s.id}')" class="w-full py-2 border border-primary-500/30 text-primary-400 rounded-lg hover:bg-primary-500/10 transition-all text-sm">View Docs & Keys</button>
                    </div>
                \`).join('');
                lucide.createIcons();
            } catch (e) { console.error(e); }
        }

        async function openSvcDocs(id) {
            const res = await api('/api/user/services');
            const s = res.items.find(x => x.id === id);
            \$('modal-title').innerText = s.name;
            \$('modal-body').innerHTML = \`
                <div class="space-y-4">
                    <div class="p-4 bg-dark-800 rounded-lg border border-gray-700">
                        <p class="text-xs text-gray-500 uppercase font-bold mb-1">Target Endpoint</p>
                        <code class="text-sm text-primary-400">\${location.origin}/u/\${s.id}</code>
                    </div>
                    <div class="p-4 bg-dark-800 rounded-lg border border-gray-700">
                        <p class="text-xs text-gray-500 uppercase font-bold mb-1">Documentation</p>
                        <p class="text-sm text-gray-300 whitespace-pre-wrap">\${esc(s.documentation || 'No documentation provided.')}</p>
                    </div>
                </div>
            \`;
            \$('modal-footer').innerHTML = \`
                <div class="flex flex-col gap-4">
                    <p class="font-semibold text-gray-200">Generate New API Key</p>
                    <div class="flex gap-2">
                        <input id="new-key-name" placeholder="Key name (e.g. My App)" class="flex-1 px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg outline-none">
                        <button onclick="generateKey('\${s.id}')" class="px-6 py-2 bg-primary-600 rounded-lg font-medium">Create Key</button>
                    </div>
                </div>
            \`;
            \$('modal').classList.remove('hidden');
        }

        async function generateKey(svcId) {
            try {
                await api('/api/user/keys', { method: 'POST', body: JSON.stringify({ serviceId: svcId, name: \$('new-key-name').value }) });
                closeModal();
                showToast('API Key generated successfully');
                switchTab('credentials');
            } catch (e) { alert(e.message); }
        }

        async function loadKeys() {
            try {
                const res = await api('/api/user/keys');
                \$('keys-body').innerHTML = res.items.map(k => \`
                    <tr>
                        <td class="px-6 py-4">\${esc(k.name)}</td>
                        <td class="px-6 py-4 text-gray-400 text-xs">\${esc(k.serviceId)}</td>
                        <td class="px-6 py-4 font-mono text-primary-400 text-xs">\${esc(k.key)}</td>
                    </tr>
                \`).join('') || '<tr><td colspan="3" class="px-6 py-8 text-center text-gray-500">No keys generated yet.</td></tr>';
            } catch (e) { console.error(e); }
        }

        async function loadLogs() {
            try {
                const res = await api('/api/user/logs');
                \$('logsTable').innerHTML = res.items.map(l => \`
                    <tr class="hover:bg-dark-800/50 transition-colors">
                        <td class="px-6 py-4 text-xs text-gray-400 font-mono">\${new Date(l.timestamp).toLocaleString()}</td>
                        <td class="px-6 py-4">
                            <span class="px-2 py-1 rounded text-[10px] font-bold \${l.method==='GET'?'bg-blue-500/10 text-blue-400':'bg-green-500/10 text-green-400'}">\${l.method}</span>
                        </td>
                        <td class="px-6 py-4 text-xs font-mono text-gray-300">\${esc(l.endpoint)}</td>
                        <td class="px-6 py-4">
                            <span class="px-2 py-1 rounded-full text-[10px] \${l.status<400?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}">\${l.status}</span>
                        </td>
                        <td class="px-6 py-4 text-xs text-gray-400">\${l.latency}</td>
                    </tr>
                \`).join('') || '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No logs found.</td></tr>';
            } catch (e) { console.error(e); }
        }

        async function loadAdminData(tab) {
            try {
                console.log('Loading admin data for:', tab);
                if (tab === 'admin-users') {
                    const res = await api('/api/admin/users');
                    console.log('Admin users response:', res);
                    \$('admin-users-body').innerHTML = res.items.map(u => \`
                        <tr class="border-b border-gray-800 hover:bg-dark-800/30 transition-colors">
                            <td class="px-6 py-4 font-medium">\${esc(u.username)}</td>
                            <td class="px-6 py-4"><span class="tag tag-\${u.status.toLowerCase()}">\${u.status}</span></td>
                            <td class="px-6 py-4">
                                <div class="flex gap-2">
                                    \${u.status === 'PENDING' ? \`
                                        <button onclick="adminApprove('\${u.username}')" class="px-3 py-1 bg-green-600 hover:bg-green-500 text-[10px] font-bold rounded transition-colors">APPROVE</button>
                                        <button onclick="adminReject('\${u.username}')" class="px-3 py-1 bg-red-600 hover:bg-red-500 text-[10px] font-bold rounded transition-colors">REJECT</button>
                                    \` : \`
                                        <button onclick="adminDeleteUser('\${u.username}')" class="p-2 text-gray-400 hover:text-red-400 transition-colors" title="Delete User">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    \`}
                                </div>
                            </td>
                        </tr>
                    \`).join('') || '<tr><td colspan="3" class="px-6 py-8 text-center text-gray-500">No users found.</td></tr>';
                    lucide.createIcons();
                } else if (tab === 'admin-svcs') {
                   const res = await api('/api/admin/services');
                   console.log('Admin services response:', res);
                   \$('admin-svc-list').innerHTML = res.items.map(s => \`
                        <div class="glass-effect p-5 rounded-xl border border-gray-800 flex justify-between items-center hover:border-gray-700 transition-all">
                            <div>
                                <h4 class="font-bold text-lg">\${esc(s.name)}</h4>
                                <p class="text-xs text-gray-500 font-mono mt-1">\${s.id} &rarr; \${esc(s.targetUrl)}</p>
                            </div>
                            <div class="flex items-center gap-6">
                                <div class="text-right">
                                    <p class="text-xs font-bold text-primary-400 uppercase tracking-wider">\${s.usages.reduce((a,b)=>a+b.count,0)} hits</p>
                                    <p class="text-[10px] text-gray-500 mt-1">\${s.limit > 0 ? 'Limit: '+s.limit : 'No Limit'}</p>
                                </div>
                                <button onclick="adminDeleteSvc('\${s.id}')" class="p-2 text-gray-400 hover:text-red-400 transition-colors">
                                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                                </button>
                            </div>
                        </div>
                   \`).join('') || '<div class="glass-effect p-8 rounded-xl border border-gray-800 text-center text-gray-500">No services configured.</div>';
                   lucide.createIcons();
                } else if (tab === 'admin-logs') {
                    const res = await api('/api/admin/logs');
                    console.log('Admin logs response:', res);
                    \$('admin-logs-body').innerHTML = res.items.map(l => \`
                        <tr class="text-xs border-b border-gray-800 hover:bg-dark-800/30 transition-colors">
                            <td class="px-6 py-3 font-mono text-gray-500">\${new Date(l.timestamp).toLocaleString()}</td>
                            <td class="px-6 py-3 text-gray-300 font-medium">\${esc(l.username || '-')}</td>
                            <td class="px-6 py-3 text-gray-400 truncate max-w-[300px]">\${esc(l.message || l.endpoint)}\${l.routeId ? ' <span class="text-[10px] text-gray-600">('+l.routeId+')</span>' : ''}</td>
                            <td class="px-6 py-3"><span class="\${l.status<400?'text-green-400':'text-red-400'} font-bold">\${l.status}</span></td>
                        </tr>
                    \`).join('') || '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No system logs available.</td></tr>';
                }
            } catch (e) {
                console.error('Error loading admin data:', e);
                showToast('Failed to load admin data: ' + e.message);
            }
        }


        async function adminApprove(u) { try { await api('/api/admin/users/'+u, { method:'PATCH', body: JSON.stringify({status:'APPROVED'}) }); showToast('User approved'); loadAdminData('admin-users'); } catch(e) { showToast(e.message); } }
        async function adminReject(u) { try { await api('/api/admin/users/'+u, { method:'PATCH', body: JSON.stringify({status:'REJECTED'}) }); showToast('User rejected'); loadAdminData('admin-users'); } catch(e) { showToast(e.message); } }
        async function adminDeleteUser(u) { if(confirm('Delete user '+u+'?')) { try { await api('/api/admin/users/'+u, { method:'DELETE'}); showToast('User deleted'); loadAdminData('admin-users'); } catch(e) { showToast(e.message); } } }
        async function adminDeleteSvc(id) { if(confirm('Delete service '+id+'?')) { await api('/api/admin/services/'+id, { method:'DELETE'}); loadAdminData('admin-svcs'); } }
        async function clearAllLogs() { if(confirm('Clear all logs?')) { await api('/api/admin/logs', { method:'DELETE'}); loadAdminData('admin-logs'); } }

        function openCreateSvcModal() {
            \$('modal-title').innerText = 'Create New API Service';
            \$('modal-body').innerHTML = \`
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Service Name</label>
                        <input id="s-name" placeholder="e.g. Weather API" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Target URL</label>
                        <input id="s-target" placeholder="https://api.example.com" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Rate Limit (req/user)</label>
                        <input id="s-limit" type="number" value="1000" class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg outline-none">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Documentation</label>
                        <textarea id="s-docs" placeholder="Usage instructions..." class="w-full px-4 py-2 bg-dark-800 border border-gray-700 rounded-lg outline-none h-32"></textarea>
                    </div>
                </div>
            \`;
            \$('modal-footer').innerHTML = \`
                <button onclick="submitSvc()" class="w-full py-3 bg-primary-600 rounded-lg font-bold">Publish API Service</button>
            \`;
            \$('modal').classList.remove('hidden');
        }

        async function submitSvc() {
            try {
                await api('/api/admin/services', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: \$('s-name').value,
                        targetUrl: \$('s-target').value,
                        limit: \$('s-limit').value,
                        documentation: \$('s-docs').value
                    })
                });
                closeModal();
                showToast('Service created successfully');
                loadAdminData('admin-svcs');
            } catch (e) { alert(e.message); }
        }

        function closeModal() { \$('modal').classList.add('hidden'); }

        function initOverviewChart() {
            const ctx = \$('usageChart').getContext('2d');
            if (state.charts.usage) state.charts.usage.destroy();
            state.charts.usage = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        data: [12, 19, 3, 5, 2, 3, 10],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4, fill: true
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } } } }
            });
        }

        function initUsageCharts() {
            // Placeholder charts for now
        }

        function toggleSidebar() {
            state.sidebarCollapsed = !state.sidebarCollapsed;
            const s = \$('sidebar');
            const icon = \$('toggleIcon');
            if (state.sidebarCollapsed) {
                s.classList.add('sidebar-collapsed');
                s.style.width = '80px';
                icon.style.transform = 'rotate(180deg)';
            } else {
                s.classList.remove('sidebar-collapsed');
                s.style.width = '256px';
                icon.style.transform = 'rotate(0deg)';
            }
        }

        function toggleMobileSidebar() {
            const s = \$('sidebar');
            const o = \$('mobileOverlay');
            if (s.classList.contains('-translate-x-full')) {
                s.classList.remove('-translate-x-full');
                o.classList.remove('hidden');
            } else {
                s.classList.add('-translate-x-full');
                o.classList.add('hidden');
            }
        }

        function refreshCurrentView() {
            if (state.currentTab === 'overview') initDashboard();
            else if (state.currentTab.startsWith('admin')) loadAdminData(state.currentTab);
            else switchTab(state.currentTab);
            showToast('Data refreshed');
        }

        function toggleTheme() { document.documentElement.classList.toggle('dark'); }

        if (state.token || state.adminToken) {
            const savedTab = localStorage.getItem('activeTab') || 'overview';
            \$('loginOverlay').classList.add('hidden');
            \$('mainApp').classList.remove('hidden');

            if (state.adminToken) {
                $('admin-nav').classList.remove('hidden');
                $('user-role-display').innerText = 'Admin Panel';
                switchTab(savedTab.startsWith('admin-') ? savedTab : 'admin-users');
            } else {
                switchTab(savedTab.startsWith('admin-') ? 'overview' : savedTab);
            }
        }
    </script>
</body>
</html>
`;

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
        console.log('Registering user:', username);
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
          console.log('Admin listing users, count:', items.length);
          return withCors(json({ ok: true, items }));
        }

        if (request.method === "GET" && url.pathname === "/api/admin/logs") {
          const items = await listLogs(env, url.searchParams.get("limit") || 100);
          return withCors(json({ ok: true, items }));
        }

        if (request.method === "DELETE" && url.pathname === "/api/admin/logs") {
          await deleteLogs(env);
          return withCors(json({ ok: true }));
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

        if (request.method === "GET" && url.pathname === "/api/user/logs") {
          const allLogs = await listLogs(env, 200);
          const items = allLogs.filter(l => l.username === authedUsername);
          return withCors(json({ ok: true, items }));
        }

        if (request.method === "GET" && url.pathname === "/api/user/stats") {
          const allLogs = await listLogs(env, 500);
          const userLogs = allLogs.filter(l => l.username === authedUsername);

          const today = new Date().toISOString().split('T')[0];
          const todayLogs = userLogs.filter(l => l.timestamp && l.timestamp.startsWith(today));

          const successCount = userLogs.filter(l => l.status >= 200 && l.status < 400).length;
          const successRate = userLogs.length > 0 ? ((successCount / userLogs.length) * 100).toFixed(1) + '%' : '0%';

          const latencies = userLogs.map(l => parseInt(l.latency) || 0).filter(l => l > 0);
          const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) + 'ms' : '0ms';

          return withCors(json({
            ok: true,
            stats: {
              todayRequests: todayLogs.length,
              successRate,
              avgLatency
            }
          }));
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

        const start = Date.now();
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

          const latency = `${Date.now() - start}ms`;
          await addLog(env, {
            method: request.method,
            endpoint: targetUrl.pathname + targetUrl.search,
            status: upstream.status,
            latency,
            username: keyData.username,
            routeId: id,
            message: `Proxy request to ${route.name}`
          });

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