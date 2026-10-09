import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BACKEND_SUITES, DEMO_PROJECT, emulatorConfiguration, testEnvironment, discoverRuntime, emulatorArguments, networkGuardImport, probeEmulator } from '../scripts/backend-emulator-check.mjs';

test('runner rejects live projects and remote or malformed emulator addresses before I/O', () => {
  const config = emulatorConfiguration({});
  assert.deepEqual(config, { project: DEMO_PROJECT, host: '127.0.0.1', port: 8285, endpoint: '127.0.0.1:8285' });
  assert.equal(emulatorConfiguration({ FIRESTORE_EMULATOR_HOST: 'localhost:8385', GCLOUD_PROJECT: DEMO_PROJECT }).endpoint, '127.0.0.1:8385');
  for (const key of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'GCP_PROJECT']) assert.throws(() => emulatorConfiguration({ [key]: 'production-project' }), /demo/);
  for (const host of ['firestore.googleapis.com:443', '192.168.1.2:8285', '0.0.0.0:8285', 'http://127.0.0.1:8285', 'user:pass@127.0.0.1:8285', '127.0.0.1:0', '127.0.0.1:65536', '127.0.0.1:8285/path']) {
    assert.throws(() => emulatorConfiguration({ FIRESTORE_EMULATOR_HOST: host }), /loopback/);
  }
});

test('runner strips all inherited credentials, proxies and code injection while preserving runtime discovery', () => {
  const config = emulatorConfiguration({});
  const env = testEnvironment({ PATH: 'safe-path', SystemRoot: 'C:/Windows', JAVA_HOME: 'java-home',
    GOOGLE_APPLICATION_CREDENTIALS: 'private.json', OPENAI_API_KEY: 'private-key', ANTHROPIC_API_KEY: 'private-key',
    FIREBASE_TOKEN: 'private-token', FIREBASE_CONFIG: '{"projectId":"live"}', STRIPE_SECRET_KEY: 'private-key',
    HTTP_PROXY: 'https://remote.example', NODE_OPTIONS: '--import malicious.mjs', JAVA_TOOL_OPTIONS: '-javaagent:malicious.jar' }, config);
  assert.equal(env.PATH, 'safe-path'); assert.equal(env.SystemRoot, 'C:/Windows'); assert.equal(env.JAVA_HOME, 'java-home');
  assert.equal(env.GCLOUD_PROJECT, DEMO_PROJECT); assert.equal(env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8285');
  assert.equal(env.METADATA_SERVER_DETECTION, 'none');
  assert.deepEqual(JSON.parse(env.FIREBASE_CONFIG), { projectId: DEMO_PROJECT });
  for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'FIREBASE_TOKEN', 'STRIPE_SECRET_KEY', 'HTTP_PROXY', 'NODE_OPTIONS', 'JAVA_TOOL_OPTIONS']) assert.equal(env[key], undefined);
});

test('runtime discovery uses JAVA_HOME, then PATH, then cached workspace Java and newest cached JAR', () => {
  const root = path.resolve('fixture-workspace'), home = path.resolve('fixture-home');
  const javaHome = path.resolve('configured-java'), pathJava = path.resolve('path-java');
  const local = path.join(root, '.local-dev-logs', 'java');
  const cache = path.join(home, '.cache', 'firebase', 'emulators');
  const candidates = [path.join(javaHome, 'bin', 'java.exe'), path.join(pathJava, 'java.exe'), path.join(local, 'cached-jre', 'bin', 'java.exe')];
  const visible = new Set([local, cache, ...candidates]);
  const list = location => location === local ? [{ name: 'cached-jre', isDirectory: () => true }] : ['cloud-firestore-emulator-v1.9.0.jar', 'cloud-firestore-emulator-v1.20.4.jar', 'other.jar'];
  const options = { root, platform: 'win32', exists: candidate => visible.has(candidate), list,
    env: { USERPROFILE: home, JAVA_HOME: javaHome, Path: pathJava } };
  assert.equal(discoverRuntime(options).java, candidates[0]);
  visible.delete(candidates[0]); assert.equal(discoverRuntime(options).java, candidates[1]);
  visible.delete(candidates[1]); assert.equal(discoverRuntime(options).java, candidates[2]);
  assert.equal(discoverRuntime(options).jar, path.join(cache, 'cloud-firestore-emulator-v1.20.4.jar'));
  visible.delete(cache); assert.throws(() => discoverRuntime(options), /never downloads/);
});

