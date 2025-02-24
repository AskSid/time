DROP TABLE IF EXISTS logs;

CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_text TEXT NOT NULL,
    category TEXT,
    sub_category TEXT,
    who_with TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);