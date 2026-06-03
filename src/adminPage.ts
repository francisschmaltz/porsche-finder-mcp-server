export function renderAdminPage(): string {
  return String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Porsche Finder MCP Admin</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f6f4;
      --panel: #ffffff;
      --text: #151515;
      --muted: #696966;
      --line: #d8d8d2;
      --accent: #111111;
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
      padding: 0 20px;
      border-bottom: 1px solid var(--line);
      background: #111;
      color: #fff;
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
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 16px;
      padding: 16px;
      max-width: 1440px;
      margin: 0 auto;
    }

    section, aside {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
      min-width: 0;
    }

    aside {
      padding: 12px;
      height: calc(100vh - 88px);
      overflow: auto;
    }

    .workspace {
      display: grid;
      grid-template-columns: minmax(360px, 520px) minmax(360px, 1fr);
      gap: 16px;
      background: transparent;
      border: 0;
    }

    .panel {
      padding: 14px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
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
      border-radius: 4px;
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
      border-radius: 4px;
      padding: 7px 10px;
      background: #fff;
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
    button:hover { border-color: #9b9b94; }

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
      border-radius: 4px;
      background: #fbfbfa;
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
      border-radius: 4px;
      background: #fbfbfa;
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
      border-radius: 4px;
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

    @media (max-width: 980px) {
      main, .workspace {
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
        height: auto;
        gap: 12px;
        align-items: stretch;
        flex-direction: column;
        padding: 12px;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>Porsche Finder MCP</h1>
    <div class="auth">
      <input id="token" type="text" autocomplete="off" placeholder="Bearer token">
      <button id="save-token">Save Token</button>
    </div>
  </header>
  <main>
    <aside>
      <div class="toolbar" style="margin-top:0;margin-bottom:10px">
        <button id="new-search" class="primary">New Search</button>
        <button id="reload">Reload</button>
      </div>
      <div id="search-list" class="muted">No searches loaded.</div>
    </aside>

    <section class="workspace">
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
          <button id="preview-search">Preview</button>
          <button id="delete-search">Delete</button>
        </div>
        <p id="status" class="muted"></p>
      </div>

      <div class="panel">
        <h2>Preview Output</h2>
        <pre id="preview">Preview a search to see the text Open WebUI will receive.</pre>
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
      activeId: null,
      token: new URL(location.href).searchParams.get("token") || localStorage.getItem("porscheFinderToken") || ""
    };

    const els = {
      token: document.querySelector("#token"),
      saveToken: document.querySelector("#save-token"),
      list: document.querySelector("#search-list"),
      status: document.querySelector("#status"),
      preview: document.querySelector("#preview"),
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
      root.addEventListener("change", updateGeneratedUrl);
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
      const [options, searches] = await Promise.all([
        api("/api/options"),
        api("/api/searches")
      ]);
      state.options = options;
      state.searches = searches.searches;
      renderChecks("categories", options.categories);
      renderChecks("modelGenerations", options.modelGenerations);
      renderChecks("equipment", options.equipment);
      renderSearchList();
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

    async function previewSearch() {
      els.preview.textContent = "Fetching Porsche Finder.";
      const body = JSON.stringify({ ...readForm(), refresh: true });
      const result = await api("/api/searches/preview", { method: "POST", body });
      els.preview.textContent = result.text;
      els.status.textContent = "Preview complete.";
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
    document.querySelector("#reload").addEventListener("click", () => loadAll().catch(showError));
    document.querySelector("#new-search").addEventListener("click", () => setForm(null));
    document.querySelector("#save-search").addEventListener("click", () => saveSearch().catch(showError));
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

    function showError(error) {
      els.status.textContent = error.message;
      els.preview.textContent = error.stack || error.message;
    }

    loadAll().catch(showError);
  </script>
</body>
</html>`;
}
