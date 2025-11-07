const path = require('path');
const { getDb } = require(path.join(__dirname, '..', 'src', 'main', 'database'));

try {
  const db = getDb();
  const rows = db.prepare('SELECT id, code, name, price, rental_price_per_day, stock_quantity, available_quantity FROM bundles').all();
  console.log('bundles:', rows);
  process.exit(0);
} catch (err) {
  console.error('Error querying DB:', err);
  process.exit(1);
}
