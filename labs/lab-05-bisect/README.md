# Lab 05 — Git bisect et debugging d'historique

> **Outcome :** à la fin, tu sais trouver le commit qui casse un test avec `git bisect` (manuel **et** `git bisect run`), puis enquêter avec `git blame` et le pickaxe (`git log -S`/`-G`).
> **Vrai outil :** Git réel + Node/npm dans un dépôt que tu crées de zéro — pas de harnais simulé, aucune fonction à compléter.
> **Feedback :** le coach valide en session (le vrai `git bisect run` affiche lui-même `is the first bad commit`).

---

## Énoncé

Tu vas fabriquer un vrai dépôt Git avec un historique piégé : un test vert au départ, cassé quelque part au milieu par un commit précis, plus un `feature flag` introduit encore avant. Puis tu retrouves le commit fautif **sans le connaître** — d'abord à la main, puis en une seule commande automatisée — et tu remontes à l'origine du flag avec `blame` et pickaxe.

**Tout se fait avec de vraies commandes git.** Aucune fonction TypeScript à compléter, aucun `npm run lab:05`.

### Setup — construire l'historique piégé

Copie-colle ce bloc tel quel (bash / Git Bash / WSL). Il crée un dépôt de 12 commits dont **un** casse le test.

```bash
mkdir tp-bisect && cd tp-bisect
git init -q

# Le module testé : additionne le sous-total d'une commande TribuZen
cat > sum.js <<'EOF'
// Somme des montants d'une commande (en centimes)
const ALLOW_NEGATIVE = false;
function sum(amounts) {
  return amounts.reduce((acc, n) => acc + n, 0);
}
module.exports = { sum, ALLOW_NEGATIVE };
EOF

# Le test : rend exit 0 si vert, exit 1 si rouge (convention bisect)
cat > sum.test.js <<'EOF'
const assert = require('assert');
const { sum } = require('./sum');
assert.strictEqual(sum([100, 200, 50]), 350);
console.log('OK');
EOF

git add . && git commit -q -m "feat: sum + test (vert)"

# 5 commits anodins — le test reste vert
for i in 1 2 3 4 5; do
  echo "// note $i" >> sum.js
  git commit -qam "chore: note $i"
done

# Introduction du feature flag suspect (pour la partie pickaxe)
sed -i 's/const ALLOW_NEGATIVE = false;/const ALLOW_NEGATIVE = true; \/\/ flag migration/' sum.js
git commit -qam "feat: ALLOW_NEGATIVE flag temporaire"

# LE COMMIT FAUTIF : introduit un bug dans sum (offset de +1)
sed -i 's/acc + n, 0/acc + n, 1/' sum.js
git commit -qam "refactor: init reduce (BUG ici)"

# 4 commits anodins après le bug — le test reste rouge
for i in 6 7 8 9; do
  echo "// note $i" >> sum.js
  git commit -qam "chore: note $i"
done

echo "--- Historique prêt ---"
git log --oneline
echo "--- État actuel du test ---"
node sum.test.js || echo "ROUGE (attendu)"
```

> Note Windows : exécute ce lab sous **Git Bash** ou **WSL** — le bloc utilise des here-docs (`<<'EOF'`), `sed -i` et des boucles `for` qui sont du bash. En **PowerShell pur**, il faut adapter : remplacer les here-docs par des `Set-Content`, les `sed -i` par une édition manuelle de `sum.js`, et les boucles `for i in ...` par `foreach ($i in 1..5) { ... }`.

Tu obtiens 12 commits. Le premier (`feat: sum + test`) est **bon**, `HEAD` est **mauvais**. Tu ne dois PAS regarder lequel casse — c'est ce que bisect va trouver.

---

## Étapes (en friction)

### Partie A — Bisect manuel

