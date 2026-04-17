# Medicare31 — Documentation Architecture

Portail médical full-stack conteneurisé (projet de cours).  
Stack : **FastAPI + PostgreSQL + Nginx + Vanilla JS**, orchestré avec **Docker Compose**.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture des services Docker](#2-architecture-des-services-docker)
3. [Flux de communication entre services](#3-flux-de-communication-entre-services)
4. [Structure des fichiers](#4-structure-des-fichiers)
5. [Backend — détail de chaque fichier](#5-backend--détail-de-chaque-fichier)
6. [Base de données — schéma complet](#6-base-de-données--schéma-complet)
7. [API — endpoints disponibles](#7-api--endpoints-disponibles)
8. [Authentification JWT](#8-authentification-jwt)
9. [Frontend](#9-frontend)
10. [Variables d'environnement](#10-variables-denvironnement)
11. [Lancer le projet](#11-lancer-le-projet)

---

## 1. Vue d'ensemble

Medicare31 est une application web médicale permettant de gérer :
- des comptes utilisateurs avec rôles (patient, médecin, secrétariat, admin)
- un répertoire de patients avec coordonnées et dossier médical
- un agenda de rendez-vous
- une messagerie interne
- des notifications et tâches pour le personnel

L'application est découpée en **4 services Docker indépendants** qui communiquent entre eux sur un réseau interne.

---

## 2. Architecture des services Docker

```
┌─────────────────────────────────────────────────────────┐
│                      docker-compose                     │
│                                                         │
│  ┌──────────┐     ┌──────────┐     ┌─────────────────┐ │
│  │  nginx   │────▶│ frontend │     │     backend      │ │
│  │ :80      │     │ nginx    │     │   FastAPI        │ │
│  │          │────▶│ static   │     │   Uvicorn        │ │
│  │ reverse  │     │ HTML/CSS │     │   :8000          │ │
│  │ proxy    │────▶│ /JS      │     │                  │ │
│  └──────────┘     └──────────┘     └────────┬─────────┘ │
│       ▲                                     │           │
│       │ port 80                             ▼           │
│   (extérieur)                       ┌───────────────┐   │
│                                     │  PostgreSQL   │   │
│                                     │  :5432        │   │
│                                     │  db_data vol  │   │
│                                     └───────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Rôle de chaque service

| Service    | Image                  | Port exposé | Rôle                                              |
|------------|------------------------|-------------|---------------------------------------------------|
| `nginx`    | `nginx:alpine`         | `80` (host) | Reverse proxy — route `/api/` vers backend, `/` vers frontend |
| `frontend` | `nginx:alpine` (build) | interne     | Sert les fichiers HTML/CSS/JS statiques           |
| `backend`  | `python:3.11` (build)  | interne     | API REST FastAPI, logique métier, accès DB        |
| `db`       | `postgres:15-alpine`   | interne     | Base de données PostgreSQL persistante            |

> Le port `5432` de PostgreSQL n'est **jamais exposé** à l'extérieur — uniquement accessible par le backend via le réseau Docker interne.

---

## 3. Flux de communication entre services

### Requête HTTP standard

```
Navigateur
    │
    │ HTTP :80
    ▼
nginx (reverse proxy)
    │
    ├─ /api/*  ──────────────────▶ backend:8000 (FastAPI)
    │                                    │
    │                                    │ SQLAlchemy (TCP)
    │                                    ▼
    │                              db:5432 (PostgreSQL)
    │
    └─ /*  ──────────────────────▶ frontend:80 (fichiers statiques)
```

### Règles de routage Nginx (`nginx/nginx.conf`)

| Préfixe URL      | Destination            | Usage                              |
|------------------|------------------------|------------------------------------|
| `/api/`          | `backend:8000`         | Tous les endpoints REST            |
| `/docs`          | `backend:8000/docs`    | Swagger UI (dev uniquement)        |
| `/openapi.json`  | `backend:8000/openapi.json` | Schéma OpenAPI                |
| `/`              | `frontend:80`          | Pages HTML, CSS, JS                |

### Ordre de démarrage Docker

```
db  ──▶  backend  ──▶  nginx
                  ──▶  frontend  ──▶  nginx
```
(`depends_on` dans docker-compose.yml)

---

## 4. Structure des fichiers

```
Medicare31/
│
├── docker-compose.yml          # Orchestration des 4 services
├── .env                        # Variables d'environnement (ne pas commiter)
├── .env.example                # Template des variables requises
├── .gitignore
│
├── nginx/
│   └── nginx.conf              # Config reverse proxy
│
├── frontend/
│   ├── Dockerfile              # FROM nginx:alpine + COPY fichiers HTML
│   ├── index.html              # Dashboard principal
│   ├── index2.html             # Dashboard alternatif patient
│   ├── login.html              # Page de connexion
│   ├── register.html           # Inscription multi-étapes (4 steps)
│   ├── patients.html           # Répertoire patients (CRUD + filtres)
│   ├── calendrier.html         # Agenda (vue jour/semaine/mois)
│   ├── messagerie.html         # Messagerie interne
│   └── js/
│       └── register.js         # Logique du formulaire d'inscription
│
└── backend/
    ├── Dockerfile              # FROM python:3.11-slim + uvicorn
    ├── requirements.txt        # Dépendances Python
    └── app/
        ├── main.py             # Point d'entrée FastAPI + seeding BDD
        ├── config.py           # Lecture des variables .env (Pydantic Settings)
        ├── db.py               # Connexion SQLAlchemy + session + Base ORM
        │
        ├── models/             # Tables SQL mappées en classes Python (SQLAlchemy ORM)
        │   ├── __init__.py     # Importe tous les models (requis pour create_all)
        │   ├── role.py         # Table roles
        │   ├── user.py         # Table users
        │   ├── staff.py        # Table staff (médecins, secrétaires...)
        │   ├── patient.py      # Tables patients + patient_contacts + patient_security
        │   ├── medical.py      # Tables medical_records, vitals, events, documents
        │   ├── room.py         # Tables rooms + appointment_types
        │   ├── appointment.py  # Table appointments
        │   ├── message.py      # Tables threads + participants + messages + attachments
        │   ├── notification.py # Table notifications
        │   └── task.py         # Table tasks
        │
        ├── schemas/            # Schémas Pydantic — validation des données API
        │   └── user.py         # UserCreate, UserOut, Token
        │
        ├── routers/            # Endpoints FastAPI groupés par domaine
        │   ├── auth.py         # /api/auth/* (login, register, france-connect...)
        │   └── patients.py     # /api/patients/* (CRUD + search + pagination)
        │
        └── services/
            └── auth.py         # Logique JWT (hash, verify, create_token, get_current_user)
```

---

## 5. Backend — détail de chaque fichier

### `app/main.py` — Point d'entrée

C'est le fichier qui démarre l'application FastAPI. Il fait 3 choses au démarrage :

1. **Crée toutes les tables** en base via `Base.metadata.create_all(bind=engine)`
2. **Seed les rôles** : insère `patient`, `medecin`, `secretariat`, `admin` dans la table `roles` si elle est vide
3. **Enregistre les routers** : `auth` et `patients`

```
lifespan() ──▶ create_all() ──▶ _seed_roles()
                                      │
                                      ▼
                              INSERT INTO roles (si vide)
```

Il configure aussi le middleware **CORS** (Cross-Origin Resource Sharing) pour autoriser les requêtes depuis le frontend.

---

### `app/config.py` — Configuration

Lit les variables d'environnement depuis le fichier `.env` via **Pydantic Settings**.  
Rend disponible l'objet `settings` dans toute l'application.

Variables lues :

| Variable                       | Usage                              |
|--------------------------------|------------------------------------|
| `DATABASE_URL`                 | URL de connexion PostgreSQL        |
| `SECRET_KEY`                   | Clé de signature des JWT           |
| `ALGORITHM`                    | Algorithme JWT (HS256)             |
| `ACCESS_TOKEN_EXPIRE_MINUTES`  | Durée de vie du token (minutes)    |

---

### `app/db.py` — Connexion base de données

Crée et expose 3 éléments utilisés partout dans le backend :

| Élément        | Type              | Rôle                                                  |
|----------------|-------------------|-------------------------------------------------------|
| `engine`       | SQLAlchemy Engine | Connexion physique à PostgreSQL                       |
| `SessionLocal` | sessionmaker      | Factory de sessions DB                                |
| `Base`         | DeclarativeBase   | Classe parente de tous les models ORM                 |
| `get_db()`     | générateur        | Injecté dans les routes via `Depends(get_db)` — ouvre une session, la ferme après la requête |

---

### `app/models/` — Models ORM (SQLAlchemy)

Chaque fichier = un ou plusieurs modèles de tables SQL.  
Un model = une classe Python qui hérite de `Base`. SQLAlchemy traduit ça en vraie table PostgreSQL.

**Principe :** les `relationship()` permettent de naviguer entre tables en Python sans écrire de SQL :

```python
patient.contact.email        # accès aux coordonnées
patient.appointments         # liste des RDV
user.role.code_role          # code du rôle de l'utilisateur
```

#### `models/role.py`
Table `roles` — référentiel des rôles applicatifs.
```
id_role | code_role    | libelle
--------|--------------|------------------
1       | patient      | Patient
2       | medecin      | Médecin
3       | secretariat  | Secrétariat
4       | admin        | Administrateur
```

#### `models/user.py`
Table `users` — compte technique de connexion (email + mot de passe hashé).  
Lié à `roles` (1 user = 1 rôle). Lié à `Staff` ou `Patient` via des relationships 1-1.

#### `models/staff.py`
Table `staff` — profil métier du personnel (médecins, secrétaires...).  
Chaque `Staff` est relié à 1 `User`. Contient la couleur d'agenda, la spécialité, etc.

#### `models/patient.py`
Contient 3 tables :
- `patients` — identité + données médicales de base (groupe sanguin, allergies, numéro de dossier)
- `patient_contacts` — coordonnées (email, téléphone, adresse) séparées pour des raisons RGPD
- `patient_security` — données de sécurité (question secrète, consentements CGU/HDS)

#### `models/medical.py`
Contient 4 tables :
- `medical_records` — dossier médical global (antécédents, notes cliniques)
- `medical_vitals` — historique des constantes (taille, poids, tension artérielle)
- `medical_events` — timeline médicale (consultations, bilans, ordonnances...)
- `documents` — fichiers joints (analyses, ordonnances, certificats...)

#### `models/room.py`
- `rooms` — cabinets/salles disponibles
- `appointment_types` — types de RDV avec durée par défaut (consultation, téléconsultation, urgence...)

#### `models/appointment.py`
Table `appointments` — RDV central.  
Relie : un `Patient` + un `Staff` + une `Room` + un `AppointmentType`.  
Trace aussi `created_by_user_id` et `updated_by_user_id` pour l'audit.

#### `models/message.py`
Contient 4 tables :
- `conversation_threads` — fil de discussion (sujet, catégorie, priorité)
- `conversation_participants` — table de jointure N-N entre threads et users (avec compteur de non-lus)
- `messages` — messages individuels dans un thread (supporte les réponses imbriquées via `reply_to_message_id`)
- `message_attachments` — pièces jointes d'un message

#### `models/notification.py`
Table `notifications` — alertes utilisateur (rappel RDV, nouveau message, document reçu...).  
`related_entity_type` + `related_entity_id` permettent de pointer vers n'importe quelle entité.

#### `models/task.py`
Table `tasks` — tâches pour le dashboard professionnel (todo/done, assignées à un user).

---

### `app/schemas/user.py` — Schémas Pydantic

Les schemas définissent la **forme des données qui transitent par l'API** (pas la DB).  
Ils valident automatiquement le JSON entrant et filtrent le JSON sortant.

| Schema        | Direction  | Contenu                                              |
|---------------|------------|------------------------------------------------------|
| `UserCreate`  | Entrée     | email, password (en clair), nom, prenom, role        |
| `UserOut`     | Sortie     | id_user, email, nom, prenom, role, is_active — **sans password_hash** |
| `Token`       | Sortie     | access_token, token_type, role, nom, prenom          |

---

### `app/services/auth.py` — Logique d'authentification

Fonctions pures réutilisables, sans dépendance aux routes :

| Fonction              | Rôle                                                     |
|-----------------------|----------------------------------------------------------|
| `hash_password()`     | Hash le mot de passe en bcrypt avant stockage DB         |
| `verify_password()`   | Compare un mot de passe clair avec son hash              |
| `create_access_token()` | Génère un JWT signé avec `SECRET_KEY`, contenant `user_id` + `role` + expiration |
| `get_current_user()`  | Dépendance FastAPI — décode le JWT du header `Authorization: Bearer`, retourne le `User` correspondant |

---

### `app/routers/auth.py` — Endpoints d'authentification

Préfixe : `/api/auth`

| Méthode | Route              | Description                                                    |
|---------|--------------------|----------------------------------------------------------------|
| POST    | `/register`        | Crée un `User` + profil `Patient` ou `Staff` selon le rôle     |
| POST    | `/login`           | Vérifie email+password, retourne un JWT                        |
| GET     | `/me`              | Retourne le profil de l'utilisateur connecté (token requis)    |
| POST    | `/france-connect`  | Mock — connecte un patient fictif "Jean Dupont"                |
| POST    | `/carte-vitale`    | Mock — connecte un patient fictif "Marie Martin"               |

**Flux d'inscription :**
```
POST /api/auth/register
    │
    ├─ Vérifie que l'email n'existe pas
    ├─ Récupère le Role en DB (via code_role)
    ├─ Crée User (email + password hashé)
    ├─ db.flush() → génère id_user sans commit
    ├─ Si role == "patient" → crée Patient (+ numero_dossier auto)
    │  Sinon              → crée Staff
    └─ db.commit() → tout est sauvegardé atomiquement
```

---

### `app/routers/patients.py` — Endpoints patients

Préfixe : `/api/patients`

| Méthode | Route              | Description                                           |
|---------|--------------------|-------------------------------------------------------|
| GET     | `/`                | Liste paginée (8/page), filtres search + statut       |
| GET     | `/count`           | Nombre total (pour la pagination côté frontend)       |
| POST    | `/`                | Crée un `Patient` + son `PatientContact` en 1 requête |
| GET     | `/{id}`            | Détail d'un patient                                   |
| PUT     | `/{id}`            | Mise à jour complète (patient + contact)              |
| DELETE  | `/{id}`            | Suppression                                           |

**Aplatissement des données :**  
La table `patients` et `patient_contacts` sont stockées séparément en DB, mais l'API les retourne **fusionnées** (champs `email`, `telephone_principal`, `ville` directement dans la réponse patient) pour simplifier le frontend.

---

## 6. Base de données — schéma complet

### Relations

```
roles ──────────────── 1 ──── N ──── users
                                         │
                          ┌──────────────┤
                          │              │
                    patients (1-1)    staff (1-1)
                          │
          ┌───────────────┼────────────────────────┐
          │               │                        │
    patient_contacts  patient_security      medical_records
    (coordonnées)     (CGU, consentements)  (dossier médical)
          │
          ├── medical_vitals (constantes)
          ├── medical_events (timeline)
          ├── documents (fichiers)
          └── appointments ──── staff
                            ──── rooms
                            ──── appointment_types

users ──── conversation_participants ──── conversation_threads
                                               │
                                           messages
                                               │
                                       message_attachments

users ──── notifications
users ──── tasks
```

### Cardinalités clés

| Relation                          | Type |
|-----------------------------------|------|
| `roles` → `users`                 | 1-N  |
| `users` → `patients`              | 1-1  |
| `users` → `staff`                 | 1-1  |
| `patients` → `patient_contacts`   | 1-1  |
| `patients` → `patient_security`   | 1-1  |
| `patients` → `medical_records`    | 1-1  |
| `patients` → `medical_vitals`     | 1-N  |
| `patients` → `appointments`       | 1-N  |
| `users` ↔ `conversation_threads`  | N-N (via `conversation_participants`) |
| `messages` → `messages`           | auto-référence (réponses imbriquées)  |

---

## 7. API — endpoints disponibles

Une fois le projet lancé, tous les endpoints sont documentés automatiquement par FastAPI :

- **Swagger UI interactif** → `http://localhost/docs`
- **Schéma OpenAPI JSON** → `http://localhost/openapi.json`

### Résumé des routes

```
GET  /api/health                    → Sanity check

POST /api/auth/register             → Inscription
POST /api/auth/login                → Connexion (retourne JWT)
GET  /api/auth/me                   → Profil connecté
POST /api/auth/france-connect       → Mock SSO FranceConnect
POST /api/auth/carte-vitale         → Mock Carte Vitale

GET    /api/patients/               → Liste patients (paginée)
GET    /api/patients/count          → Nombre total
POST   /api/patients/               → Créer patient
GET    /api/patients/{id}           → Détail patient
PUT    /api/patients/{id}           → Modifier patient
DELETE /api/patients/{id}           → Supprimer patient
```

---

## 8. Authentification JWT

### Flux complet

```
1. Client  ──POST /api/auth/login──▶  Backend
2. Backend vérifie email + bcrypt(password)
3. Backend génère JWT : { sub: user_id, role: "medecin", exp: +60min }
4. Backend ──{ access_token }──▶  Client
5. Client stocke le token (localStorage)
6. Client ──GET /api/auth/me──▶  Backend
           Header: Authorization: Bearer <token>
7. Backend décode JWT → récupère user_id → charge User en DB
8. Backend ──{ profil utilisateur }──▶  Client
```

### Structure du JWT (payload)

```json
{
  "sub": "42",
  "role": "medecin",
  "exp": 1713456789
}
```

### Sécurité

- Mots de passe hashés en **bcrypt** (via `passlib`)
- Tokens signés **HS256** avec `SECRET_KEY`
- `is_active` vérifié à chaque requête authentifiée
- Durée de vie configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`

---

## 9. Frontend

Le frontend est constitué de **fichiers HTML/CSS/JS purs** (pas de framework).  
Il est servi par un conteneur nginx dédié.

| Fichier             | Page                  | Fonctionnalités                                   |
|---------------------|-----------------------|---------------------------------------------------|
| `login.html`        | Connexion             | Formulaire email/password, sélection de rôle, boutons mock SSO |
| `register.html`     | Inscription           | Formulaire 4 étapes (identité → contact → sécurité → confirmation) |
| `index.html`        | Dashboard             | Cartes de statistiques, navigation                |
| `patients.html`     | Patients              | Tableau paginé, recherche, filtres, CRUD          |
| `calendrier.html`   | Agenda                | Vues jour/semaine/mois, drag & drop               |
| `messagerie.html`   | Messagerie            | Threads, dossiers, pièces jointes                 |

**Communication avec l'API :**  
Les appels API se font via `fetch()` vers `/api/...` — Nginx route automatiquement vers le backend.

```javascript
// Exemple d'appel API depuis le frontend
const res = await fetch('/api/patients/?search=martin&limit=8', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
});
const data = await res.json();
```

---

## 10. Variables d'environnement

Fichier `.env` à la racine du projet (copier depuis `.env.example`) :

```env
# PostgreSQL
POSTGRES_USER=medicare
POSTGRES_PASSWORD=medicare_pass
POSTGRES_DB=medicaredb

# SQLAlchemy — utilise les variables ci-dessus
DATABASE_URL=postgresql://medicare:medicare_pass@db:5432/medicaredb

# JWT
SECRET_KEY=changez-cette-cle-en-production-minimum-32-caracteres
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

> Le nom d'hôte `db` dans `DATABASE_URL` correspond au nom du service Docker — pas `localhost`.

---

## 11. Lancer le projet

### Prérequis
- Docker Desktop installé et démarré

### Démarrage

```bash
# 1. Copier les variables d'environnement
cp .env.example .env

# 2. Construire et démarrer tous les services
docker compose up --build

# 3. Accès
#    Frontend  → http://localhost
#    Swagger   → http://localhost/docs
#    Health    → http://localhost/api/health
```

### Commandes utiles

```bash
# Démarrer en arrière-plan
docker compose up -d --build

# Voir les logs en temps réel
docker compose logs -f backend

# Arrêter tous les services
docker compose down

# Arrêter ET supprimer la base de données
docker compose down -v

# Relancer uniquement le backend après modification
docker compose restart backend
```

### Ordre d'initialisation automatique

Au premier démarrage, le backend :
1. Crée toutes les tables PostgreSQL (si elles n'existent pas)
2. Insère les 4 rôles par défaut (`patient`, `medecin`, `secretariat`, `admin`)

Aucune migration manuelle n'est nécessaire.
