const dbFileInput = document.getElementById('db-file-input');
const dbFileSelectBtn = document.getElementById('db-file-select-btn');
const dbFileTooltipText = document.getElementById('db-file-tooltip-text');
const dbSaveBtn = document.getElementById('db-save-btn');
const dbCloseBtn = document.getElementById('db-close-btn');
const saveTooltipText = document.getElementById('save-tooltip-text');
const mainContent = document.getElementById('main-content');
const tableList = document.getElementById('table-list');
const queryInput = document.getElementById('query-input');
const executeButton = document.getElementById('execute-button');
const showColumnsButton = document.getElementById('show-columns-button');
const clearButton = document.getElementById('clear-button');
const resultsContainer = document.getElementById('results-container');
const loadingIndicator = document.getElementById('loading-indicator');
const tableSearchInput = document.getElementById('table-search-input');
const themeToggleButton = document.getElementById('theme-toggle-btn');
const themeTooltipText = document.getElementById('theme-tooltip-text');
const queryAccordionToggleBtn = document.getElementById('query-accordion-toggle-btn');
const queryBoxContent = document.getElementById('query-box-content');
const queryRunner = document.getElementById('query-runner');
const splashScreen = document.getElementById('splash-screen');
const insertButton = document.getElementById('insert-button');
const recordSearchInput = document.getElementById('record-search-input');
const dataEntryModal = document.getElementById('dataEntryModal');
const modalTitle = document.getElementById('modalTitle');
const modalCloseButton = dataEntryModal.querySelector('.modal-close-button');
const dataEntryForm = document.getElementById('dataEntryForm');
const formFieldsDiv = document.getElementById('formFields');
const modalCancelButton = dataEntryModal.querySelector('.form-actions .cancel-btn');

let db;
let SQL;
let editor;
let allTables = [];
let tableSchemas = {};
let currentSortColumn = null;
let currentSortDirection = 'asc';
let currentFileName = "Select Database File";
let currentDbDownloadFileName = "database.db";
let currentSelectedColumnHeader = null;
let currentSelectedRow = null;
let currentDisplayedTableName = null;
let currentTableData = null;
let primaryKeyColumnNames = [];
let currentSelectedRowData = null;

const DB_NAME = 'KaracaxDB';
const STORE_NAME = 'databaseFiles';
const DB_KEY = 'lastOpenedDB';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject('IndexedDB error: ' + event.target.errorCode);
    });
}

async function saveDB(filename, data) {
    const idb = await openDB();
    const transaction = idb.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ id: DB_KEY, filename, data });
    return transaction.complete;
}

async function getDB() {
    const idb = await openDB();
    const transaction = idb.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(DB_KEY);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject('Failed to retrieve from IndexedDB');
    });
}

async function clearDB() {
    const idb = await openDB();
    const transaction = idb.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    return transaction.complete;
}

async function persistDbStateToIndexedDB() {
    if (!db) return;
    try {
        const data = db.export();
        await saveDB(currentDbDownloadFileName, data);
    } catch (err) {
        console.error("Failed to persist DB state to IndexedDB:", err);
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Failed to save changes locally: ${err.message}`);
    }
}

async function initializeSqlJs() {
    try {
        SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
        });

        editor = CodeMirror.fromTextArea(queryInput, {
            mode: 'text/x-sql',
            lineNumbers: true,
            lineWrapping: true,
            theme: localStorage.getItem('theme') === 'dark-theme' ? 'material-darker' : 'default',
            extraKeys: {
                "Shift-Enter": executeQuery
            }
        });

        const savedDb = await getDB();
        if (savedDb) {
            await loadDbData(savedDb.data, savedDb.filename, false);
        } else {
            displayInitialState();
        }

    } catch (err) {
        console.error(err);
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Failed to initialize application: ${err.message}`);
        displayInitialState();
    }
}
initializeSqlJs();

function displayInitialState() {
    splashScreen.classList.remove('hidden');
    mainContent.style.display = 'none';
    loadingIndicator.style.display = 'none';
    currentFileName = "Select Database File";
    dbFileTooltipText.textContent = currentFileName;
    dbSaveBtn.disabled = true;
    dbCloseBtn.style.display = 'none';
    dbSaveBtn.style.display = 'none';
    dbFileTooltipText.style.display = 'none';
    resultsContainer.innerHTML = '';
    updateActionButtonStates();
}

dbCloseBtn.addEventListener('click', async () => {
    if (db) {
        db.close();
        db = null;
    }
    await clearDB();
    displayInitialState();
    dbFileInput.value = null;
});

