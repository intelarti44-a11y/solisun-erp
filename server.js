const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Identifiants (modifiables via variables d'environnement sur Railway)
const LOGIN_USER     = process.env.LOGIN_USER     || 'admin';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'SoliSun2024!';
const SESSION_SECRET = process.env.SESSION_SECRET || 'solisun-secret-key-change-me';

// Middlewares de base
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 8 * 60 * 60 * 1000 } // 8 heures
}));

// Content Security Policy
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; " +
        "connect-src *; " +
        "img-src 'self' data:;"
    );
    next();
});

// Middleware d'authentification
function requireAuth(req, res, next) {
    if (req.session && req.session.loggedIn) {
        return next();
    }
    // Si c'est une requête API, renvoyer 401
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    // Sinon rediriger vers login
    res.redirect('/login');
}

// ─── Routes publiques (login) ───────────────────────────────────────────────

// Page de login GET
app.get('/login', (req, res) => {
    if (req.session && req.session.loggedIn) return res.redirect('/');
    const error = req.query.error === '1';
    let html = require('fs').readFileSync(path.join(__dirname, 'login.html'), 'utf8');
    html = html.replace('<% if (error) { %>', error ? '' : '<!--');
    html = html.replace('<% } %>', error ? '' : '-->');
    res.send(html);
});

// Login POST
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === LOGIN_USER && password === LOGIN_PASSWORD) {
        req.session.loggedIn = true;
        req.session.username = username;
        res.redirect('/');
    } else {
        res.redirect('/login?error=1');
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ─── Fichiers statiques protégés ────────────────────────────────────────────
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/app.js', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'app.js'));
});

// ─── Assets publics (appelés depuis login.html, CDN ne nécessite pas de protection) ──
// Aucun fichier statique servi sans auth - tout passe par les routes explicites ci-dessus
// Les fonts/icons viennent de CDN externe, pas besoin de les servir localement

// Utilitaire: formatage téléphone français -> "06 01 01 01 01"
function formatPhone(raw) {
    if (!raw) return raw;
    const s = raw.toString().trim();
    if (/[a-zA-Z]{3,}/.test(s)) return s; // texte libre (ex: "a rappeler")
    let digits = s.replace(/[\s.\/\-\(\)]/g, '');
    if (digits.startsWith('+33')) digits = '0' + digits.slice(3);
    else if (digits.startsWith('0033')) digits = '0' + digits.slice(4);
    else if (digits.startsWith('33') && digits.length === 11) digits = '0' + digits.slice(2);
    digits = digits.replace(/\D/g, '');
    if (digits.length < 10) return s;
    if (digits.length > 10) digits = digits.slice(-10);
    return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
}

// Database setup — Volume persistant Railway
const fs = require('fs');
const DATA_DIR  = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const dbPath    = path.join(DATA_DIR, 'database.sqlite');
const seedPath  = path.join(__dirname, 'database.sqlite'); // fichier initial (GitHub)

// Créer le dossier data s'il n'existe pas (mode local)
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Si la base persistante n'existe pas encore → copier les données initiales
if (!fs.existsSync(dbPath) && fs.existsSync(seedPath)) {
    fs.copyFileSync(seedPath, dbPath);
    console.log('✅ Base de données initiale copiée dans le volume persistant.');
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Erreur de connexion à la base de données :", err.message);
    } else {
        console.log(`Connecté à la base de données SQLite : ${dbPath}`);
        initializeDatabase(db);
    }
});

function initializeDatabase(database) {
    database.run(`
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            
            -- Fiche client
            nom TEXT NOT NULL,
            telephone TEXT NOT NULL,
            email TEXT,
            adresse TEXT NOT NULL,
            code_postal TEXT NOT NULL,
            ville TEXT NOT NULL,
            
            -- Suivi commercial
            date_contact TEXT,
            date_rdv TEXT,
            commercial TEXT,
            statut_commercial TEXT,
            
            -- Projet installation
            type_installation TEXT,
            batterie TEXT,
            type_toiture TEXT,
            commentaires TEXT,
            
            -- Devis
            prix_installation_ht REAL,
            taux_tva REAL,
            montant_devis REAL,
            date_envoi_devis TEXT,
            date_signature TEXT,
            mode_paiement TEXT,
            
            -- Chantier / Admin
            statut_chantier TEXT,
            date_debut TEXT,
            enedis TEXT,
            consuel TEXT,
            
            -- Autres infos
            type_client TEXT,
            observations TEXT,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error("Erreur lors de la création de la table :", err.message);
        } else {
            // Apply migrations silently if columns missing
            db.run(`ALTER TABLE clients ADD COLUMN prix_installation_ht REAL`, () => {});
            db.run(`ALTER TABLE clients ADD COLUMN taux_tva REAL`, () => {});
            db.run(`ALTER TABLE clients ADD COLUMN type_client TEXT DEFAULT 'Particulier'`, () => {});
            db.run(`ALTER TABLE clients ADD COLUMN observations TEXT`, () => {});
            db.run(`ALTER TABLE clients ADD COLUMN acompte_1_montant REAL`, () => {});
            db.run(`ALTER TABLE clients ADD COLUMN acompte_1_date TEXT`, () => {});
            db.run(`ALTER TABLE clients ADD COLUMN acompte_2_montant REAL`, () => {});
            db.run(`ALTER TABLE clients ADD COLUMN acompte_2_date TEXT`, () => {});
            db.run(`ALTER TABLE clients ADD COLUMN solde_montant REAL`, () => {});
            db.run(`ALTER TABLE clients ADD COLUMN solde_date TEXT`, () => {});
            
            db.run(`
                CREATE TABLE IF NOT EXISTS commerciaux (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nom TEXT UNIQUE NOT NULL
                )
            `, (err) => {
                if (!err) {
                    // Inject sample data if table is empty
                    db.get(`SELECT COUNT(*) as count FROM commerciaux`, (err, row) => {
                        if (row && row.count === 0) {
                            db.run(`INSERT INTO commerciaux (nom) VALUES ('Greg'), ('Lucas'), ('Marie')`);
                        }
                    });
                }
            });
            
            db.run(`
                CREATE TABLE IF NOT EXISTS installations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nom TEXT UNIQUE NOT NULL
                )
            `, (err) => {
                if (!err) {
                    db.get(`SELECT COUNT(*) as count FROM installations`, (err, row) => {
                        if (row && row.count === 0) {
                            db.run(`INSERT INTO installations (nom) VALUES ('3 kWc'), ('6 kWc'), ('9 kWc')`);
                        }
                    });
                }
            });
            
            console.log("Tables SQLite initialisées.");
        }
    });
}

// API Routes — toutes protégées par authentification
app.get('/api/clients', requireAuth, (req, res) => {
    const sql = `SELECT * FROM clients ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ clients: rows });
    });
});

