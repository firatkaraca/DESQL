# 💾 DESQL — Lightweight SQLite Manager for Web & Desktop (Electron)

**DESQL** is a modern, lightweight, and developer-friendly SQLite database manager that runs directly in your browser — and now also as a **fully-functional desktop app** via [Electron.js](https://www.electronjs.org/).

It enables effortless database management through a clean UI and powerful features like:

- Schema exploration
- Full CRUD support
- SQL query execution
- Dark/light theme toggling
- In-browser persistence or export to `.sqlite` file

---

## 🌟 Key Features

### 📦 Dual-Mode: Web & Desktop

- **Web-Based:** Runs entirely in the browser using WebAssembly (via [sql.js](https://github.com/sql-js/sql.js))
- **Electron-Powered Desktop App:** Full offline functionality with file system access
- Cross-platform support (Windows / macOS / Linux)

### 💻 SQL Query Editor

- Powered by [CodeMirror](https://codemirror.net/)
- Syntax highlighting and intelligent formatting
- Run SQL queries using `Shift + Enter`
- Supports standard SQLite syntax: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`, etc.

### 🧾 Schema Viewer

- View and explore table schemas with detailed column information:
  - Index
  - Column Name
  - Data Type
  - Constraints: `PRIMARY KEY`, `AUTOINCREMENT`, `NOT NULL`, `DEFAULT`, etc.
- Copy `CREATE TABLE` statements with one click
- Copy `ALTER TABLE ADD COLUMN` for individual columns

### 🗃️ CRUD Interface

- Add, edit, and delete records through modal-based forms
- Auto-generates input fields based on schema
- Real-time updates within the in-memory database

### 💾 Save Your Work

- Changes are applied in-memory
- Use the 💾 **Save** button to export the live database as a `.sqlite` file
- Prevent data loss on page reload or app close by saving after CRUD actions

### 🎨 Dark & Light Theme

- Toggle between light and dark themes with a single click
- Stylish, accessible, and distraction-free interface

---

## 🖥️ Desktop Mode via Electron

This app has been fully wrapped with [Electron](https://www.electronjs.org/) so it can be used offline as a native desktop application.

### ✅ Benefits of Desktop Mode:

- Open and save `.sqlite` files directly from your filesystem
- Zero installation for backend dependencies
- Full-featured experience identical to the web version
- Offline support & file access sandboxed to user

### 🚀 Run Locally

```bash
# Install dependencies
npm install

# Start the Electron app in development
npm start