1. Démarre une session : `git bisect start`.
2. Marque l'état courant : `git bisect bad` (le test est rouge maintenant).
3. Marque le point de départ connu bon : `git bisect good <hash-du-premier-commit>` (prends-le dans `git log --oneline`, le tout premier).
4. Git checkout un commit du milieu. **Teste-le** : `node sum.test.js`. Selon le résultat, tape `git bisect good` (le test passe) ou `git bisect bad` (il échoue).
5. Répète l'étape 4 jusqu'au verdict `... is the first bad commit`.
6. Note le hash et le message trouvés, puis **`git bisect reset`**.

### Partie B — Bisect automatisé (le cœur du lab)

7. Relance en laissant Git tout piloter. `node sum.test.js` rend déjà 0/1 → il est directement utilisable :
   ```bash
   git bisect start HEAD <hash-du-premier-commit>
   git bisect run node sum.test.js
   git bisect reset
   ```
8. Vérifie que le commit trouvé est **le même** qu'en partie A, mais obtenu sans aucune décision manuelle. Compte le nombre d'étapes que Git a affichées.
9. Inspecte le diff exact du coupable : `git show <hash-fautif>`.

### Partie C — blame + pickaxe

10. Sur `HEAD`, trouve qui a écrit la ligne du `reduce` : `git blame -L '/reduce/,+1' sum.js`.
11. Retrouve **quand** le flag `ALLOW_NEGATIVE` est passé à `true` avec le pickaxe : `git log -S 'ALLOW_NEGATIVE = true' --oneline`, puis ajoute `-p` pour voir le diff.
12. Compare avec `git log -G 'ALLOW_NEGATIVE'` : observe qu'il liste plus de commits (toute ligne touchée) que `-S`.

---

## Corrigé complet commenté

```bash
# ══════════════ PARTIE A — Bisect manuel ══════════════
# Récupère le hash du commit bon connu (le tout premier)
git log --oneline
#   e9f... chore: note 9
#   ...
#   a1b... feat: sum + test (vert)   ← GOOD connu

git bisect start          # ouvre la session
git bisect bad            # HEAD est rouge → mauvais
git bisect good a1b       # premier commit → bon

# Git checkout le milieu et annonce "roughly 3-4 steps".
# À CHAQUE étape, on TESTE puis on classe :
node sum.test.js          # affiche "OK" (exit 0) ou une AssertionError (exit 1)
git bisect good           #   si "OK"  → le bug est plus RÉCENT
# ou
git bisect bad            #   si erreur → le bug est ICI ou plus ANCIEN

# ... répéter ~4 fois (log2(12) ≈ 4) ...
#   <hash> is the first bad commit
#       refactor: init reduce (BUG ici)

git bisect reset          # OBLIGATOIRE : sort du HEAD détaché, revient sur la branche


# ══════════════ PARTIE B — Bisect automatisé ══════════════
# node sum.test.js rend 0 si vert / 1 si rouge → convention bisect respectée.
# Git enchaîne checkout → run → classe → recommence, tout seul.
git bisect start HEAD a1b            # bad=HEAD, good=a1b en une ligne
git bisect run node sum.test.js
#   running 'node sum.test.js'   → exit 1 → bad
#   running 'node sum.test.js'   → exit 0 → good
#   running 'node sum.test.js'   → exit 1 → bad
#   <hash> is the first bad commit
#       refactor: init reduce (BUG ici)
#   bisect run success
git bisect reset

# → MÊME commit qu'en partie A, zéro décision manuelle.
# Le diff exact qui a cassé le test :
git show <hash-fautif>
#   -  return amounts.reduce((acc, n) => acc + n, 0);
#   +  return amounts.reduce((acc, n) => acc + n, 1);   ← +1 parasite


# ── Variante : script dédié quand le test complet ne suffit pas ──
cat > check.sh <<'EOF'
#!/usr/bin/env bash
node -e "require('./sum')" || exit 125   # non testable (module cassé) → skip
node sum.test.js                          # 0 = good, 1 = bad
EOF
chmod +x check.sh
git bisect start HEAD a1b
git bisect run ./check.sh                 # exit 125 skippe les commits non chargeables
git bisect reset


# ══════════════ PARTIE C — blame + pickaxe ══════════════
# Qui a écrit la ligne du reduce, telle qu'elle est aujourd'hui ?
git blame -L '/reduce/,+1' sum.js
#   <hash-fautif> (Toi <date> 4) return amounts.reduce((acc, n) => acc + n, 1);

# QUAND le flag est-il passé à true ? (-S = variation du nombre d'occurrences)
git log -S 'ALLOW_NEGATIVE = true' --oneline
#   <hash-flag> feat: ALLOW_NEGATIVE flag temporaire   ← un seul commit : sa naissance
git log -S 'ALLOW_NEGATIVE = true' -p        # + le diff exact de l'introduction

# -G est plus large : TOUT commit dont le diff touche une ligne "ALLOW_NEGATIVE"
git log -G 'ALLOW_NEGATIVE' --oneline
#   <hash-flag>  feat: ALLOW_NEGATIVE flag temporaire
#   <hash-init>  feat: sum + test (vert)   ← la déclaration initiale = false, captée aussi
```

