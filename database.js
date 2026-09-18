const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFile = path.resolve(__dirname, 'polls.db');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        // Tabla de Encuestas (Contenedor principal)
        db.run(`CREATE TABLE IF NOT EXISTS polls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT
        )`);

        // Tabla de Preguntas (Permite varias preguntas por encuesta)
        db.run(`CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            poll_id INTEGER,
            question_text TEXT NOT NULL,
            FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
        )`);

        // Tabla de Opciones de respuesta para cada pregunta
        db.run(`CREATE TABLE IF NOT EXISTS options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER,
            text TEXT NOT NULL,
            votes INTEGER DEFAULT 0,
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
        )`);

        // Insertar datos predeterminados si la tabla polls está vacía
        db.get(`SELECT COUNT(*) as count FROM polls`, (err, row) => {
            if (row && row.count === 0) {
                console.log('Creando encuestas predeterminadas en el sistema...');
                
                // Encuesta 1: Satisfacción Laboral y Tecnológica (Multi-pregunta)
                db.run(`INSERT INTO polls (title, description) VALUES (?, ?)`, 
                    ["Evaluación de Clima Laboral y Tecnologías 2026", "Encuesta integral sobre herramientas de desarrollo y ambiente de trabajo."], 
                    function(err) {
                        const poll1Id = this.lastID;

                        // Pregunta 1
                        db.run(`INSERT INTO questions (poll_id, question_text) VALUES (?, ?)`, [poll1Id, "¿Qué lenguaje de programación prefieres para el backend?"], function(err) {
                            const q1Id = this.lastID;
                            db.run(`INSERT INTO options (question_id, text) VALUES (?, ?)`, [q1Id, "Node.js / JavaScript"]);
                            db.run(`INSERT INTO options (question_id, text) VALUES (?, ?)`, [q1Id, "Python (FastAPI / Django)"]);
                            db.run(`INSERT INTO options (question_id, text) VALUES (?, ?)`, [q1Id, "Java / Spring Boot"]);
                        });

                        // Pregunta 2
                        db.run(`INSERT INTO questions (poll_id, question_text) VALUES (?, ?)`, [poll1Id, "¿Cómo calificarías el ambiente de trabajo actual?"], function(err) {
                            const q2Id = this.lastID;
                            db.run(`INSERT INTO options (question_id, text) VALUES (?, ?)`, [q2Id, "Excelente"]);
                            db.run(`INSERT INTO options (question_id, text) VALUES (?, ?)`, [q2Id, "Bueno"]);
                            db.run(`INSERT INTO options (question_id, text) VALUES (?, ?)`, [q2Id, "Necesita mejoras"]);
                        });
                    }
                );

                // Encuesta 2: Hábitos de Desarrollo
                db.run(`INSERT INTO polls (title, description) VALUES (?, ?)`, 
                    ["Hábitos y Metodologías de Desarrollo", "Conoce las preferencias del equipo en metodologías ágiles."], 
                    function(err) {
                        const poll2Id = this.lastID;

                        db.run(`INSERT INTO questions (poll_id, question_text) VALUES (?, ?)`, [poll2Id, "¿Qué metodología ágil utilizas más en tus proyectos?"], function(err) {
                            const q3Id = this.lastID;
                            db.run(`INSERT INTO options (question_id, text) VALUES (?, ?)`, [q3Id, "Scrum"]);
                            db.run(`INSERT INTO options (question_id, text) VALUES (?, ?)`, [q3Id, "Kanban"]);
                            db.run(`INSERT INTO options (question_id, text) VALUES (?, ?)`, [q3Id, "Programación Extrema (XP)"]);
                        });
                    }
                );
            }
        });
    });
}

module.exports = db;
