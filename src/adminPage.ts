export function renderAdminPage(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Porsche 911 Finder MCP Admin</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #ffffff;
      --panel: #ffffff;
      --surface: #f4f4f4;
      --surface-soft: #fafafa;
      --text: #010205;
      --muted: rgba(1, 2, 5, 0.62);
      --line: rgba(1, 2, 5, 0.14);
      --line-strong: rgba(1, 2, 5, 0.24);
      --accent: #010205;
      --accent-dark: #000000;
      --focus: #1769aa;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      letter-spacing: 0;
    }

    header {
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
    }

    h1 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
    }

    h2 {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
    }

    main {
      padding: 18px 24px 32px;
      max-width: 1440px;
      margin: 0 auto;
    }

    section {
      min-width: 0;
    }

    aside {
      padding: 16px;
      height: calc(100vh - 88px);
      overflow: auto;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 4px;
    }

    .admin-nav {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      margin-bottom: 18px;
      border-bottom: 1px solid var(--line);
    }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
    }

    .tabs button {
      position: relative;
      min-height: 44px;
      border: 0;
      border-radius: 0;
      padding: 0;
      background: transparent;
      color: var(--muted);
      font-size: 14px;
      font-weight: 600;
    }

    .tabs button.active {
      color: var(--text);
    }

    .tabs button.active::after {
      content: "";
      position: absolute;
      right: 0;
      bottom: -1px;
      left: 0;
      height: 2px;
      background: var(--accent);
    }

    .tab-view {
      display: none;
    }

    .tab-view.active {
      display: block;
    }

    .searches-layout {
      display: grid;
      grid-template-columns: 300px minmax(360px, 520px) minmax(360px, 1fr);
      gap: 16px;
      background: transparent;
      border: 0;
    }

    .overview-grid {
      display: grid;
      grid-template-columns: minmax(360px, 1fr) minmax(360px, 1fr);
      gap: 18px;
      align-items: start;
    }

    .stat-groups {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px 24px;
    }

    .stat-group {
      min-width: 0;
    }

    .stat-group h3 {
      margin: 0 0 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
    }

    .stat-row span {
      color: var(--muted);
    }

    .stat-row strong {
      color: var(--text);
      font-weight: 600;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .panel {
      padding: 18px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 4px;
      min-width: 0;
    }

    .stack {
      display: grid;
      gap: 16px;
      align-content: start;
      min-width: 0;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 650;
      color: var(--muted);
      margin: 12px 0 5px;
    }

    input[type="text"], input[type="number"], textarea {
      width: 100%;
      min-height: 36px;
      border: 1px solid var(--line);
      border-radius: 3px;
      padding: 7px 9px;
      font: inherit;
      font-size: 14px;
      background: #fff;
      color: var(--text);
    }

    textarea {
      resize: vertical;
      min-height: 76px;
    }

    input:focus, textarea:focus, button:focus {
      outline: 2px solid var(--focus);
      outline-offset: 1px;
    }

    button {
      min-height: 34px;
      border: 1px solid var(--line);
      border-radius: 3px;
      padding: 7px 10px;
      background: var(--panel);
      color: var(--text);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
    }

    button.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }

    button.primary:hover { background: var(--accent-dark); }
    button:hover { border-color: var(--line-strong); }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-top: 14px;
    }

    .auth {
      display: flex;
      gap: 8px;
      align-items: center;
      min-width: 460px;
    }

    .auth input {
      height: 32px;
      min-height: 32px;
      font-size: 13px;
      background: #222;
      color: #fff;
      border-color: #444;
    }

    .auth button {
      min-width: 96px;
    }

    .saved-search {
      width: 100%;
      text-align: left;
      margin-bottom: 8px;
      border-color: var(--line);
      background: var(--surface-soft);
    }

    .saved-search.active {
      border-color: var(--accent);
      box-shadow: inset 3px 0 0 var(--accent);
    }

    .saved-search strong {
      display: block;
      font-size: 13px;
    }

    .saved-search span {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .checks {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 6px 10px;
      max-height: 220px;
      overflow: auto;
      padding: 8px;
      border: 1px solid var(--line);
      border-radius: 3px;
      background: var(--surface-soft);
    }

    .checks label {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0;
      font-size: 12px;
      font-weight: 500;
      color: var(--text);
    }

    .row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    .slug-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: start;
    }

    .inline {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
      font-size: 13px;
    }

    .url {
      padding: 9px;
      border: 1px solid var(--line);
      border-radius: 3px;
      background: var(--surface-soft);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    pre {
      margin: 0;
      padding: 12px;
      min-height: 460px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 3px;
      background: #101010;
      color: #f4f4f4;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .muted {
      color: var(--muted);
      font-size: 12px;
    }

    .hint {
      margin-top: 5px;
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .car-list {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }

    .car-card {
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 10px;
      background: var(--surface-soft);
    }

    .car-card strong {
      display: block;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .car-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 10px;
      color: var(--muted);
      font-size: 12px;
    }

    .car-card .toolbar {
      margin-top: 8px;
    }

    @media (max-width: 980px) {
      main, .searches-layout, .overview-grid, .stat-groups {
        grid-template-columns: 1fr;
      }

      aside {
        height: auto;
      }

      .auth {
        min-width: 0;
        width: 100%;
      }

      header {
        height: 52px;
        padding: 12px;
      }

      .admin-nav {
        align-items: stretch;
        flex-direction: column;
      }

      .tabs {
        gap: 18px;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Porsche 911 Finder MCP</h1>
    <button id="nav-new-search" class="primary">New Search</button>
  </header>
  <main>
    <nav class="admin-nav" aria-label="Admin sections">
      <div class="tabs">
        <button class="tab-button" data-tab="overview">Overview</button>
        <button class="tab-button" data-tab="searches">Searches</button>
        <button class="tab-button" data-tab="favorites">Favorite Cars</button>
      </div>
    </nav>

    <section id="tab-overview" class="tab-view">
      <div class="overview-grid">
        <div class="stack">
          <div class="panel">
            <h2>Overview</h2>
            <label for="token">Bearer token</label>
            <div class="slug-row">
              <input id="token" type="text" autocomplete="off" placeholder="Bearer token">
              <button id="save-token">Save Token</button>
            </div>
            <div class="toolbar">
              <button id="overview-reload">Reload</button>
            </div>
            <p id="status" class="muted"></p>
          </div>

          <div class="panel">
            <h2>Stats</h2>
            <div id="overview-stats" class="stat-groups"></div>
          </div>

          <div class="panel">
            <h2>Recent Runs</h2>
            <div id="overview-runs" class="car-list"></div>
          </div>
        </div>

        <div class="panel">
          <h2>Favorites Preview</h2>
          <div id="overview-favorites" class="car-list">No favorites loaded.</div>
        </div>
      </div>
    </section>

    <section id="tab-searches" class="tab-view">
      <div class="searches-layout">
        <aside>
          <div class="toolbar" style="margin-top:0;margin-bottom:10px">
            <button id="searches-new-search" class="primary">New Search</button>
          </div>
          <div id="search-list" class="muted">No searches loaded.</div>
        </aside>

        <div class="panel">
          <h2>Saved Search</h2>
          <input id="search-id" type="hidden">
          <label for="name">Name</label>
          <input id="name" type="text" placeholder="Carrera S coupes under sanity">

          <label for="slug">MCP tool slug</label>
          <div class="slug-row">
            <input id="slug" type="text" autocomplete="off" spellcheck="false" placeholder="carrera_s_coupes">
            <button id="slug-from-name" type="button">Use name</button>
          </div>
          <div id="tool-name-preview" class="hint">MCP tool: porsche_911_...</div>

          <label for="description">Description</label>
          <textarea id="description" placeholder="What this tool should search for."></textarea>

          <div class="row">
            <div>
              <label for="defaultLimit">Default limit</label>
              <input id="defaultLimit" type="number" min="1" max="50" value="10">
            </div>
            <div>
              <label for="maxPages">Max pages</label>
              <input id="maxPages" type="number" min="1" max="5" value="1">
            </div>
            <div>
              <label for="maximumMileage">Max mileage</label>
              <input id="maximumMileage" type="number" min="0" max="500000" step="1000" value="30000">
            </div>
            <div>
              <label>&nbsp;</label>
              <label class="inline"><input id="enabled" type="checkbox" checked> Enabled</label>
            </div>
          </div>

          <label>Categories</label>
          <div id="categories" class="checks"></div>

          <label>Model generations</label>
          <div id="modelGenerations" class="checks"></div>

          <label>Equipment</label>
          <div id="equipment" class="checks"></div>

          <label>Generated Porsche Finder URL</label>
          <div id="generated-url" class="url"></div>

          <div class="toolbar">
            <button id="save-search" class="primary">Save</button>
            <button id="run-search">Run + Cache</button>
            <button id="preview-search">Preview</button>
            <button id="delete-search">Delete</button>
          </div>
        </div>

        <div class="panel">
          <h2>Search Output</h2>
          <pre id="preview">Preview a search to see the text Open WebUI will receive.</pre>
          <div id="run-cars" class="car-list"></div>
        </div>
      </div>
    </section>

    <section id="tab-favorites" class="tab-view">
      <div class="panel">
        <h2>Favorite Cars</h2>
        <div id="favorites-list" class="car-list">No favorites loaded.</div>
      </div>
    </section>
  </main>

  <script>
    const fixedParams = {
      model: "911",
      condition: "porsche_approved",
      position: "94611,37.82475,-122.23235,-1",
      order: "price_asc"
    };

    const state = {
      options: null,
      searches: [],
      favorites: [],
      overview: null,
      lastListings: [],
      activeId: null,
      token: new URL(location.href).searchParams.get("token") || localStorage.getItem("porscheFinderToken") || ""
    };

    const els = {
      tabButtons: [...document.querySelectorAll(".tab-button")],
      tabViews: [...document.querySelectorAll(".tab-view")],
      token: document.querySelector("#token"),
      saveToken: document.querySelector("#save-token"),
      overviewReload: document.querySelector("#overview-reload"),
      navNewSearch: document.querySelector("#nav-new-search"),
      searchesNewSearch: document.querySelector("#searches-new-search"),
      overviewStats: document.querySelector("#overview-stats"),
      overviewRuns: document.querySelector("#overview-runs"),
      overviewFavorites: document.querySelector("#overview-favorites"),
      list: document.querySelector("#search-list"),
      status: document.querySelector("#status"),
      preview: document.querySelector("#preview"),
      runCars: document.querySelector("#run-cars"),
      favoritesList: document.querySelector("#favorites-list"),
      generatedUrl: document.querySelector("#generated-url"),
      id: document.querySelector("#search-id"),
      name: document.querySelector("#name"),
      slug: document.querySelector("#slug"),
      slugFromName: document.querySelector("#slug-from-name"),
      toolNamePreview: document.querySelector("#tool-name-preview"),
      description: document.querySelector("#description"),
      defaultLimit: document.querySelector("#defaultLimit"),
      maxPages: document.querySelector("#maxPages"),
      maximumMileage: document.querySelector("#maximumMileage"),
      enabled: document.querySelector("#enabled")
    };

    els.token.value = state.token;
    if (state.token) {
      localStorage.setItem("porscheFinderToken", state.token);
    }

    function activeTab() {
      const tab = location.hash.replace("#", "");
      return ["overview", "searches", "favorites"].includes(tab) ? tab : "overview";
    }

    function showTab(tab) {
      const nextTab = ["overview", "searches", "favorites"].includes(tab) ? tab : "overview";
      els.tabButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === nextTab);
      });
      els.tabViews.forEach((view) => {
        view.classList.toggle("active", view.id === "tab-" + nextTab);
      });
      if (location.hash !== "#" + nextTab) {
        history.replaceState(null, "", "#" + nextTab);
      }
    }

    function goToTab(tab) {
      location.hash = tab;
      showTab(tab);
    }

    function headers() {
      return {
        "content-type": "application/json",
        "authorization": "Bearer " + state.token
      };
    }

    async function api(path, options = {}) {
      const response = await fetch(path, {
        ...options,
        headers: {
          ...headers(),
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || response.statusText);
      }

      if (response.status === 204) {
        return null;
      }

      return response.json();
    }

    function readForm() {
      return {
        name: els.name.value.trim(),
        slug: els.slug.value.trim() || undefined,
        description: els.description.value.trim(),
        enabled: els.enabled.checked,
        categories: checkedValues("categories"),
        modelGenerations: checkedValues("modelGenerations"),
        equipment: checkedValues("equipment"),
        maximumMileage: Number(els.maximumMileage.value || 30000),
        defaultLimit: Number(els.defaultLimit.value || 10),
        maxPages: Number(els.maxPages.value || 1)
      };
    }

    function slugify(value) {
      return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 48);
    }

    function checkedValues(id) {
      return [...document.querySelectorAll("#" + id + " input:checked")].map((input) => input.value);
    }

    function setForm(search) {
      els.id.value = search?.id || "";
      els.name.value = search?.name || "";
      els.slug.value = search?.slug || "";
      els.description.value = search?.description || "";
      els.enabled.checked = search?.enabled ?? true;
      els.defaultLimit.value = search?.defaultLimit || 10;
      els.maxPages.value = search?.maxPages || 1;
      els.maximumMileage.value = search?.filters?.maximumMileage || 30000;

      setChecked("categories", search?.filters?.categories || []);
      setChecked("modelGenerations", search?.filters?.modelGenerations || []);
      setChecked("equipment", search?.filters?.equipment || []);
      state.activeId = search?.id || null;
      updateGeneratedUrl();
      renderSearchList();
    }

    function setChecked(id, values) {
      const selected = new Set(values);
      document.querySelectorAll("#" + id + " input").forEach((input) => {
        input.checked = selected.has(input.value);
      });
    }

    function renderChecks(id, options) {
      const root = document.querySelector("#" + id);
      root.innerHTML = options.map((option) => {
        return '<label><input type="checkbox" value="' + option.value + '"> ' + option.label + '</label>';
      }).join("");
      root.onchange = updateGeneratedUrl;
    }

    function renderSearchList() {
      if (!state.searches.length) {
        els.list.textContent = "No saved searches yet.";
        return;
      }

      els.list.innerHTML = state.searches.map((search) => {
        const active = search.id === state.activeId ? " active" : "";
        const enabled = search.enabled ? "enabled" : "disabled";
        return '<button class="saved-search' + active + '" data-id="' + search.id + '">' +
          '<strong>' + escapeHtml(search.slug) + '</strong>' +
          '<span>' + escapeHtml(search.name) + " · " + enabled + '</span>' +
          '<span>' + escapeHtml(search.toolName) + '</span>' +
          '</button>';
      }).join("");

      els.list.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
          const search = state.searches.find((item) => item.id === Number(button.dataset.id));
          setForm(search);
        });
      });
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[char];
      });
    }

    function updateGeneratedUrl() {
      const form = readForm();
      const parts = [];
      Object.entries(fixedParams).forEach(([key, value]) => {
        parts.push(formatQueryParam(key, value, key === "position"));
      });
      form.categories.forEach((value) => parts.push(formatQueryParam("category", value)));
      form.modelGenerations.forEach((value) => parts.push(formatQueryParam("model-generation", value)));
      form.equipment.forEach((value) => parts.push(formatQueryParam("equipment", value)));
      parts.push(formatQueryParam("maximum-mileage", String(form.maximumMileage)));
      els.generatedUrl.textContent = "https://finder.porsche.com/us/en-US/search/911?" + parts.join("&");
      updateToolNamePreview();
    }

    function updateToolNamePreview() {
      const slug = slugify(els.slug.value || els.name.value);
      els.toolNamePreview.textContent = slug.length >= 2
        ? "MCP tool: porsche_911_" + slug
        : "MCP tool: enter a slug, or use the name";
    }

    function formatQueryParam(key, value, rawValue = false) {
      return encodeURIComponent(key) + "=" + (rawValue ? value : encodeURIComponent(value));
    }

    async function loadAll() {
      if (!state.token) {
        els.status.textContent = "Add the bearer token first.";
        return;
      }

      els.status.textContent = "Loading.";
      const [options, searches, overview, favorites] = await Promise.all([
        api("/api/options"),
        api("/api/searches"),
        api("/api/overview"),
        api("/api/cars/favorites")
      ]);
      state.options = options;
      state.searches = searches.searches;
      state.overview = overview;
      state.favorites = favorites.favorites || [];
      renderChecks("categories", options.categories);
      renderChecks("modelGenerations", options.modelGenerations);
      renderChecks("equipment", options.equipment);
      renderSearchList();
      renderOverview();
      renderCars(state.favorites, els.favoritesList, { detailed: true, target: "favorites" });
      setForm(state.searches[0] || null);
      els.status.textContent = "Ready.";
    }

    async function saveSearch() {
      const id = els.id.value;
      const body = JSON.stringify(readForm());
      const saved = id
        ? await api("/api/searches/" + id, { method: "PUT", body })
        : await api("/api/searches", { method: "POST", body });

      await loadAll();
      const current = state.searches.find((search) => search.id === saved.search.id);
      setForm(current);
      els.status.textContent = "Saved.";
    }

    async function runSavedSearch() {
      const id = els.id.value;
      if (!id) {
        els.status.textContent = "Save the search before running it into the cache.";
        return;
      }

      els.preview.textContent = "Running saved search.";
      els.runCars.innerHTML = "";
      const result = await api("/api/searches/" + id + "/run", {
        method: "POST",
        body: JSON.stringify({ refresh: false })
      });
      state.lastListings = result.listings || [];
      els.preview.textContent = result.text;
      renderCars(state.lastListings, els.runCars, { target: "search" });
      await reloadInventoryViews();
      els.status.textContent = "Run complete.";
    }

    async function previewSearch() {
      els.preview.textContent = "Fetching Porsche Finder.";
      const body = JSON.stringify({ ...readForm(), refresh: true });
      const result = await api("/api/searches/preview", { method: "POST", body });
      els.preview.textContent = result.text;
      state.lastListings = [];
      els.runCars.innerHTML = '<p class="muted">Preview does not cache cars. Use Run + Cache on a saved search to favorite cars.</p>';
      els.status.textContent = "Preview complete.";
    }

    async function loadFavorites() {
      const result = await api("/api/cars/favorites");
      state.favorites = result.favorites || [];
      renderCars(state.favorites, els.favoritesList, { detailed: true, target: "favorites" });
    }

    async function loadOverview() {
      state.overview = await api("/api/overview");
      renderOverview();
    }

    async function reloadInventoryViews() {
      const [overview] = await Promise.all([
        loadOverview(),
        loadFavorites()
      ]);
      return overview;
    }

    function renderOverview() {
      if (!state.overview) {
        els.overviewStats.innerHTML = '<p class="muted">No overview loaded.</p>';
        els.overviewRuns.innerHTML = '<p class="muted">No runs loaded.</p>';
        els.overviewFavorites.innerHTML = '<p class="muted">No favorites loaded.</p>';
        return;
      }

      const stats = state.overview.stats;
      const groups = [
        {
          title: "Searches",
          metrics: [
            ["Saved searches", stats.savedSearches],
            ["Enabled searches", stats.enabledSearches],
            ["Last run", stats.lastRunAt ? formatDate(stats.lastRunAt) : "Never"]
          ]
        },
        {
          title: "Inventory",
          metrics: [
            ["Cached cars", stats.cachedCars],
            ["Favorites", stats.favoriteCars],
            ["Unavailable cars", stats.unavailableCars],
            ["Unavailable favorites", stats.unavailableFavorites]
          ]
        },
        {
          title: "Activity",
          metrics: [
            ["Total runs", stats.totalRuns],
            ["Failed runs", stats.failedRuns]
          ]
        },
        {
          title: "Fetch + Cache",
          metrics: [
            ["Cache hits", stats.cacheHits],
            ["Cache misses", stats.cacheMisses],
            ["HTTP pulls", stats.httpPulls],
            ["Playwright pulls", stats.playwrightPulls]
          ]
        }
      ];
      els.overviewStats.innerHTML = groups.map((group) => {
        return '<div class="stat-group">' +
          '<h3>' + escapeHtml(group.title) + '</h3>' +
          group.metrics.map(([label, value]) => {
            return '<div class="stat-row"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
          }).join("") +
        '</div>';
      }).join("");

      renderRuns(state.overview.recentRuns || []);
      renderCars(state.overview.favoritesPreview || [], els.overviewFavorites, { compact: true, target: "overview" });
    }

    function renderRuns(runs) {
      if (!runs.length) {
        els.overviewRuns.innerHTML = '<p class="muted">No runs yet.</p>';
        return;
      }

      els.overviewRuns.innerHTML = runs.map((run) => {
        const status = run.success ? "success" : "failed";
        return '<div class="car-card">' +
          '<strong>' + escapeHtml(run.searchName) + '</strong>' +
          '<div class="car-meta">' +
            '<span>' + escapeHtml(run.runType) + '</span>' +
            '<span>' + status + '</span>' +
            '<span>' + escapeHtml(formatDate(run.finishedAt)) + '</span>' +
            '<span>' + escapeHtml(run.pagesFetched) + ' page(s)</span>' +
            '<span>' + escapeHtml(run.listingsCount) + ' listing(s)</span>' +
            '<span>cache ' + escapeHtml(run.cacheHits) + '/' + escapeHtml(run.cacheMisses) + '</span>' +
            '<span>pulls ' + escapeHtml(run.httpPulls) + '/' + escapeHtml(run.playwrightPulls) + '</span>' +
          '</div>' +
          (run.error ? '<div class="hint">' + escapeHtml(run.error) + '</div>' : '') +
        '</div>';
      }).join("");
    }

    function renderCars(cars, root, options = {}) {
      if (!cars.length) {
        root.innerHTML = '<p class="muted">No cars.</p>';
        return;
      }

      root.innerHTML = cars.map((car) => {
        const featureSummary = car.details?.featureMatches?.length
          ? car.details.featureMatches.map((match) => match.label).join(", ")
          : "None detected";
        const favoriteLabel = car.isFavorite ? "Unfavorite" : "Favorite";
        const favoriteAction = car.isFavorite ? "unfavorite" : "favorite";
        const details = options.compact ? "" :
          '<div class="hint">Features: ' + escapeHtml(featureSummary) + '</div>' +
          (options.detailed && car.details?.featureMatches?.length
            ? '<div class="hint">Matched: ' + escapeHtml(car.details.featureMatches.map((match) => match.label + ": " + match.matchedLines.join("; ")).join(" | ")) + '</div>'
            : '') +
          (options.detailed && car.details?.includedOptions?.length
            ? '<div class="hint">Included Options: ' + escapeHtml(car.details.includedOptions.slice(0, 10).join("; ")) + '</div>'
            : '');

        return '<div class="car-card">' +
          '<strong>' + escapeHtml(car.title) + '</strong>' +
          '<div class="car-meta">' +
            '<span>ID ' + escapeHtml(car.id || "preview") + '</span>' +
            '<span>' + escapeHtml(car.status || "active") + '</span>' +
            '<span>Favorite: ' + (car.isFavorite ? "yes" : "no") + '</span>' +
            (car.vin ? '<span>VIN ' + escapeHtml(car.vin) + '</span>' : '') +
            (car.stockNumber ? '<span>Stock ' + escapeHtml(car.stockNumber) + '</span>' : '') +
            '<span>' + escapeHtml(car.price || "Unknown price") + '</span>' +
            '<span>' + escapeHtml(car.location || "Unknown location") + '</span>' +
          '</div>' +
          details +
          '<div class="hint"><a href="' + escapeHtml(car.link || "#") + '" target="_blank" rel="noreferrer">Porsche Finder detail page</a></div>' +
          '<div class="toolbar">' +
            '<button data-car-id="' + escapeHtml(car.id) + '" data-favorite-action="' + favoriteAction + '">' + favoriteLabel + '</button>' +
          '</div>' +
        '</div>';
      }).join("");

      root.querySelectorAll("[data-favorite-action]").forEach((button) => {
        button.addEventListener("click", () => {
          toggleFavorite(Number(button.dataset.carId), button.dataset.favoriteAction === "favorite").catch(showError);
        });
      });
    }

    async function toggleFavorite(carId, favorite) {
      if (!carId) {
        return;
      }

      const path = favorite ? "/api/cars/favorite" : "/api/cars/unfavorite";
      const result = await api(path, {
        method: "POST",
        body: JSON.stringify({ carId })
      });
      state.lastListings = state.lastListings.map((car) => car.id === result.car.id ? result.car : car);
      if (state.lastListings.length) {
        renderCars(state.lastListings, els.runCars, { target: "search" });
      }
      await reloadInventoryViews();
      els.status.textContent = favorite ? "Favorited." : "Unfavorited.";
    }

    async function deleteSearch() {
      const id = els.id.value;
      if (!id) {
        setForm(null);
        return;
      }

      await api("/api/searches/" + id, { method: "DELETE" });
      await loadAll();
      els.status.textContent = "Deleted.";
    }

    els.saveToken.addEventListener("click", async () => {
      state.token = els.token.value.trim();
      localStorage.setItem("porscheFinderToken", state.token);
      await loadAll().catch(showError);
    });
    els.overviewReload.addEventListener("click", () => loadAll().catch(showError));
    els.navNewSearch.addEventListener("click", () => {
      setForm(null);
      goToTab("searches");
    });
    els.searchesNewSearch.addEventListener("click", () => setForm(null));
    document.querySelector("#save-search").addEventListener("click", () => saveSearch().catch(showError));
    document.querySelector("#run-search").addEventListener("click", () => runSavedSearch().catch(showError));
    document.querySelector("#preview-search").addEventListener("click", () => previewSearch().catch(showError));
    document.querySelector("#delete-search").addEventListener("click", () => deleteSearch().catch(showError));
    els.slugFromName.addEventListener("click", () => {
      els.slug.value = slugify(els.name.value);
      updateGeneratedUrl();
      els.slug.focus();
    });
    els.slug.addEventListener("blur", () => {
      els.slug.value = slugify(els.slug.value);
      updateGeneratedUrl();
    });
    ["name", "slug", "description", "defaultLimit", "maxPages", "maximumMileage"].forEach((id) => {
      document.querySelector("#" + id).addEventListener("input", updateGeneratedUrl);
    });
    els.tabButtons.forEach((button) => {
      button.addEventListener("click", () => goToTab(button.dataset.tab));
    });
    window.addEventListener("hashchange", () => showTab(activeTab()));

    function showError(error) {
      els.status.textContent = error.message;
      els.preview.textContent = error.stack || error.message;
    }

    function formatDate(value) {
      return new Date(value).toLocaleString();
    }

    showTab(activeTab());
    loadAll().catch(showError);
  </script>
</body>
</html>`;
}
