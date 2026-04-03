# Lab 08 — Monorepo

## Objectif

Modéliser les outils de gestion d'un monorepo : détection de packages affectés et tri topologique pour l'ordre de build.

## Instructions

1. Ouvre `exercise.ts` et complète les fonctions marquées `TODO`
2. Lance les tests : `npm run lab:08`
3. Vérifie avec la solution : `npm run solution:08`

## Concepts testés

- Parsing de configuration workspace (pnpm-workspace style)
- Détection des packages impactés par des changements
- Tri topologique basé sur les dépendances entre packages