function hideSplashScreen() {
    splashScreen.classList.add('hidden');
}

dbFileSelectBtn.addEventListener('click', () => {
    dbFileInput.click();
});

dbFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const Uints = new Uint8Array(e.target.result);
        await loadDbData(Uints, file.name, true);
    };
    reader.onerror = () => {
        displayMessage('error', '<i class="fas fa-exclamation-circle"></i> An error occurred while reading the file.');
        loadingIndicator.style.display = 'none';
        displayInitialState();
    };
    reader.readAsArrayBuffer(file);
    event.target.value = null;
});

async function loadDbData(uint8Array, fileName, saveToIdb) {
    hideSplashScreen();
    mainContent.style.display = 'none';
    resultsContainer.innerHTML = '';
    tableList.innerHTML = '';
    if (editor) editor.setValue('');
    loadingIndicator.style.display = 'block';

    resetCurrentSelectionAndTableInfo();
    updateActionButtonStates();
    dbSaveBtn.disabled = true;
    dbCloseBtn.style.display = 'none';
    dbSaveBtn.style.display = 'none';
    dbFileTooltipText.style.display = 'none';

    try {
        if (db) {
            db.close();
        }
        db = new SQL.Database(uint8Array);
        if (saveToIdb) {
            await saveDB(fileName, uint8Array);
        }
        currentFileName = `Selected file: ${fileName}`;
        currentDbDownloadFileName = fileName;
        dbFileTooltipText.textContent = currentFileName;

        hideSplashScreen();
        mainContent.style.display = 'grid';
        await fetchAndDisplayTables();
        displayMessage('success', `<i class="fas fa-check-circle"></i> Database loaded successfully: <b>${fileName}</b>`);
        dbSaveBtn.disabled = false;
        dbCloseBtn.style.display = 'block';
        dbSaveBtn.style.display = 'block';
        dbFileTooltipText.style.display = 'block';
    } catch (err) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Failed to read database file or invalid: ${err.message}`);
        await clearDB();
        displayInitialState();
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

dbSaveBtn.addEventListener('click', () => {
    if (!db) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> No database loaded to save.`);
        return;
    }
    try {
        const data = db.export();
        const blob = new Blob([data], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentDbDownloadFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        displayMessage('success', `<i class="fas fa-check-circle"></i> Database saved as <b>${currentDbDownloadFileName}</b>.`);
    } catch (err) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Error saving database: ${err.message}`);
    }
});

async function fetchAndDisplayTables() {
    tableList.innerHTML = '';
    allTables = [];
    tableSchemas = {};
    try {
        const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
        if (res.length > 0) {
            allTables = res[0].values.map(row => row[0]);
            await fetchTableSchemas(allTables);
            renderTableList(allTables);
        } else {
            tableList.innerHTML = '<li>No tables found.</li>';
        }
    } catch (err) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Failed to list tables: ${err.message}`);
    }
}

async function fetchTableSchemas(tableNames) {
    for (const tableName of tableNames) {
        try {
            const res = db.exec(`PRAGMA table_info("${tableName}");`);
            if (res.length > 0) {
                tableSchemas[tableName] = res[0].values.map(col => ({
                    cid: col[0],
                    name: col[1],
                    type: col[2],
                    notnull: col[3],
                    dflt_value: col[4],
                    pk: col[5] === 1
                }));
            }
        } catch (err) {
            console.error(`Error fetching schema for table ${tableName}: ${err.message}`);
        }
    }
}

function renderTableList(tablesToRender) {
    tableList.innerHTML = '';
    if (tablesToRender.length === 0) {
        tableList.innerHTML = '<li>No matching tables found.</li>';
        return;
    }

    tablesToRender.forEach(tableName => {
        const li = document.createElement('li');
        const tableNameSpan = document.createElement('span');
        tableNameSpan.classList.add('table-name');
        tableNameSpan.textContent = tableName;
        tableNameSpan.title = `Click to view first 10 rows from "${tableName}" table`;
        li.appendChild(tableNameSpan);

        const toggleIcon = document.createElement('i');
        toggleIcon.classList.add('fas', 'fa-info-circle', 'table-icon');
        toggleIcon.title = "Show column types";
        li.appendChild(toggleIcon);

        toggleIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            displayTableFullSchema(tableName);
            document.querySelectorAll('#table-list li').forEach(item => item.classList.remove('active'));
            li.classList.add('active');
        });

        li.addEventListener('click', (event) => {
            if (event.target.classList.contains('table-icon')) return;
            document.querySelectorAll('#table-list li').forEach(item => item.classList.remove('active'));
            li.classList.add('active');
            const newQuery = `SELECT * FROM "${tableName}" LIMIT 1000;`;
            editor.setValue(newQuery);
            recordSearchInput.value = '';
            executeQuery();
        });

        tableList.appendChild(li);
    });
}

tableSearchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredTables = allTables.filter(tableName =>
        tableName.toLowerCase().includes(searchTerm)
    );
    renderTableList(filteredTables);
});

executeButton.addEventListener('click', () => executeQuery());

showColumnsButton.addEventListener('click', () => {
    if (currentTableData && currentTableData.columns && currentTableData.columns.length > 0) {
        displayQueryResultColumnsMinimal(currentTableData.columns);
    } else {
        displayMessage('info', '<i class="fas fa-info-circle"></i> No query result columns found to display. Please run a query first.');
    }
});

clearButton.addEventListener('click', () => {
    editor.setValue('');
    editor.focus();
});

function resetCurrentSelectionAndTableInfo() {
    if (currentSelectedColumnHeader) {
        currentSelectedColumnHeader.classList.remove('selected-column');
    }
    if (currentSelectedRow) {
        currentSelectedRow.classList.remove('selected-row');
    }
    currentSelectedColumnHeader = null;
    currentSelectedRow = null;
    currentDisplayedTableName = null;
    primaryKeyColumnNames = [];
    currentSelectedRowData = null;
}

function updateActionButtonStates() {
    insertButton.disabled = !(currentDisplayedTableName && tableSchemas[currentDisplayedTableName]);
    recordSearchInput.disabled = !currentTableData || currentTableData.values.length === 0;
    if (document.activeElement !== recordSearchInput) {
        recordSearchInput.value = '';
    }
}