app.post('/api/clients', requireAuth, (req, res) => {
    const data = req.body;
    
    const sql = `
        INSERT INTO clients (
            nom, telephone, email, adresse, code_postal, ville,
            date_contact, date_rdv, commercial, statut_commercial,
            type_installation, batterie, type_toiture, commentaires,
            prix_installation_ht, taux_tva, montant_devis, date_envoi_devis, date_signature, mode_paiement,
            statut_chantier, date_debut, enedis, consuel,
            type_client, observations,
            acompte_1_montant, acompte_1_date, acompte_2_montant, acompte_2_date, solde_montant, solde_date
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;
    
    const params = [
        data.nom, formatPhone(data.telephone), data.email, data.adresse, data.code_postal, data.ville,
        data.date_contact, data.date_rdv, data.commercial, data.statut_commercial,
        data.type_installation, data.batterie, data.type_toiture, data.commentaires,
        data.prix_installation_ht, data.taux_tva, data.montant_devis, data.date_envoi_devis, data.date_signature, data.mode_paiement,
        data.statut_chantier, data.date_debut, data.enedis, data.consuel,
        data.type_client, data.observations,
        data.acompte_1_montant, data.acompte_1_date, data.acompte_2_montant, data.acompte_2_date, data.solde_montant, data.solde_date
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Dossier client enregistré =)", clientId: this.lastID });
    });
});

app.put('/api/clients/:id', requireAuth, (req, res) => {
    const data = req.body;
    const id = req.params.id;
    
    const sql = `
        UPDATE clients SET
            nom = ?, telephone = ?, email = ?, adresse = ?, code_postal = ?, ville = ?,
            date_contact = ?, date_rdv = ?, commercial = ?, statut_commercial = ?,
            type_installation = ?, batterie = ?, type_toiture = ?, commentaires = ?,
            prix_installation_ht = ?, taux_tva = ?, montant_devis = ?, date_envoi_devis = ?, date_signature = ?, mode_paiement = ?,
            statut_chantier = ?, date_debut = ?, enedis = ?, consuel = ?,
            type_client = ?, observations = ?,
            acompte_1_montant = ?, acompte_1_date = ?, acompte_2_montant = ?, acompte_2_date = ?, solde_montant = ?, solde_date = ?
        WHERE id = ?
    `;
    
    const params = [
        data.nom, formatPhone(data.telephone), data.email, data.adresse, data.code_postal, data.ville,
        data.date_contact, data.date_rdv, data.commercial, data.statut_commercial,
        data.type_installation, data.batterie, data.type_toiture, data.commentaires,
        data.prix_installation_ht, data.taux_tva, data.montant_devis, data.date_envoi_devis, data.date_signature, data.mode_paiement,
        data.statut_chantier, data.date_debut, data.enedis, data.consuel,
        data.type_client, data.observations,
        data.acompte_1_montant, data.acompte_1_date, data.acompte_2_montant, data.acompte_2_date, data.solde_montant, data.solde_date,
        id
    ];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Dossier client mis à jour =)", changes: this.changes });
    });
});

// --- API: COMMERCIAUX ---
app.get('/api/commerciaux', requireAuth, (req, res) => {
    db.all(`SELECT * FROM commerciaux ORDER BY nom ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ commerciaux: rows });
    });
});

app.post('/api/commerciaux', requireAuth, (req, res) => {
    const { nom } = req.body;
    db.run(`INSERT INTO commerciaux (nom) VALUES (?)`, [nom], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Commercial ajouté", id: this.lastID, nom });
    });
});

app.delete('/api/commerciaux/:id', requireAuth, (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM commerciaux WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Commercial supprimé" });
    });
});

// --- API: INSTALLATIONS ---
app.get('/api/installations', requireAuth, (req, res) => {
    db.all(`SELECT * FROM installations ORDER BY id ASC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ installations: rows });
    });
});

app.post('/api/installations', requireAuth, (req, res) => {
    const { nom } = req.body;
    db.run(`INSERT INTO installations (nom) VALUES (?)`, [nom], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Type ajouté", id: this.lastID, nom });
    });
});

app.delete('/api/installations/:id', requireAuth, (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM installations WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Type supprimé" });
    });
});

// Starts the Server
app.listen(PORT, () => {
    console.log('');
    console.log('==============================================');
    console.log(`🚀 Serveur SoliSun ERP démarré sur http://localhost:${PORT}`);
    console.log('==============================================');
    console.log('');
});