**Pourquoi ce corrigé est correct :**
- `node sum.test.js` respecte la convention bisect (0 vert / 1 rouge) → utilisable tel quel dans `git bisect run` sans wrapper.
- Partie A et B trouvent forcément le **même** commit : bisect est déterministe sur un historique monotone (une fois cassé, reste cassé).
- `git bisect reset` clôt chaque session : sans lui on resterait en HEAD détaché sur un commit du milieu.
- `-S 'ALLOW_NEGATIVE = true'` isole la *naissance* du flag (le compte d'occurrences de cette chaîne passe de 0 à 1) ; `-G 'ALLOW_NEGATIVE'` renvoie en plus la déclaration initiale, illustrant la différence compte-vs-regex.
- `exit 125` dans `check.sh` protège des commits non chargeables (skip) plutôt que de les classer « mauvais » à tort.

---

## Variante J+30 (fading)

**Même objectif, contraintes ajoutées — reproduire de mémoire, en 20 minutes :**

1. Reconstruis un dépôt piégé avec **au moins 30 commits** (boucle `for`), le bug injecté à une position que tu ne notes pas.
2. Trouve le commit fautif **uniquement** avec `git bisect run` + un `check.sh` qui gère `exit 125`.
3. Sans relancer bisect, exporte la session avec `git bisect log > run.log` et explique à voix haute à quoi sert `git bisect replay run.log`.
4. Avec le pickaxe, retrouve en une commande le commit qui a **supprimé** une ligne donnée (pas seulement ajoutée).

**Critère de réussite :** bisect run désigne le bon commit en ≤ 6 étapes affichées, et tu sais dire pourquoi `-S` répond à « quand cette ligne est-elle apparue/disparue » là où `blame` répond à « qui l'a écrite aujourd'hui ».

---

## Application TribuZen

Dans le repo `smaurier/tribuzen`, cette séquence est la routine de chasse aux régressions :

```bash
# 1. La CI est rouge sur main depuis un merge inconnu → bisect run sur le vrai test
git bisect start HEAD <dernier-tag-vert>          # ex. v1.4.0
git bisect run npx vitest run src/invite/inviteMember.test.ts
git bisect reset

# 2. Comprendre la ligne coupable
git blame -L '/duplicate/,+5' src/invite/inviteMember.ts

# 3. Tracer un feature flag de migration
git log -S 'ALLOW_DUPLICATE_INVITE' -p -- src/invite/config.ts
```

**Différences par rapport au lab :**
- Le test cible est un vrai `vitest run` (pas un `node file.test.js`) — même convention 0/1, donc `bisect run` fonctionne à l'identique.
- Le dépôt versionne `.git-blame-ignore-revs` + `git config blame.ignoreRevsFile` pour que les `chore: format` ne polluent pas les blames.
- Les bornes `good` viennent des tags de release posés par la CI, pas d'un hash noté à la main.

**Commit cible :**
```
chore(scripts): check-invite-bug.sh — cible bisect run (exit 0/1/125)
docs: .git-blame-ignore-revs — ignorer les commits de reformatage
```
