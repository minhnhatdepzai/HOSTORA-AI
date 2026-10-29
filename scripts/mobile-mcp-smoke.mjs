import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'output/playwright', `mobile-mcp-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const wrapper = join(homedir(), '.local/bin/hostora-mobile-mcp');
if (!existsSync(wrapper)) throw new Error('Mobile MCP wrapper missing; see docs/CODEX_TOOLCHAIN.md.');
mkdirSync(output, { recursive: true });
const child = spawn(wrapper, [], { stdio: ['pipe', 'pipe', 'pipe'] });
child.stderr.on('data', data => appendFileSync(join(output, 'mcp.log'), data));
let buffer = '', sequence = 0;
const pending = new Map();
child.stdout.on('data', data => {
  buffer += data;
  while (buffer.includes('\n')) {
    const index = buffer.indexOf('\n');
    const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
    try { const response = JSON.parse(line); pending.get(response.id)?.(response); } catch { /* non-JSON diagnostic */ }
  }
});
async function rpc(method, params) {
  const id = ++sequence;
  const result = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 90000);
    pending.set(id, response => { clearTimeout(timeout); pending.delete(id); if (response.error) reject(new Error(JSON.stringify(response.error))); else resolve(response.result); });
  });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  return result;
}
let device;
async function call(name, args) {
  const result = await rpc('tools/call', { name, arguments: { device, ...args } });
  if (result.isError) throw new Error(result.content?.find(item => item.type === 'text')?.text || name);
  return result;
}
async function inspect() {
  const result = await call('mobile_list_elements_on_screen', { format: 'json' });
  const text = result.content.find(item => item.type === 'text').text;
  return JSON.parse(text.slice(text.indexOf('[')));
}
function match(elements, text) {
  return elements.find(item => item.text === text && item.coordinates?.height > 0 && item.coordinates.y < 2200) || elements.find(item => item.label?.includes(text) && item.coordinates?.height > 0 && item.coordinates.y < 2200);
}
async function find(text, scroll = true) {
  for (let attempt = 0; attempt < (scroll ? 8 : 15); attempt++) {
    const elements = await inspect();
    const element = match(elements, text);
    if (element) return element;
    if (elements.some(item => item.text?.includes('Chưa tải được bảng giá'))) throw new Error('App cannot load catalog. Check API base URL and adb reverse; do not substitute fake catalog data.');
    if (scroll) await call('mobile_swipe_on_screen', { direction: 'up', distance: 500 });
    else await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Element not found: ${text}`);
}
async function tap(text) { const element = await find(text); await call('mobile_click_on_screen_at_coordinates', { ref: element.ref }); }
try {
  await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'hostora-native-smoke', version: '1.0.0' } });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const devices = await rpc('tools/call', { name: 'mobile_list_available_devices', arguments: {} });
  const available = JSON.parse(devices.content.find(item => item.type === 'text').text).devices.filter(item => item.platform === 'android' && item.state === 'online');
  device = process.env.HOSTORA_ANDROID_DEVICE || (available.length === 1 ? available[0].id : null);
  if (!device || !available.some(item => item.id === device)) throw new Error('Select one Android device using HOSTORA_ANDROID_DEVICE.');
  const adb = join(process.env.ANDROID_HOME || join(homedir(), 'Android/Sdk'), 'platform-tools/adb');
  execFileSync(adb, ['-s', device, 'reverse', 'tcp:3000', 'tcp:3000']);
  execFileSync(adb, ['-s', device, 'shell', 'am', 'force-stop', 'com.hostora.ai']);
  execFileSync(adb, ['-s', device, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'hostora:///', 'com.hostora.ai']);
  // The native intro overlays the home accessibility tree for seven seconds.
  // Wait for the overlay to mount, then dismiss it before touching home controls.
  for (let attempt = 0; attempt < 16; attempt++) {
    const elements = await inspect();
    const skip = match(elements, 'Bỏ qua');
    if (skip) { await call('mobile_click_on_screen_at_coordinates', { ref: skip.ref }); break; }
    if (attempt >= 4 && match(elements, 'Tư vấn chọn gói phù hợp')) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  await find('Trang chủ', false);
  await tap('Tư vấn chọn gói phù hợp');
  await find('BƯỚC 1/4', false);
  const steps = [];
  for (let step = 1; step <= 4; step++) {
    steps.push({ step, observed: (await inspect()).map(item => item.text).filter(Boolean) });
    await call('mobile_save_screenshot', { saveTo: join(output, `step-${step}.png`) });
    await tap(step < 4 ? 'Tiếp tục' : 'Xem đề xuất');
  }
  await find('ĐÃ TẢI BẢNG GIÁ', false);
  await find('3 gói để bạn so sánh', false);
  await call('mobile_save_screenshot', { saveTo: join(output, 'result.png') });
  writeFileSync(join(output, 'result.json'), JSON.stringify({ passed: true, device, steps }, null, 2));
  console.log(`Native consultation passed. Evidence: ${output}`);
} catch (error) {
  writeFileSync(join(output, 'result.json'), JSON.stringify({ passed: false, device, error: error.message }, null, 2));
  console.error(`${error.message}\nEvidence: ${output}`); process.exitCode = 1;
} finally { child.kill('SIGTERM'); }
