import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEMO_PROJECT = 'demo-book-buy-agent';
export const FIXTURE_PROJECTS = [DEMO_PROJECT, 'demo-book-buy'];
export const BACKEND_SUITES = [
  'ai-emulator', 'platform-reviews', 'commerce-authority', 'inventory-authority', 'payment-authority',
  'website-runtime', 'workspace-butler-authority', 'profile-publishing',
  'rescheduling-emulator', 'markets-emulator', 'analytics-rules-emulator'
].map(name => `tests/${name}.test.mjs`);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Never infer the test project from .firebaserc, Firebase login, or application configuration.
export function emulatorConfiguration(env = process.env) {
  if (env.GCLOUD_PROJECT && env.GCLOUD_PROJECT !== DEMO_PROJECT) {
    throw new Error(`Backend checks require GCLOUD_PROJECT=${DEMO_PROJECT}.`);
  }
  for (const key of ['GOOGLE_CLOUD_PROJECT', 'GCP_PROJECT']) {
    if (env[key] && env[key] !== DEMO_PROJECT) throw new Error(`${key} must use the demo test project.`);
  }
  const raw = env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8285';
  const match = /^(127\.0\.0\.1|localhost):([1-9]\d{0,4})$/.exec(raw);
  if (!match || Number(match[2]) > 65535) throw new Error('FIRESTORE_EMULATOR_HOST must be a loopback host:port, for example 127.0.0.1:8285.');
  return { project: DEMO_PROJECT, host: '127.0.0.1', port: Number(match[2]), endpoint: `127.0.0.1:${match[2]}` };
}

// An allowlist excludes cloud credentials, provider keys, NODE_OPTIONS and Java preload options.
export function testEnvironment(env, config) {
  const allowed = new Set(['path', 'pathext', 'systemroot', 'windir', 'comspec', 'temp', 'tmp', 'tmpdir',
    'home', 'userprofile', 'localappdata', 'appdata', 'java_home', 'lang', 'lc_all', 'term']);
  const clean = Object.fromEntries(Object.entries(env).filter(([key]) => allowed.has(key.toLowerCase())));
  return { ...clean, NODE_ENV: 'test', METADATA_SERVER_DETECTION: 'none', GCLOUD_PROJECT: config.project, GOOGLE_CLOUD_PROJECT: config.project,
    FIRESTORE_EMULATOR_HOST: config.endpoint, FIREBASE_CONFIG: JSON.stringify({ projectId: config.project }),
    NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' };
}

export function discoverRuntime({ root = repoRoot, env = process.env, platform = process.platform, exists = existsSync, list = readdirSync } = {}) {
  const binary = platform === 'win32' ? 'java.exe' : 'java';
  const homes = [env.JAVA_HOME && path.join(env.JAVA_HOME, 'bin', binary)];
  const pathValue = Object.entries(env).find(([key]) => key.toLowerCase() === 'path')?.[1] || '';
  homes.push(...pathValue.split(platform === 'win32' ? ';' : ':').filter(Boolean).map(folder => path.join(folder, binary)));
  const localJava = path.join(root, '.local-dev-logs', 'java');
  if (exists(localJava)) {
    for (const folder of list(localJava, { withFileTypes: true })) {
      if (folder.isDirectory()) homes.push(path.join(localJava, folder.name, 'bin', binary));
    }
  }
  const java = homes.filter(Boolean).find(candidate => exists(candidate));
  const cache = path.join(env.USERPROFILE || env.HOME || os.homedir(), '.cache', 'firebase', 'emulators');
  const jars = exists(cache) ? list(cache).filter(name => /^cloud-firestore-emulator-v\d[\d.]*\.jar$/.test(name)) : [];
  jars.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const jar = jars[0] && path.join(cache, jars[0]);
  if (!java || !jar) throw new Error('No running emulator was found. Install Java 21+ and cache the Firebase Firestore emulator JAR, or set FIRESTORE_EMULATOR_HOST to your running loopback emulator. This check never downloads dependencies.');
  return { java, jar };
}

export function emulatorArguments(runtime, config, { root = repoRoot, env = process.env, platform = process.platform } = {}) {
  // Windows Unix domain sockets fail when the ordinary TEMP path is too long.
  const socketTemp = platform === 'win32'
    ? path.join(env.USERPROFILE || os.homedir(), '.cache', 'javatmp')
    : path.join(os.tmpdir(), 'bb-firestore');
  return { socketTemp, args: [`-Djdk.net.unixdomain.tmpdir=${socketTemp}`, `-Djava.io.tmpdir=${socketTemp}`, '-jar', runtime.jar,
    '--host', config.host, '--port', String(config.port), '--project_id', config.project,
    '--rules', path.join(root, 'firestore.rules')] };
}

// Every test worker inherits this import. Fail closed even if a test accidentally calls a real provider.
export function networkGuardImport(config) {
  const source = `
    import net from 'node:net';
    import { syncBuiltinESMExports } from 'node:module';
    const allowedPort = ${JSON.stringify(config.port)};
    const denied = () => { throw new Error('Backend checks forbid network access outside the local Firestore emulator.'); };
    const socketConnect = net.Socket.prototype.connect;
    net.Socket.prototype.connect = function (...args) {
      const parts = Array.isArray(args[0]) ? args[0] : args;
      const options = typeof parts[0] === 'object' && parts[0] !== null ? parts[0] : { port: parts[0], host: parts[1] };
      if (Number(options.port) !== allowedPort || options.host !== '127.0.0.1') denied();
      return socketConnect.apply(this, args);
    };
    syncBuiltinESMExports();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = function (input, init) {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || Number(url.port) !== allowedPort || url.username || url.password) denied();
      return originalFetch(input, init);
    };
  `;
  return `data:text/javascript,${encodeURIComponent(source)}`;
}

export async function probeEmulator(config, { fetchImpl = fetch, allowStartupTimeout = false } = {}) {
  let response;
  let body;
  try {
    response = await fetchImpl(`http://${config.endpoint}/emulator/v1/projects/${config.project}:securityRules`, { signal: AbortSignal.timeout(2500) });
    try { body = await response.json(); }
    catch (error) { if (error instanceof SyntaxError) body = null; else throw error; }
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') return false;
    if (allowStartupTimeout && (['TimeoutError', 'AbortError'].includes(error.name) || ['ECONNRESET', 'UND_ERR_SOCKET'].includes(error.cause?.code))) return false;
    throw new Error(`Cannot verify the local emulator: ${error.message}`);
  }
  if (!response.ok || !Array.isArray(body?.rules?.files)) throw new Error('The selected loopback port is occupied by a service that is not a verified Firestore emulator.');
  return true;
}

async function loadRules(config, root) {
  const content = readFileSync(path.join(root, 'firestore.rules'), 'utf8');
  for (const project of FIXTURE_PROJECTS) {
    const response = await fetch(`http://${config.endpoint}/emulator/v1/projects/${project}:securityRules`, {
      method: 'PUT', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content }] } })
    });
    const body = await response.json();
    const errors = (body.issues || []).filter(issue => issue.severity === 'ERROR');
    if (!response.ok || errors.length) throw new Error(`Emulator rules failed for ${project}: ${errors.map(issue => issue.description).join('; ') || response.status}`);
  }
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([new Promise(resolve => child.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 3000))]);
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
}

