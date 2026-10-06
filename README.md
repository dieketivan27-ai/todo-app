# 📋 Cascade Engine V3 — TodoApp

Application avancée de productivité et de gestion de tâches.
Elle inclut une interface riche (Kanban, Dashboard, Focus), une gestion des objectifs, des statistiques, et une authentification sécurisée.

**Stack :** Angular 18 (Standalone) + Tailwind CSS · Node.js/Express · MySQL · Docker Compose

---

## 🚀 Démarrage rapide

```bash
# Cloner et lancer
git clone <repo>
cd todo-app
docker-compose up -d --build
```

Accès :
- **Frontend :** http://localhost:4200 (Redirige vers `/login`)
- **API :** http://localhost:3000/api
- **MySQL :** localhost:3306

> **Note :** Créez un nouveau compte depuis l'interface `/register` pour commencer, la base de données est initialisée vide pour chaque nouvel utilisateur.

---

## 🗂️ Architecture globale

```
todo-app/
├── frontend/          # Angular 18 (Standalone Components, Signals, RxJS)
│   ├── src/app/
│   │   ├── components/
│   │   │   ├── auth/        # Login, Register
│   │   │   ├── dashboard/   # Vue globale
│   │   │   ├── task-list/   # Kanban interactif
│   │   │   ├── focus/       # Ma journée
│   │   │   ├── goals/       # Objectifs (Cascade)
│   │   │   ├── projects/    # Projets
│   │   │   └── layout/      # Sidebar, Topbar avec Notifications
│   │   ├── services/      # AuthService (Cookies), TaskService, NotificationService...
│   │   └── models/        # Interfaces TypeScript
│   └── Dockerfile
│
├── backend/           # Node.js + Express + Sequelize
│   ├── controllers/   # Auth, Tasks, Goals, Projects, Analytics, Notifications
│   ├── routes/        # API REST sécurisées par JWT
│   ├── models/        # User, Task, Goal, GoalStep, Project, Notification, DailyMetrics
│   ├── middleware/    # auth.middleware (Cookie HttpOnly), cron jobs
│   └── Dockerfile
│
├── database/
│   └── init.sql       # Structure des tables (aucune donnée démo orpheline)
│
└── docker-compose.yml
```

---

## 🔐 Sécurité & RGPD

- **Authentification :** JWT stocké dans un cookie de session `HttpOnly` et `SameSite=Lax` pour contrer les attaques XSS. (Aucun token sensible dans le `localStorage`).
- **RGPD :**
  - Bannière de consentement aux cookies pour informer l'utilisateur de l'utilisation de cookies strictement nécessaires.
  - Footer avec liens pour la politique de confidentialité, l'export de données (Art. 20) et la suppression de compte (Art. 17).
- **Isolation :** Chaque ressource (tâche, notification, objectif) est liée via un `user_id` et vérifiée côté serveur pour garantir l'isolation des données par compte.

---

## 📡 API REST Principales

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/register` | Créer un compte |
| POST | `/api/auth/login` | Connexion (Set Cookie HttpOnly) |
| GET | `/api/auth/me` | Récupère le profil actif |
| POST | `/api/auth/logout` | Déconnexion (Clear Cookie) |
| GET | `/api/tasks` | Liste les tâches (filtres supportés) |
| POST | `/api/tasks` | Créer une tâche |
| PATCH | `/api/tasks/:id/progress` | Changer statut |
| GET | `/api/notifications` | Liste les notifications |
| PATCH | `/api/notifications/:id/read` | Marquer une notif lue |
| GET | `/api/analytics/metrics` | Rapports de performance |

---

## 🎨 Fonctionnalités Principales

- ✅ **Dashboard "Cascade Engine"** : Vue d'ensemble de la progression quotidienne et des objectifs.
- ✅ **Tableau Kanban** : Glisser/déposer (ou clic) pour la gestion des priorités et statuts.
- ✅ **Système de Notifications** : Cloche avec badge, historique de notifications dynamiques.
- ✅ **Barre de Recherche Globale** : Filtre en temps réel les tâches depuis n'importe quel écran.
- ✅ **Mode Focus ("Ma Journée")** : Interface dédiée pour accomplir ses tâches urgentes.
- ✅ **Empty States (États Vides)** : Interfaces amicales et illustrations pour guider l'utilisateur lors de son inscription.
- ✅ **Responsive & Moderne** : Conçu avec TailwindCSS, utilisation d'effets Glassmorphism et d'animations subtiles.
