const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[Backend Request] ${req.method} ${req.url}`, req.body);
  next();
});
// Initialize SQLite database
const dbPath = path.join(__dirname, 'smartledger_v2.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run('PRAGMA journal_mode=WAL;', (err) => {
      if (err) console.error('Failed to set WAL mode', err.message);
      else console.log('WAL journal mode enabled.');
    });
    createTables();
  }
});

function createTables() {
  db.serialize(() => {
    // Projects Table
    db.run(`CREATE TABLE IF NOT EXISTS projects (
      name TEXT PRIMARY KEY
    )`);

    // Categories Table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY
    )`);

    // Obligations Table
    db.run(`CREATE TABLE IF NOT EXISTS obligations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      project TEXT NOT NULL,
      paid INTEGER DEFAULT 0
    )`);

    // Transactions Table
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      project TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL
    )`, () => {
      // Seed data if empty
      seedDatabase();
    });
  });
}

function seedDatabase() {
  // Check if projects table is empty
  db.get('SELECT COUNT(*) as count FROM projects', (err, row) => {
    if (row && row.count === 0) {
      console.log('Seeding initial database content...');
      // Insert Projects
      const projects = ['Personal', 'Syneur Technologies', 'Cocoa Stories'];
      const stmtProj = db.prepare('INSERT INTO projects (name) VALUES (?)');
      projects.forEach(p => stmtProj.run(p));
      stmtProj.finalize();

      // Insert Categories
      const categories = ['Rent', 'EMI', 'Salary', 'Groceries', 'Utilities', 'Software Subscription', 'Consulting', 'Marketing'];
      const stmtCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
      categories.forEach(c => stmtCat.run(c));
      stmtCat.finalize();

      // Insert Obligations
      const obligations = [
        ['Office Rent', 1500, 'Expense', 'Monthly', '2026-06-15', 'Syneur Technologies', 0],
        ['AWS Cloud Hosting', 350, 'Expense', 'Monthly', '2026-06-18', 'Syneur Technologies', 0],
        ['Equipment Loan EMI', 500, 'Expense', 'Monthly', '2026-06-25', 'Cocoa Stories', 0],
        ['Adobe Creative Suite', 80, 'Expense', 'Monthly', '2026-06-12', 'Personal', 0]
      ];
      const stmtOb = db.prepare('INSERT INTO obligations (name, amount, type, frequency, dueDate, project, paid) VALUES (?, ?, ?, ?, ?, ?, ?)');
      obligations.forEach(ob => stmtOb.run(ob));
      stmtOb.finalize();

      // Insert Transactions
      const transactions = [
        ['Income', 5000, 'Consulting Retainer', 'Syneur Technologies', 'Consulting', '2026-06-01'],
        ['Expense', 1200, 'Office Rent Payment', 'Syneur Technologies', 'Rent', '2026-06-01'],
        ['Income', 3200, 'Client Project Launch', 'Cocoa Stories', 'Consulting', '2026-06-05'],
        ['Expense', 150, 'Local Marketing Flyers', 'Cocoa Stories', 'Marketing', '2026-06-07'],
        ['Expense', 120, 'Weekly Groceries', 'Personal', 'Groceries', '2026-06-08']
      ];
      const stmtTx = db.prepare('INSERT INTO transactions (type, amount, description, project, category, date) VALUES (?, ?, ?, ?, ?, ?)');
      transactions.forEach(tx => stmtTx.run(tx));
      stmtTx.finalize();
      console.log('Database successfully seeded with local original default data.');
    }
  });
}

// REST API Endpoints

// Root welcome route
app.get('/', (req, res) => {
  res.send('SmartLedger API Server is running successfully!');
});

// 1. Projects REST API
app.get('/api/projects', (req, res) => {
  db.all('SELECT name FROM projects', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.name));
  });
});

app.post('/api/projects', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });
  db.run('INSERT INTO projects (name) VALUES (?)', [name.trim()], (err) => {
    if (err) return res.status(400).json({ error: 'Project already exists' });
    res.json({ name: name.trim() });
  });
});

app.delete('/api/projects/:name', (req, res) => {
  const { name } = req.params;
  db.run('DELETE FROM projects WHERE name = ?', [name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Project removed successfully', changes: this.changes });
  });
});

// 2. Categories REST API
app.get('/api/categories', (req, res) => {
  db.all('SELECT name FROM categories', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.name));
  });
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  db.run('INSERT INTO categories (name) VALUES (?)', [name.trim()], (err) => {
    if (err) return res.status(400).json({ error: 'Category already exists' });
    res.json({ name: name.trim() });
  });
});

app.delete('/api/categories/:name', (req, res) => {
  const { name } = req.params;
  db.run('DELETE FROM categories WHERE name = ?', [name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Category removed successfully', changes: this.changes });
  });
});

// 3. Transactions REST API
app.get('/api/transactions', (req, res) => {
  db.all('SELECT * FROM transactions ORDER BY date DESC, id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/transactions', (req, res) => {
  const { type, amount, description, project, category, date } = req.body;
  const numAmount = Number(amount);
  if (isNaN(numAmount)) {
    return res.status(400).json({ error: 'Amount must be a valid number' });
  }
  db.run(
    'INSERT INTO transactions (type, amount, description, project, category, date) VALUES (?, ?, ?, ?, ?, ?)',
    [type, numAmount, description || '', project, category, date],
    function(err) {
      if (err) {
        console.error('[Database Error] Failed to insert transaction:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, type, amount: numAmount, description, project, category, date });
    }
  );
});

// 4. Obligations REST API
app.get('/api/obligations', (req, res) => {
  db.all('SELECT * FROM obligations ORDER BY dueDate ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Convert paid 0/1 back to boolean
    const formatted = rows.map(r => ({ ...r, paid: !!r.paid }));
    res.json(formatted);
  });
});

app.post('/api/obligations', (req, res) => {
  const { name, amount, type, frequency, dueDate, project } = req.body;
  const numAmount = Number(amount);
  if (isNaN(numAmount)) {
    return res.status(400).json({ error: 'Amount must be a valid number' });
  }
  db.run(
    'INSERT INTO obligations (name, amount, type, frequency, dueDate, project, paid) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [name, numAmount, type, frequency || 'Monthly', dueDate, project],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, amount: numAmount, type, frequency, dueDate, project, paid: false });
    }
  );
});

// Mark obligation as paid and write it to transactions
app.put('/api/obligations/:id/pay', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM obligations WHERE id = ?', [id], (err, obligation) => {
    if (err || !obligation) return res.status(404).json({ error: 'Obligation not found' });
    
    db.serialize(() => {
      // 1. Mark paid
      db.run('UPDATE obligations SET paid = 1 WHERE id = ?', [id]);
      
      // 2. Create ledger transaction
      const dateToday = new Date().toISOString().split('T')[0];
      const category = obligation.type === 'Expense' ? 'Rent' : 'Salary';
      
      db.run(
        'INSERT INTO transactions (type, amount, description, project, category, date) VALUES (?, ?, ?, ?, ?, ?)',
        [obligation.type, obligation.amount, `Paid Obligation: ${obligation.name}`, obligation.project, category, dateToday],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ 
            message: 'Obligation paid and recorded to ledger', 
            obligationId: Number(id), 
            transactionId: this.lastID 
          });
        }
      );
    });
  });
});

app.listen(PORT, () => {
  console.log(`Backend API Server running at http://localhost:${PORT}`);
});
