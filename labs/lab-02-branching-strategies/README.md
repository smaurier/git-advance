# Lab 02 — Stratégies de branching

> **Outcome :** à la fin, tu sais dérouler un **GitHub Flow complet** avec de vraies commandes git (branche courte, merge dans `main` déployable), puis **comparer** ce déroulé au même scénario en Git Flow pour mesurer concrètement la sur-ingénierie.
> **Vrai outil :** git lui-même (dépôt local réel, pas de simulateur). La « PR » est jouée en local par un merge reviewé — le mécanisme de branche/merge est identique à GitHub.
> **Feedback :** le coach valide en session via `git log --graph` et le comptage des merges — pas de test-runner auto-correcteur.

---

## Énoncé

Tu gères le repo TribuZen. Scénario **imposé, identique pour les deux stratégies** :

1. Une feature à livrer : ajouter un fichier `invitations.md` (le flux d'invitation famille).
2. Pendant que la feature avance, un **hotfix urgent** tombe : corriger une typo critique dans `README.md` en « prod ».
3. Livrer les deux en « production » (= sur `main`).

Tu vas dérouler ce scénario **deux fois** dans deux dépôts jumeaux :
- **Partie A** — en **GitHub Flow** (`main` déployable + branches courtes + merge type PR).
- **Partie B** — en **Git Flow** (`develop` + `feature/*` + `release/*` + `hotfix/*`).

Puis tu **comptes les merges** et tu conclus lequel est justifié ici.

### Starter minimal

Aucun fichier fourni : tu construis les deux dépôts de zéro (c'est l'exercice). Prépare un dossier de travail :

```bash
mkdir tp-branching && cd tp-branching
```

**Contraintes :**
- Vraies commandes git uniquement. Pas de raccourci, tu tapes chaque commande.
- À la fin de chaque partie, capture `git log --oneline --graph --all`.
- **Pas de gap-fill** : tu écris toi-même les noms de branches (convention `type/slug`).

---

## Étapes (en friction)

### Partie A — GitHub Flow

1. **Initialise le dépôt A** avec un `main` déployable de départ :
   ```bash
   mkdir ghflow && cd ghflow
   git init -b main
   printf "# TribuZen\n\nBienvnue.\n" > README.md   # typo volontaire : "Bienvnue"
   git add README.md && git commit -m "chore: init projet TribuZen"
   ```
2. **Branche de feature courte** depuis `main` : crée `feat/family-invitations`, ajoute `invitations.md`, commite.
3. **Simule le hotfix** : la typo `Bienvnue` est en prod. Depuis `main` (pas depuis la feature !), crée `hotfix/readme-typo`, corrige, commite.
4. **Livre le hotfix** : merge `hotfix/readme-typo` dans `main` (option `--no-ff` pour matérialiser la PR), supprime la branche.
5. **Termine puis livre la feature** : merge `feat/family-invitations` dans `main` (`--no-ff`), supprime la branche.
6. **Observe** : `git log --oneline --graph --all`. Compte les merges vers `main`.

### Partie B — Git Flow (même scénario)

7. **Initialise le dépôt B** avec `main` **et** `develop` :
   ```bash
   cd .. && mkdir gitflow && cd gitflow
   git init -b main
   printf "# TribuZen\n\nBienvnue.\n" > README.md
   git add README.md && git commit -m "chore: init projet TribuZen"
   git switch -c develop
   ```
8. **Feature** : depuis `develop`, crée `feature/family-invitations`, ajoute `invitations.md`, commite, puis merge dans `develop` (`--no-ff`).
9. **Hotfix** : depuis `main`, crée `hotfix/readme-typo`, corrige la typo, commite. Merge dans `main` **ET** dans `develop` (double merge imposé par Git Flow), tague `v1.0.1`.
10. **Release** : depuis `develop`, crée `release/1.1`, merge dans `main`, tague `v1.1`, puis re-merge `release/1.1` dans `develop`.
11. **Observe** : `git log --oneline --graph --all`. Compte les merges.

### Comparaison

12. **Remplis le tableau** : nombre de merges, nombre de branches créées, nombre de commandes pour livrer la même chose. Conclus : Git Flow était-il justifié pour ce scénario (un seul service, une seule version en prod) ?

---

## Corrigé complet commenté

### Partie A — GitHub Flow

```bash
# ── 1. Init : main déployable ────────────────────────────────────
mkdir ghflow && cd ghflow
git init -b main
printf "# TribuZen\n\nBienvnue.\n" > README.md      # typo : "Bienvnue"
git add README.md && git commit -m "chore: init projet TribuZen"

# ── 2. Feature : branche courte depuis main ──────────────────────
git switch -c feat/family-invitations                # nommage type/slug
printf "# Invitations famille\n\nFlux d'invitation.\n" > invitations.md
git add invitations.md
git commit -m "feat(invite): flux d'invitation famille"

# ── 3. Hotfix : part de MAIN, pas de la feature ──────────────────
git switch main                                      # base = prod, pas la feature
git switch -c hotfix/readme-typo
# corrige "Bienvnue" -> "Bienvenue"
printf "# TribuZen\n\nBienvenue.\n" > README.md
git commit -am "fix(readme): corrige la typo Bienvnue -> Bienvenue"

# ── 4. Livraison du hotfix (merge = PR) ──────────────────────────
git switch main
git merge --no-ff hotfix/readme-typo -m "Merge PR: hotfix/readme-typo"
git branch -d hotfix/readme-typo                     # branche courte : on la supprime

# ── 5. Livraison de la feature ───────────────────────────────────
git switch feat/family-invitations
git merge main                       # optionnel : remettre le hotfix dans la feature
git switch main
git merge --no-ff feat/family-invitations -m "Merge PR: feat/family-invitations"
git branch -d feat/family-invitations

# ── 6. Résultat ──────────────────────────────────────────────────
git log --oneline --graph --all
# * Merge PR: feat/family-invitations
# |\
# | * feat(invite): flux d'invitation famille
# * | Merge PR: hotfix/readme-typo
# |\|
# | * fix(readme): corrige la typo ...
# |/
# * chore: init projet TribuZen
#
# Bilan A : 2 merges vers main, 2 branches courtes, main toujours déployable.
```

### Partie B — Git Flow (même résultat fonctionnel)

```bash
# ── 7. Init : main + develop ─────────────────────────────────────
cd .. && mkdir gitflow && cd gitflow
git init -b main
printf "# TribuZen\n\nBienvnue.\n" > README.md
git add README.md && git commit -m "chore: init projet TribuZen"
git switch -c develop                                # branche permanente n°2

# ── 8. Feature : part de develop, merge dans develop ─────────────
git switch -c feature/family-invitations             # depuis develop
printf "# Invitations famille\n\nFlux d'invitation.\n" > invitations.md
git add invitations.md
git commit -m "feat(invite): flux d'invitation famille"
git switch develop
git merge --no-ff feature/family-invitations -m "Merge feature/family-invitations"
git branch -d feature/family-invitations             # merge n°1

# ── 9. Hotfix : part de main, merge dans main ET develop ─────────
git switch main
git switch -c hotfix/readme-typo
printf "# TribuZen\n\nBienvenue.\n" > README.md
git commit -am "fix(readme): corrige la typo Bienvnue -> Bienvenue"
git switch main
git merge --no-ff hotfix/readme-typo -m "Merge hotfix/readme-typo"   # merge n°2
git tag v1.0.1
git switch develop
git merge --no-ff hotfix/readme-typo -m "Merge hotfix -> develop"    # merge n°3 (double !)
git branch -d hotfix/readme-typo

# ── 10. Release : develop -> main, tag, puis re-merge develop ────
git switch -c release/1.1 develop
# (stabilisation "symbolique" : rien à stabiliser sur ce scénario)
git switch main
git merge --no-ff release/1.1 -m "Merge release/1.1"                 # merge n°4
git tag v1.1
git switch develop
git merge --no-ff release/1.1 -m "Merge release/1.1 -> develop"      # merge n°5
git branch -d release/1.1

# ── 11. Résultat ─────────────────────────────────────────────────
git log --oneline --graph --all
# Bilan B : 5 merges, 4 branches (dont develop permanente), 2 tags,
#           pour livrer EXACTEMENT la même chose que la partie A.
```

### Comparaison — le tableau à remplir

| Métrique | GitHub Flow (A) | Git Flow (B) |
|---|---|---|
| Merges pour livrer | **2** | **5** |
| Branches créées | 2 (courtes) | 4 (dont `develop` permanente) |
| Double-merge du hotfix | Non | **Oui** (`main` + `develop`) |
| Branche `release/*` | Non | Oui (vide de sens ici) |
| `main` toujours déployable | Oui | Oui (mais via cérémonie) |

**Pourquoi ce corrigé est correct :**
- Les deux dépôts aboutissent au **même contenu final** (`README.md` corrigé + `invitations.md` livré) : le résultat métier est identique.
- En **GitHub Flow**, le hotfix ne se merge qu'une fois (dans `main`) : il n'y a **qu'une** branche de vérité, donc pas de re-synchronisation.
- En **Git Flow**, le même hotfix impose un **double merge** (`main` puis `develop`) sinon `develop` régresse — coût direct de la branche permanente. La `release/1.1` n'a **rien stabilisé** ici : c'est la sur-ingénierie rendue visible.
- Conclusion attendue : pour **un seul service à version unique déployé en continu**, Git Flow multiplie les merges sans bénéfice → **GitHub Flow est le bon choix**. Git Flow ne se justifierait que si plusieurs versions coexistaient en prod.

---

## Variante J+30 (fading)

**Même scénario, contraintes ajoutées — reproduire de mémoire, sans rouvrir ce corrigé :**

1. Refais **uniquement la Partie A (GitHub Flow)** en **moins de 10 minutes**, de mémoire.
2. Contrainte nouvelle : la feature `invitations.md` doit être **mergée sur `main` AVANT d'être terminée**, cachée derrière un **feature flag**. Ajoute un fichier `flags.env` contenant `NEW_INVITE=off`, commit-le sur la branche de feature, merge-le, puis fais un second commit `chore(flags): active NEW_INVITE` qui passe le flag à `on` — sans redéployer/recréer de branche de feature.
3. **Critère de réussite :** `git log --graph` montre le flag mergé (off) **avant** que la feature soit « activée » (on), `main` reste linéaire et déployable à chaque commit, et tu expliques à voix haute pourquoi le feature flag remplace la branche longue.

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, ce lab se matérialise ainsi :

- Le modèle **GitHub Flow** de la Partie A **est** le workflow officiel de TribuZen : `main` déployable, branches `feat/`/`fix/`/`hotfix/` courtes, une PR par changement.
- Le feature flag de la variante J+30 correspond au vrai fichier `src/config/flags.ts` (features longues type refonte du flux d'invitation).
- Documente le workflow retenu pour que l'équipe s'y tienne :

```
tribuzen/
  CONTRIBUTING.md            # section "Branching : GitHub Flow" + convention type/slug
  .github/
    pull_request_template.md # checklist PR (CI verte, review) avant merge
    workflows/ci.yml         # bloque le merge si la CI n'est pas verte
  src/config/flags.ts        # feature flags des features longues
```

**Commit cible :**
```
docs(contributing): adopte GitHub Flow (main déployable + PR) pour TribuZen
chore(ci): exige la CI verte avant merge sur main
```
