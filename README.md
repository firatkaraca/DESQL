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
- **Electron-Powered Desktop App:** Full offline functionality and native file system access  
- Cross-platform support: Windows / macOS / Linux  

### 💻 SQL Query Editor

- Powered by [CodeMirror](https://codemirror.net/)  
- Syntax highlighting and intelligent formatting  
- Run SQL queries with `Shift + Enter`  
- Supports SQLite commands: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`, etc.  

### 🧾 Schema Viewer

- View and explore table schemas with detailed column information:
  - Column index, name, data type
  - Constraints: `PRIMARY KEY`, `AUTOINCREMENT`, `NOT NULL`, `DEFAULT`, etc.
- Easily copy the full `CREATE TABLE` statement 📋  
- Copy single-column `ALTER TABLE ADD COLUMN` commands for quick alterations  

### 🗃️ CRUD Interface

- Add, edit, and delete records using modal forms  
- Automatically generated input fields based on schema  
- In-memory database updates are reflected in real-time  

### 💾 Save Your Work

- Changes are applied in-memory  
- Click the 💾 **Save** button to export your current database as a `.sqlite` file  
- Prevent data loss — remember to save before refreshing or closing the app!

### 🎨 Dark & Light Theme

- Toggle between light and dark themes with a click  
- Accessible, clean, and distraction-free interface  

---

## 🖥️ Desktop Mode via Electron

This app has been fully wrapped with [Electron](https://www.electronjs.org/) to provide a native desktop experience.

### ✅ Desktop Mode Highlights:

- Open and save `.sqlite` files directly from your file system  
- No backend dependencies — completely standalone  
- Identical experience to the web version, with full offline support  

<img width="1680" alt="desql1" src="https://github.com/user-attachments/assets/ebd7328b-962e-4170-9556-c051ddadb4d5" />
<img width="1680" alt="desql2" src="https://github.com/user-attachments/assets/12ce823b-0207-444e-af51-788b9a35547d" />
<img width="1680" alt="desql3" src="https://github.com/user-attachments/assets/d1fd160d-ac0a-4c4f-8cb6-d1807c27d94e" />
<img width="1680" alt="desql4" src="https://github.com/user-attachments/assets/ae1945b1-8b76-43f4-8ca5-5ff5df473718" />
<img width="1680" alt="desql5" src="https://github.com/user-attachments/assets/20024069-4f15-46cb-ad54-d2d36f7149e4" />
<img width="1680" alt="desql6" src="https://github.com/user-attachments/assets/c1bdc3e0-baa9-4371-a51a-17dc9f05f26a" />
<img width="1680" alt="desql7" src="https://github.com/user-attachments/assets/23ba2341-ff91-41cd-8795-c488c504539a" />

### 🚀 Run Locally in Development

```bash
# Install dependencies
npm install

# Start the Electron app
npm start
