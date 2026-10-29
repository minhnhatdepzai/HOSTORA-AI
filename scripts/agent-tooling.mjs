import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const userDir = homedir();
const pnpm = existsSync(join(userDir, '.nvm/versions/node/v24.21.0/bin/pnpm')) ? join(userDir, '.nvm/versions/node/v24.21.0/bin/pnpm') : 'pnpm';
const sdk = process.env.ANDROID_HOME || join(userDir, 'Android/Sdk');
const javaHome = process.env.HOSTORA_JAVA_HOME || (existsSync(join(userDir, '.local/share/codex-tools/jdk-21/bin/javac')) ? join(userDir, '.local/share/codex-tools/jdk-21') : '/usr/lib/jvm/java-17-openjdk-amd64');
const adb = join(sdk, 'platform-tools/adb');
const maestro = existsSync(join(userDir, '.local/bin/maestro')) ? join(userDir, '.local/bin/maestro') : 'maestro';
const output = join(root, 'output/playwright', `agent-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const mode = process.argv[2] || 'doctor';
function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)));
  });
}
function capture(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 20000 });
  if (result.error || result.status !== 0) throw result.error || new Error(result.stderr || `${cmd} failed`);
  return result.stdout.trim();
}
function device() {
  const devices = capture(adb, ['devices']).split('\n').slice(1).filter(line => /\tdevice$/.test(line)).map(line => line.split('\t')[0]);
  const target = process.env.HOSTORA_ANDROID_DEVICE;
  if (target && devices.includes(target)) return target;
  if (devices.length !== 1) throw new Error('Connect one authorized Android device, or set HOSTORA_ANDROID_DEVICE.');
  return devices[0];
}
async function doctor() {
  const expected = JSON.parse(readFileSync(join(root, 'mobile/app.json'), 'utf8')).expo.version;
  const checks = {};
  for (const [name, cmd, args] of [
    ['node', process.execPath, ['--version']], ['pnpm', pnpm, ['--version']],
    ['adb', adb, ['version']], ['maestro', maestro, ['--version']], ['javac', join(javaHome, 'bin/javac'), ['-version']],
  ]) {
    try { checks[name] = { ok: true, detail: capture(cmd, args).split('\n')[0] }; }
    catch (error) { checks[name] = { ok: false, detail: error.message }; }
  }
  try {
    const id = device();
    const pkg = capture(adb, ['-s', id, 'shell', 'dumpsys', 'package', 'com.hostora.ai']);
    const installed = pkg.match(/versionName=([^\s]+)/)?.[1] || null;
    checks.android = { ok: installed === expected, device: id, expected, installed };
  } catch (error) { checks.android = { ok: false, detail: error.message }; }
  checks.localApk = { ok: existsSync(join(root, 'mobile/releases', `HOSTORA-AI-${expected}-arm64.apk`)), expected };
  checks.skills = { ok: existsSync(join(userDir, '.codex/skills/expo-native-ui/SKILL.md')) && existsSync(join(userDir, '.codex/skills/hostora-quality/SKILL.md')) };
  console.log(JSON.stringify(checks, null, 2));
  if (Object.values(checks).some(check => !check.ok)) process.exitCode = 1;
}
async function isolatedWeb(action) {
  if (!existsSync(join(root, '.next/standalone/server.js'))) throw new Error('Run pnpm build first.');
  try { process.loadEnvFile(join(root, '.env.local')); } catch { /* optional local configuration */ }
  const port = await new Promise((resolve, reject) => { const server = createServer(); server.on('error', reject); server.listen(0, '127.0.0.1', () => { const value = server.address().port; server.close(() => resolve(value)); }); });
  const runtime = mkdtempSync(join(tmpdir(), 'hostora-agent-'));
  const isolatedBaseUrl = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1', HOSTORA_E2E_BASE_URL: isolatedBaseUrl, HOSTORA_PUBLIC_BASE_URL: isolatedBaseUrl, HOSTORA_TRUST_CLOUDFLARE_PROXY: 'false', HOSTORA_TRUST_PROXY: 'false', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '', HOSTORA_TURNSTILE_SECRET_KEY: '', HOSTORA_TURNSTILE_HOSTNAMES: '', HOSTORA_PAYMENTS_DB_PATH: join(runtime, 'payments.sqlite'), HOSTORA_CATALOG_DB_PATH: join(runtime, 'catalog.sqlite'), HOSTORA_ADMIN_SESSION_SECRET: randomBytes(32).toString('hex'), HOSTORA_PAYMENTS_MODE: 'demo', HOSTORA_SMTP_HOST: '', HOSTORA_SMTP_PASSWORD: '', LANGFUSE_PUBLIC_KEY: '', LANGFUSE_SECRET_KEY: '', HOSTORA_STUDIO_GITHUB_ENABLED: 'false', HOSTORA_AUDIT_OUTPUT: output };
  mkdirSync(output, { recursive: true });
  const server = spawn(process.execPath, [join(root, '.next/standalone/server.js')], { cwd: root, env, stdio: ['ignore', 'inherit', 'inherit'] });
  let exited = false;
  server.on('exit', () => { exited = true; });
  const stop = () => server.kill('SIGTERM');
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (exited) throw new Error('Isolated production server exited during startup.');
      try { const response = await fetch(env.HOSTORA_E2E_BASE_URL, { signal: AbortSignal.timeout(1000) }); if (response.ok) { ready = true; break; } } catch { /* server starting */ }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!ready) throw new Error('Isolated production server did not become ready.');
    if (action === 'e2e') await run(pnpm, ['exec', 'playwright', 'test', '--workers=1'], { env });
    else await run(process.execPath, ['scripts/audit-ui.mjs'], { env });
  } finally {
    stop(); process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
    console.log(`Evidence: ${output}\nIsolated test databases: ${runtime}`);
  }
}
async function androidUpdate() {
  const id = device();
  await run(pnpm, ['--dir', 'mobile', 'apk:arm64'], { env: { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk, JAVA_HOME: javaHome } });
  const folder = join(root, 'mobile/android/app/build/outputs/apk/release');
  const files = readdirSync(folder).filter(name => name.endsWith('.apk') && !name.includes('unsigned'));
  const name = files.find(name => name.includes('arm64')) || files.find(name => name === 'app-release.apk');
  if (!name) throw new Error('No signed arm64/release APK found.');
  const apk = join(folder, name);
  const expected = JSON.parse(readFileSync(join(root, 'mobile/app.json'), 'utf8')).expo.version;
  const buildTools = join(sdk, 'build-tools');
  const aapt = readdirSync(buildTools).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).map(name => join(buildTools, name, 'aapt')).find(existsSync);
  if (!aapt) throw new Error('Android build-tools/aapt is required to verify APK version.');
  const metadata = capture(aapt, ['dump', 'badging', apk]);
  if (!metadata.includes(`name='com.hostora.ai'`) || !metadata.includes(`versionName='${expected}'`)) throw new Error('APK metadata differs from app.json; sync the native project and rebuild before installing.');
  await run(adb, ['-s', id, 'install', '-r', apk]);
  await run(adb, ['-s', id, 'shell', 'am', 'start', '-n', 'com.hostora.ai/.MainActivity']);
  console.log(`Installed ${expected} with existing app data preserved. Validate the changed user flow on the device.`);
}
try {
  if (mode === 'doctor') await doctor();
  else if (mode === 'verify') {
    for (const args of [['typecheck'], ['lint'], ['test'], ['build'], ['--dir', 'mobile', 'typecheck'], ['--dir', 'mobile', 'lint'], ['ai:check']]) await run(pnpm, args);
  } else if (mode === 'e2e' || mode === 'audit') await isolatedWeb(mode);
  else if (mode === 'android') {
    mkdirSync(output, { recursive: true });
    await run(maestro, ['test', '--udid', device(), '--format', 'JUNIT', '--output', join(output, 'android-junit.xml'), '--test-output-dir', join(output, 'maestro'), 'mobile/.maestro/consultation-smoke.yaml']);
  } else if (mode === 'update') await androidUpdate();
  else throw new Error('Use doctor, verify, e2e, audit, android or update.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
