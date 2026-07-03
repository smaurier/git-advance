---
titre: Stratégies de branching
cours: 07-git-avance
notions: [branche comme ref mobile, trunk-based development, feature flags, GitHub Flow, Git Flow, release branches, hotfix, branches courtes vs longues, conventions de nommage, comparatif et choix de stratégie]
outcomes: [choisir une stratégie de branching adaptée au contexte d'une équipe, mettre en place un GitHub Flow avec main déployable, reconnaître quand Git Flow est justifié ou de la sur-ingénierie]
prerequis: [01-git-internals-objects]
next: 03-merge-vs-rebase
libs: []
tribuzen: modèle de branching de TribuZen (GitHub Flow — main déployable, branches de feature, PR)
last-reviewed: 2026-07
---

# Stratégies de branching

> **Outcomes — tu sauras FAIRE :** choisir une stratégie de branching adaptée au contexte d'une équipe, mettre en place un GitHub Flow avec `main` déployable, reconnaître quand Git Flow est justifié ou de la sur-ingénierie.
> **Difficulté :** :star::star:

## 1. Cas concret d'abord

Tu rejoins l'équipe TribuZen (4 devs). Le repo est un chaos : `develop`, `develop-2`, `staging`, `preprod`, `feature/old-auth` (dernier commit il y a 3 mois), `release/1.2` jamais mergée. Personne ne sait quelle branche est déployée en prod. Un bug critique arrive : impossible de livrer un fix sans se demander « je pars de quelle branche ? je merge où ? ».

Un collègue te lance : « On avait mis du Git Flow au début, mais on n'a jamais fait de release planifiée — on déploie en continu sur Vercel à chaque merge. »

**Le diagnostic (audit-first) :**
1. L'équipe déploie en **continu** mais utilise un modèle (Git Flow) conçu pour des **releases planifiées avec plusieurs versions en prod**. Inadéquation totale.
2. Les branches longues (`develop`, `feature/old-auth`) accumulent de la dette de merge : plus une branche vit longtemps, plus elle diverge de `main`.
3. Aucune règle de nommage → impossible de savoir ce qu'est `develop-2`.

Ce module te donne la grille pour trancher : **quelle stratégie pour quel contexte**, et comment nettoyer ce repo vers un GitHub Flow simple où `main` est toujours déployable.

---

## 2. Théorie complète, concise

### 2.1 Une branche = un ref mobile (rappel module 01)

Avant de parler stratégie, il faut re-fixer ce qu'est *techniquement* une branche. Au module 01, tu as vu que Git stocke des objets (blobs, trees, commits) et des **refs**. Une branche n'est **rien d'autre qu'un fichier texte contenant un SHA-1** :

```bash
cat .git/refs/heads/main
# 7a291ad3f9c2e1b0d4a8f6c5e2b1a0d9c8f7e6d5

# Une branche = un pointeur mobile vers un commit.
# Créer une branche = écrire 41 octets. C'est tout.
git switch -c feature/hotfix
cat .git/refs/heads/feature/hotfix
# 7a291ad3f9c2e1b0d4a8f6c5e2b1a0d9c8f7e6d5   ← même commit, autre pointeur
```

Conséquence directe : **créer une branche ne coûte rien** (pas de copie de fichiers), et **une branche "avance"** simplement en réécrivant ce SHA quand tu commites. Toute stratégie de branching n'est qu'une **convention humaine** sur qui déplace quel pointeur, quand, et vers où on merge. Git ne t'impose aucun modèle.

`HEAD` (`.git/HEAD`) pointe vers la branche active :

```bash
cat .git/HEAD
# ref: refs/heads/main   ← HEAD suit main ; commiter déplace main
```

### 2.2 Trunk-Based Development (recommandé moderne)

**Principe :** un seul tronc partagé, `main` (le *trunk*). Tout le monde intègre dessus en continu, via des branches **ultra-courtes** (< 1 jour) ou des commits directs.

```
main ──●──●──●──●──●──●──●──●──  (intégration continue, toujours vert)
        \  /       \  /
         ●           ●            branches de vie < 24h
```

Règles :
1. Les branches vivent **moins de 24h** — on merge vite, on évite la divergence.
2. Le code non terminé est **caché derrière un feature flag** (voir 2.3), pas dans une branche longue.
3. **CI obligatoire** : chaque intégration passe les tests. `main` reste toujours déployable.
4. On release depuis `main` (tag ou release branch éphémère).

C'est le modèle des équipes matures (Google, la plupart des scale-ups) et celui que recommandent les études DORA : intégration fréquente = moins de conflits, livraison plus rapide. **Exigeant** : sans CI solide ni feature flags, c'est ingérable.

### 2.3 Feature flags : découpler déploiement et activation

Un **feature flag** est un interrupteur (booléen, souvent piloté à distance) qui active ou masque une fonctionnalité **sans redéployer**. Il permet de merger du code incomplet sur `main` sans l'exposer.

```ts
// Le code de la nouvelle feature est mergé sur main,
// mais reste invisible tant que le flag est off.
if (flags.newInvitationFlow) {
  return <NewInvitationFlow />;
}
return <LegacyInvitationFlow />;
```

C'est ce qui rend le trunk-based development possible : on n'a **plus besoin de branche longue** pour isoler une feature en cours — on merge tôt, on active plus tard. Le flag découple *déployé* de *activé*.

### 2.4 GitHub Flow (simple, PR + main déployable)

**Le modèle par défaut recommandé pour la plupart des équipes web.** Plus cadré que le trunk-based pur (chaque changement passe par une PR), sans la lourdeur de Git Flow.

```
main ──●──────●──────●──────●──  (toujours déployable)
        \    / \    /
         ●──●   ●──●             branches de feature courtes
```

Les 6 règles :
1. `main` est **toujours déployable**.
2. Pour tout changement, on crée une **branche descriptive** depuis `main`.
3. On commite et push régulièrement sur cette branche.
4. On ouvre une **Pull Request** → review + CI.
5. Après approbation, on **merge dans `main`**.
6. On **déploie** (souvent automatiquement à chaque merge).

```bash
git switch main
git pull
git switch -c feat/family-invitations
# ... commits ...
git push -u origin feat/family-invitations
# → PR sur GitHub → review → merge → déploiement auto
```

Différence avec le trunk-based : ici la **PR est le point de contrôle** (review humaine obligatoire), les branches peuvent vivre quelques jours (pas < 24h strict). C'est le bon compromis pour une petite/moyenne équipe qui déploie en continu.

### 2.5 Git Flow (lourd — quand c'est justifié)

Le modèle historique de Vincent Driessen (2010). **Deux branches permanentes** + trois types de branches temporaires.

```
main    ────●───────────────●────────  releases taguées (prod)
             \             / \
release       \        ●──●   \        stabilisation avant release
               \      /        \
develop ──●──●──●──●──●──●──●────●───   intégration
           \  /       \   /
feature ────●          ●─●              features (partent de develop)
```

- `main` — chaque commit = une release en production (taguée v1.0, v1.1…).
- `develop` — branche d'intégration permanente, la prochaine release.
- `feature/*` — part de `develop`, merge dans `develop`.
- `release/*` — stabilisation ; part de `develop`, merge dans `main` **et** `develop`.
- `hotfix/*` — fix urgent ; part de `main`, merge dans `main` **et** `develop`.

**Honnêteté technique :** Git Flow est **de la sur-ingénierie pour la plupart des équipes web modernes**. Il a été conçu pour du logiciel **versionné distribué** (une app desktop, une lib, un produit dont plusieurs versions coexistent en prod : v1.2 chez un client, v2.0 chez un autre). Son propre auteur a depuis ajouté une note : si tu **déploies en continu** un service web unique, GitHub Flow ou le trunk-based sont un meilleur choix. La branche `develop` et les branches `release/*` ajoutent de la cérémonie qui ne se justifie que si tu gères réellement des versions parallèles.

### 2.6 Release branches (le cas où c'est légitime)

Une **release branch** isole une version pour la stabiliser pendant que le développement continue ailleurs. Utile quand : tu dois maintenir une v1.x en prod (patches de sécurité) tout en développant la v2.

```
main ──●──●──●──●──●──●──●──●──  développement de la v2
        \
         ●──●──●                 release/1.x : que des correctifs de la v1
```

Même en GitHub Flow, une release branch **ponctuelle et éphémère** peut être créée pour tagger une version ou porter un correctif sur une ligne supportée. La différence avec Git Flow : elle est **exceptionnelle**, pas un rouage permanent du workflow.

### 2.7 Branches courtes vs longues

| | Branche courte (< qq jours) | Branche longue (semaines) |
|---|---|---|
| Divergence de `main` | Faible | Forte |
| Douleur de merge | Minime | Élevée (conflits) |
| Feedback / review | Rapide | Tardif |
| Recommandation | ✅ Défaut | ❌ À éviter |

**Règle d'or :** plus une branche vit longtemps, plus elle diverge, plus le merge est douloureux. Une branche longue est un **signe qu'il fallait un feature flag** (merger tôt, activer tard) plutôt que d'isoler pendant des semaines.

### 2.8 Conventions de nommage

Un nom de branche doit dire **le type** et **le sujet**. Convention courante (préfixe `type/slug`) :

```
feat/family-invitations      nouvelle fonctionnalité
fix/avatar-upload-crash      correction de bug
hotfix/login-500             correctif urgent en prod
chore/bump-deps              maintenance (deps, config)
docs/readme-setup            documentation
refactor/member-service      refactorisation sans changement de comportement
```

Interdits : `develop-2`, `test`, `sylvain`, `wip` — aucune info sur le contenu. Un bon nom se lit dans `git branch` et dans l'URL de la PR sans ouvrir le diff.

### 2.9 Comparatif — quand choisir quoi

| Critère | Git Flow | GitHub Flow | Trunk-Based |
|---------|----------|-------------|-------------|
| Complexité | Haute | Basse | Basse (discipline haute) |
| Branches permanentes longues | Oui (`develop`) | Non | Non |
| Feature flags | Optionnel | Optionnel | **Obligatoire** |
| Fréquence de déploiement | Planifiée | Continue | Continue |
| Point de contrôle | `release/*` | PR + review | CI (+ PR selon variante) |
| Risque de conflits | Élevé | Modéré | Faible |
| Versions parallèles en prod | Oui | Non | Non |
| Bon défaut pour du web SaaS | ❌ | ✅ | ✅ (équipe mature) |

**Arbre de décision :**

```
Plusieurs versions coexistent en prod (v1.x ET v2.x chez des clients) ?
├── Oui → Git Flow (ou release branches formalisées)
└── Non → tu déploies en continu ?
          ├── Oui → équipe très mature (CI + feature flags solides) ?
          │         ├── Oui → Trunk-Based Development
          │         └── Non → GitHub Flow  ← défaut sain
          └── Non → GitHub Flow
```

Pour la grande majorité des projets web (un service, déploiement continu) : **GitHub Flow > Git Flow**. Git Flow ne se justifie que si tu gères réellement des versions parallèles.

---

## 3. Worked examples

### Exemple 1 — Nettoyer le repo TribuZen vers GitHub Flow

Reprise du cas concret. On part du chaos, on converge vers `main` déployable + branches courtes.

```bash
# 1. Faire l'inventaire des branches (locales + distantes)
git branch -a
#   develop
#   develop-2
#   feature/old-auth
#   release/1.2
# * main
#   remotes/origin/staging

# 2. Décider LA branche de vérité. On déploie en continu → main est déployable.
#    develop n'a plus de raison d'être : on aligne main sur ce qui est en prod.
git switch main
git pull origin main

# 3. Récupérer le travail encore utile d'une branche longue AVANT de la supprimer.
#    (ici on suppose que feature/old-auth est obsolète et abandonnée)
git log feature/old-auth --oneline -5   # inspecter : rien à sauver ? on supprime.

# 4. Supprimer les branches mortes en local
git branch -D develop develop-2 feature/old-auth release/1.2

# 5. Supprimer les branches mortes sur le distant
git push origin --delete staging
#   (à faire aussi pour les autres si elles existent sur origin)

# 6. Nettoyer les refs distantes disparues côté local
git fetch --prune

# 7. Désormais : une seule vérité. On travaille en branches courtes depuis main.
git switch -c feat/family-invitations
# ... code ... commit ... push ... PR ... merge ... déploiement.
```

**Ce que ça règle :** plus de `develop` qui diverge, une seule branche déployée (`main`), et une convention de nommage claire pour les nouvelles branches. Le repo est passé de « quelle branche est en prod ? » à « `main` est en prod, point ».

### Exemple 2 — Reconnaître une sur-ingénierie Git Flow

Un client ESN t'impose Git Flow « parce que c'est plus pro ». Contexte réel : **une seule** app web, déployée en continu sur un seul environnement de prod, une seule version vivante. Voici le raisonnement d'audit à tenir.

```bash
# Symptôme : chaque feature traverse 2 merges cérémoniels
git switch develop
git switch -c feature/x
# ... travail ...
git switch develop && git merge --no-ff feature/x   # merge 1
# puis pour livrer :
git switch -c release/1.7 develop
# ... on "stabilise" une release qui n'existe pas vraiment ...
git switch main && git merge --no-ff release/1.7     # merge 2
git tag v1.7
git switch develop && git merge --no-ff release/1.7  # re-merge dans develop
```

**Diagnostic :** trois merges et une branche `release/1.7` pour livrer **une** feature sur **un** service à version unique. La branche `develop` duplique `main` sans apporter d'isolation utile puisqu'il n'y a pas de version parallèle à protéger.

**Recommandation à formuler (audit-first, pas dogmatique) :**
- Si le client maintient réellement plusieurs versions chez plusieurs clients → Git Flow est justifié, on garde.
- Sinon → proposer GitHub Flow : `main` déployable + branche de feature + PR. On supprime `develop` et le rituel `release/*`. Gain : un seul merge par feature, livraison plus rapide, moins de conflits.

Le point clé : **la stratégie se déduit du contexte** (versions parallèles ? déploiement continu ?), pas d'une préférence esthétique.

---

## 4. Pièges & misconceptions

### PIÈGE #1 — « Git Flow est plus professionnel / plus sûr »

Faux. Git Flow n'est pas « mieux », il est **adapté à un contexte précis** (versions parallèles en prod). Appliqué à un service web déployé en continu, il ajoute des branches (`develop`, `release/*`) et des merges qui ne protègent rien — c'est de la cérémonie. La « sécurité » vient de la CI et des PR, pas du nombre de branches. Le bon défaut moderne est GitHub Flow.

### PIÈGE #2 — Confondre trunk-based et « pas de branches / pas de review »

Le trunk-based **n'est pas** « on push tout sur main sans review ». C'est : branches **ultra-courtes** intégrées vite, **derrière feature flags**, avec **CI obligatoire**. La review existe (souvent via PR courte, ou pair programming). Sans discipline (CI + flags), le trunk-based casse la prod — c'est le modèle le plus exigeant, pas le plus laxiste.

### PIÈGE #3 — Laisser vivre une branche de feature des semaines

```bash
# ❌ Branche ouverte il y a 3 semaines, jamais rebasée/mergée
git switch feat/big-refactor    # 40 commits de retard sur main
git merge main                  # → CONFLIT géant, un enfer à résoudre
```

Plus une branche vit, plus elle diverge, plus le merge est douloureux. **Correct :** découper en petites PR, ou merger tôt le code incomplet **derrière un feature flag** (2.3) et l'activer plus tard. Une branche longue est presque toujours le symptôme d'un flag manquant.

### PIÈGE #4 — `main` non déployable

En GitHub Flow, la règle n°1 est *`main` toujours déployable*. Si on merge du code cassé, on viole le contrat : n'importe quel déploiement depuis `main` casse la prod. **Correct :** la CI doit être verte **avant** merge (pas après), et le déploiement peut se déclencher automatiquement au merge en confiance.

### PIÈGE #5 — Noms de branches muets

```bash
git switch -c wip        # ❌ ne dit rien
git switch -c sylvain    # ❌ nom de personne, pas de sujet
git switch -c test       # ❌ ambigu
git switch -c fix/avatar-upload-crash   # ✅ type + sujet
```

Un nom muet oblige à ouvrir le diff pour comprendre. Le préfixe `type/slug` (2.8) rend la branche lisible dans `git branch` et dans l'URL de PR.

---

## 5. Ancrage TribuZen

TribuZen est **un seul service web** (Nuxt/Nest + Postgres) déployé **en continu** — pas de versions parallèles chez des clients différents. Le choix découle directement de l'arbre de décision 2.9 : **GitHub Flow**.

**Le modèle de branching TribuZen :**
- `main` — **toujours déployable**. Chaque merge déclenche un déploiement (preview par PR, prod au merge sur `main`).
- Branches de feature courtes depuis `main`, préfixées : `feat/`, `fix/`, `chore/`, `docs/`.
- Toute intégration passe par une **Pull Request** (review + CI verte obligatoire avant merge).
- Pas de branche `develop` : elle n'apporterait aucune isolation utile puisqu'il n'y a qu'une version vivante.

**Gérer un hotfix TribuZen** (bug critique en prod, ex. login qui renvoie 500) — en GitHub Flow le hotfix est une branche de feature normale, juste prioritaire :

```bash
git switch main && git pull
git switch -c hotfix/login-500
# ... correctif minimal ...
git commit -am "fix(auth): login renvoie 500 sur session expirée"
git push -u origin hotfix/login-500
# → PR prioritaire → CI verte → merge → déploiement immédiat
```

Pas besoin du double-merge de Git Flow (`main` + `develop`) : il n'y a qu'une branche de vérité.

**Gérer une feature longue avec feature flag** (ex. refonte du flux d'invitation famille, plusieurs semaines) — on **ne fait pas** de branche longue. On merge par petits bouts sur `main`, masqués par un flag :

```ts
// src/config/flags.ts
export const flags = {
  newInvitationFlow: process.env.NUXT_FLAG_NEW_INVITE === 'on', // off en prod
};

// composant : le nouveau flux est mergé mais invisible tant que le flag est off
if (flags.newInvitationFlow) return <NewInvitationFlow />;
return <LegacyInvitationFlow />;
```

Chaque PR reste courte, `main` reste déployable, et on active `newInvitationFlow` en prod le jour où c'est prêt — sans redéployer de code, juste en basculant le flag.

Fichiers cibles dans `smaurier/tribuzen` :
```
tribuzen/
  .github/
    workflows/ci.yml        # CI verte obligatoire avant merge (GitHub Flow)
    pull_request_template.md
  src/
    config/flags.ts         # feature flags (features longues)
  CONTRIBUTING.md           # documente le modèle GitHub Flow + nommage
```

---

## 6. Points clés

1. Une branche = un ref mobile : un fichier de 41 octets contenant un SHA. Créer/déplacer une branche ne coûte rien ; une stratégie n'est qu'une **convention humaine** sur qui déplace quel pointeur.
2. **GitHub Flow** (`main` déployable + branche de feature + PR) est le **bon défaut** pour la plupart des équipes web en déploiement continu.
3. **Trunk-based development** (intégration continue sur `main`, branches < 24h, feature flags, CI) est le modèle des équipes matures — le plus performant mais le plus exigeant.
4. **Git Flow** (`develop` + `release/*` + `hotfix/*`) ne se justifie que si **plusieurs versions coexistent en prod** ; sur un service web à version unique, c'est de la sur-ingénierie.
5. Un **feature flag** découple *déployé* de *activé* — il remplace la branche longue : on merge tôt, on active tard.
6. Plus une branche vit longtemps, plus elle diverge de `main` et plus le merge est douloureux : préférer les branches courtes.
7. Nommage `type/slug` (`feat/`, `fix/`, `hotfix/`, `chore/`) : le nom dit le type et le sujet, lisible sans ouvrir le diff.
8. Le choix de stratégie se **déduit du contexte** (versions parallèles ? déploiement continu ? maturité CI ?), jamais d'une préférence esthétique.

---

## 7. Seeds Anki

```
Techniquement, qu'est-ce qu'une branche Git ?|Un ref mobile : un fichier (.git/refs/heads/<nom>) contenant le SHA-1 d'un commit. La créer ne coûte rien ; commiter réécrit ce SHA. Une stratégie de branching n'est qu'une convention humaine par-dessus ce mécanisme.
Quelle stratégie de branching est le bon défaut pour un service web en déploiement continu ?|GitHub Flow : main toujours déployable, une branche de feature courte par changement, une Pull Request (review + CI) avant chaque merge. Plus simple que Git Flow, adapté au déploiement continu.
Quand Git Flow est-il réellement justifié plutôt que de la sur-ingénierie ?|Quand plusieurs versions coexistent en production (v1.x ET v2.x chez des clients différents), justifiant develop + release/* + hotfix/*. Sur un service web à version unique déployé en continu, c'est de la cérémonie inutile → préférer GitHub Flow.
Qu'est-ce qu'un feature flag et à quel problème répond-il ?|Un interrupteur qui active/masque une fonctionnalité sans redéployer. Il découple 'déployé' de 'activé', ce qui permet de merger du code incomplet sur main (branches courtes) au lieu de le garder dans une branche longue qui diverge.
Quelles sont les trois exigences du trunk-based development ?|(1) branches ultra-courtes (< 24h) ou commits directs sur main ; (2) code non terminé caché derrière des feature flags ; (3) CI obligatoire à chaque intégration. Modèle le plus performant mais le plus exigeant en discipline.
Pourquoi éviter les branches de feature longues ?|Plus une branche vit longtemps, plus elle diverge de main, plus le merge génère de conflits douloureux et plus le feedback (review/CI) arrive tard. Une branche longue signale souvent un feature flag manquant.
À quoi sert une convention de nommage type/slug pour les branches ?|Le nom (feat/family-invitations, fix/avatar-crash, hotfix/login-500) indique le type et le sujet, lisible dans git branch et l'URL de PR sans ouvrir le diff. Évite les noms muets (wip, test, prénom).
En GitHub Flow, comment gère-t-on un hotfix par rapport à Git Flow ?|En GitHub Flow, un hotfix est une branche de feature normale mais prioritaire : branche depuis main, PR, CI verte, merge, déploiement immédiat. Pas de double-merge (main + develop) comme en Git Flow, car il n'y a qu'une seule branche de vérité.
```

---

## Pont vers le lab

> Lab associé : `07-git-avance/labs/lab-02-branching-strategies/README.md`. Simuler un GitHub Flow complet avec de vraies commandes git (branche, PR simulée en local, merge), puis comparer avec le déroulé Git Flow sur le même scénario pour mesurer la sur-ingénierie.
