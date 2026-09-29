// Run with: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../evalbench/stats.js");

const close = (actual, expected, tol = 1e-9) => assert.ok(Math.abs(actual - expected) < tol, `${actual} != ${expected}`);

test("normalQuantile matches known z values", () => {
  close(S.normalQuantile(0.975), 1.959963985, 1e-8);
  close(S.normalQuantile(0.8), 0.841621234, 1e-8);
  close(S.normalQuantile(0.5), 0, 1e-12);
  close(S.normalQuantile(0.01), -2.326347874, 1e-8);
  assert.throws(() => S.normalQuantile(1), RangeError);
});

test("summarize gives sample SD, SE, and a 95% interval", () => {
  const s = S.summarize([1, 2, 3, 4]);
  close(s.mean, 2.5);
  close(s.sd, Math.sqrt(5 / 3));
  close(s.se, Math.sqrt(5 / 3) / 2);
  close(s.hi - s.mean, S.Z_95 * s.se);
  assert.throws(() => S.summarize([1]), RangeError);
});

test("passAtK equals 1 - C(n-c,k)/C(n,k)", () => {
  // n=5, c=2, k=2: 1 - C(3,2)/C(5,2) = 1 - 3/10
  close(S.passAtK(5, 2, 2), 0.7);
  close(S.passAtK(5, 0, 3), 0);
  close(S.passAtK(5, 3, 3), 1); // n - c < k
  close(S.passAtK(10, 3, 1), 0.3); // k = 1 is the success rate
});

test("passHatK equals C(c,k)/C(n,k)", () => {
  // n=5, c=3, k=2: C(3,2)/C(5,2) = 3/10
  close(S.passHatK(5, 3, 2), 0.3);
  close(S.passHatK(5, 1, 2), 0);
  close(S.passHatK(4, 4, 4), 1);
  close(S.passHatK(10, 3, 1), 0.3);
});

test("requiredTasks follows ((z_a + z_b) * sd / delta)^2", () => {
  // (1.96 + 0.8416)^2 * (0.3 / 0.1)^2 = 70.6 -> 71
  assert.equal(S.requiredTasks(0.3, 0.1), 71);
  assert.equal(S.requiredTasks(0.3, -0.1), 71);
  assert.equal(S.requiredTasks(0.3, 0), Infinity);
});

test("parseTasks skips header/comments and reports bad lines", () => {
  const { tasks, errors } = S.parseTasks([
    "task,a_success,a_trials,b_success,b_trials",
    "# comment",
    "t1, 3, 5, 1, 5",
    "",
    "t2, 6, 5, 1, 5",
    "t3, 1.5, 5, 1, 5",
    "t4, 1, 5",
  ].join("\n"));
  assert.deepEqual(tasks, [{ id: "t1", a: { c: 3, n: 5 }, b: { c: 1, n: 5 } }]);
  assert.equal(errors.length, 3);
  assert.match(errors[0], /Line 5/);
});

test("analyze computes a paired difference from per-task rates", () => {
  const tasks = S.parseTasks("t1,5,5,4,5\nt2,3,5,1,5\nt3,0,5,0,5").tasks;
  const result = S.analyze(tasks, 2);
  close(result.a.rate.mean, (1 + 0.6 + 0) / 3);
  close(result.diff.mean, (0.2 + 0.4 + 0) / 3);
  assert.equal(result.tasks, 3);
  assert.throws(() => S.analyze(tasks, 6), /between 1 and 5/);
  assert.throws(() => S.analyze(tasks.slice(0, 1), 1), /at least 2/);
});
