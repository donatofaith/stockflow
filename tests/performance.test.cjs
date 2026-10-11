/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness for isolated TypeScript modules. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function loadModule(path, globals) {
  const fixture = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(
    source,
    {
      module: fixture,
      exports: fixture.exports,
      console: { error() {} },
      setTimeout,
      clearTimeout,
      AbortController,
      AbortSignal,
      URL,
      ...globals,
    },
    { filename: path },
  );
  return fixture.exports;
}

test("market requests share a refresh, reuse fresh prices and retain dated prices during an outage", async () => {
  let now = 1_000_000,
    calls = 0,
    unavailable = false;
  class Clock extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }
    static now() {
      return now;
    }
  }
  const { GET } = loadModule("app/api/xstocks/route.ts", {
    Date: Clock,
    require: () => ({
      NextResponse: { json: (body, init) => ({ body, ...init }) },
    }),
    fetch: async (_url, init) => {
      calls++;
      assert.equal(init.next.revalidate, 120);
      await Promise.resolve();
      return {
        ok: !unavailable,
        json: async () => ({ price: 123.45 }),
        text: async () => "",
      };
    },
  });
  const [first, shared] = await Promise.all([GET(), GET()]);
  assert.equal(
    calls,
    8,
    "eight assets, not sixteen duplicate upstream requests",
  );
  assert.equal(first.body, shared.body);
  assert.equal(first.body.assets.length, 8);
  assert.equal(first.body.stale, false);
  assert.match(first.headers["Cache-Control"], /s-maxage=120/);
  await GET();
  assert.equal(calls, 8, "fresh cache does not contact upstream");
  const observedAt = first.body.updatedAt;
  now += 121_000;
  unavailable = true;
  const outage = await GET();
  assert.equal(outage.body.assets[0].price, 123.45);
  assert.equal(outage.body.assets[0].updatedAt, observedAt);
  assert.equal(
    outage.body.updatedAt,
    observedAt,
    "outage does not pretend old quotes are new",
  );
  assert.equal(outage.body.stale, true);
  assert.match(outage.headers["Cache-Control"], /s-maxage=30/);
  const outageCalls = calls;
  await GET();
  assert.equal(
    calls,
    outageCalls,
    "failed upstream is not hammered on every visitor",
  );
});

test("visible polling cannot overlap, pauses in hidden tabs, resumes and cleans up", async () => {
  let now = 1_000_000,
    calls = 0,
    resolve;
  const timers = new Map();
  let nextId = 0;
  const listeners = new Map();
  const document = {
    visibilityState: "visible",
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  const { startVisiblePolling } = loadModule("lib/visible-polling.ts", {
    Date: { now: () => now },
    document,
    setTimeout: (fn, delay) => {
      const id = ++nextId;
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  const stop = startVisiblePolling(() => {
    calls++;
    return new Promise((done) => {
      resolve = done;
    });
  }, 60_000);
  assert.equal(calls, 1);
  document.visibilityState = "hidden";
  listeners.get("visibilitychange")();
  document.visibilityState = "visible";
  listeners.get("visibilitychange")();
  assert.equal(
    calls,
    1,
    "visibility events cannot start a second in-flight request",
  );
  document.visibilityState = "hidden";
  listeners.get("visibilitychange")();
  resolve();
  await new Promise((done) => setImmediate(done));
  assert.equal(timers.size, 0, "hidden completion does not schedule more work");
  now += 120_000;
  document.visibilityState = "visible";
  listeners.get("visibilitychange")();
  const scheduled = [...timers.values()][0];
  assert.equal(scheduled.delay, 0);
  timers.clear();
  scheduled.fn();
  assert.equal(calls, 2);
  stop();
  resolve();
  await new Promise((done) => setImmediate(done));
  assert.equal(listeners.size, 0);
  assert.equal(timers.size, 0);
});
