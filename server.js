const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Ver lista de encuestas
app.get('/', (req, res) => {
    db.all(`SELECT * FROM polls`, [], (err, polls) => {
        if (err) {
            return res.status(500).send("Error interno del servidor");
        }
        res.render('index', { polls });
    });
});

// 2. Formulario para crear encuesta
app.get('/poll/create', (req, res) => {
    res.render('create_poll', { error: null });
});

// 3. Guardar nueva encuesta
app.post('/poll/create', (req, res) => {
    let { title, options } = req.body;
    
    // Asegurar que options sea un array y limpiar vacíos
    if (!Array.isArray(options)) {
        options = [options];
    }
    const validOptions = options.map(opt => opt.trim()).filter(opt => opt.length > 0);

    if (!title || title.trim() === "" || validOptions.length < 2) {
        return res.render('create_poll', { 
            error: "Debes ingresar un título y al menos 2 opciones válidas." 
        });
    }

    db.run(`INSERT INTO polls (title) VALUES (?)`, [title.trim()], function(err) {
        if (err) {
            return res.status(500).send("Error al crear la encuesta");
        }
        const pollId = this.lastID;

        const stmt = db.prepare(`INSERT INTO options (text, votes, poll_id) VALUES (?, 0, ?)`);
        validOptions.forEach(optText => {
            stmt.run(optText, pollId);
        });
        stmt.finalize(() => {
            res.redirect('/');
        });
    });
});

// 4. Ver formulario de votación
app.get('/poll/:id', (req, res) => {
    const pollId = req.params.id;
    db.get(`SELECT * FROM polls WHERE id = ?`, [pollId], (err, poll) => {
        if (err || !poll) {
            return res.status(404).send("Encuesta no encontrada");
        }
        db.all(`SELECT * FROM options WHERE poll_id = ?`, [pollId], (err, options) => {
            if (err) {
                return res.status(500).send("Error al cargar opciones");
            }
            poll.options = options;
            res.render('vote_poll', { poll });
        });
    });
});

// 5. Procesar el voto
app.post('/poll/:id/vote', (req, res) => {
    const pollId = req.params.id;
    const optionId = req.body.option_id;

    if (!optionId) {
        return res.status(400).send("Debes seleccionar una opción");
    }

    db.run(`UPDATE options SET votes = votes + 1 WHERE id = ? AND poll_id = ?`, [optionId, pollId], (err) => {
        if (err) {
            return res.status(500).send("Error al registrar el voto");
        }
        res.redirect(`/poll/${pollId}/results`);
    });
});

// 6. Ver resultados de la encuesta
app.get('/poll/:id/results', (req, res) => {
    const pollId = req.params.id;
    db.get(`SELECT * FROM polls WHERE id = ?`, [pollId], (err, poll) => {
        if (err || !poll) {
            return res.status(404).send("Encuesta no encontrada");
        }
        db.all(`SELECT * FROM options WHERE poll_id = ?`, [pollId], (err, options) => {
            if (err) {
                return res.status(500).send("Error al cargar resultados");
            }
            poll.options = options;
            res.render('results', { poll });
        });
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