async function executeQuery() {
    const query = editor.getValue().trim();
    if (!query) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Please enter a query to execute.`);
        return;
    }

    if (!db) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Please select a database file first.`);
        return;
    }

    resultsContainer.innerHTML = '';
    currentSortColumn = null;
    currentSortDirection = 'asc';

    resetCurrentSelectionAndTableInfo();

    try {
        const startTime = performance.now();
        const results = db.exec(query);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(4);
        const isModifying = db.getRowsModified() > 0;

        if (isModifying) {
            await persistDbStateToIndexedDB();
        }

        if (results.length > 0 && results[0].columns.length > 0) {
            currentTableData = { columns: results[0].columns, values: results[0].values };

            const simpleSelectMatch = query.match(/^\s*SELECT\s+\*\s+FROM\s+"?([a-zA-Z0-9_]+)"?\s*(?:LIMIT\s+\d+)?;?\s*$/i);
            if (simpleSelectMatch && simpleSelectMatch[1] && tableSchemas[simpleSelectMatch[1]]) {
                currentDisplayedTableName = simpleSelectMatch[1];
                primaryKeyColumnNames = tableSchemas[currentDisplayedTableName]
                    .filter(col => col.pk)
                    .map(col => col.name);
            } else {
                currentDisplayedTableName = null;
                primaryKeyColumnNames = [];
            }

            displayTableWithSearch(currentTableData.columns, currentTableData.values, "", duration);
        } else {
            const rowsModified = db.getRowsModified();
            displayMessage('success', `<i class="fas fa-check-circle"></i> Query executed successfully. (${duration} seconds)\nRows modified: ${rowsModified}`);
            fetchAndDisplayTables();

            if (currentDisplayedTableName && query.match(/^\s*(INSERT|UPDATE|DELETE)\s/i)) {
                editor.setValue(`SELECT * FROM "${currentDisplayedTableName}" LIMIT 1000;`);
                executeQuery();
            } else if (isModifying) {
                const tableNameMatch = query.match(/(?:FROM|INTO|UPDATE|TABLE)\s+"?([a-zA-Z0-9_]+)"?/i);
                if (tableNameMatch && tableNameMatch[1]) {
                    const tableName = tableNameMatch[1];
                     if(allTables.includes(tableName)){
                        editor.setValue(`SELECT * FROM "${tableName}" LIMIT 1000;`);
                        executeQuery();
                    }
                }
            }
            
            currentTableData = null;
            currentDisplayedTableName = null;
            primaryKeyColumnNames = [];
        }
    } catch (err) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Query Error:\n${err.message}`);
        currentTableData = null;
        currentDisplayedTableName = null;
        primaryKeyColumnNames = [];
    } finally {
        updateActionButtonStates();
    }
}

recordSearchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value;
    if (currentTableData) {
        displayTableWithSearch(currentTableData.columns, currentTableData.values, searchTerm);
    } else {
        resultsContainer.innerHTML = '';
        if (searchTerm.trim() !== '') {
            displayMessage('info', '<i class="fas fa-info-circle"></i> No table data available to search.');
        }
    }
});

function displayTableWithSearch(columns, values, searchTerm, duration = null) {
    resultsContainer.innerHTML = '';

    const indexedValues = values.map((row, index) => ({ row, originalIndex: index }));

    let filteredValues = indexedValues;
    if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        filteredValues = indexedValues.filter(item =>
            item.row.some(cell => String(cell).toLowerCase().includes(lowerCaseSearchTerm))
        );
    }

    if (filteredValues.length === 0 && searchTerm.trim() !== '') {
        displayMessage('info', `<i class="fas fa-info-circle"></i> No records found matching "${searchTerm}".`);
        return;
    } else if (values.length === 0) {
        displayMessage('info', '<i class="fas fa-info-circle"></i> The query returned no results.');
        return;
    }

    const table = createResultTable(columns, filteredValues);
    const resultHeader = document.createElement('h3');
    let headerText = `Result Set (${filteredValues.length} of ${values.length} rows`;
    if (duration !== null) {
        headerText += `, ${duration} seconds`;
    }
    headerText += `)`;
    resultHeader.textContent = headerText;
    resultsContainer.appendChild(resultHeader);
    resultsContainer.appendChild(table);
}

function createResultTable(columns, indexedValues) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr');

    columns.forEach((colName, index) => {
        const th = document.createElement('th');
        const colIndexSpan = document.createElement('span');
        colIndexSpan.textContent = `${index + 1}. `;
        colIndexSpan.style.fontWeight = 'normal';
        colIndexSpan.style.marginRight = '5px';
        th.appendChild(colIndexSpan);

        const colNameSpan = document.createElement('span');
        colNameSpan.textContent = colName;
        th.appendChild(colNameSpan);

        th.setAttribute('data-column-index', index);
        th.classList.add('sortable');

        const sortIcon = document.createElement('i');
        sortIcon.classList.add('sort-icon', 'fas');
        th.appendChild(sortIcon);

        th.addEventListener('click', (event) => {
            toggleColumnSelection(th);
            sortTable(table, index);
        });
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    indexedValues.forEach(item => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-original-index', item.originalIndex);

        item.row.forEach(cellData => {
            const td = document.createElement('td');
            const displayValue = cellData === null ? 'NULL' : cellData;
            td.textContent = displayValue;
            td.title = displayValue;
            tr.appendChild(td);
        });

        tr.addEventListener('click', () => {
            toggleRowSelection(tr);
        });

        tr.addEventListener('dblclick', () => {
            const originalIndex = parseInt(tr.getAttribute('data-original-index'));
            const originalRowData = currentTableData.values[originalIndex];
            if (originalRowData) {
                const rowDataToUpdate = {};
                currentTableData.columns.forEach((colName, idx) => {
                    rowDataToUpdate[colName] = originalRowData[idx];
                });
                currentSelectedRowData = rowDataToUpdate;
                openModal('update', currentSelectedRowData);
            } else {
                displayMessage('info', `<i class="fas fa-info-circle"></i> No valid row data found to update.`);
            }
        });

        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
}

function toggleColumnSelection(headerElement) {
    if (currentSelectedColumnHeader) {
        currentSelectedColumnHeader.classList.remove('selected-column');
    }
    if (currentSelectedColumnHeader === headerElement) {
        currentSelectedColumnHeader = null;
    } else {
        headerElement.classList.add('selected-column');
        currentSelectedColumnHeader = headerElement;
    }
}

function toggleRowSelection(rowElement) {
    if (currentSelectedRow) {
        currentSelectedRow.classList.remove('selected-row');
    }
    if (currentSelectedRow === rowElement) {
        currentSelectedRow = null;
        currentSelectedRowData = null;
    } else {
        rowElement.classList.add('selected-row');
        currentSelectedRow = rowElement;
        const originalIndex = parseInt(rowElement.getAttribute('data-original-index'));
        if (currentTableData && currentTableData.values[originalIndex]) {
            currentSelectedRowData = {};
            currentTableData.columns.forEach((colName, idx) => {
                currentSelectedRowData[colName] = currentTableData.values[originalIndex][idx];
            });
        }
    }
    updateActionButtonStates();
}

function sortTable(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headerCells = table.querySelectorAll('th');

    headerCells.forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (icon) {
            icon.classList.remove('fa-sort-up', 'fa-sort-down');
        }
    });

    if (currentSortColumn === columnIndex) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = columnIndex;
        currentSortDirection = 'asc';
    }

    const currentHeaderIcon = headerCells[columnIndex].querySelector('.sort-icon');
    if (currentHeaderIcon) {
        currentHeaderIcon.classList.add(currentSortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
    }

    rows.sort((a, b) => {
        const aText = a.children[columnIndex].textContent;
        const bText = b.children[columnIndex].textContent;

        let valA = parseFloat(aText);
        let valB = parseFloat(bText);

        if (!isNaN(valA) && !isNaN(valB)) {
            return (valA - valB) * (currentSortDirection === 'asc' ? 1 : -1);
        } else {
            return aText.localeCompare(bText) * (currentSortDirection === 'asc' ? 1 : -1);
        }
    });

    rows.forEach(row => tbody.appendChild(row));
}

function displayMessage(type, message) {
    resultsContainer.innerHTML = '';
    const div = document.createElement('div');
    div.className = `status-message ${type}`;
    div.innerHTML = message;
    resultsContainer.appendChild(div);
}

function displayTableFullSchema(tableName) {
    resultsContainer.innerHTML = '';
    recordSearchInput.value = '';
    if (!tableSchemas[tableName]) {
        displayMessage('info', `<i class="fas fa-info-circle"></i> Schema information for "${tableName}" table not found.`);
        return;
    }

    const schemaDiv = document.createElement('div');
    schemaDiv.classList.add('column-details-display');
    const titleBar = document.createElement('div');
    titleBar.style.display = 'flex';
    titleBar.style.alignItems = 'center';
    titleBar.style.justifyContent = 'space-between';

    const title = document.createElement('h3');
    title.textContent = `"${tableName}" Table Schema`;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-schema-btn';
    copyBtn.innerHTML = `<div class="btn-copy-create-code"><i class="fas fa-copy"></i>COPY CREATE CODE<span class="tooltip">COPY CREATE CODE</span></div>`;

    copyBtn.addEventListener('click', () => {
        const schema = tableSchemas[tableName];
        if (!schema || schema.length === 0) return;

        const columnDefs = schema.map(col => {
            let def = `"${col.name}" ${col.type}`;
            if (col.notnull) def += ' NOT NULL';
            if (col.dflt_value !== null) def += ` DEFAULT ${col.dflt_value}`;
            if (col.pk) def += ' PRIMARY KEY';
            const likelyAutoInc = col.pk && col.type.toUpperCase().includes('INT') && col.dflt_value === null;
            if (likelyAutoInc) def += ' AUTOINCREMENT';
            return def;
        });

        const createSQL = `CREATE TABLE "${tableName}" (\n  ${columnDefs.join(",\n  ")}\n);`;

        navigator.clipboard.writeText(createSQL);
        const tooltip = copyBtn.querySelector('.tooltip');
        tooltip.textContent = 'Copied!';
        setTimeout(() => tooltip.textContent = 'Copy CREATE', 2000);
    });

    titleBar.appendChild(title);
    titleBar.appendChild(copyBtn);
    schemaDiv.appendChild(titleBar);

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    thead.innerHTML = `
        <tr>
            <th>Index</th>
            <th>Column Name</th>
            <th>Data Type</th>
            <th>PK</th>
            <th>COPY</th>
        </tr>
    `;

    tableSchemas[tableName].forEach(col => {
        const isAutoIncrementLikely = col.pk && col.type.toUpperCase().includes('INT') && col.dflt_value === null;
        const pkIcon = col.pk ? `<i class="fas fa-key" title="Primary Key"></i>` : '';
        const autoIncrementHint = isAutoIncrementLikely ? ` <small>(Likely Auto-increment)</small>` : '';

        const tr = document.createElement('tr');

        const copyColumnBtn = document.createElement('button');
        copyColumnBtn.className = 'copy-column-btn';
        copyColumnBtn.innerHTML = `<i class="fas fa-copy"></i><span class="tooltip">COPY ALTER CODE</span>`;

        copyColumnBtn.addEventListener('click', () => {
            let columnDef = `"${col.name}" ${col.type}`;

            if (col.notnull) columnDef += ' NOT NULL';
            if (col.dflt_value !== null) columnDef += ` DEFAULT ${col.dflt_value}`;
            if (col.pk) columnDef += ' PRIMARY KEY';
            const likelyAutoInc = col.pk && col.type.toUpperCase().includes('INT') && col.dflt_value === null;
            if (likelyAutoInc) columnDef += ' AUTOINCREMENT';

            const alterSQL = `ALTER TABLE "${tableName}" ADD COLUMN ${columnDef};`;

            navigator.clipboard.writeText(alterSQL);
            const tooltip = copyColumnBtn.querySelector('.tooltip');
            tooltip.textContent = 'Copied!';
            setTimeout(() => tooltip.textContent = 'Copy ALTER', 2000);
        });

        const copyTd = document.createElement('td');
        copyTd.appendChild(copyColumnBtn);

        tr.innerHTML = `
            <td>${col.cid + 1}</td>
            <td><span class="column-name">${col.name}</span></td>
            <td><span class="column-type">${col.type}</span></td>
            <td>${pkIcon}${autoIncrementHint}</td>
        `;
        tr.appendChild(copyTd);

        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    schemaDiv.appendChild(table);
    resultsContainer.appendChild(schemaDiv);

    if (queryBoxContent.classList.contains('open')) {
        toggleQueryBox();
    }
}

function displayQueryResultColumnsMinimal(columns) {
    resultsContainer.innerHTML = '';
    recordSearchInput.value = '';
    const schemaDiv = document.createElement('div');
    schemaDiv.classList.add('column-details-display');
    schemaDiv.innerHTML = `<h3>Query Result Columns</h3>`;

    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    thead.innerHTML = `
        <tr>
            <th>Index</th>
            <th>Column Name</th>
        </tr>
    `;

    columns.forEach((colName, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><span class="column-name">${colName}</span></td>
        `;
        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    schemaDiv.appendChild(table);
    resultsContainer.appendChild(schemaDiv);

    if (queryBoxContent.classList.contains('open')) {
        toggleQueryBox();
    }
}

