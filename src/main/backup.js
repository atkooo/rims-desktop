const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

module.exports = {
  backup: () => {
    const src = path.join(process.cwd(), 'data', 'rims.db');
    const destDir = path.join(process.cwd(), 'data', 'backups');
    ensureDir(destDir);
    const stamp = new Date().toISOString().slice(0,10);
    const dest = path.join(destDir, `${stamp}_rims.db`);
    fs.copyFileSync(src, dest);
    return dest;
  },
  restore: (backupFile) => {
    const dest = path.join(process.cwd(), 'data', 'rims.db');
    fs.copyFileSync(backupFile, dest);
    return dest;
  },
};
