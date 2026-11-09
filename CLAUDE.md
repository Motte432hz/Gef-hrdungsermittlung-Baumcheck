# Projekt: Gefährdungsermittlung Baumpflege (Arbeitstitel „BaumCheck“)

## Ziel
App für Baumpflegebetriebe zum Erstellen einer **einsatzbezogenen Gefährdungsermittlung / Baumsicherheitsbeurteilung** direkt vor Ort.
Ablauf: Formular Schritt für Schritt ausfüllen → alle Beteiligten unterschreiben → fertiges PDF mit eigenem Firmenlogo → Ablage in der Cloud + Versand an Firmen-Mail → Auftrag/Rechnung anhängen.

Grundlage ist der Inhalt des SVLFG-Formulars „Einsatzbezogene Gefährdungsermittlung/Baumsicherheitsbeurteilung“ (Stand Sept. 2019), **inhaltlich überarbeitet und verständlicher formuliert**. Kein SVLFG-Logo, keine SVLFG-Kopfzeile im Ergebnis.

Erst Eigennutzung (Firma Zwieselwiesel), später **Verkauf an andere Betriebe** (SaaS, mandantenfähig von Anfang an).

## Anforderungen (Kurzfassung)
- Läuft auf iOS, Android, Desktop (Browser)
- **Offline-first**: komplette Erfassung inkl. Unterschriften und PDF ohne Netz; Sync, sobald Netz da ist
- Ausfüllen als **geführter Assistent** (ein Thema pro Ansicht), sieht NICHT wie ein PDF aus – PDF nur als Ergebnis
- Standort per GPS, Adresse, what3words, Zufahrtsinfos für Rettungskräfte
- Fotos vom Baum mit Gerätekamera (optional, mehrere)
- Unterschrift aller eingetragenen Personen auf dem Display
- PDF mit eigenem Logo + Firmendaten, unveränderbar nach Abschluss
- Upload/Foto-Scan von Auftragsbestätigung oder Rechnung, verknüpft mit dem Einsatz
- Vorgespeicherte Profile (Firma, Mitarbeiter, Ausrüstung, Kunden)

## Tech-Stack
- **Frontend**: React + TypeScript + Vite, als PWA
- **Native Apps**: Capacitor (iOS/Android, Kamera, GPS, Dateien)
- **UI**: Tailwind CSS, große Touch-Ziele (Bedienung mit Handschuhen/draußen), hoher Kontrast, Dark Mode
- **Offline-Speicher**: IndexedDB via Dexie; Sync-Warteschlange für ausstehende Uploads
- **Backend**: Supabase, **EU-Region (Frankfurt)** – Auth, Postgres mit Row Level Security, Storage, Edge Functions
- **PDF**: clientseitig mit pdf-lib (muss offline funktionieren)
- **Unterschrift**: signature_pad
- **Karte**: Leaflet + OpenStreetMap (online); offline nur Koordinaten anzeigen
- **what3words**: API-Aufruf über Supabase Edge Function (API-Key nie im Client); offline später nachladen
- **E-Mail-Versand**: Edge Function + transaktionaler Mail-Dienst mit EU-Server
- **Später**: Stripe für Abos

## Architektur-Grundsätze
1. **Mandantenfähig ab Tag 1**: jede Tabelle hat `organization_id`, RLS erzwingt Trennung.
2. **Offline-first**: lokale Daten sind die Wahrheit während der Erfassung; Server-Sync ist nachgelagert.
3. **Unveränderbarkeit**: Nach Abschluss wird das Protokoll gesperrt. Gespeichert werden der SHA-256-Hash des PDFs, Zeitstempel und Geräte-Info. Korrekturen nur als neue Version mit Verweis auf das Original.
4. **Audit-Log**: wer hat wann was erstellt/abgeschlossen/versendet.
5. **DSGVO**: EU-Hosting, Unterschriften und Namen sind personenbezogene Daten, Löschkonzept, später AV-Vertrag für Kunden.
6. **Formular-Definition als Daten** (JSON-Schema), nicht hartkodiert – damit Texte/Punkte später anpassbar sind und Kunden eigene Punkte ergänzen können.