function applyTheme(theme) {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(theme);
    localStorage.setItem('theme', theme);

    const editorTheme = theme === 'dark-theme' ? 'material-darker' : 'default';
    if (editor) {
        editor.setOption('theme', editorTheme);
    }

    if (theme === 'dark-theme') {
        themeToggleButton.innerHTML = '<i class="fas fa-sun"></i><span class="tooltip-text" id="theme-tooltip-text">Light Theme</span>';
    } else {
        themeToggleButton.innerHTML = '<i class="fas fa-moon"></i><span class="tooltip-text" id="theme-tooltip-text">Dark Theme</span>';
    }
}

themeToggleButton.addEventListener('click', () => {
    const currentTheme = localStorage.getItem('theme') || 'light-theme';
    const newTheme = currentTheme === 'light-theme' ? 'dark-theme' : 'light-theme';
    applyTheme(newTheme);
});

function toggleQueryBox() {
    queryBoxContent.classList.toggle('open');
    queryRunner.classList.toggle('query-box-collapsed');
    adjustResultsContainerHeight();
    if (queryBoxContent.classList.contains('open')) {
        editor.refresh();
    }
}

function adjustResultsContainerHeight() {
    const queryBoxHeight = queryBoxContent.classList.contains('open') ? queryBoxContent.offsetHeight : 0;
    const queryAccordionButtonHeight = queryAccordionToggleBtn.offsetHeight;
    const actionButtonsHeight = document.querySelector('.action-buttons').offsetHeight;

    const spaceTakenByQueryArea = (queryBoxContent.classList.contains('open') ? queryBoxHeight : 0) +
        queryAccordionButtonHeight +
        actionButtonsHeight +
        20;

    resultsContainer.style.maxHeight = `calc(100% - ${spaceTakenByQueryArea}px)`;

    resultsContainer.style.marginTop = `10px`;
}

