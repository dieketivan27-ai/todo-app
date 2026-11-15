-- Schema PostgreSQL complet pour Neon / Render
-- Synchronisé avec les modèles Sequelize de l'application

-- Types énumérés
DO $$ BEGIN
  CREATE TYPE enum_goals_goal_type AS ENUM('habit', 'actions');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enum_tasks_priority AS ENUM('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enum_tasks_status AS ENUM('TODO', 'IN_PROGRESS', 'DONE', 'LATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enum_tasks_freq_type AS ENUM('once', 'weekly_until_done');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enum_projects_status AS ENUM('ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table projects
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status enum_projects_status DEFAULT 'ON_TRACK',
  progress INTEGER DEFAULT 0,
  category VARCHAR(255) DEFAULT 'General',
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table goals
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'Général',
  annual_target INTEGER DEFAULT 52,
  year INTEGER NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  description TEXT,
  goal_type enum_goals_goal_type NOT NULL DEFAULT 'actions',
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table tasks
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority enum_tasks_priority DEFAULT 'MEDIUM',
  status enum_tasks_status DEFAULT 'TODO',
  category VARCHAR(100) DEFAULT 'Général',
  deadline DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  start_time TIME,
  end_time TIME,
  freq_type enum_tasks_freq_type NOT NULL DEFAULT 'once',
  recurrence_hebdomadaire BOOLEAN DEFAULT FALSE,
  jours_assignes JSONB,
  action_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table subtasks
CREATE TABLE IF NOT EXISTS subtasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  terminee BOOLEAN DEFAULT FALSE,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table daily_metrics
CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  focus_score INTEGER DEFAULT 0,
  deep_work_hours REAL DEFAULT 0.0,
  alignment_score REAL DEFAULT 0.0,
  tasks_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
