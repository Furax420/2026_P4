# Yoga Studio

Application de rÃ©servation de sÃ©ances de yoga : connexion, inscription, profil et participation ; crÃ©ation, modification et suppression des sÃ©ances pour les administrateurs.

React 19 / TypeScript / Vite 7 cÃ´tÃ© front ; Express 4 / Prisma 5 / PostgreSQL 16 cÃ´tÃ© back. Architecture du back : controller â†’ service â†’ repository, avec validation Zod et gestion centrale des erreurs.

## Installation et lancement

PrÃ©requis : Node.js 22 LTS (22.17 ou plus rÃ©cent), npm et Docker Desktop lancÃ©. Les commandes suivantes fonctionnent dans PowerShell et se lancent depuis la racine du dÃ©pÃ´t, sauf indication contraire.

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

Le fichier `backend/.env` configure PostgreSQL de dÃ©veloppement sur 5432, le secret JWT et l'API sur 8080. Il reste hors Git. Les migrations sont versionnÃ©es ; le seed fournit les comptes de dÃ©monstration `yoga@studio.com` (admin) et `user@test.com` (utilisateur), mot de passe `test!1234`.

Dans un second terminal, depuis la racine :

```powershell
cd frontend
npm ci
npm run dev
```

Front : http://localhost:5173. API : http://localhost:8080/api/health. Le proxy Vite redirige `/api` vers l'API. Le port front est strict : arrÃªter un serveur existant avant d'en dÃ©marrer un second sur ce port.

## Tests front et back

Les tests sont dans `frontend/tests` et `backend/tests`, sÃ©parÃ©s de `src`. Chaque cas prÃ©pare ses donnÃ©es, exÃ©cute une action et vÃ©rifie un rÃ©sultat observable ; les commentaires utilisent Arrange / Act / Assert.

- Front : Vitest, React Testing Library, user-event et jsdom. Les tests unitaires isolent les services ; les intÃ©grations font travailler ensemble pages, routeur et services avec les rÃ©ponses HTTP simulÃ©es.
- Back : Vitest et Supertest. Les tests unitaires simulent les repositories ; les intÃ©grations API traversent rÃ©ellement Express, les services, Prisma et PostgreSQL.
- Les DTO, schÃ©mas Zod et fichiers de types du back ne font pas l'objet de tests dÃ©diÃ©s et sont exclus de la couverture. Les saisies incorrectes restent vÃ©rifiÃ©es par les rÃ©ponses HTTP. Le point d'entrÃ©e `server.ts` est exclu : les tests utilisent directement `app.ts`, sans lancer le serveur habituel.

PrÃ©parer la base isolÃ©e, depuis la racine :

```powershell
docker compose --profile test up -d --wait postgres-test
cd backend
npm run test:db:migrate
```

La base `yogastudio_test` utilise le port 5433 et son propre volume. Les intÃ©grations refusent de commencer si l'adresse pointe vers une autre base. Chaque cas crÃ©e des fixtures puis supprime uniquement ses comptes et sÃ©ances. Ne pas exÃ©cuter simultanÃ©ment les intÃ©grations back et Cypress : ils partagent cette base de test.

Depuis `backend`, puis sÃ©parÃ©ment depuis `frontend` :

```powershell
npm run test:run
npm run test:coverage
npm run test:ratio
npm run test:typecheck
```

`test:run` exÃ©cute tous les cas une fois ; `test` les surveille ; `test:unit` et `test:integration` exÃ©cutent uniquement la catÃ©gorie choisie. Le contrÃ´le TypeScript inclut les tests : Vitest seul transforme TypeScript sans vÃ©rifier tous les types.

`test:coverage` impose au moins 80 % en instructions, branches, fonctions et lignes. Le rapport JSON des cas permet Ã  `test:ratio` de vÃ©rifier au moins 30 % d'intÃ©gration en comptant les cas exÃ©cutÃ©s, y compris chaque ligne des tests paramÃ©trÃ©s. ExÃ©cuter la suite complÃ¨te avant ce contrÃ´le : un rapport d'une seule catÃ©gorie n'est pas un rÃ©sultat final.

## Parcours E2E et couverture Cypress

Cypress est l'outil prÃ©vu par les consignes P4 ; Playwright Ã©tait Ã©galement autorisÃ©. Nightwatch, utilisÃ© dans la formation, n'est pas utilisÃ© dans ce dÃ©pÃ´t.

PrÃ©parer PostgreSQL de test et ses migrations comme ci-dessus. Dans un premier terminal, depuis `backend` :

```powershell
npm run dev:e2e
```

Dans un deuxiÃ¨me terminal, depuis `frontend` :

```powershell
npm run dev:e2e
```

Cette combinaison lance l'API de test sur **8081**, puis le front instrumentÃ© sur **5173**, avec un proxy vers 8081. Les variables de test sont imposÃ©es par les scripts ; les E2E ne passent pas par l'API de dÃ©veloppement sur 8080.

Dans un troisiÃ¨me terminal, depuis `frontend` :

```powershell
npm run e2e:run
npm run e2e:coverage:check
npm run e2e:typecheck
```

