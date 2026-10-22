# Yoga Studio

Application de réservation de séances de yoga : inscription, connexion, profil et participations. Les administrateurs peuvent créer, modifier et supprimer les séances.

Front : React / TypeScript / Vite. Back : Express / Prisma / PostgreSQL.

## Prérequis

- Node.js 22 LTS (22.17 minimum) et npm.
- Git et Docker Desktop avec Docker Compose, démarré.
- Ports disponibles : 5173 (front), 8080 (API), 5432 (base) ; 8081 et 5433 pour les tests.

Les commandes ci-dessous utilisent **PowerShell**. Chaque nouveau terminal démarre à la racine du dépôt.

## Installation

```powershell
git clone https://github.com/Furax420/2026_P4.git
cd 2026_P4
docker compose up -d --wait postgres
cd backend
npm ci
Copy-Item .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
cd ../frontend
npm ci
```

Le fichier `backend/.env` contient la configuration locale de l’API et de la base. À la première installation, la copie ci-dessus fournit les valeurs nécessaires.

## Lancer l’application

Dans deux terminaux séparés :

| Terminal | Dossier | Commande |
| --- | --- | --- |
| 1 : API | `cd backend` | `npm run dev` |
| 2 : interface | `cd frontend` | `npm run dev` |

Ouvrir **http://localhost:5173**. L’API utilise le port **8080**.

Comptes de démonstration : `yoga@studio.com` (administrateur) et `user@test.com` (utilisateur). Mot de passe commun : `test!1234`.

**Différence entre les modes :** `npm run dev` sert à utiliser et développer l’application avec la base habituelle. `npm run dev:e2e` prépare l’application pour Cypress : API sur 8081, base de test sur 5433 et mesure de couverture activée côté front. Le front reste sur 5173.

## Exécuter les tests

### Préparer la base de test

Une fois à l’installation, puis après tout ajout de migration, depuis la racine :

```powershell
docker compose --profile test up -d --wait postgres-test
cd backend
npm run test:db:migrate
```

Cette base est séparée de celle de développement. Docker doit rester démarré pendant les tests back et E2E.

### Tests unitaires et d’intégration

Depuis `backend`, puis depuis `frontend`, lancer :

```powershell
npm run test:coverage
npm run test:ratio
```

`test:coverage` exécute tous les tests Vitest et génère la couverture ; `test:ratio` vérifie la proportion de tests d’intégration. Les tests back utilisent Supertest et PostgreSQL ; les tests front utilisent React Testing Library. Aucun serveur d’application n’est nécessaire pour ces suites.

Pour lancer les tests sans couverture : `npm run test:run`.

### Tests de parcours utilisateur (E2E)

Arrêter les serveurs `dev` avec **Ctrl+C**, puis lancer dans trois terminaux séparés :

| Terminal | Dossier | Commande |
| --- | --- | --- |
| 1 : API de test | `cd backend` | `npm run dev:e2e` |
| 2 : interface de test | `cd frontend` | `npm run dev:e2e` |
| 3 : Cypress | `cd frontend` | `npm run e2e:run` puis `npm run e2e:coverage:check` |

Pour suivre les parcours dans l’interface Cypress, utiliser `npm run e2e:open` à la place de `e2e:run`. Ne pas lancer les tests back et Cypress en même temps : ils partagent la base de test.

**Seuils demandés :** au moins **80 %** de couverture pour chacun des quatre indicateurs (instructions, branches, fonctions et lignes), séparément pour le front, le back et les E2E ; au moins **30 %** de tests d’intégration dans chacune des suites Vitest front et back. Les DTO, schémas Zod et fichiers de types du back sont exclus de la couverture.

## Consulter les rapports HTML

Après un clone ou un pull, ouvrir **[rapports.html](rapports.html)** par double-clic, ou depuis la racine :

```powershell
Start-Process .\rapports.html
```

Cette page donne accès aux trois rapports sauvegardés (front, back, E2E), **sans serveur ni installation**. Depuis GitHub, cloner ou télécharger le dépôt pour les consulter dans un navigateur.

Pour actualiser les rapports sauvegardés, rejouer les trois suites avec couverture et leurs contrôles ci-dessus, puis lancer `node scripts/export-reports.cjs` depuis la racine.
