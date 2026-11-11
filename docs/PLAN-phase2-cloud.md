# Plan Phase 2 – Firmen-Kartei, Beitritt per Code, Abgleich zwischen Geräten

Stand: 11.11.2026 · Status: in Umsetzung – Block 1 (Datenbank und Rechte) fertig

## Ablauf

1. **Firma einrichten** (erstes Gerät): Firmendaten, Logo; die Person wird **Inhaber/in**.
2. **Einladen**: Unter „Firma“ → „Mitarbeiter / Gerät einladen“ → Code (z. B. `ZW-7K3P-92`) und QR-Code, 7 Tage gültig.
3. **Beitreten** (neues Gerät): „Einer Firma beitreten“ → Code, Name, E-Mail → Anmeldung mit 6-stelligem E-Mail-Code → „Warte auf Freigabe“.
4. **Freigabe**: Admins sehen die Anfrage (Name, E-Mail, Gerät) → Freigeben (mit Rolle) / Ablehnen.
5. **Nach Freigabe**: Das Gerät lädt alle Firmendaten (Logo, Farben, Personen, Subunternehmer, Kunden, Standard-Ausrüstung, Protokolle). Für die Person wird automatisch ein eigenes Profil in der Firma angelegt bzw. verknüpft.
6. **Abgleich**: automatisch, sobald Netz da ist; offline geht alles weiter (Warteschlange).

## Entscheidungen

- **Anmeldung**: E-Mail + Einmal-Code (kein Passwort).
- **Protokolle**: Alle Mitglieder sehen alle Protokolle der Firma.
- **Rollen**:

| Recht                                                      | Inhaber/in (genau 1) | Admin (mehrere)      | Mitarbeiter                           |
| ---------------------------------------------------------- | -------------------- | -------------------- | ------------------------------------- |
| Firmendaten, Logo, Farben, Ausrüstung, Nummernkreis ändern | ✓                    | ✓                    | –                                     |
| Personen, Subunternehmer, Kunden neu anlegen               | ✓                    | ✓                    | ✓                                     |
| Bestehende Einträge ändern                                 | ✓                    | ✓                    | nur selbst angelegte + eigenes Profil |
| Einträge/Personen/Kunden **löschen**                       | ✓                    | –                    | –                                     |
| Protokolle/Entwürfe anderer löschen                        | ✓                    | –                    | –                                     |
| Backups löschen, Firma löschen                             | ✓                    | –                    | –                                     |
| Mitglieder freigeben / Rollen vergeben                     | ✓                    | ✓ (nicht Inhaber/in) | –                                     |
| Inhaberschaft übertragen                                   | ✓                    | –                    | –                                     |

Admins können also keine Daten endgültig löschen. Ein „Entfernen“ durch Admins ist höchstens ein Ausblenden/Deaktivieren, das die Inhaberin/der Inhaber rückgängig machen kann.

## Technik

- Supabase, Region EU (Frankfurt): Auth (E-Mail-OTP), Postgres mit Row Level Security, Storage, Edge Functions.
- Tabellen wie in CLAUDE.md, zusätzlich `memberships` (user, organization, role: owner/admin/member, status: pending/active) und `invites` (Code-Hash, Ablauf, erstellt von).
- Jeder Datensatz bekommt `created_by`; RLS prüft Rolle und Ersteller serverseitig.
- Abgeschlossene Protokolle bleiben unveränderbar (Server prüft zusätzlich).
- Konflikte: Stammdaten ändern nur Admins → selten; je Datensatz gewinnt die neueste Änderung, Protokolle werden nie überschrieben.

## Vorleistungen in Phase 1 (Blöcke B/D)

- Subunternehmer-Firmen als eigene Datensätze.
- Löschen an einer Stelle gebündelt, damit es später an die Inhaber-Rolle gebunden werden kann.

## Nötig vom Betrieb

- Supabase-Konto (kostenloser Tarif zum Start; bei vielen Fotos/PDFs Pro, ca. 25 $/Monat).
- Später: Mail-Dienst mit EU-Server für die Anmelde-Codes.

## Umsetzung

| Block | Inhalt                                                                         | Stand |
| ----- | ------------------------------------------------------------------------------ | ----- |
| 1     | Datenbank, Rechte (RLS), Funktionen für Firma/Einladung/Freigabe, Datei-Ablage | ✓     |
| 2     | Anmeldung per E-Mail-Code, Firma in die Cloud bringen, beitreten               | offen |
| 3     | Abgleich Daten und Dateien                                                     | offen |
| 4     | Mitglieder-Verwaltung in der App                                               | offen |

### Datenbank pflegen

- Schema: `supabase/migrations/*.sql` (werden der Reihe nach genau einmal angewendet)
- Rechte-Tests: `supabase/tests/rls_test.sql` (laufen in einer Transaktion, die zurückgerollt wird)
- `scripts/db.sh migrate` · `scripts/db.sh test` · `scripts/db.sh query "select 1"`
- Benötigt einen Supabase-Zugangs-Token (`SUPABASE_ACCESS_TOKEN`); in der Cloud-Entwicklungsumgebung setzt ihn der Netzwerk-Proxy automatisch ein.
- Projekt: `fjrhcvgiyivanikgazyk` (Region eu-central-1, Frankfurt)
- Die Sicherheitsprüfung von Supabase meldet nur die sechs App-Funktionen (`create_organization`, `create_invite`, `request_join`, `decide_membership`, `set_my_worker`, `transfer_ownership`). Das ist gewollt: Sie prüfen die Rolle selbst, die Tests decken das ab.
