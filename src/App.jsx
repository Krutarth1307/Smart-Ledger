import React, { useState, useEffect } from 'react'

// Mock initial data
const DEFAULT_PROJECTS = ['Personal', 'Syneur Technologies', 'Cocoa Stories']
const DEFAULT_CATEGORIES = ['Rent', 'EMI', 'Salary', 'Groceries', 'Utilities', 'Software Subscription', 'Consulting', 'Marketing']
const DEFAULT_OBLIGATIONS = [
  { id: 1, name: 'Office Rent', amount: 1500, type: 'Expense', frequency: 'Monthly', dueDate: '2026-06-15', project: 'Syneur Technologies', paid: false },
  { id: 2, name: 'AWS Cloud Hosting', amount: 350, type: 'Expense', frequency: 'Monthly', dueDate: '2026-06-18', project: 'Syneur Technologies', paid: false },
  { id: 3, name: 'Equipment Loan EMI', amount: 500, type: 'Expense', frequency: 'Monthly', dueDate: '2026-06-25', project: 'Cocoa Stories', paid: false },
  { id: 4, name: 'Adobe Creative Suite', amount: 80, type: 'Expense', frequency: 'Monthly', dueDate: '2026-06-12', project: 'Personal', paid: false }
]
const DEFAULT_TRANSACTIONS = [
  { id: 1, type: 'Income', amount: 5000, description: 'Consulting Retainer', project: 'Syneur Technologies', category: 'Consulting', date: '2026-06-01' },
  { id: 2, type: 'Expense', amount: 1200, description: 'Office Rent Payment', project: 'Syneur Technologies', category: 'Rent', date: '2026-06-01' },
  { id: 3, type: 'Income', amount: 3200, description: 'Client Project Launch', project: 'Cocoa Stories', category: 'Consulting', date: '2026-06-05' },
  { id: 4, type: 'Expense', amount: 150, description: 'Local Marketing Flyers', project: 'Cocoa Stories', category: 'Marketing', date: '2026-06-07' },
  { id: 5, type: 'Expense', amount: 120, description: 'Weekly Groceries', project: 'Personal', category: 'Groceries', date: '2026-06-08' }
]

const formatCurrency = (val, decimals = 2) => {
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? '0.00' : num.toFixed(decimals);
};

