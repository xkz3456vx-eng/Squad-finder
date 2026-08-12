# Squad Finder

Plateforme LFG (*Looking For Group*) pour Roblox. On publie une annonce, on
valide les joueurs qui demandent à rejoindre, et le groupe se retrouve dans un
espace privé — le **Crew** — avec chat en temps réel et liens directs vers le
jeu.

Aucune inscription par e-mail : chaque compte reçoit un **numéro unique** qui
sert à la fois d'identité et de clé de connexion.

## Stack

| Couche | Choix |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript strict |
| UI | TailwindCSS v4, thème sombre, design system maison (`src/components/ui`) |
| Base de données | SQLite (`better-sqlite3`) + Drizzle ORM |
| Temps réel | Server-Sent Events (`/api/crew/[id]/messages/stream`) |
| Auth | Numéro de compte + token de session en cookie `httpOnly` |
| Roblox | Proxy serveur des API publiques Roblox |

Le choix SQLite garde le projet exécutable avec un seul `npm run dev`, sans
service externe à provisionner. Le schéma Drizzle (`src/lib/db/schema.ts`) reste
portable vers Postgres/Supabase si le besoin arrive.

## Démarrage

```bash
npm install
npm run dev          # http://localhost:3000
```

La base est créée automatiquement au premier accès dans `data/app.db`
(`DATABASE_FILE` permet de choisir un autre chemin). Les tables sont créées de
façon idempotente au premier ouvrage de la connexion — aucune commande de
migration à lancer.

```bash
npm run build        # build de production
npm run start        # serveur de production
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # tests unitaires (parsing des URLs Roblox)
```

`scripts/smoke.mjs` rejoue le parcours complet contre un serveur en cours
d'exécution — inscription, reconnexion, publication, demande, validation, chat
SSE, et le contrôle d'accès à chaque étape :

```bash
npm run build && npm run start &
SMOKE_BASE=http://127.0.0.1:3000 npm run test:smoke
```

## Mise en ligne

L'application a besoin d'un **processus Node vivant** : rendu serveur, routes
API, écritures SQLite et connexion SSE longue durée. GitHub Pages et tout autre
hébergement statique sont donc exclus — l'export statique de Next.js l'est aussi
(les routes lisent les cookies et sont `force-dynamic`).

Il lui faut également **un disque persistant** et **une seule instance** : la
base est un fichier SQLite et le bus SSE est in-process.

Le `Dockerfile` fourni est autonome (build `output: "standalone"`, utilisateur
non-root, volume `/data`) et fonctionne tel quel sur Railway, Fly.io, Koyeb ou
un VPS :

```bash
docker build -t squad-finder .
docker run -p 3000:3000 -v squad-data:/data squad-finder
```

Sur Render, `render.yaml` est un blueprint prêt à l'emploi : *New > Blueprint*,
puis pointer sur ce dépôt.

Deux points à vérifier sur l'hébergeur retenu :

- **HTTPS obligatoire** — le cookie de session est marqué `secure` en
  production, il ne circulera pas en HTTP simple.
