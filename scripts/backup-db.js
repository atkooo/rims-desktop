const fs = require("fs");
const path = require("path");
const logger = require("../src/main/helpers/logger");
const dbConfig = require("../src/main/config/database");

// Membuat backup database
async function backupDatabase() {
  const sourceFile = dbConfig.path;
  const backupDir = path.join(__dirname, "../data/backups");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `backup-${timestamp}.sqlite`);

  try {
    // Buat direktori backup jika belum ada
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Copy database file
    fs.copyFileSync(sourceFile, backupFile);
    logger.info(`Database backup created successfully at ${backupFile}`);

    // Hapus backup lama (simpan 5 backup terakhir)
    const files = fs
      .readdirSync(backupDir)
      .filter((file) => file.startsWith("backup-"))
      .sort()
      .reverse();

    if (files.length > 5) {
      files.slice(5).forEach((file) => {
        fs.unlinkSync(path.join(backupDir, file));
        logger.info(`Deleted old backup: ${file}`);
      });
    }
  } catch (error) {
    logger.error("Error during database backup:", error);
    throw error;
  }
}

backupDatabase().catch(console.error);