export default function App() {
  // Authentication State
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('sl_user')
    return savedUser ? JSON.parse(savedUser) : null
  })

  // App Data States (Loaded dynamically from SQLite DB)
  const [transactions, setTransactions] = useState([])
  const [projects, setProjects] = useState([])
  const [categories, setCategories] = useState([])
  const [obligations, setObligations] = useState([])

  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard')

  // UI Toast State
  const [toast, setToast] = useState(null)

  // Auth Screen Input States
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState('login') // 'login' or 'register'

  // Load state from SQLite database on mount
  useEffect(() => {
    if (!user) return

    fetch('/api/projects')
      .then(res => res.json())
      .then(setProjects)
      .catch(err => console.error('Error fetching projects:', err))

    fetch('/api/categories')
      .then(res => res.json())
      .then(setCategories)
      .catch(err => console.error('Error fetching categories:', err))

    fetch('/api/transactions')
      .then(res => res.json())
      .then(setTransactions)
      .catch(err => console.error('Error fetching transactions:', err))

    fetch('/api/obligations')
      .then(res => res.json())
      .then(setObligations)
      .catch(err => console.error('Error fetching obligations:', err))
  }, [user])

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  // Handle Simulated Auth
  const handleAuthSubmit = (e) => {
    e.preventDefault()
    if (!authEmail || !authPassword) {
      showToast('Please fill all credentials!')
      return
    }
    const mockUser = { email: authEmail, name: authEmail.split('@')[0] }
    localStorage.setItem('sl_user', JSON.stringify(mockUser))
    setUser(mockUser)
    showToast(`Welcome back, ${mockUser.name}!`)
  }

  const handleLogout = () => {
    localStorage.removeItem('sl_user')
    setUser(null)
    showToast('Logged out successfully.')
  }

  // Quick Entry Handler (Database POST)
  const handleAddTransaction = (newTx) => {
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to log transaction');
        return res.json();
      })
      .then(savedTx => {
        setTransactions([savedTx, ...transactions])
        showToast(`Logged ${savedTx.type}: ₹${formatCurrency(savedTx.amount)} for ${savedTx.project}`)
      })
      .catch(err => {
        console.error(err)
        showToast('Error logging transaction')
      })
  }

  // Handle marking obligation paid (Database PUT & reload lists)
  const handlePayObligation = (obligationId) => {
    fetch(`/api/obligations/${obligationId}/pay`, { method: 'PUT' })
      .then(res => {
        if (!res.ok) throw new Error('Payment failed')
        return res.json()
      })
      .then(() => {
        showToast('Obligation paid and recorded to Ledger!')
        // Refresh obligations and transactions from server
        fetch('/api/transactions').then(res => res.json()).then(setTransactions)
        fetch('/api/obligations').then(res => res.json()).then(setObligations)
      })
      .catch(err => {
        console.error(err)
        showToast('Error recording payment')
      })
  }

  // Handle adding new Project (Database POST)
  const handleAddProject = (newProjName) => {
    if (!newProjName.trim()) return
    if (projects.includes(newProjName.trim())) {
      showToast('Project already exists!')
      return
    }
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProjName })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save project');
        return res.json();
      })
      .then(saved => {
        setProjects([...projects, saved.name])
        showToast(`Added project "${saved.name}"`)
      })
      .catch(err => {
        console.error(err)
        showToast('Error saving project')
      })
  }

  // Handle adding new Category (Database POST)
  const handleAddCategory = (newCatName) => {
    if (!newCatName.trim()) return
    if (categories.includes(newCatName.trim())) {
      showToast('Category already exists!')
      return
    }
    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCatName })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save category');
        return res.json();
      })
      .then(saved => {
        setCategories([...categories, saved.name])
        showToast(`Added category "${saved.name}"`)
      })
      .catch(err => {
        console.error(err)
        showToast('Error saving category')
      })
  }

  // Handle removing a Project (Database DELETE)
  const handleRemoveProject = (projName) => {
    if (projects.length <= 1) {
      showToast('Must keep at least one project!')
      return
    }
    fetch(`/api/projects/${encodeURIComponent(projName)}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Deletion failed')
        setProjects(projects.filter(p => p !== projName))
        showToast(`Removed project "${projName}"`)
      })
      .catch(err => {
        console.error(err)
        showToast('Error deleting project')
      })
  }

  // Handle removing a Category (Database DELETE)
  const handleRemoveCategory = (catName) => {
    if (categories.length <= 1) {
      showToast('Must keep at least one category!')
      return
    }
    fetch(`/api/categories/${encodeURIComponent(catName)}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Deletion failed')
        setCategories(categories.filter(c => c !== catName))
        showToast(`Removed category "${catName}"`)
      })
      .catch(err => {
        console.error(err)
        showToast('Error deleting category')
      })
  }

  // Handle adding a recurring obligation (Database POST)
  const handleAddObligation = (newOb) => {
    fetch('/api/obligations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOb)
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save obligation');
        return res.json();
      })
      .then(savedOb => {
        setObligations([savedOb, ...obligations])
        showToast(`Created obligation: ${savedOb.name}`)
      })
      .catch(err => {
        console.error(err)
        showToast('Error saving commitment')
      })
  }

  // Calculations for Dashboard
  const totalIncome = transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0)
  const cashAvailable = totalIncome - totalExpense
  const upcomingLiability = obligations.filter(ob => !ob.paid && ob.type === 'Expense').reduce((sum, o) => sum + o.amount, 0)
  const netProfit = cashAvailable - upcomingLiability

  // Auth Screen View
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>SmartLedger</h1>
            <p>{authMode === 'login' ? 'Access your unified finances instantly' : 'Create a secure financial container'}</p>
          </div>
          <form onSubmit={handleAuthSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="you@example.com" 
                value={authEmail} 
                onChange={e => setAuthEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••" 
                value={authPassword} 
                onChange={e => setAuthPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
              {authMode === 'login' ? 'Sign In Securely' : 'Register Account'}
            </button>
          </form>
          <div style={{ marginTop: '20px', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>{' '}
            <button 
              className="nav-btn" 
              style={{ padding: '0 4px', textDecoration: 'underline', color: 'var(--primary)' }}
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            >
              {authMode === 'login' ? 'Create one' : 'Log in'}
            </button>
          </div>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    )
  }

  // App Layout Screen
  return (
    <div>
      <header className="app-header">
        <div className="header-container">
          <div className="logo">SmartLedger</div>
          <nav className="nav-links">
            <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
            <button className={`nav-btn ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>Ledger</button>
            <button className={`nav-btn ${activeTab === 'obligations' ? 'active' : ''}`} onClick={() => setActiveTab('obligations')}>Obligations</button>
            <button className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
            <button className="nav-btn" onClick={handleLogout} style={{ color: 'var(--danger)', marginLeft: '12px' }}>Logout</button>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && (
          <div className="dashboard-grid">
            <div>
              {/* KPI cards */}
              <div className="kpi-row">
                <div className="kpi-card">
                  <div className="kpi-title">Cash Available</div>
                  <div className="kpi-value balance">₹{formatCurrency(cashAvailable)}</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-title">Net Profit (Projected)</div>
                  <div className={`kpi-value ${netProfit >= 0 ? 'income' : 'expense'}`}>
                    ₹{formatCurrency(netProfit)}
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-title">Upcoming Bills</div>
                  <div className="kpi-value expense">₹{formatCurrency(upcomingLiability)}</div>
                </div>
              </div>

              {/* Quick Entry Box */}
              <QuickEntry 
                projects={projects} 
                categories={categories} 
                onSubmit={handleAddTransaction} 
              />

              {/* Recent Ledger Transactions */}
              <div className="quick-entry-card">
                <div className="card-header">
                  <h2 className="section-title">Recent Ledger Entries</h2>
                  <button className="nav-btn" onClick={() => setActiveTab('ledger')}>View Full Ledger</button>
                </div>
                <div className="item-list">
                  {transactions.slice(0, 4).map(tx => (
                    <div className="list-item" key={tx.id}>
                      <div className="item-details">
                        <span className="item-title">{tx.description || tx.category}</span>
                        <span className="item-subtitle">{tx.project} • {tx.date}</span>
                      </div>
                      <div className={`item-value ${tx.type === 'Income' ? 'income' : 'expense'}`}>
                        {tx.type === 'Income' ? '+' : '-'}₹{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                      No transactions logged yet. Use the entry panel above.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              {/* Project Profitability Dashboard component */}
              <div className="quick-entry-card">
                <h2 className="section-title" style={{ marginBottom: '16px' }}>Project Health</h2>
                <div className="item-list">
                  {projects.map(proj => {
                    const projIncome = transactions.filter(t => t.project === proj && t.type === 'Income').reduce((sum, t) => sum + t.amount, 0)
                    const projExpense = transactions.filter(t => t.project === proj && t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0)
                    const projLiability = obligations.filter(ob => ob.project === proj && !ob.paid && ob.type === 'Expense').reduce((sum, o) => sum + o.amount, 0)
                    const profit = projIncome - projExpense - projLiability
                    return (
                      <div className="list-item" key={proj}>
                        <div className="item-details">
                          <span className="item-title">{proj}</span>
                          <span className="item-subtitle">In: ₹{formatCurrency(projIncome, 0)} | Out: ₹{formatCurrency(projExpense + projLiability, 0)}</span>
                        </div>
                        <div className={`item-value ${profit >= 0 ? 'income' : 'expense'}`}>
                          ₹{formatCurrency(profit, 0)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Next Upcoming Due */}
              <div className="quick-entry-card">
                <div className="card-header">
                  <h2 className="section-title">What is Due Next?</h2>
                </div>
                <div className="item-list">
                  {obligations.filter(ob => !ob.paid).slice(0, 3).map(ob => (
                    <div className="list-item" key={ob.id}>
                      <div className="item-details">
                        <span className="item-title">{ob.name}</span>
                        <span className="item-subtitle">Due {ob.dueDate} • {ob.project}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="item-value expense">₹{ob.amount}</div>
                        <button 
                          className="nav-btn" 
                          style={{ fontSize: '0.75rem', padding: '2px 8px', color: 'var(--success)', marginTop: '4px' }}
                          onClick={() => handlePayObligation(ob.id)}
                        >
                          Pay now
                        </button>
                      </div>
                    </div>
                  ))}
                  {obligations.filter(ob => !ob.paid).length === 0 && (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
                      All obligations paid!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <Ledger 
            transactions={transactions} 
            projects={projects} 
            categories={categories} 
          />
        )}

        {activeTab === 'obligations' && (
          <Obligations 
            obligations={obligations} 
            projects={projects} 
            onPay={handlePayObligation} 
            onAdd={handleAddObligation}
          />
        )}

        {activeTab === 'settings' && (
          <Settings 
            projects={projects} 
            categories={categories} 
            onAddProject={handleAddProject} 
            onAddCategory={handleAddCategory} 
            onRemoveProject={handleRemoveProject}
            onRemoveCategory={handleRemoveCategory}
          />
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// ------------------- COMPONENTS -------------------

function QuickEntry({ projects, categories, onSubmit }) {
  const [type, setType] = useState('Expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [project, setProject] = useState(projects[0] || 'Personal')
  const [category, setCategory] = useState(categories[0] || 'Rent')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  // Click shortcut helper
  const handleAmountClick = (value) => {
    setAmount(prev => {
      const current = parseFloat(prev) || 0
      return (current + value).toString()
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!amount) return
    onSubmit({
      type,
      amount: parseFloat(amount),
      description: description || `${type} Entry`,
      project,
      category,
      date
    })
    setAmount('')
    setDescription('')
  }

  return (
    <div className="quick-entry-card">
      <h2 className="section-title" style={{ marginBottom: '16px' }}>Quick Entry Panel</h2>
      <div className="quick-tabs">
        <button className={`tab-btn ${type === 'Expense' ? 'active expense' : ''}`} onClick={() => setType('Expense')}>
          Expense (Out)
        </button>
        <button className={`tab-btn ${type === 'Income' ? 'active income' : ''}`} onClick={() => setType('Income')}>
          Income (In)
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Amount (₹)</label>
            <input 
              type="number" 
              step="any"
              className="form-input" 
              placeholder="0.00" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Description</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Server hosting" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
        </div>

        {/* Amount Quick-Add Chips */}
        <div className="quick-chips">
          {[100, 500, 1000, 5000].map(val => (
            <button type="button" key={val} className="chip" onClick={() => handleAmountClick(val)}>
              +₹{val}
            </button>
          ))}
          <button type="button" className="chip" style={{ background: '#475569' }} onClick={() => setAmount('')}>Clear</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Project</label>
            <select className="form-input" value={project} onChange={e => setProject(e.target.value)}>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Category</label>
            <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <button type="submit" className="btn btn-primary">Log Transaction (under 3 clicks)</button>
      </form>
    </div>
  )
}

function Ledger({ transactions, projects, categories }) {
  const [filterProject, setFilterProject] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = transactions.filter(t => {
    const matchProj = filterProject === 'All' || t.project === filterProject
    const matchCat = filterCategory === 'All' || t.category === filterCategory
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
    return matchProj && matchCat && matchSearch
  })

  const handleExportCSV = () => {
    if (filtered.length === 0) return
    const headers = ['ID', 'Type', 'Amount (INR)', 'Description', 'Project', 'Category', 'Date']
    const rows = filtered.map(tx => [
      tx.id,
      tx.type,
      formatCurrency(tx.amount),
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.project.replace(/"/g, '""')}"`,
      `"${tx.category.replace(/"/g, '""')}"`,
      tx.date
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `smartledger_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="quick-entry-card">
      <div className="card-header">
        <h2 className="section-title">Unified Ledger</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Showing {filtered.length} entries</div>
          <button 
            className="btn btn-secondary" 
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }} 
            onClick={handleExportCSV}
          >
            Export Excel (CSV)
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <input 
          type="text" 
          placeholder="Search descriptions..." 
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="All">All Projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="item-list">
        {filtered.map(tx => (
          <div className="list-item" key={tx.id}>
            <div className="item-details">
              <span className="item-title">{tx.description || tx.category}</span>
              <span className="item-subtitle">{tx.project} • {tx.category} • {tx.date}</span>
            </div>
            <div className={`item-value ${tx.type === 'Income' ? 'income' : 'expense'}`}>
              {tx.type === 'Income' ? '+' : '-'}₹{formatCurrency(tx.amount)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No records matched the active filters.
          </div>
        )}
      </div>
    </div>
  )
}

function Obligations({ obligations, projects, onPay, onAdd }) {
  const [showHistory, setShowHistory] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('Expense')
  const [project, setProject] = useState(projects[0] || 'Personal')
  const [dueDate, setDueDate] = useState('')

  const handleAddSubmit = (e) => {
    e.preventDefault()
    if (!name || !amount || !dueDate) return
    onAdd({
      name,
      amount: parseFloat(amount),
      type,
      project,
      frequency: 'Monthly',
      dueDate
    })
    setName('')
    setAmount('')
    setDueDate('')
    setShowModal(false)
  }

  const displayed = obligations.filter(ob => showHistory ? ob.paid : !ob.paid)

  return (
    <div className="quick-entry-card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <h2 className="section-title">Automated Recurring Obligations</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className={`nav-btn ${!showHistory ? 'active' : ''}`} 
            onClick={() => setShowHistory(false)}
            style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            Pending
          </button>
          <button 
            className={`nav-btn ${showHistory ? 'active' : ''}`} 
            onClick={() => setShowHistory(true)}
            style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
          >
            History ({obligations.filter(ob => ob.paid).length})
          </button>
          <button className="btn btn-primary" style={{ width: 'auto', marginLeft: '8px' }} onClick={() => setShowModal(true)}>
            + Add Commitment
          </button>
        </div>
      </div>

      <div className="item-list" style={{ marginTop: '20px' }}>
        {displayed.map(ob => (
          <div className="list-item" key={ob.id}>
            <div className="item-details">
              <span className="item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {ob.name}
                <span className={`badge ${ob.paid ? 'badge-success' : 'badge-warning'}`}>
                  {ob.paid ? 'Settled' : 'Pending'}
                </span>
              </span>
              <span className="item-subtitle">{ob.project} • Due {ob.dueDate}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={`item-value ${ob.type === 'Income' ? 'income' : 'expense'}`}>
                ₹{formatCurrency(ob.amount)}
              </div>
              {!ob.paid && (
                <button 
                  className="nav-btn" 
                  style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '4px', textDecoration: 'underline' }}
                  onClick={() => onPay(ob.id)}
                >
                  Mark Paid & Ledger
                </button>
              )}
            </div>
          </div>
        ))}
        {displayed.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>
            {showHistory ? 'No settled obligations history.' : 'All obligations paid!'}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            <h3 style={{ marginBottom: '16px' }}>Add Recurring Commitment</h3>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>Obligation Name</label>
                <input type="text" className="form-input" placeholder="e.g. Office Rent" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" className="form-input" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Direction</label>
                  <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
                    <option value="Expense">Expense (Paying Out)</option>
                    <option value="Income">Income (Receiving)</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Project</label>
                  <select className="form-input" value={project} onChange={e => setProject(e.target.value)}>
                    {projects.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>Save Commitment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Settings({ projects, categories, onAddProject, onAddCategory, onRemoveProject, onRemoveCategory }) {
  const [newProj, setNewProj] = useState('')
  const [newCat, setNewCat] = useState('')

  return (
    <div className="quick-entry-card">
      <h2 className="section-title" style={{ marginBottom: '24px' }}>System Configuration</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <h3>Tracked Projects / Entities</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>Separate finances by client business or personal container.</p>
          <div className="item-list" style={{ marginBottom: '16px' }}>
            {projects.map(p => (
              <div key={p} className="list-item" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-title">{p}</span>
                <button 
                  className="nav-btn" 
                  style={{ color: 'var(--danger)', padding: '2px 8px', fontSize: '0.8rem' }}
                  onClick={() => onRemoveProject(p)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" className="form-input" placeholder="e.g. Acme Corp" value={newProj} onChange={e => setNewProj(e.target.value)} />
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { onAddProject(newProj); setNewProj(''); }}>Add</button>
          </div>
        </div>

        <div>
          <h3>Expense Categories</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>Configure custom tags for analyzing ledger flows.</p>
          <div className="item-list" style={{ marginBottom: '16px' }}>
            {categories.map(c => (
              <div key={c} className="list-item" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="item-title">{c}</span>
                <button 
                  className="nav-btn" 
                  style={{ color: 'var(--danger)', padding: '2px 8px', fontSize: '0.8rem' }}
                  onClick={() => onRemoveCategory(c)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" className="form-input" placeholder="e.g. Travel" value={newCat} onChange={e => setNewCat(e.target.value)} />
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { onAddCategory(newCat); setNewCat(''); }}>Add</button>
          </div>
        </div>
      </div>
    </div>
  )
}
