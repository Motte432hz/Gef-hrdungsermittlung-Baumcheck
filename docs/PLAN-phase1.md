# Plan Phase 1 – MVP (Eigennutzung Zwieselwiesel)

Stand: 09.11.2026 · Status: **Entwurf, wartet auf Freigabe**

## Ziel

Ein Einsatz wird vor Ort komplett **offline** erfasst: Assistent → Fotos → GPS → Unterschriften → PDF mit eigenem Logo. Alles wird lokal gespeichert; das PDF wird über „Teilen“ / Mail-App verschickt.
Login, Cloud-Sync, what3words und automatischer Mailversand folgen in Phase 2 – das Datenmodell ist aber jetzt schon darauf ausgelegt.

## Entscheidungen

### Plattformen (Antwort 4: alle gängigen Handys, Tablets, Laptop)

- **Eine Codebasis als PWA**, installierbar auf iPhone/iPad (Safari), Android (Pixel, Samsung usw., Chrome) und Laptop (Chrome, Edge, Firefox, Safari).
- **Responsives Layout:** Handy einspaltig (Referenz 380 px); Tablet und Laptop mit Schrittleiste links und größerem Unterschriftenfeld.
- **Native Apps über Capacitor** am Ende von Phase 1 (Meilenstein 10):
  - Android: APK direkt installierbar. Play Store optional, einmalig ca. 25 $.
  - iOS: Apple Developer Program (99 €/Jahr) plus Mac oder Cloud-Build-Dienst. Bis dahin läuft auf iPhone/iPad die installierte PWA.
- **Mindestversionen (Vorschlag):** iOS/iPadOS 16, Android 9 mit aktuellem Chrome, aktuelle Desktop-Browser.
- **Tests:** automatisch in Chromium, WebKit (Safari-Engine) und Firefox mit Handy-, Tablet- und Desktop-Größen; zusätzlich manuell auf echten Geräten.

### Protokollnummern (Antwort 1)

Format: `<Firmenkürzel>-<Jahr>-<laufende Nr.>`, z. B. `ZW-2026-0042`.

- **Vergabe erst beim Abschluss**, nicht beim Anlegen. Entwürfe haben nur eine interne ID, damit verworfene Entwürfe keine Nummer verbrauchen.
- **Nach dem Abschluss ändert sich die Nummer nie mehr.** Das PDF ist unterschrieben und gesperrt. Eine spätere Umnummerierung würde das PDF und seinen Hash ungültig machen.
- **Phase 2, mehrere Geräte einer Firma:**
  - Online liefert der Server beim Abschluss die nächste fortlaufende Nummer.
  - Ist ein Gerät online, reserviert es sich im Hintergrund einen kleinen **Nummernblock** (z. B. 10 Nummern). Offline nimmt es die nächste Nummer aus diesem Block. Damit bleibt die Nummer auch offline endgültig und es gibt keine doppelten Nummern.
  - Fallback, wenn der Block aufgebraucht ist oder das Gerät nie online war: eine Gerätenummer, z. B. `ZW-2026-T2-005` (T2 = Tablet 2).
  - Sobald wieder Netz da ist, läuft der Sync automatisch im Hintergrund über die Warteschlange.
- **Konten (Phase 2):** eine Firma (Organisation) mit mehreren Logins. Ein gemeinsamer Firmen-Login ist möglich, empfohlen ist **ein Login je Mitarbeiter**, damit das Audit-Log zeigt, wer was gemacht hat. Nach einmaligem Login funktioniert die App vollständig offline.
- **Phase 1:** nur ein lokaler Zähler. Firmenkürzel und Gerätekürzel werden in den Einstellungen festgelegt.

### Personen und Unterschriften (Antwort 2)

- Personen im Team sind entweder
  - **Mitarbeiter aus dem Profil**, oder
  - **Gast/Subunternehmer** mit Name, Firma, Qualifikationen und optional Telefon. Diese Person kann mit einem Tipp als **Subunternehmer-Profil** gespeichert werden, damit sie beim nächsten Einsatz auswählbar ist.
- Unterschrift je Person:
  - **gespeicherte Profil-Unterschrift übernehmen**, oder
  - **frisch vor Ort unterschreiben**. Für Gäste ohne Profil ist das Pflicht.
- Im PDF steht bei jeder Unterschrift, wie sie entstanden ist: „vor Ort unterschrieben, 09.11.2026 08:14, GPS …“ oder „hinterlegte Unterschrift übernommen, bestätigt durch [Aufsicht]“. Das macht nachvollziehbar, wie jede Unterschrift entstanden ist.
- Vorschlag: Für die **Unterweisungs-Bestätigung** ist „frisch unterschreiben“ voreingestellt. Die Profil-Unterschrift lässt sich aber auswählen.

### Hosting (Antwort 3: noch keine Domain)

