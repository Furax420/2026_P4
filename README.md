# Yoga Studio

Application de réservation de séances de yoga : connexion, inscription, profil et participation ; création, modification et suppression des séances pour les administrateurs.

React 19 / TypeScript / Vite 7 côté front ; Express 4 / Prisma 5 / PostgreSQL 16 côté back. Architecture du back : controller → service → repository, avec validation Zod et gestion centrale des erreurs.

## Installation et lancement

Prérequis : Node.js 22 LTS (22.17 ou plus récent), npm et Docker Desktop lancé. Les commandes suivantes fonctionnent dans PowerShell et se lancent depuis la racine du dépôt, sauf indication contraire.

```powershell
git clone https://github.com/Furax420/2026_P4.git
cd 2026_P4
docker compose up -d --wait postgres
cd backend
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Le fichier `backend/.env` configure PostgreSQL de développement sur 5432, le secret JWT et l'API sur 8080. Il reste hors Git. Les migrations sont versionnées ; le seed fournit les comptes de démonstration `yoga@studio.com` (admin) et `user@test.com` (utilisateur), mot de passe `test!1234`.

Dans un second terminal, depuis la racine :

```powershell
cd frontend
npm ci
npm run dev
```

Front : http://localhost:5173. API : http://localhost:8080/api/health. Le proxy Vite redirige `/api` vers l'API. Si un ancien `.env` existe, vérifier que `PORT=8080` pour correspondre au proxy Vite. Le port front est strict : arrêter un serveur existant avant d'en démarrer un second sur ce port.

## Tests front et back

Les tests sont dans `frontend/tests` et `backend/tests`, séparés de `src`. Chaque cas prépare ses données, exécute une action et vérifie un résultat observable ; les commentaires utilisent Arrange / Act / Assert.

- Front : Vitest, React Testing Library, user-event et jsdom. Les tests unitaires isolent les services ; les intégrations font travailler ensemble pages, routeur et services avec les réponses HTTP simulées.
- Back : Vitest et Supertest. Les tests unitaires simulent les repositories ; les intégrations API traversent réellement Express, les services, Prisma et PostgreSQL.
- Les DTO, schémas Zod et fichiers de types du back ne font pas l'objet de tests dédiés et sont exclus de la couverture. Les saisies incorrectes restent vérifiées par les réponses HTTP. Le point d'entrée `server.ts` est exclu : les tests utilisent directement `app.ts`, sans lancer le serveur habituel.

Préparer la base isolée, depuis la racine :

```powershell
docker compose --profile test up -d --wait postgres-test
cd backend
npm run test:db:migrate
```

La base `yogastudio_test` utilise le port 5433 et son propre volume. Les intégrations refusent de commencer si l'adresse pointe vers une autre base. Chaque cas crée des fixtures puis supprime uniquement ses comptes et séances. Ne pas exécuter simultanément les intégrations back et Cypress : ils partagent cette base de test.

Depuis `backend`, puis séparément depuis `frontend` :

```powershell
npm run test:run
npm run test:coverage
npm run test:ratio
npm run test:typecheck
```

`test:run` exécute tous les cas une fois ; `test` les surveille ; `test:unit` et `test:integration` exécutent uniquement la catégorie choisie. Le contrôle TypeScript inclut les tests : Vitest seul transforme TypeScript sans vérifier tous les types.

`test:coverage` impose au moins 80 % en instructions, branches, fonctions et lignes. Le rapport JSON des cas permet à `test:ratio` de vérifier au moins 30 % d'intégration en comptant les cas exécutés, y compris chaque ligne des tests paramétrés. Exécuter la suite complète avant ce contrôle : un rapport d'une seule catégorie n'est pas un résultat final.

## Parcours E2E et couverture Cypress

Cypress est l'outil prévu par les consignes P4 ; Playwright était également autorisé. Nightwatch, utilisé dans la formation, n'est pas utilisé dans ce dépôt.

Préparer PostgreSQL de test et ses migrations comme ci-dessus. Dans un premier terminal, depuis `backend` :

```powershell
npm run dev:e2e
```

Dans un deuxième terminal, depuis `frontend` :

```powershell
npm run dev:e2e
```

Cette combinaison lance l'API de test sur **8081**, puis le front instrumenté sur **5173**, avec un proxy vers 8081. Les variables de test sont imposées par les scripts ; les E2E ne passent pas par l'API de développement sur 8080.

Dans un troisième terminal, depuis `frontend` :

```powershell
npm run e2e:run
npm run e2e:coverage:check
npm run e2e:typecheck
```

`e2e:open` ouvre l'interface Cypress. `e2e:run -- --browser chrome` utilise Chrome s'il est installé ; le navigateur embarqué fonctionne aussi. En cas d'absence du binaire Cypress après installation : `npx cypress install` puis `npx cypress verify`.

Chaque parcours prépare ses comptes et séances dédiés (`@e2e.test`) via une tâche Node ; seules ces fixtures sont réinitialisées. Les parcours de connexion, inscription, suppression, création, édition et participation utilisent la vraie API de test. Les pannes HTTP et la réponse de promotion en développement sont simulées explicitement avec `cy.intercept` ; le serveur de test refuse la promotion réelle.

Istanbul ajoute des compteurs au front uniquement avec `VITE_COVERAGE=true`. Le plugin Cypress les collecte et NYC génère le rapport. Un hook avant chaque exécution efface les compteurs du lancement précédent pour éviter une couverture cumulée artificiellement. Le contrôle E2E exige les quatre seuils à 80 % et vérifie que tous les fichiers exécutables de `src` figurent dans le rapport.

Vite ignore les dossiers de rapports et de compteurs dans sa surveillance : leur génération ne doit pas recharger la page pendant un parcours.

## Rapports et résultats

Les rapports générés restent hors Git, ainsi que les captures Cypress et les données NYC. Ils sont reproductibles avec les commandes ci-dessus.

| Suite | Rapport HTML | Résultats détaillés |
| --- | --- | --- |
| Front | `frontend/coverage/vitest/index.html` | `coverage-summary.json`, `test-results.json`, `lcov.info` dans le même dossier |
| Back | `backend/coverage/index.html` | `coverage-summary.json`, `test-results.json`, `lcov.info` dans le même dossier |
| E2E | `frontend/coverage/e2e/index.html` | `coverage-summary.json`, `lcov.info` dans le même dossier |

Dernière validation : 22/10/2026.

| Suite | Cas réussis | Intégration | Instructions | Branches | Fonctions | Lignes |
| --- | --- | --- | --- | --- | --- | --- |
| Front | 86 | 65/86 = 75,58 % | 98,68 % | 97,10 % | 100 % | 99,65 % |
| Back | 149 | 76/149 = 51,01 % | 100 % | 97,50 % | 100 % | 100 % |
| E2E | 30 | Parcours navigateur | 97,94 % | 91 % | 100 % | 99,03 % |

Les intégrations back comprennent 74 cas avec PostgreSQL et 2 contrôles HTTP initiaux. Les tests vérifient notamment le refus de consulter le profil ou de modifier la participation d’un autre utilisateur, y compris pour un administrateur. Les seuils concernent chaque indicateur et chaque suite séparément, pas une moyenne entre front, back et E2E.

## Builds et contrôles

Depuis chaque dossier `backend` et `frontend` : `npm run build`. Pour prévisualiser le front compilé : `npm run preview` (adresse affichée par Vite). L'API de développement doit tourner pour les requêtes de cette prévisualisation.

En cas d'erreur de connexion : `docker compose --profile test ps`, puis `docker compose logs postgres-test`. Relancer `npm run test:db:migrate` après recréation du volume de test. Si un port est occupé, arrêter le serveur concerné ; un front temporaire peut utiliser `npm run dev:e2e -- --port 5174`, puis Cypress `npm run e2e:run -- --config baseUrl=http://localhost:5174`.

## Organisation des fichiers

- `frontend/src` : pages, composants, services, modèles TypeScript.
- `frontend/tests/unit` et `tests/integration` : suites Vitest ; `tests/helpers.tsx` : fixtures et routeur de test.
- `frontend/cypress` : parcours et collecte ; `frontend/scripts` : nettoyage et contrôle de couverture E2E.
- `backend/src` : controllers, services, repositories, middleware, utilitaires ; `app.ts` exporte Express, `server.ts` lance l'écoute.
- `backend/tests` : unités, intégrations, fixtures et protection de la base ; `backend/scripts` : migrations/base/serveur E2E.
- `scripts/check-integration-ratio.cjs` : contrôle de la proportion d'intégrations à partir des rapports JSON.
- `backend/prisma` : schéma, migrations et seed de développement.

Les enseignants sont consultables via `/api/teacher` et `/api/teacher/:id`. Les autres groupes de routes sont `/api/auth`, `/api/session` et `/api/user`. Les mutations de séances exigent le rôle administrateur ; la consultation et la suppression de compte ainsi que la gestion des participations exigent leur propriétaire, même pour un administrateur. La promotion existante `/api/user/promote-admin` fonctionne uniquement en développement.
