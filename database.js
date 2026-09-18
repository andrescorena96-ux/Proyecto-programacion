const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFile = path.resolve(__dirname, 'polls.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
    }
});

// Crear tablas si no existen
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS polls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        votes INTEGER DEFAULT 0,
        poll_id INTEGER,
        FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    )`);
});

module.exports = db;
