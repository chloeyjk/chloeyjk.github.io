// Run with: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { validate } = require("../tools/validate-catalog.js");

const entry = (overrides = {}) => ({
  id: "some-paper",
  title: "Some Paper",
  added: "2026-10-05",
  topics: ["uncertainty"],
  links: [{ label: "arXiv", url: "https://arxiv.org/abs/2411.00640" }],
  ...overrides,
});

test("accepts a valid file with progress updates", () => {
  const data = { updated: "2026-10-05", items: [entry({ progress: [{ at: "2026-10-12", note: "Code released", links: [{ label: "Code", url: "https://github.com/x/y" }] }] })] };
  assert.deepEqual(validate(data, "f"), []);
});

test("rejects duplicate ids and duplicate source links", () => {
  const data = { updated: "2026-10-05", items: [entry(), entry({ id: "some-paper" }), entry({ id: "other" })] };
  const errors = validate(data, "f");
  assert.ok(errors.some((e) => e.includes("duplicate id")));
  assert.ok(errors.some((e) => e.includes("already used by some-paper")));
});

test("rejects bad dates, unknown topics, and non-https links", () => {
  const data = { updated: "Oct 5", items: [entry({ added: "2026/10/05", topics: ["vibes"], links: [{ label: "x", url: "http://example.com" }] })] };
  const errors = validate(data, "f");
  assert.ok(errors.some((e) => e.includes('"updated"')));
  assert.ok(errors.some((e) => e.includes('"added"')));
  assert.ok(errors.some((e) => e.includes('unknown topic "vibes"')));
  assert.ok(errors.some((e) => e.includes("https://")));
});

test("rejects malformed progress notes", () => {
  const data = { updated: "2026-10-05", items: [entry({ progress: [{ at: "soon", note: "" }] })] };
  const errors = validate(data, "f");
  assert.equal(errors.filter((e) => e.includes("progress[0]")).length, 2);
});

test("rejects a file without an items array", () => {
  assert.ok(validate({ updated: "2026-10-05" }, "f").some((e) => e.includes('"items"')));
});
