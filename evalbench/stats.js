// Statistics for agent evals. Runs in the browser (window.EvalStats) and in Node (require) for tests.
(function (root) {
  "use strict";

  const Z_95 = 1.959963984540054;

  /**
   * Inverse standard normal CDF (Acklam's rational approximation, |error| < 1.2e-9).
   * @param {number} p probability in (0, 1)
   * @returns {number}
   */
  function normalQuantile(p) {
    if (!(p > 0 && p < 1)) throw new RangeError("p must be in (0, 1)");
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const pLow = 0.02425;
    if (p < pLow) {
      const q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > 1 - pLow) return -normalQuantile(1 - p);
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  /**
   * Mean with CLT standard error and 95% interval.
   * @param {number[]} values
   * @returns {{n: number, mean: number, sd: number, se: number, lo: number, hi: number}}
   */
  function summarize(values) {
    const n = values.length;
    if (n < 2) throw new RangeError("need at least 2 values");
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const sd = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1));
    const se = sd / Math.sqrt(n);
    return { n, mean, sd, se, lo: mean - Z_95 * se, hi: mean + Z_95 * se };
  }

  /**
   * Unbiased pass@k estimator (Chen et al. 2021): P(at least one of k draws succeeds).
   * @param {number} n trials
   * @param {number} c successes
   * @param {number} k
   * @returns {number}
   */
  function passAtK(n, c, k) {
    if (k > n) throw new RangeError("k must be <= trials");
    if (n - c < k) return 1;
    let failAll = 1;
    for (let i = n - c + 1; i <= n; i += 1) failAll *= 1 - k / i;
    return 1 - failAll;
  }

  /**
   * pass^k (Yao et al. 2024): P(all k draws succeed) = C(c, k) / C(n, k).
   * @param {number} n trials
   * @param {number} c successes
   * @param {number} k
   * @returns {number}
   */
  function passHatK(n, c, k) {
    if (k > n) throw new RangeError("k must be <= trials");
    let all = 1;
    for (let i = 0; i < k; i += 1) all *= Math.max(c - i, 0) / (n - i);
    return all;
  }

  /**
   * Tasks needed for a paired comparison to detect a difference `delta`.
   * @param {number} sdDiff standard deviation of per-task differences
   * @param {number} delta difference to detect
   * @param {number} [alpha=0.05] two-sided significance level
   * @param {number} [power=0.8]
   * @returns {number}
   */
  function requiredTasks(sdDiff, delta, alpha = 0.05, power = 0.8) {
    if (!(delta !== 0)) return Infinity;
    const z = normalQuantile(1 - alpha / 2) + normalQuantile(power);
    return Math.ceil(((z * sdDiff) / Math.abs(delta)) ** 2);
  }

  /**
   * Parse "task, a_successes, a_trials, b_successes, b_trials" lines. Blank lines, "#" comments,
   * and a header row are skipped.
   * @param {string} text
   * @returns {{tasks: Array<{id: string, a: {c: number, n: number}, b: {c: number, n: number}}>, errors: string[]}}
   */
  function parseTasks(text) {
    const tasks = [];
    const errors = [];
    String(text).split(/\r?\n/).forEach((raw, index) => {
      const line = raw.trim();
      if (!line || line.startsWith("#")) return;
      const cells = line.split(",").map((cell) => cell.trim());
      if (index === 0 && Number.isNaN(Number(cells[1]))) return;
      const lineNo = index + 1;
      if (cells.length !== 5) {
        errors.push(`Line ${lineNo}: expected 5 columns, found ${cells.length}.`);
        return;
      }
      const [id, ...nums] = cells;
      const [ac, an, bc, bn] = nums.map(Number);
      if (![ac, an, bc, bn].every(Number.isInteger)) {
        errors.push(`Line ${lineNo}: counts must be whole numbers.`);
        return;
      }
      if (an < 1 || bn < 1 || ac < 0 || bc < 0 || ac > an || bc > bn) {
        errors.push(`Line ${lineNo}: need 0 ≤ successes ≤ trials and trials ≥ 1.`);
        return;
      }
      tasks.push({ id, a: { c: ac, n: an }, b: { c: bc, n: bn } });
    });
    return { tasks, errors };
  }

  /**
   * Full analysis for two agents on the same tasks.
   * @param {ReturnType<typeof parseTasks>["tasks"]} tasks
   * @param {number} k
   */
  function analyze(tasks, k) {
    if (tasks.length < 2) throw new RangeError("Enter at least 2 tasks.");
    const minTrials = Math.min(...tasks.flatMap((t) => [t.a.n, t.b.n]));
    if (!Number.isInteger(k) || k < 1 || k > minTrials) {
      throw new RangeError(`k must be a whole number between 1 and ${minTrials} (the fewest trials on any task).`);
    }
    const rateA = tasks.map((t) => t.a.c / t.a.n);
    const rateB = tasks.map((t) => t.b.c / t.b.n);
    const diff = summarize(rateA.map((a, i) => a - rateB[i]));
    const agent = (side, rates) => ({
      rate: summarize(rates),
      passAtK: summarize(tasks.map((t) => passAtK(t[side].n, t[side].c, k))).mean,
      passHatK: summarize(tasks.map((t) => passHatK(t[side].n, t[side].c, k))).mean,
    });
    return {
      tasks: tasks.length,
      k,
      a: agent("a", rateA),
      b: agent("b", rateB),
      diff,
      tasksFor80: diff.sd === 0 ? null : requiredTasks(diff.sd, diff.mean),
    };
  }

  const api = { Z_95, normalQuantile, summarize, passAtK, passHatK, requiredTasks, parseTasks, analyze };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EvalStats = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
