// Local opt-in only. Do not overwrite the normal Render environment or start a Backend.
const { spawn } = require('node:child_process');
const path = require('node:path');
console.log('Expo GitHub E2E: http://localhost:8081 -> http://localhost:5239/api');
const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), 'start', '--web', '--port', '8081'], {
  cwd: path.resolve(__dirname, '..'), stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_API_URL: 'http://localhost:5239/api', BROWSER: 'none' },
});
child.on('error', () => { console.error('Không thể khởi động Expo E2E.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