test('Windows emulator launch uses the short socket directory and only local demo arguments', () => {
  const home = path.resolve('fixture-home');
  const launch = emulatorArguments({ jar: 'cached.jar' }, emulatorConfiguration({}), { platform: 'win32', env: { USERPROFILE: home }, root: path.resolve('.') });
  assert.equal(launch.socketTemp, path.join(home, '.cache', 'javatmp'));
  assert.equal(launch.args[0], `-Djdk.net.unixdomain.tmpdir=${launch.socketTemp}`);
  assert.ok(launch.args.includes(`-Djava.io.tmpdir=${launch.socketTemp}`));
  assert.ok(launch.args.includes(DEMO_PROJECT)); assert.ok(launch.args.includes('127.0.0.1'));
  assert.ok(launch.args.includes('8285')); assert.equal(launch.args.includes('--import-data'), false);
  assert.equal(BACKEND_SUITES.length, 12); assert.ok(BACKEND_SUITES.includes('tests/platform-reviews.test.mjs'));
  assert.ok(BACKEND_SUITES.includes('tests/listing-enquiries-emulator.test.mjs'));
});

test('only a runner-owned emulator startup tolerates temporary timeouts; unrelated services fail closed', async () => {
  const config = emulatorConfiguration({});
  const timeoutFetch = async () => { throw new DOMException('Starting', 'TimeoutError'); };
  await assert.rejects(probeEmulator(config, { fetchImpl: timeoutFetch }), /Cannot verify/);
  assert.equal(await probeEmulator(config, { fetchImpl: timeoutFetch, allowStartupTimeout: true }), false);
  const slowBodyFetch = async () => ({ ok: true, json: async () => { throw new DOMException('Starting', 'AbortError'); } });
  assert.equal(await probeEmulator(config, { fetchImpl: slowBodyFetch, allowStartupTimeout: true }), false);
  await assert.rejects(probeEmulator(config, { fetchImpl: slowBodyFetch }), /Cannot verify/);
  const unrelatedFetch = async () => ({ ok: true, json: async () => ({ service: 'other' }) });
  await assert.rejects(probeEmulator(config, { fetchImpl: unrelatedFetch, allowStartupTimeout: true }), /not a verified Firestore emulator/);
  const readyFetch = async () => ({ ok: true, json: async () => ({ rules: { files: [] } }) });
  assert.equal(await probeEmulator(config, { fetchImpl: readyFetch, allowStartupTimeout: true }), true);
});

test('test-worker network guard rejects actual provider fetch, HTTP, sockets and credentialed URLs', () => {
  const config = emulatorConfiguration({});
  const script = `
    import assert from 'node:assert/strict';
    import net from 'node:net';
    import http from 'node:http';
    const denied = /forbid network access/;
    assert.throws(() => fetch('https://api.openai.com/v1/responses'), denied);
    assert.throws(() => fetch('http://user:secret@127.0.0.1:8285/v1/test'), denied);
    assert.throws(() => http.get('http://example.com/'), denied);
    assert.throws(() => net.connect({ host: '127.0.0.1', port: 443 }), denied);
    assert.throws(() => net.connect({ host: 'example.com', port: 8285 }), denied);
  `;
  const result = spawnSync(process.execPath, ['--import', networkGuardImport(config), '--input-type=module', '-e', script],
    { env: testEnvironment(process.env, config), windowsHide: true, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});