## Datenmodell (Entwurf)
- `organizations`: Name, Logo, Adresse, Telefon, E-Mail, Versand-E-Mail(s), Steuer-/Betriebsnummer optional
- `members`: Benutzerkonten der Organisation, Rolle (Admin/Mitarbeiter)
- `workers`: Mitarbeiter-Profile: Name, Qualifikationen (AS-Baum I, AS-Baum II, SKT A, SKT B, SKT K), Ablaufdaten der Nachweise optional, gespeicherte Unterschrift optional
- `equipment_presets`: Standard-Ausrüstung (vorbelegte Häkchen)
- `customers`: Kunden (z. B. Hausverwaltungen) mit Objekten/Adressen
- `assessments`: ein Einsatz/Protokoll, Status (Entwurf / abgeschlossen / versendet), alle Antworten als JSON, Version
- `trees`: Bäume je Einsatz (mehrere möglich), Antworten + Fotos
- `signatures`: Person, Rolle, Bild, Zeitstempel, GPS zum Zeitpunkt der Unterschrift
- `attachments`: Fotos, Auftragsbestätigung, Rechnung (Typ, Datei, Zeitstempel)
- `audit_log`

## Antwortlogik (wichtigste Verbesserung ggü. Original)
Im Original bedeutet ein Häkchen mal „OK“ und mal „Gefahr“. Neu gibt es zwei Typen:
- **Kontrollpunkt** (z. B. „PSA überprüft“): Ja / Nein / nicht relevant. „Nein“ → Warnhinweis + Pflichtfeld „Maßnahme/Begründung“.
- **Gefahrenmerkmal** (z. B. „Stromleitungen“, „Faulstellen“): vorhanden / nicht vorhanden. „Vorhanden“ → Pflichtfeld „Maßnahme“.

Jeder Punkt hat einen kurzen **Infotext (i)** mit Erklärung, optional Skizze.

## Ablauf / Schritte im Assistenten

### 1. Einsatz
- Einsatzart (Mehrfachauswahl): Baumarbeiten, Hubarbeitsbühneneinsatz, Seilklettertechnik (SKT), Einsatz von Kranen
- Kunde/Objekt (aus Profil oder neu)
- Datum (auto), Dauer von/bis
- Aufsichtsführende Person (aus Mitarbeitern)

### 2. Standort & Rettung
- GPS-Position automatisch (mit Genauigkeit), Adresse (Reverse Geocoding online, sonst manuell)
- what3words-Adresse
- Zufahrt/Treffpunkt für Rettungsdienst (Freitext), nächstes Krankenhaus optional
- Kontrollpunkte: genauer Einsatzort/Zufahrt bekannt, Notruf möglich (Mobilfunkempfang)

### 3. Team
- Mitarbeiter auswählen; Qualifikationen kommen aus dem Profil
- Rollen zuweisen: Aufsicht, Kletterer, Bodenperson, Sicherungsposten
- Kontrollpunkte: Arbeitsauftrag besprochen, Personal eingeteilt, Kommunikation abgesprochen, gesundheitliche Eignung, ausreichende Erfahrung für die geplanten Arbeiten
- Plausibilität: Bei SKT mindestens 2 Personen mit SKT-Qualifikation + Bodenperson (Hinweis, nicht blockierend)

### 4. Geplante Arbeiten
Totholzentnahme, Kronenpflege, Kroneneinkürzung, Kronensicherung, Kronensicherungsschnitt, Fällung, Fällung mit Abseiltechnik, Fällung mit Kran, Sonstiges (Freitext)

### 5. Baum (wiederholbar je Baum)
- Baumart, Baumhöhe (m), Stammdurchmesser (cm), Baum-Nr. optional
- Wuchsform: Normalbaum, Vorhänger, Rückhänger, Seithänger, angekippt
- Fotos (Kamera/Galerie, mehrere)

