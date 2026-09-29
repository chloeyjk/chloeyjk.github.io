// Single source of truth for the research hub navigation.
// Every hub page loads this script; it inserts the top bar as the first element of <body>.
(function () {
  "use strict";

  const BRAND = { href: "/research/", html: "<span>CY</span> / EVAL BRIEF" };

  const NAV = [
    { label: "Research", href: "/research/" },
    { label: "Briefs", href: "/research/briefs/" },
    { label: "In Practice", href: "/research/stories/" },
    { label: "Methods", items: [
      { label: "Uncertainty & Error Bars", href: "/research/methods/uncertainty/" },
      { label: "Comparing Agents", href: "/research/methods/paired/" },
      { label: "LLM Judges", href: "/research/methods/judges/" },
      { label: "Benchmark Validity", href: "/research/methods/validity/" },
      { label: "Multi-trial Reliability", href: "/research/methods/multi-trial/" },
    ] },
    { label: "Harness", href: "/research/harness/" },
    { label: "Lab", href: "/research/lab/" },
    { label: "Templates", href: "/research/templates/" },
    { label: "Study", href: "/research/study/" },
    { label: "Builds", items: [
      { label: "EvalBench", href: "/evalbench/" },
      { label: "Methods Matrix", href: "/research/builds/methods-matrix/" },
    ] },
  ];

  const here = location.pathname.replace(/index\.html$/, "");

  function link(item) {
    const current = item.href === here ? ' aria-current="page"' : "";
    return `<a href="${item.href}"${current}>${item.label}</a>`;
  }

  function entry(item) {
    if (!item.items) return `<li>${link(item)}</li>`;
    return `<li><details><summary>${item.label}</summary><ul>${item.items.map((child) => `<li>${link(child)}</li>`).join("")}</ul></details></li>`;
  }

  const bar = document.createElement("header");
  bar.className = "topbar";
  bar.innerHTML = `<div class="shell">
      <a class="brand" href="${BRAND.href}">${BRAND.html}</a>
      <ul class="nav" aria-label="Primary">${NAV.map(entry).join("")}</ul>
      <span class="nav-home"><a href="/">Chloe Yang ↗</a></span>
    </div>`;
  document.body.prepend(bar);

  // Close any open dropdown when clicking elsewhere.
  document.addEventListener("click", (event) => {
    bar.querySelectorAll("details[open]").forEach((menu) => {
      if (!menu.contains(event.target)) menu.removeAttribute("open");
    });
  });
})();
