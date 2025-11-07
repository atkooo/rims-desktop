const path = require("path");

/**
 * Konfigurasi database SQLite
 */
const dbConfig = {
  path: path.join(__dirname, "../../../data/database.sqlite"),
  options: {
    // Mengaktifkan foreign keys
    pragma: {
      foreign_keys: "ON",
    },
  },
};

module.exports = dbConfig;