### 6. Baumbeurteilung (je Baum)
- **Baumumfeld** (Gefahrenmerkmale): Bodenrisse, Nachbarbäume, Wurzelverletzung, Pilzfruchtkörper
- **Stammfuß/Stamm**: Defektsymptome (Risse/Wülste/Beulen/Rippen), Pilzfruchtkörper, Faulstellen, baumchirurgische Maßnahmen, Wunden, abgestorbene Rinde
- **Krone**: Vitalität eingeschränkt, Totholz, Defektsymptome, Druckzwiesel, Ausbrüche, Sturmschäden, Insektennester, alte Kronensicherung, Kappung, Faulstellen, Pilzfruchtkörper
- Gewichtsverteilung der Krone: gleichmäßig / einseitig
- **Ergebnis**: Baum sicher für geplante Arbeiten: ja / nein / eingehende Untersuchung erforderlich; Bemerkung
- Bei „nein“ oder „eingehende Untersuchung“: deutliche Warnung, Abschluss nur mit Begründung

### 7. Einsatzort
- Witterung geeignet, Fallbereich frei, Rückweiche vorhanden, Kommunikation möglich (Kontrollpunkte)
- Stromleitungen, Verkehrssicherung notwendig, Abseilen erforderlich (Gefahrenmerkmale/Anforderungen)
- Sonstiges

### 8. Ausrüstung & Notfall (vorbelegt aus Profil)
- Betriebssichere PSA vorhanden, PSA überprüft, zwei Kletterausrüstungen, Abseilausrüstung vorhanden/überprüft, erforderliche Maschinen vorhanden/überprüft, Funk erforderlich/geprüft, Absperr- und Sicherungsmaterial vorhanden
- Erste-Hilfe-Material, Rettungsmaterial, Rettungsseil, Ruf- und Sichtverbindung, Notfallmaßnahmen besprochen
- Besonderheiten

### 9. Zusammenfassung & Unterschriften
- Übersicht aller Angaben, offene Warnungen hervorgehoben, Sprung zurück zu jedem Schritt
- Erklärung: „Auf Grundlage der von mir durchgeführten Gefährdungsermittlung/Baumsicherheitsbeurteilung können die geplanten Arbeiten durchgeführt werden.“ → Unterschrift Verantwortliche/r
- Je Teammitglied: „Ich wurde über die Gefährdungen und Maßnahmen unterwiesen und habe sie verstanden.“ → Unterschrift
- Ort und Datum automatisch

### 10. Abschluss
- PDF erzeugen, Protokoll sperren, Hash speichern
- Cloud-Sync + Versand an Firmen-Mail (sofort oder sobald online)
- Anhängen: Auftragsbestätigung/Rechnung per Upload oder Kamera-Scan (Zuschnitt + Kontrast)

## PDF-Layout
- Kopf: eigenes Logo + Firmendaten, Titel, Protokoll-Nr., Datum
- Abschnitte wie oben, kompakt; Gefahren mit Maßnahmen deutlich hervorgehoben
- Standort-Block: Adresse, Koordinaten, what3words, Zufahrt, kleine Karte (wenn online erzeugt) oder QR-Code mit Kartenlink
- Fotos als Anhangseiten
- Unterschriften mit Name, Rolle, Zeitstempel
- Fußzeile: Seitenzahl, Protokoll-ID, Hash-Kurzform, „erstellt mit BaumCheck“
- A4, druckbar in Schwarzweiß

## Phasen
1. **MVP (Eigennutzung)**: Assistent, Profile, Fotos, GPS, Unterschriften, PDF, lokal speichern, PDF teilen/per Mail-App senden. Alles offline.
2. **Cloud**: Supabase-Login, Sync, automatischer Mail-Versand, what3words, Anhänge Auftrag/Rechnung, Archiv mit Suche (Kunde, Datum, Objekt).
3. **Verkauf**: Mandanten-Onboarding, Benutzerverwaltung, Stripe-Abos, App-Store-Veröffentlichung, AGB/Datenschutz/AV-Vertrag, anpassbare Formularpunkte.

## Konventionen
- UI-Sprache Deutsch, Code und Kommentare Englisch
- Fachbegriff: „Hacker“ (nicht „Häcksler“) für das Gerät zum Zerkleinern von Ast- und Kronenmaterial
- Mobile zuerst testen (ca. 380 px Breite)
- Vor jeder Phase: Plan vorlegen, dann umsetzen; Tests für PDF-Erzeugung und Sync-Logik