function openModal(mode, initialData = {}) {
    if (!currentDisplayedTableName) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Please select a table to add/update/delete records.`);
        return;
    }

    const schema = tableSchemas[currentDisplayedTableName];
    if (!schema || schema.length === 0) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Schema information for "${currentDisplayedTableName}" table not found.`);
        return;
    }

    formFieldsDiv.innerHTML = '';
    modalTitle.textContent = '';
    dataEntryForm.onsubmit = null;
    const formActions = dataEntryForm.querySelector('.form-actions');
    formActions.innerHTML = '';
    formActions.classList.remove('delete-mode');

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.classList.add('cancel-btn');
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', closeModal);


    if (mode === 'insert') {
        modalTitle.textContent = `Add New Record to ${currentDisplayedTableName}`;
        schema.forEach(col => {
            const isAutoIncrementImplicit = col.pk && col.type.toUpperCase() === 'INTEGER' && col.dflt_value === null;
            if (!isAutoIncrementImplicit) {
                const formGroup = document.createElement('div');
                formGroup.classList.add('form-group');
                const label = document.createElement('label');
                label.textContent = col.name + (col.notnull ? ' *' : '');
                label.setAttribute('for', `modal-input-${col.name}`);
                formGroup.appendChild(label);
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `modal-input-${col.name}`;
                input.name = col.name;
                input.autocomplete = "off";
                input.placeholder = col.type + (col.dflt_value !== null ? ` (default: ${col.dflt_value})` : '');
                input.required = col.notnull && col.dflt_value === null;
                input.value = initialData[col.name] !== undefined && initialData[col.name] !== null ? initialData[col.name] : '';
                formGroup.appendChild(input);
                formFieldsDiv.appendChild(formGroup);
            }
        });
        dataEntryForm.onsubmit = handleInsert;

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.classList.add('submit-btn');
        submitButton.textContent = 'Save';

        formActions.appendChild(cancelButton);
        formActions.appendChild(submitButton);

    } else if (mode === 'update') {
        if (!currentSelectedRowData || primaryKeyColumnNames.length === 0) {
            displayMessage('error', `<i class="fas fa-exclamation-circle"></i> You must select a row and the table must have a primary key to update.`);
            closeModal();
            return;
        }
        modalTitle.textContent = `Update ${currentDisplayedTableName} Table`;
        schema.forEach(col => {
            const formGroup = document.createElement('div');
            formGroup.classList.add('form-group');
            const label = document.createElement('label');
            label.textContent = col.name + (col.notnull ? ' *' : '');
            label.setAttribute('for', `modal-input-${col.name}`);
            formGroup.appendChild(label);
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `modal-input-${col.name}`;
            input.name = col.name;
            input.autocomplete = "off";
            input.placeholder = col.type;
            input.required = col.notnull;
            input.value = initialData[col.name] !== undefined && initialData[col.name] !== null ? initialData[col.name] : '';
            if (col.pk) {
                input.readOnly = true;
                input.style.backgroundColor = 'var(--column-detail-bg)';
            }
            formGroup.appendChild(input);
            formFieldsDiv.appendChild(formGroup);
        });
        dataEntryForm.onsubmit = handleUpdate;

        const deleteButtonModal = document.createElement('button');
        deleteButtonModal.type = 'button';
        deleteButtonModal.classList.add('delete-btn-modal');
        deleteButtonModal.textContent = 'Delete Record';
        deleteButtonModal.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this record?')) {
                handleDelete();
            }
        });

        const submitButton = document.createElement('button');
        submitButton.type = 'submit';
        submitButton.classList.add('submit-btn');
        submitButton.textContent = 'Save';

        formActions.appendChild(deleteButtonModal);
        const rightSideContainer = document.createElement('div');
        rightSideContainer.appendChild(cancelButton);
        rightSideContainer.appendChild(submitButton);
        rightSideContainer.style.display = 'flex';
        rightSideContainer.style.gap = '10px';
        formActions.appendChild(rightSideContainer);

        formActions.classList.add('delete-mode');

    }
    dataEntryModal.style.display = 'flex';
}

