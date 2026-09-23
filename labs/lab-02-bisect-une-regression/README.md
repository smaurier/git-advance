# Lab 02 — Intervention : trouver une régression réelle avec `git bisect`

> **Outcome :** à la fin, tu as trouvé, par recherche binaire AUTOMATISÉE (pas une boucle
> `for` qui checkout chaque commit un par un — `git bisect` fait mieux, en O(log n)), le
> commit EXACT qui a introduit une régression réelle dans un historique de 10 commits.
> **Vrai outil :** `git bisect start`/`bad`/`good`/`run`, un vrai script de test
> (`check.mjs`) au contrat exact que `bisect run` attend (exit 0 = sain, exit 1 = cassé).
> **Feedback :** `npm run lab` — RED tant que `src/findCulprit.mjs` ne satisfait pas
> l'oracle. `npm run solution` prouve l'oracle (compte ~30-40 s : un vrai `git bisect run`
> lance un vrai processus Node à chaque étape).

## Prérequis technique

`git` doit être installé. Aucune dépendance npm.

## Lire avant (une lecture bornée)

- Module [`05-git-bisect-debugging.md`](../../modules/05-git-bisect-debugging.md) —
  recherche binaire sur les commits, `git bisect run`, les codes de sortie qu'il attend.

## Énoncé

L'oracle prépare un historique RÉEL de 10 commits : `calc.mjs` (une fonction `add`) est
saine sur les 5 premiers commits, puis CASSÉE à partir du 6e (et reste cassée jusqu'à
`HEAD`). `check.mjs`, committé à chaque étape, dit si le commit courant est sain ou cassé.

Lis les commentaires en tête de `src/findCulprit.mjs`. Utilise `git bisect` pour trouver
AUTOMATIQUEMENT le commit fautif.

**Le piège à éviter.** Une boucle JS qui fait `git checkout <chaque-sha>` puis lance
`check.mjs` un par un TROUVERAIT le bon commit — mais en O(n), pas O(log n), et ce n'est
pas ce que `git bisect` apporte. Le sujet du lab est d'utiliser le VRAI outil (`bisect run`),
pas de le réinventer manuellement.

## Étapes (en friction)

1. `npm run lab` : RED.
2. `git bisect start`, `git bisect bad` (HEAD, connu cassé), `git bisect good <firstCommit>`
   (donné en paramètre, connu sain).
3. `git bisect run node check.mjs` — laisse git faire la recherche binaire.
4. Récupère `HEAD` (git t'y a laissé positionné, sur le premier commit cassé).
5. `git bisect reset` avant de retourner le résultat.

## Vérifier

```bash
cd 07-git-avance/labs/lab-02-bisect-une-regression
npm run lab
npm run solution
```

**Ce que l'oracle vérifie**

`findCulprit` s'exécute sans erreur ; le SHA retourné correspond EXACTEMENT au 6e commit
(ni le 5e — encore sain, ni le 7e — déjà trop tard) ; le bisect a bien été nettoyé
(`bisect reset`), le dépôt n'est plus dans un état de bisect ; le dépôt est revenu sur
`main`.

## Variante J+30 (fading)

Le script `check.mjs` d'un des commits intermédiaires ne peut PAS s'exécuter du tout (une
erreur de syntaxe committée par erreur, pas liée au bug qu'on cherche). `git bisect` a un
code de sortie spécial pour "ce commit est ininterprétable, saute-le" — lequel (module 05) ?

## Application TribuZen

Même geste sur une vraie régression de `tribuzen-api`, avec `npm test` comme script de
vérification au lieu de `check.mjs`. Commit :
`docs(git): régression localisée par bisect run, commit fautif identifié précisément`.
