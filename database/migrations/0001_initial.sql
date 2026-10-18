CREATE TABLE publishing_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT,content_date TEXT NOT NULL,content_type TEXT NOT NULL CHECK(content_type IN ('story','post','reel')),scheduled_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','queued','processing','publishing','published','failed','permanently_failed')),r2_key TEXT NOT NULL,caption TEXT,instagram_container_id TEXT,instagram_media_id TEXT,attempt_count INTEGER NOT NULL DEFAULT 0,last_error TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,published_at TEXT,UNIQUE(content_date,content_type));
CREATE INDEX idx_jobs_due ON publishing_jobs(status,scheduled_at);
CREATE INDEX idx_jobs_failed ON publishing_jobs(status,updated_at);
CREATE INDEX idx_jobs_date ON publishing_jobs(content_date);