function closeModal() {
    dataEntryModal.style.display = 'none';
}

modalCloseButton.addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
    if (event.target === dataEntryModal) {
        closeModal();
    }
});

insertButton.addEventListener('click', () => {
    openModal('insert');
});

async function handleInsert(event) {
    event.preventDefault();
    const formData = new FormData(dataEntryForm);
    const columns = [];
    const values = [];
    const placeholders = [];

    const schema = tableSchemas[currentDisplayedTableName];

    schema.forEach(col => {
        const isAutoIncrement = col.pk && col.type.toUpperCase() === 'INTEGER' && col.dflt_value === null;
        if (isAutoIncrement) {
            return;
        }

        if (formData.has(col.name)) {
            const value = formData.get(col.name);

            if (value === '' && col.dflt_value !== null) {
                return;
            }

            columns.push(`"${col.name}"`);
            values.push(value === '' ? null : value);
            placeholders.push('?');
        }
    });

    if (columns.length === 0 && schema.every(c => c.dflt_value !== null || (c.pk && c.type.toUpperCase() === 'INTEGER'))) {
        const query = `INSERT INTO "${currentDisplayedTableName}" DEFAULT VALUES`;
        try {
            db.run(query);
            await persistDbStateToIndexedDB();
            displayMessage('success', `<i class="fas fa-check-circle"></i> Record added successfully with default values.`);
            closeModal();
            editor.setValue(`SELECT * FROM "${currentDisplayedTableName}" LIMIT 1000;`);
            executeQuery();
        } catch (err) {
            displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Error adding record: ${err.message}`);
            closeModal();
        }
        return;
    }

    if (columns.length === 0) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> No valid columns found to insert.`);
        closeModal();
        return;
    }

    const query = `INSERT INTO "${currentDisplayedTableName}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    try {
        db.run(query, values);
        await persistDbStateToIndexedDB();
        displayMessage('success', `<i class="fas fa-check-circle"></i> Record added successfully.`);
        closeModal();
        editor.setValue(`SELECT * FROM "${currentDisplayedTableName}" LIMIT 1000;`);
        executeQuery();
    }
    catch (err) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Error adding record: ${err.message}`);
        closeModal();
    }
}

