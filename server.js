const express = require('express');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Ver lista de encuestas
app.get('/', (req, res) => {
    db.all(`SELECT * FROM polls`, [], (err, polls) => {
        if (err) return res.status(500).send("Error interno");
        res.render('index', { polls });
    });
});

// 2. Formulario para crear encuesta multi-pregunta (Vista sencilla guiada)
app.get('/poll/create', (req, res) => {
    res.render('create_poll', { error: null });
});

// 3. Guardar nueva encuesta multi-pregunta
app.post('/poll/create', (req, res) => {
    const { title, description, question_text, option_1, option_2, option_3 } = req.body;

    if (!title || !question_text) {
        return res.render('create_poll', { error: "El título y al menos una pregunta son obligatorios." });
    }

    db.run(`INSERT INTO polls (title, description) VALUES (?, ?)`, [title, description || ''], function(err) {
        if (err) return res.status(500).send("Error al crear encuesta");
        const pollId = this.lastID;

        db.run(`INSERT INTO questions (poll_id, question_text) VALUES (?, ?)`, [pollId, question_text], function(err) {
            const qId = this.lastID;
            const validOptions = [option_1, option_2, option_3].filter(opt => opt && opt.trim() !== "");
            
            const stmt = db.prepare(`INSERT INTO options (question_id, text, votes) VALUES (?, ?, 0)`);
            validOptions.forEach(optText => {
                stmt.run(qId, optText);
            });
            stmt.finalize(() => {
                res.redirect('/');
            });
        });
    });
});

// 4. Ver formulario de votación (Carga la encuesta con todas sus preguntas y opciones)
app.get('/poll/:id', (req, res) => {
    const pollId = req.params.id;
    
    db.get(`SELECT * FROM polls WHERE id = ?`, [pollId], (err, poll) => {
        if (err || !poll) return res.status(404).send("Encuesta no encontrada");

        db.all(`SELECT * FROM questions WHERE poll_id = ?`, [pollId], (err, questions) => {
            if (err) return res.status(500).send("Error al cargar preguntas");

            let loadedQuestions = 0;
            if (questions.length === 0) {
                poll.questions = [];
                return res.render('vote_poll', { poll });
            }

            questions.forEach((q, index) => {
                db.all(`SELECT * FROM options WHERE question_id = ?`, [q.id], (err, options) => {
                    questions[index].options = options;
                    loadedQuestions++;
                    
                    if (loadedQuestions === questions.length) {
                        poll.questions = questions;
                        res.render('vote_poll', { poll });
                    }
                });
            });
        });
    });
});

// 5. Procesar los votos múltiples de la encuesta
app.post('/poll/:id/vote', (req, res) => {
    const pollId = req.params.id;
    const votesSubmitted = req.body; // Viene en formato { [question_id]: option_id }

    const optionIds = Object.values(votesSubmitted);
    if (optionIds.length === 0) {
        return res.status(400).send("No seleccionaste ninguna opción.");
    }

    let completed = 0;
    optionIds.forEach(optId => {
        db.run(`UPDATE options SET votes = votes + 1 WHERE id = ?`, [optId], (err) => {
            completed++;
            if (completed === optionIds.length) {
                res.redirect(`/poll/${pollId}/results`);
            }
        });
    });
});

// 6. Ver resultados agrupados por preguntas
app.get('/poll/:id/results', (req, res) => {
    const pollId = req.params.id;

    db.get(`SELECT * FROM polls WHERE id = ?`, [pollId], (err, poll) => {
        if (err || !poll) return res.status(404).send("Encuesta no encontrada");

        db.all(`SELECT * FROM questions WHERE poll_id = ?`, [pollId], (err, questions) => {
            if (err) return res.status(500).send("Error al cargar resultados");

            let loaded = 0;
            if (questions.length === 0) {
                poll.questions = [];
                return res.render('results', { poll });
            }

            questions.forEach((q, index) => {
                db.all(`SELECT * FROM options WHERE question_id = ?`, [q.id], (err, options) => {
                    questions[index].options = options;
                    loaded++;

                    if (loaded === questions.length) {
                        poll.questions = questions;
                        res.render('results', { poll });
                    }
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
