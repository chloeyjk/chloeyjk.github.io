// Renders a filterable, searchable entry list from a JSON file.
// Usage: <div data-entries="entries.json"></div> plus <p class="meta" data-updated></p> (optional).
// Add data-topic="x" to show only items whose "topics" array contains x.
// JSON shape: { "updated": "YYYY-MM-DD", "items": [{ id, tag, topics, title, summary, venue, links: [{label, url}], added }] }
(function () {
  "use strict";

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function isSafeUrl(url) {
    return /^(https?:\/\/|\/)/i.test(String(url));
  }

  function monthLabel(date) {
    const [year, month] = String(date || "").slice(0, 7).split("-").map(Number);
    return MONTHS[month - 1] ? `${MONTHS[month - 1]} ${year}` : "Undated";
  }

  function entryHtml(item) {
    const links = (item.links || [])
      .filter((link) => link && isSafeUrl(link.url))
      .map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">[${escapeHtml(link.label)}]</a>`)
      .join("");
    return `
      <article class="entry" id="${escapeHtml(item.id)}">
        <div class="entry-meta">
          ${item.tag ? `<span class="pill">${escapeHtml(item.tag)}</span>` : ""}
          <span>Added ${escapeHtml(item.added)}</span>
        </div>
        <p class="entry-title">${escapeHtml(item.title)}</p>
        ${item.summary ? `<p class="entry-summary">${escapeHtml(item.summary)}</p>` : ""}
        ${item.venue ? `<span class="entry-venue">${escapeHtml(item.venue)}</span> ` : ""}
        <span class="entry-links">${links}</span>
      </article>`;
  }

  function mount(root) {
    const state = { items: [], tag: "All", query: "" };
    root.innerHTML = `
      <div class="controls">
        <div class="tags" role="group" aria-label="Filter by tag"></div>
        <input class="search" type="search" placeholder="Search entries…" aria-label="Search entries">
      </div>
      <div class="entry-list"><p class="status">Loading…</p></div>`;
    const tagsEl = root.querySelector(".tags");
    const listEl = root.querySelector(".entry-list");

    function matches(item) {
      if (state.tag !== "All" && item.tag !== state.tag) return false;
      if (!state.query) return true;
      return [item.title, item.summary, item.venue, item.tag].join(" ").toLowerCase().includes(state.query);
    }

    function renderTags() {
      const tags = ["All", ...new Set(state.items.map((item) => item.tag).filter(Boolean))];
      tagsEl.innerHTML = tags.length > 2
        ? tags.map((tag) => `<button class="tag-btn" type="button" data-tag="${escapeHtml(tag)}" aria-pressed="${tag === state.tag}">${escapeHtml(tag)}</button>`).join("")
        : "";
    }

    function renderList() {
      const visible = state.items.filter(matches);
      if (visible.length === 0) {
        listEl.innerHTML = `<p class="status">${state.items.length ? "No entries match." : "No entries yet."}</p>`;
        return;
      }
      const groups = new Map();
      visible.forEach((item) => {
        const label = monthLabel(item.added);
        groups.set(label, [...(groups.get(label) || []), item]);
      });
      listEl.innerHTML = [...groups.entries()]
        .map(([label, items]) => `<h2 class="month">${escapeHtml(label)}</h2>${items.map(entryHtml).join("")}`)
        .join("");
    }

    tagsEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tag]");
      if (!button) return;
      state.tag = button.dataset.tag;
      renderTags();
      renderList();
    });
    root.querySelector(".search").addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderList();
    });

    fetch(root.dataset.entries, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        state.items = (Array.isArray(data.items) ? data.items : [])
          .filter((item) => item && item.id && item.title)
          .filter((item) => !root.dataset.topic || (item.topics || []).includes(root.dataset.topic))
          .sort((a, b) => String(b.added).localeCompare(String(a.added)));
        const updatedEl = document.querySelector("[data-updated]");
        if (updatedEl && data.updated) updatedEl.textContent = `Last updated ${data.updated} · ${state.items.length} entries`;
        renderTags();
        renderList();
      })
      .catch((err) => {
        listEl.innerHTML = `<p class="status error">Could not load entries (${escapeHtml(err.message)}).</p>`;
      });
  }

  document.querySelectorAll("[data-entries]").forEach(mount);
})();
