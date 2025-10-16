const fs = require('fs');
const path = require('path');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('Created database directory:', dbDir);
}

// Copy the database file if it doesn't exist in the expected location
const sourceDb = path.join(__dirname, '../db/custom.db');
const targetDb = path.join(__dirname, '../db/custom.db');

if (fs.existsSync(sourceDb) && !fs.existsSync(targetDb)) {
  fs.copyFileSync(sourceDb, targetDb);
  console.log('Copied database file to:', targetDb);
}

console.log('Database setup completed');