`e2e:open` ouvre l'interface Cypress. `e2e:run -- --browser chrome` utilise Chrome s'il est installÃ© ; le navigateur embarquÃ© fonctionne aussi. En cas d'absence du binaire Cypress aprÃ¨s installation : `npx cypress install` puis `npx cypress verify`.

Chaque parcours prÃ©pare ses comptes et sÃ©ances dÃ©diÃ©s (`@e2e.test`) via une tÃ¢che Node ; seules ces fixtures sont rÃ©initialisÃ©es. Les parcours de connexion, inscription, suppression, crÃ©ation, Ã©dition et participation utilisent la vraie API de test. Les pannes HTTP et la rÃ©ponse de promotion en dÃ©veloppement sont simulÃ©es explicitement avec `cy.intercept` ; le serveur de test refuse la promotion rÃ©elle.

Istanbul ajoute des compteurs au front uniquement avec `VITE_COVERAGE=true`. Le plugin Cypress les collecte et NYC gÃ©nÃ¨re le rapport. Un hook avant chaque exÃ©cution efface les compteurs du lancement prÃ©cÃ©dent pour Ã©viter une couverture cumulÃ©e artificiellement. Le contrÃ´le E2E exige les quatre seuils Ã  80 % et vÃ©rifie que tous les fichiers exÃ©cutables de `src` figurent dans le rapport.

## Rapports et rÃ©sultats

Les rapports gÃ©nÃ©rÃ©s restent hors Git, ainsi que les captures Cypress et les donnÃ©es NYC. Ils sont reproductibles avec les commandes ci-dessus.

| Suite | Rapport HTML | RÃ©sultats dÃ©taillÃ©s |
| --- | --- | --- |
| Front | `frontend/coverage/vitest/index.html` | `coverage-summary.json`, `test-results.json`, `lcov.info` dans le mÃªme dossier |
| Back | `backend/coverage/index.html` | `coverage-summary.json`, `test-results.json`, `lcov.info` dans le mÃªme dossier |
| E2E | `frontend/coverage/e2e/index.html` | `coverage-summary.json`, `lcov.info` dans le mÃªme dossier |

DerniÃ¨re validation : 12/10/2026.

| Suite | Cas rÃ©ussis | IntÃ©gration | Instructions | Branches | Fonctions | Lignes |
| --- | --- | --- | --- | --- | --- | --- |
| Front | 86 | 65/86 = 75,58 % | 98,68 % | 97,10 % | 100 % | 99,65 % |
| Back | 132 | 65/132 = 49,24 % | 100 % | 97,41 % | 100 % | 100 % |
| E2E | Ã€ confirmer aprÃ¨s le lancement final | Parcours navigateur | Ã€ confirmer | Ã€ confirmer | Ã€ confirmer | Ã€ confirmer |

Les intÃ©grations back comprennent 63 cas avec PostgreSQL et 2 contrÃ´les HTTP initiaux. Les seuils concernent chaque indicateur et chaque suite sÃ©parÃ©ment, pas une moyenne entre front, back et E2E.

## Builds et contrÃ´les

Depuis chaque dossier `backend` et `frontend` : `npm run build`. Pour prÃ©visualiser le front compilÃ© : `npm run preview` (adresse affichÃ©e par Vite). L'API de dÃ©veloppement doit tourner pour les requÃªtes de cette prÃ©visualisation.

En cas d'erreur de connexion : `docker compose --profile test ps`, puis `docker compose logs postgres-test`. Relancer `npm run test:db:migrate` aprÃ¨s recrÃ©ation du volume de test. Si un port est occupÃ©, arrÃªter le serveur concernÃ© ; un front temporaire peut utiliser `npm run dev:e2e -- --port 5174`, puis Cypress `npm run e2e:run -- --config baseUrl=http://localhost:5174`.

## Organisation des fichiers

- `frontend/src` : pages, composants, services, modÃ¨les TypeScript.
- `frontend/tests/unit` et `tests/integration` : suites Vitest ; `tests/helpers.tsx` : fixtures et routeur de test.
- `frontend/cypress` : parcours et collecte ; `frontend/scripts` : nettoyage et contrÃ´le de couverture E2E.
- `backend/src` : controllers, services, repositories, middleware, utilitaires ; `app.ts` exporte Express, `server.ts` lance l'Ã©coute.
- `backend/tests` : unitÃ©s, intÃ©grations, fixtures et protection de la base ; `backend/scripts` : migrations/base/serveur E2E.
- `scripts/check-integration-ratio.cjs` : contrÃ´le de la proportion d'intÃ©grations Ã  partir des rapports JSON.
- `backend/prisma` : schÃ©ma, migrations et seed de dÃ©veloppement.

Les enseignants sont consultables via `/api/teacher` et `/api/teacher/:id`. Les autres groupes de routes sont `/api/auth`, `/api/session` et `/api/user`. Les mutations de sÃ©ances exigent le rÃ´le administrateur ; la suppression de compte exige son propriÃ©taire. La promotion existante `/api/user/promote-admin` fonctionne uniquement en dÃ©veloppement.