export async function runBackendChecks({ env = process.env, root = repoRoot, reuseOnly = false } = {}) {
  const config = emulatorConfiguration(env);
  const childEnv = testEnvironment(env, config);
  for (const file of BACKEND_SUITES) if (!existsSync(path.join(root, file))) throw new Error(`Missing backend test suite: ${file}`);
  let emulator;
  let tests;
  let emulatorOutput = '';
  const interrupted = () => { tests?.kill('SIGTERM'); emulator?.kill('SIGTERM'); };
  process.once('SIGINT', interrupted);
  process.once('SIGTERM', interrupted);
  try {
    if (await probeEmulator(config)) {
      console.log(`Using local Firestore emulator ${config.endpoint}; projects ${FIXTURE_PROJECTS.join(', ')}.`);
    } else {
      if (reuseOnly) throw new Error('No running Firestore emulator at the selected loopback address.');
      const runtime = discoverRuntime({ root, env });
      const launch = emulatorArguments(runtime, config, { root, env });
      mkdirSync(launch.socketTemp, { recursive: true });
      const emulatorEnv = { ...childEnv, TEMP: launch.socketTemp, TMP: launch.socketTemp, TMPDIR: launch.socketTemp };
      emulator = spawn(runtime.java, launch.args, { cwd: root, env: emulatorEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      emulator.stdout.on('data', chunk => { emulatorOutput = (emulatorOutput + chunk).slice(-6000); });
      emulator.stderr.on('data', chunk => { emulatorOutput = (emulatorOutput + chunk).slice(-6000); });
      let launchError;
      emulator.once('error', error => { launchError = error; });
      console.log(`Starting cached local Firestore emulator ${config.endpoint}; no downloads or cloud credentials.`);
      const deadline = Date.now() + 90000;
      let ready = false;
      while (Date.now() < deadline) {
        if (launchError) throw launchError;
        if (emulator.exitCode !== null) throw new Error(`Firestore emulator exited: ${emulatorOutput}`);
        try {
          if (await probeEmulator(config, { allowStartupTimeout: true })) { ready = true; break; }
        } catch (error) { throw new Error(`${error.message}\n${emulatorOutput}`); }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!ready) throw new Error(`Firestore emulator did not become ready: ${emulatorOutput}`);
    }
    await loadRules(config, root);
    console.log('Current security rules loaded. Running backend suites with external network access blocked.');
    tests = spawn(process.execPath, ['--import', networkGuardImport(config), '--test', '--test-concurrency=1', '--test-reporter=tap', ...BACKEND_SUITES],
      { cwd: root, env: childEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    tests.stdout.on('data', chunk => { process.stdout.write(chunk); output = (output + chunk).slice(-12000); });
    tests.stderr.on('data', chunk => process.stderr.write(chunk));
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; tests.kill('SIGTERM'); }, 6 * 60 * 1000);
    let code;
    try {
      code = await new Promise((resolve, reject) => { tests.once('error', reject); tests.once('exit', (code, signal) => resolve(signal ? 1 : code)); });
    } finally { clearTimeout(timeout); }
    if (timedOut) throw new Error('Backend suites exceeded the six minute limit.');
    if (code !== 0) throw new Error(`Backend suites failed (exit ${code}).`);
    const skipped = /# skipped (\d+)/.exec(output);
    if (!skipped || Number(skipped[1]) !== 0) throw new Error('Backend checks must complete with zero skipped integration tests.');
    console.log('Backend emulator checks passed. No deployment or live provider calls were made.');
  } finally {
    await stopChild(tests);
    await stopChild(emulator);
    process.removeListener('SIGINT', interrupted);
    process.removeListener('SIGTERM', interrupted);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Run local backend integration checks: npm run test:backend [-- --reuse-only].\nUses demo-book-buy-agent and loopback Firestore (default 127.0.0.1:8285).\nReuses a running emulator or starts cached Java/JAR. Never downloads, deploys, or calls live providers.');
  } else if (args.some(arg => arg !== '--reuse-only')) {
    console.error('Unknown option. Use --help or --reuse-only.'); process.exitCode = 1;
  } else {
    await runBackendChecks({ reuseOnly: args.includes('--reuse-only') }).catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
