# BaumCheck

App für Baumpflegebetriebe zum Erstellen einer **einsatzbezogenen Gefährdungsermittlung / Baumsicherheitsbeurteilung** direkt vor Ort – offline-fähig, auf Handy, Tablet und Laptop.

- Projektbeschreibung und Anforderungen: [`CLAUDE.md`](CLAUDE.md)
- Plan Phase 1 (MVP): [`docs/PLAN-phase1.md`](docs/PLAN-phase1.md)
- Formulartexte (Entwurf zur Abstimmung): [`docs/FORMULARTEXTE.md`](docs/FORMULARTEXTE.md)

## Entwicklung

Voraussetzung: Node.js 22+

```bash
npm install
npm run dev          # Entwicklungsserver
npm run build        # Produktions-Build nach dist/
npm run preview      # Build lokal ansehen (inkl. Offline-Modus)
```

## Qualität

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run format       # Prettier
npm test             # Unit-Tests (Vitest)
npm run e2e          # End-to-End-Tests (Playwright) in Handy-, Tablet- und Desktop-Größe
ALL_BROWSERS=1 npm run e2e   # zusätzlich WebKit (iPhone/iPad) und Firefox
```

Die GitHub-Actions-Pipeline führt alle Prüfungen bei jedem Push aus.

## Technik

React · TypeScript · Vite · Tailwind CSS · PWA (vite-plugin-pwa / Workbox) · React Router · Vitest · Playwright

App-Icons werden aus `public/favicon.svg` erzeugt: `npm run icons`.