- Vorschlag: **Cloudflare Pages**, kostenlos, mit Adresse wie `baumcheck.pages.dev`. Eine eigene Domain lässt sich später ohne Aufwand ergänzen.
- Dort liegt nur die App selbst. **Keine Einsatzdaten**, die bleiben in Phase 1 auf dem Gerät.
- Ein Konto anlegen musst du selbst. Ich sage Bescheid, sobald Meilenstein 1 so weit ist.

### Technik (wie besprochen)

- **Basis:** React, TypeScript, Vite, Tailwind (mit Dark Mode und großen Touch-Zielen), PWA mit Offline-Cache.
- **Lokale Datenbank:** Dexie/IndexedDB. Die App fragt `navigator.storage.persist()` an, damit der Browser die Daten nicht löscht. Dazu gibt es ein **Backup als ZIP** (Export/Import) mit Erinnerung.
- **Datensätze:** Jeder Datensatz hat eine UUID, `organizationId`, Zeitstempel und `syncState`. Phase 2 braucht dadurch keine Datenmigration.
- **Formulardefinition als versioniertes JSON:** Texte siehe `docs/FORMULARTEXTE.md`. Assistent und PDF werden beide daraus erzeugt.
- **Automatisches Speichern** bei jeder Eingabe.
- **PDF:** pdf-lib mit eingebetteter Schrift. Statt der Karte gibt es offline einen QR-Code mit Kartenlink.
- **Hashes:**
  - In der Fußzeile steht ein **Inhalts-Hash** über Antworten, Unterschriften und Formularversion.
  - Der SHA-256 der fertigen PDF-Datei wird zusätzlich gespeichert und angezeigt.
- **Sperre nach Abschluss:** Korrekturen nur als neue Version mit Verweis auf das Original. Alle Aktionen landen im Audit-Log.

## Meilensteine

| #   | Inhalt                                                                                                 | Ergebnis zum Anschauen                    |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| 0   | **Formulartexte abstimmen** (`docs/FORMULARTEXTE.md`)                                                  | deine Korrekturen eingearbeitet           |
| 1   | Grundgerüst: Vite/React/TS, Tailwind, PWA, Router, Lint, Vitest, Playwright, GitHub Actions            | leere App installierbar, offline startbar |
| 2   | Datenbank, Formulardefinition (JSON), Prüflogik (Pflicht-Maßnahmen, Warnungen, Plausibilität)          | Unit-Tests                                |
| 3   | Profile: Firma (Logo), Mitarbeiter, Subunternehmer, Ausrüstung, Kunden/Objekte                         | Profile pflegen                           |
| 4   | Assistent-Gerüst und Bausteine; Schritte 1, 3, 4, 7, 8                                                 | Durchklicken am Handy                     |
| 5   | Standort: GPS mit Genauigkeit, Adresse (online Nominatim, offline von Hand), Karte nur online, Zufahrt | Standort erfassen                         |
| 6   | Bäume: mehrere je Einsatz, Fotos (verkleinert), Beurteilung, Ergebnis mit Warnlogik                    | Bäume erfassen                            |
| 7   | Zusammenfassung, offene Warnungen, Unterschriften (Profil oder frisch)                                 | Unterschreiben                            |
| 8   | PDF, Abschluss, Sperre, Hashes, Protokollnummer, Teilen                                                | fertiges PDF                              |
| 9   | Archiv mit Suche, „als Vorlage kopieren“, Backup-Export/-Import, neue Version                          | Archiv                                    |
| 10  | Feinschliff, Capacitor-Builds (Android, iOS vorbereiten), Feldtest                                     | Test auf euren Geräten                    |

## Tests

- **Unit:** Prüflogik, Sichtbarkeitsbedingungen, Protokollnummern, Hashes, Sperre und Versionen.
- **PDF:**
  - erzeugen und zurücklesen: Seiten, Pflichttexte, Umlaute, Warnungen, Fußzeile
  - Referenz-Snapshots
- **E2E:** ein kompletter Einsatz im Offline-Modus, in Handy-, Tablet- und Desktop-Größe.
- **Sync-Logik:** in Phase 2. Die Nummernvergabe ist schon als Modul vorbereitet und wird getestet.

## Risiken

- **iOS Safari** kann Daten nicht installierter Web-Apps löschen. Gegenmaßnahmen: App auf dem Home-Bildschirm installieren, Persist-Anfrage, Backup-Erinnerung. In Phase 2 entfällt das Problem durch den Cloud-Sync.
- **Formulartexte** sind eine Neufassung. Die fachliche Prüfung liegt bei dir. Vor dem Verkauf in Phase 3 sollte geklärt werden (z. B. mit der SVLFG), ob die Fassung den Anforderungen genügt.
- **Unterschriften** auf dem Display sind einfache elektronische Unterschriften. Das ersetzt keine Rechtsberatung.