async function handleUpdate(event) {
    event.preventDefault();
    const formData = new FormData(dataEntryForm);
    const setParts = [];
    const updateParams = [];
    const pkWhereParts = [];
    const pkParams = [];

    const schema = tableSchemas[currentDisplayedTableName];
    const primaryKeys = schema.filter(col => col.pk);

    schema.forEach(col => {
        if (!col.pk) {
            const newValue = formData.get(col.name);
            setParts.push(`"${col.name}" = ?`);
            updateParams.push(newValue === '' ? null : newValue);
        }
    });

    primaryKeys.forEach(pkCol => {
        if (currentSelectedRowData.hasOwnProperty(pkCol.name)) {
            pkWhereParts.push(`"${pkCol.name}" = ?`);
            pkParams.push(currentSelectedRowData[pkCol.name]);
        } else {
            displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Primary key column missing. Could not update record.`);
            closeModal();
            return;
        }
    });

    if (setParts.length === 0) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> No columns found to update.`);
        closeModal();
        return;
    }
    if (pkWhereParts.length === 0) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Primary key not found. Could not update record.`);
        closeModal();
        return;
    }

    const query = `UPDATE "${currentDisplayedTableName}" SET ${setParts.join(', ')} WHERE ${pkWhereParts.join(' AND ')}`;
    const params = updateParams.concat(pkParams);

    try {
        db.run(query, params);
        await persistDbStateToIndexedDB();
        displayMessage('success', `<i class="fas fa-check-circle"></i> Record updated successfully.`);
        closeModal();
        editor.setValue(`SELECT * FROM "${currentDisplayedTableName}" LIMIT 1000;`);
        executeQuery();
    } catch (err) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Error updating record: ${err.message}`);
        closeModal();
    }
}

async function handleDelete() {
    if (!currentSelectedRowData || primaryKeyColumnNames.length === 0) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> No record selected or primary key missing.`);
        closeModal();
        return;
    }

    const pkWhereParts = [];
    const pkParams = [];
    const schema = tableSchemas[currentDisplayedTableName];
    const primaryKeys = schema.filter(col => col.pk);

    primaryKeys.forEach(pkCol => {
        if (currentSelectedRowData.hasOwnProperty(pkCol.name)) {
            pkWhereParts.push(`"${pkCol.name}" = ?`);
            pkParams.push(currentSelectedRowData[pkCol.name]);
        } else {
            displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Primary key column missing. Could not delete record.`);
            closeModal();
            return;
        }
    });

    if (pkWhereParts.length === 0) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Primary key not found. Could not delete record.`);
        closeModal();
        return;
    }

    const query = `DELETE FROM "${currentDisplayedTableName}" WHERE ${pkWhereParts.join(' AND ')}`;

    try {
        db.run(query, pkParams);
        await persistDbStateToIndexedDB();
        displayMessage('success', `<i class="fas fa-check-circle"></i> Record deleted successfully.`);
        closeModal();
        editor.setValue(`SELECT * FROM "${currentDisplayedTableName}" LIMIT 1000;`);
        executeQuery();
    } catch (err) {
        displayMessage('error', `<i class="fas fa-exclamation-circle"></i> Error deleting record: ${err.message}`);
        closeModal();
    }
}

queryAccordionToggleBtn.addEventListener('click', toggleQueryBox);

const savedTheme = localStorage.getItem('theme') || 'light-theme';
applyTheme(savedTheme);

queryBoxContent.classList.remove('open');
queryRunner.classList.add('query-box-collapsed');
adjustResultsContainerHeight();

dbFileTooltipText.textContent = currentFileName;

window.addEventListener('resize', adjustResultsContainerHeight);