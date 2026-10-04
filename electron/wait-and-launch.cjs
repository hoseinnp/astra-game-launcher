const http = require('http');
const { spawn } = require('child_process');

function checkVite() {
  const req = http.get('http://localhost:5173', () => {
    console.log('[Dev] Vite is ready, launching Electron...');
    const electron = require('electron');
    const child = spawn(electron, ['.'], { stdio: 'inherit', shell: true });
    child.on('close', (code) => {
      process.exit(code || 0);
    });
  });

  req.on('error', () => {
    setTimeout(checkVite, 300);
  });
}

checkVite();