- `DATABASE_FILE` doit pointer vers le volume monté (`/data/app.db` par défaut
  dans l'image).

Vercel demanderait deux migrations préalables : SQLite → Postgres, et le bus
in-process → Redis pub/sub. Les limites de durée des fonctions serverless
coupent par ailleurs les connexions SSE longues.

## Authentification anonyme

- Aucun e-mail, aucun mot de passe.
- À la création du profil, le serveur génère un numéro du type
  `RBX-7K3M-9QW2-XT4A` (alphabet sans `I`, `L`, `O`, `U`, donc pas d'ambiguïté à
  la lecture). **Il est affiché une seule fois** — c'est la seule clé de
  connexion.
- La saisie à la reconnexion est tolérante : minuscules, tirets manquants et
  préfixe absent sont normalisés (`src/lib/auth/account-number.ts`).
- Le numéro est un secret : il n'est jamais exposé dans les réponses concernant
  un *autre* compte. La frontière est `toPublicAccount()`
  (`src/lib/auth/session.ts`) — tout ce qui sort vers un tiers passe par là.
- Une ligne par appareil dans la table `sessions` : se connecter sur un
  téléphone ne déconnecte pas le poste fixe, et « Quitter » ne ferme que la
  session courante.

Le `username` est **volontairement non unique** : plusieurs comptes peuvent
porter le même nom d'affichage.

## Intégration Roblox

`src/lib/roblox/` isole tout ce qui touche à Roblox.

- `parse.ts` — extraction de l'identifiant depuis une URL collée. Accepte les
  formes `roblox.com/users/123/profile`, `/users/123`, `user.aspx?username=…`,
  `roblox.com/games/1818/Nom`, `games/start?placeId=…`, avec ou sans schéma,
  avec ou sans `www.`. Les hôtes sosies (`notroblox.com`,
  `roblox.com.evil.net`, `https://roblox.com@evil.com/…`) sont rejetés.
- `client.ts` — appels aux API publiques (identité, headshot, `placeId` →
  `universeId` → infos et vignette du jeu). Chaque requête a un timeout de 6 s,
  chaque réponse est narrowée avant usage, et les succès sont mis en cache
  10 minutes.

**La dégradation est un choix de conception, pas un accident.** Les données
secondaires (avatar, vignette, `universeId`, créateur) tombent à `null` si leur
sous-requête échoue, et un jeu injoignable se résout en `Place <id>` sans
vignette. Le formulaire d'annonce propose alors la saisie manuelle du nom du
jeu : publier ne dépend jamais de la disponibilité de Roblox.

Côté HTTP, les routes `/api/roblox/*` distinguent un lien invalide (**400**,
faute de frappe de l'utilisateur) d'un service injoignable (**502**).

## Annonces et Crew

1. L'hôte publie une annonce : jeu (URL ou nom), description, critères
   facultatifs, lien de serveur privé facultatif, taille du crew facultative.
2. Un joueur clique sur « Demander à rejoindre » et peut joindre un message.
3. L'hôte accepte ou refuse (`/me` ou la page de l'annonce).
4. Dès l'acceptation, le joueur accède au **Crew** : liste des membres avec
   accès à leurs profils Roblox, lien vers le jeu, lien du serveur privé, et
   chat en direct.

L'appartenance à un crew est **dérivée**, jamais dupliquée : hôte + demandes au
statut `accepted` (`src/lib/crew/access.ts`). C'est la même fonction qui garde
la page Crew, l'API de chat et le flux SSE — il n'existe pas de chemin où l'un
autorise ce que l'autre refuse.

Sans lien de serveur privé, le Crew affiche l'invitation à ajouter l'hôte en ami
sur Roblox.

## Chat temps réel

`GET /api/crew/[id]/messages/stream` est un flux SSE. Chaque message porte un
`seq` monotone alloué dans une transaction SQLite, ce qui donne un curseur
gap-free : le navigateur renvoie `Last-Event-ID` à la reconnexion et reprend
exactement où il s'était arrêté, sans doublon ni trou.

Deux sources réveillent le flux : un bus `EventEmitter` in-process (latence
immédiate) et un poll de 2 s (filet de sécurité, et couvre le cas multi-process).
La correction ne dépend donc pas du bus.

## Arborescence

```
src/
├── app/
│   ├── page.tsx                    fil d'annonces + recherche
│   ├── onboarding/ login/          création de compte, reconnexion
│   ├── listings/new/ listings/[id] publication, détail + demandes
│   ├── crew/[id]/                  espace restreint + chat
│   ├── me/                         profil, demandes reçues/envoyées
│   └── api/
│       ├── auth/{register,login,logout,me}
│       ├── roblox/{profile,game}
│       ├── listings/[id]/requests · requests/[id]
│       └── crew/[id]/messages{,/stream}
├── components/          composants métier + ui/ (design system)
└── lib/
    ├── auth/            numéro de compte, sessions
    ├── crew/            accès, messages, bus SSE
    ├── db/              schéma Drizzle + bootstrap SQLite
    ├── listings/        requêtes du fil
    └── roblox/          parsing d'URL + client API
```

## Limites connues

- Le bus SSE est in-process. Derrière plusieurs instances Node, les messages
  arrivent toujours (via le poll) mais avec jusqu'à 2 s de latence ; un vrai
  déploiement multi-instance demanderait Redis pub/sub.
- SQLite convient à un déploiement mono-instance. Le schéma Drizzle est
  portable, la bascule vers Postgres ne touche que `src/lib/db/`.
- Le numéro de compte est stocké en clair (il doit être ré-affiché au
  propriétaire depuis `/me`) : la base doit être traitée comme un magasin de
  secrets.
- Pas de modération ni de rate limiting sur le chat et les annonces.
