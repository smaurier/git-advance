import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Git avancé',
  description: 'Formation Git avancé : internals, branching, rebase interactif, bisect, hooks, worktrees, submodules, monorepos, workflows (intermédiaire → expert)',
  lang: 'fr-FR',
  srcDir: '.',

  // Refonte v1 : liens internes non bloquants (labs renumérotés) ; intégrité
  // prereq/next enforcée par gate-course.ps1.
  ignoreDeadLinks: true,

  // Refonte v1 : le cours vit dans modules/ + labs/. cours/ (v0, archive) exclu.
  srcExclude: ['cours/**'],

  // Docs statiques : neutralise l'interpolation Vue `{{ }}` en prose.
  vue: {
    template: {
      compilerOptions: {
        delimiters: ['(%(', ')%)'],
      },
    },
  },

  themeConfig: {
    nav: [
      { text: 'Modules', link: '/modules/00-prerequis-et-introduction' },
      { text: 'Labs', link: '/labs/lab-01-git-objects/README' },
      { text: 'Glossaire', link: '/glossaire' },
    ],

    sidebar: {
      '/': [
        {
          text: 'Modules',
          items: [
            { text: '00 — Prérequis & Introduction', link: '/modules/00-prerequis-et-introduction' },
            { text: '01 — Git internals & objets', link: '/modules/01-git-internals-objects' },
            { text: '02 — Stratégies de branching', link: '/modules/02-strategies-branching' },
            { text: '03 — Merge vs Rebase', link: '/modules/03-merge-vs-rebase' },
            { text: '04 — Rebase interactif', link: '/modules/04-rebase-interactif' },
            { text: '05 — git bisect & debugging', link: '/modules/05-git-bisect-debugging' },
            { text: '06 — Git hooks & automatisation', link: '/modules/06-git-hooks-automatisation' },
            { text: '07 — Worktrees & submodules', link: '/modules/07-worktrees-submodules' },
            { text: '08 — Monorepos', link: '/modules/08-monorepos' },
            { text: '09 — Workflows collaboratifs', link: '/modules/09-workflows-collaboratifs' },
            { text: '10 — Projet final', link: '/modules/10-projet-final' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: 'Sur cette page',
    },

    docFooter: {
      prev: 'Précédent',
      next: 'Suivant',
    },
  },
})
