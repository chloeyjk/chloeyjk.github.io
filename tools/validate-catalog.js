#!/usr/bin/env node
// Validates the hub's entry files. Run before every commit:
//   node tools/validate-catalog.js
// Exits 1 and lists every problem if any file is invalid.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..");
const FILES = ["research/catalog.json", "research/briefs/entries.json", "research/lab/entries.json"];
const TOPICS = new Set(["uncertainty", "paired", "judges", "validity", "multi-trial", "practice"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const URL_OK = /^(https:\/\/|\/)/;

/**
 * @param {unknown} list
 * @param {string} where
 * @param {string[]} errors
 */
function checkLinks(list, where, errors) {
  if (list === undefined) return;
  if (!Array.isArray(list)) {
    errors.push(`${where}: links must be an array`);
    return;
  }
  list.forEach((link, i) => {
    if (!link || typeof link.label !== "string" || !link.label.trim()) errors.push(`${where}: links[${i}] needs a label`);
    if (!link || !URL_OK.test(String(link.url))) errors.push(`${where}: links[${i}] url must start with https:// or /`);
  });
}

/**
 * Validate one parsed entry file.
 * @param {unknown} data
 * @param {string} name
 * @returns {string[]} problems found
 */
function validate(data, name) {
  const errors = [];
  if (!data || typeof data !== "object") return [`${name}: not a JSON object`];
  if (!DATE.test(String(data.updated))) errors.push(`${name}: "updated" must be YYYY-MM-DD`);
  if (!Array.isArray(data.items)) return [...errors, `${name}: "items" must be an array`];

  const ids = new Set();
  const urls = new Map();
  data.items.forEach((item, i) => {
    const where = `${name} items[${i}]${item && item.id ? ` (${item.id})` : ""}`;
    if (!item || typeof item !== "object") {
      errors.push(`${where}: not an object`);
      return;
    }
    if (!SLUG.test(String(item.id))) errors.push(`${where}: id must be a lowercase-hyphen slug`);
    if (ids.has(item.id)) errors.push(`${where}: duplicate id`);
    ids.add(item.id);
    if (typeof item.title !== "string" || !item.title.trim()) errors.push(`${where}: missing title`);
    if (!DATE.test(String(item.added))) errors.push(`${where}: "added" must be YYYY-MM-DD`);
    if (item.topics !== undefined) {
      if (!Array.isArray(item.topics)) errors.push(`${where}: topics must be an array`);
      else item.topics.filter((t) => !TOPICS.has(t)).forEach((t) => errors.push(`${where}: unknown topic "${t}"`));
    }
    checkLinks(item.links, where, errors);
    (item.links || []).forEach((link) => {
      const url = String(link && link.url);
      if (urls.has(url)) errors.push(`${where}: link ${url} already used by ${urls.get(url)}`);
      else urls.set(url, item.id);
    });
    if (item.progress !== undefined) {
      if (!Array.isArray(item.progress)) errors.push(`${where}: progress must be an array`);
      else item.progress.forEach((p, j) => {
        if (!p || !DATE.test(String(p.at))) errors.push(`${where}: progress[${j}].at must be YYYY-MM-DD`);
        if (!p || typeof p.note !== "string" || !p.note.trim()) errors.push(`${where}: progress[${j}] needs a note`);
        checkLinks(p && p.links, `${where} progress[${j}]`, errors);
      });
    }
  });
  return errors;
}

function main() {
  const errors = FILES.flatMap((file) => {
    const full = path.join(REPO, file);
    if (!fs.existsSync(full)) return [`${file}: missing`];
    try {
      return validate(JSON.parse(fs.readFileSync(full, "utf8")), file);
    } catch (err) {
      return [`${file}: invalid JSON (${err.message})`];
    }
  });
  if (errors.length) {
    process.stderr.write(`${errors.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`OK: ${FILES.length} files valid\n`);
}

module.exports = { validate, TOPICS };
if (require.main === module) main();
