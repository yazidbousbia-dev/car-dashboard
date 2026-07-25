# Auto Marché — Panneau d'Administration

Interface web admin-only pour le backend Laravel du marché de voitures
(single shop owner). Construite en **HTML/CSS/JS pur** (aucun build
step, aucun framework) avec **exactement le même design system** que
la lo dashboard "Gestion de Clinique" — même palette bleue (`#2563EB`),
mêmes composants (sidebar, cards, tableaux, modals, toasts).

## Configuration — IMPORTANT avant de démarrer

Le backend tourne actuellement en **local**. Ouvre `js/utils.js` et
vérifie/ajuste cette ligne selon ton setup :

```js
const API_BASE = 'http://127.0.0.1:8000/api';
```

- Si ton Laravel tourne avec `php artisan serve`, c'est déjà le bon port.
- Une fois déployé en production, remplace cette ligne par ton domaine
  réel (garde l'ancienne en commentaire, comme dans le fichier).

### CORS

Le fichier `config/cors.php` de ton backend autorise déjà `localhost`
et l'origine `null` (utile si tu ouvres les fichiers `.html`
directement via double-clic, en `file://`). Si tu sers ce dashboard
via un vrai serveur local (ex. `php -S localhost:5500` ou Live
Server), ajoute son URL exacte à `allowed_origins` si besoin.

### Compte admin

Ce panneau est **réservé au rôle `admin`**. Le endpoint `/register`
public crée toujours un compte `role: 'user'` — il n'existe pas de
formulaire d'inscription admin dans ce dashboard (volontairement,
comme demandé : *admin panel only*).

Pour créer ton compte admin, passe par `php artisan tinker` :

```php
User::create([
    'name' => 'Admin',
    'email' => 'admin@automarche.com',
    'password' => Hash::make('ton-mot-de-passe'),
    'role' => 'admin',
    'is_verified' => true,
]);
```

## Structure du projet

```
car-dashboard/
├── login.html          Connexion (admin uniquement, pas d'inscription)
├── css/style.css        Design system partagé (identique à la clinique)
├── js/
│   ├── utils.js          API_BASE, Auth, api(), apiForm(), toasts, badges
│   └── layout.js         Sidebar + topbar injectés dynamiquement
└── pages/
    ├── dashboard.html     Statistiques + voitures les + vues + demandes récentes
    ├── cars.html            Inventaire complet : ajout/édition/photos/statuts
    ├── requests.html        Demandes d'achat clients (suivi de statut)
    ├── brands.html           Gestion des marques (utilisées dans le formulaire voiture)
    ├── users.html            Liste des clients, bannir/réactiver un compte
    ├── reports.html          Signalements d'annonces, marquer comme résolu
    └── profile.html          Profil admin + changement de mot de passe
```

## Fonctionnalités par page

**Annonces (cars.html)** — la page la plus complète :
- Filtres : statut, marque, recherche texte
- Ajout d'une voiture : formulaire complet + upload multi-photos (tout
  part en une seule requête `multipart/form-data`, comme l'attend
  `CarController::store`)
- Édition : les champs se sauvegardent en JSON classique ; les photos
  se gèrent **séparément et en direct** (ajout/suppression immédiate)
  — c'est exactement comme le backend est conçu (`update()` n'accepte
  pas de fichiers, `addImages()`/`deleteImage()` s'en chargent)
- Actions rapides par ligne : approuver / rejeter (si en attente),
  vendre une unité, renouveler 10 jours, mettre en avant (★), supprimer

**Demandes d'achat (requests.html)** — changement de statut en un
select (`pending → contacted → confirmed → cancelled`). Passer une
demande à `confirmed` marque automatiquement la voiture comme vendue
côté backend.

**Marques (brands.html)** — CRUD simple, alimente le `<select>` marque
du formulaire voiture.

**Utilisateurs (users.html)** — recherche + filtre par rôle, bannir/
réactiver un client (le champ `is_verified` sert de flag "actif/banni").

**Signalements (reports.html)** — liste des annonces signalées par les
clients, bouton "Résoudre".

## Lancer le projet

Aucune installation nécessaire. Deux options :

1. **Double-clic sur `login.html`** — fonctionne directement grâce à
   l'origine `null` déjà autorisée dans `cors.php`.
2. **Serveur local** (recommandé, évite certains soucis de navigateur
   avec les requêtes `fetch` en `file://`) :
   ```bash
   cd car-dashboard
   python3 -m http.server 5500
   # puis ouvre http://localhost:5500/login.html
   ```

## Ce qui n'a PAS été construit (volontairement)

Comme demandé, ceci est **le panneau admin uniquement** — pas de
partie publique (catalogue de voitures visible par les visiteurs,
page de connexion client, favoris, messagerie, "je veux acheter").
Le backend expose déjà toutes ces routes (`/public/cars`, `/favorites`,
`/conversations`, etc.) si tu veux qu'on construise cette partie plus
tard dans une session séparée.
