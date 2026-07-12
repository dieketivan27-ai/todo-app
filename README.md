# 📋 TodoApp — Full Stack

Application de gestion de tâches automatisée.

**Stack :** Angular 17 + Tailwind CSS · Node.js/Express · MySQL · Docker Compose

---

## 🚀 Démarrage rapide

```bash
# Cloner et lancer
git clone <repo>
cd todo-app
docker compose up --build
```

Accès :
- **Frontend :** http://localhost:4200
- **API :** http://localhost:3000/api
- **MySQL :** localhost:3306

---

## 🗂️ Architecture

```
todo-app/
├── frontend/          # Angular 17 + Tailwind CSS
│   ├── src/app/
│   │   ├── components/   # header, stats, filters, task-form, task-list, task-item
│   │   ├── models/       # Task interfaces & types
│   │   └── services/     # TaskService, ThemeService
│   └── Dockerfile        # Multi-stage: build Angular → nginx
│
├── backend/           # Node.js + Express + Sequelize
│   ├── controllers/   # Logique métier
│   ├── routes/        # Routes REST
│   ├── models/        # Modèle Sequelize Task
│   ├── config/        # Connexion MySQL
│   ├── middleware/    # Cron jobs automatisation
│   └── Dockerfile
│
├── database/
│   └── init.sql       # Schéma + données de démo
│
└── docker-compose.yml
```

---

## 📡 API REST

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/tasks` | Liste les tâches (avec filtres) |
| GET | `/api/tasks/stats` | Statistiques globales |
| GET | `/api/tasks/:id` | Détail d'une tâche |
| POST | `/api/tasks` | Créer une tâche |
| PUT | `/api/tasks/:id` | Modifier une tâche |
| DELETE | `/api/tasks/:id` | Supprimer une tâche |
| PATCH | `/api/tasks/:id/done` | Marquer comme terminée |
| PATCH | `/api/tasks/:id/progress` | Passer en cours |

### Paramètres de filtre (GET /api/tasks)
- `status` : TODO | IN_PROGRESS | DONE | LATE
- `priority` : LOW | MEDIUM | HIGH
- `category` : nom de catégorie
- `search` : recherche dans titre/description
- `sortBy` : created_at | deadline | priority | title
- `order` : ASC | DESC

---

## ⚙️ Automatisation (Cron Jobs)

| Fréquence | Action |
|-----------|--------|
| Tous les jours à minuit | Marque EN RETARD les tâches dont l'échéance est passée |
| Tous les jours à 1h | Supprime les tâches DONE depuis +30 jours |
| Toutes les heures | Log les tâches dont l'échéance est dans les 24h |

---

## 🎨 Fonctionnalités UI

- ✅ Créer / modifier / supprimer des tâches
- ✅ Marquer terminée ou en cours (checkbox)
- ✅ Filtres : statut, priorité, catégorie, recherche
- ✅ Tri configurable
- ✅ Statistiques en temps réel + barre de progression
- ✅ Indicateur d'échéance coloré (vert / orange / rouge)
- ✅ Mode sombre (Dark Mode) avec persistance
- ✅ Toast notifications
- ✅ Responsive (mobile & desktop)
- ✅ Skeleton loading

---

## 🔧 Développement local (sans Docker)

### Backend
```bash
cd backend
cp .env.example .env   # configurer DB_HOST=localhost
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
ng serve
```

---

## 📦 Variables d'environnement Backend

| Variable | Défaut | Description |
|----------|--------|-------------|
| PORT | 3000 | Port du serveur |
| DB_HOST | mysql | Hôte MySQL |
| DB_USER | root | Utilisateur MySQL |
| DB_PASSWORD | root | Mot de passe MySQL |
| DB_NAME | tododb | Nom de la base |
