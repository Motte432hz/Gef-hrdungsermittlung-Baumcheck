# Formulartexte – Entwurf zur Durchsicht

Stand: 09.11.2026 · Formularversion: 1.0-entwurf

Grundlage ist der Inhalt des SVLFG-Formulars „Einsatzbezogene Gefährdungsermittlung/Baumsicherheitsbeurteilung“ (Stand 09/2019). Die Texte sind neu formuliert und um Infotexte ergänzt.

**So liest du die Liste**

- **KP = Kontrollpunkt.** Antwort: Ja / Nein / nicht relevant.
  - Bei **Nein** erscheinen eine Warnung und das Pflichtfeld „Maßnahme / Begründung“.
- **GM = Gefahrenmerkmal.** Antwort: vorhanden / nicht vorhanden.
  - Bei **vorhanden** erscheint das Pflichtfeld „Maßnahme“.
- **Info** ist der Erklärtext hinter dem (i).
- **Nur bei …** heißt: Der Punkt erscheint nur unter dieser Bedingung.
- **🆕 Vorschlag** ist ein Punkt, der im Original fehlt. Bitte jeweils entscheiden: übernehmen oder streichen.
- **❓** ist eine fachliche Frage an dich.

Die Kennungen in `code`-Schrift sind interne Namen für die Programmierung. Du kannst sie ignorieren.

**Aufbau im Assistenten (7 Schritte)**

1. Einsatz – inkl. 4. Geplante Arbeiten
2. Standort & Rettung
3. Team
4. Baum (je Baum)
5. Baumbeurteilung (je Baum)
6. Einsatzort & Ausrüstung – 7. Einsatzort und 8. Ausrüstung & Notfall
7. Prüfen & Abschließen

Die Nummerierung unten bleibt zur Durchsicht wie gehabt.

**Abkürzungen beim Ausfüllen**

- **Filterfragen**: Baumumfeld, Stamm, Krone und Gefahren am Einsatzort beginnen mit „Gibt es Auffälligkeiten …?“. Nur bei „Ja“ werden die einzelnen Merkmale abgefragt.
- **„Alle offenen mit Ja beantworten“** je Abschnitt mit Kontrollpunkten.
- Beantwortete Punkte ohne Befund werden zu einer Zeile eingeklappt („ändern“ öffnet sie wieder). Danach springt die Ansicht zum nächsten offenen Punkt.
- **Letzter Einsatz am Objekt**: Nach Auswahl von Kunde/Objekt zeigt die App den letzten abgeschlossenen Einsatz dort mit den damals festgestellten Gefahren und Maßnahmen. Adresse, what3words, Zufahrt, Krankenhaus und GPS lassen sich mit einem Tipp übernehmen (nur leere Felder; Kontrollpunkte nie).
- **„Weiterer Baum wie Baum N“**: Baumart, Höhe, Durchmesser und Wuchsform werden übernommen; die Baumbeurteilung wird vorbelegt und muss am neuen Baum bestätigt werden. Baum-Nr., Fotos und Bemerkung werden nicht übernommen.

Bitte korrigiere direkt in dieser Datei oder schreib mir die Änderungen, z. B. „3.4 Text ändern in …“ oder „7.9 streichen“.

---

## 1. Einsatz

**1.1 Einsatzart** · Mehrfachauswahl · `job.types`

- Baumarbeiten (allgemein)
- Arbeiten mit Hubarbeitsbühne
- Seilklettertechnik (SKT)
- Einsatz von Kran

Info: Wähle alles aus, was heute zum Einsatz kommt. Je nach Auswahl blendet die App passende Prüfpunkte ein oder aus.

**1.2 Kunde / Objekt** · Auswahl aus Profil oder neu · `job.customer`

**1.3 Datum** · automatisch, änderbar · `job.date`

**1.4 Arbeitszeit von / bis** · Uhrzeit · `job.timeFrom`, `job.timeTo`

**1.5 Aufsichtsführende Person** · Auswahl aus Mitarbeitern · `job.supervisor`

Info: Die Aufsicht ist vor Ort weisungsbefugt, leitet die Gefährdungsermittlung und unterschreibt sie. Sie muss während der Arbeiten erreichbar sein.

---

## 2. Standort & Rettung

**2.1 GPS-Position** · automatisch, mit Genauigkeit in Metern · `site.gps`

Info: Möglichst direkt am Baum bestimmen. Bei einer Genauigkeit schlechter als 30 m warnt die App.

**2.2 Adresse** · online automatisch vorgeschlagen, sonst von Hand · `site.address`

**2.3 what3words** · in Phase 1 Texteingabe, ab Phase 2 automatisch · `site.w3w`

Info: Drei Wörter, die einen 3 × 3 m großen Punkt beschreiben. Rettungsleitstellen können damit den Ort finden, auch wenn es keine Hausnummer gibt.

**2.4 Zufahrt / Treffpunkt für den Rettungsdienst** · Freitext · `site.rescueAccess`

Info: Beschreibe, wie ein Rettungswagen am schnellsten hinkommt, z. B. „Einfahrt Hofseite, Schranke offen, Treffpunkt am Tor“. Im Wald, wenn vorhanden, den Rettungstreffpunkt (Schild) angeben.

**2.5 Nächstes Krankenhaus** · optional, Freitext · `site.hospital`

**2.6 KP: Genauer Einsatzort und Zufahrt sind allen im Team bekannt** · `site.locationKnown`

Info: Im Notfall muss jede Person dem Rettungsdienst sagen können, wo sie ist und wie man hinkommt, nicht nur die Aufsicht.

**2.7 KP: Notruf ist am Arbeitsplatz möglich (Mobilfunkempfang geprüft)** · `site.emergencyCallPossible`

Info: Prüfe den Empfang direkt am Baum, nicht nur an der Straße. Ohne Empfang muss festgelegt werden, wie und von wo ein Notruf abgesetzt wird, z. B. „Empfang an der Kreuzung 200 m nördlich“.

---

## 3. Team

**3.1 Personen** · Auswahl: Mitarbeiter-Profil, Subunternehmer-Profil oder neue Person · `team.members`

Bei einer neuen Person werden Name, Firma, Qualifikationen und optional Telefon erfasst. Sie kann als Subunternehmer-Profil gespeichert werden.

**3.2 Rolle je Person** · Mehrfachauswahl · `team.roles`

- Aufsicht
- Kletterer/in
- Bodenperson
- Sicherungsposten
- 🆕 Vorschlag: Bediener/in Hubarbeitsbühne (nur bei Hubarbeitsbühne)
- 🆕 Vorschlag: Anschläger/in bzw. Einweiser/in Kran (nur bei Kran)

Info Sicherungsposten: Sichert den Gefahrenbereich ab, z. B. gegenüber Fußgängern oder Verkehr, und hat keine andere Aufgabe.

**3.3 KP: Der Arbeitsauftrag wurde mit allen besprochen** · `team.briefed`

Info: Alle wissen, welche Bäume bearbeitet werden, was genau gemacht wird und in welcher Reihenfolge.

**3.4 KP: Aufgaben und Personal sind eingeteilt** · `team.assigned`

Info: Jede Person kennt ihre Rolle (siehe 3.2) und weiß, wer sie im Notfall rettet.

**3.5 KP: Verständigung ist abgesprochen** · `team.communicationAgreed`

Info: Handzeichen, Rufkommandos (z. B. „Achtung, Ast kommt!“, „Halt!“) und gegebenenfalls Funk sind vereinbart und allen bekannt. Das gilt besonders bei Lärm durch Motorsäge oder Hacker.

**3.6 KP: Alle Beteiligten sind heute gesundheitlich geeignet** · `team.fitForWork`

Info: Keine akute Erkrankung, keine Medikamente oder Alkohol, die die Arbeit beeinträchtigen, ausgeruht. Im Zweifel nicht in den Baum.

**3.7 KP: Alle haben ausreichend Erfahrung und Qualifikation für die geplanten Arbeiten** · `team.experienced`

Info: Die nötigen Nachweise (z. B. AS-Baum, SKT A/B) liegen vor, und die Personen haben die Arbeiten in dieser Schwierigkeit schon ausgeführt.

**Automatische Hinweise** (blockieren nicht):

- Bei SKT: „Für Seilklettertechnik müssen mindestens 2 Personen mit SKT-Qualifikation und eine Bodenperson eingeteilt sein.“
  - ❓ Bitte bestätigen oder korrigieren. Nach meinem Verständnis müssen mindestens 2 SKT-qualifizierte Personen anwesend sein, von denen eine am Boden bleibt und retten kann. Ist eine **zusätzliche** Bodenperson Pflicht oder nur empfohlen?
- Ist ein Qualifikationsnachweis im Profil abgelaufen: „Nachweis [SKT B] von [Name] ist seit [Datum] abgelaufen.“
- Ist keine Person als Aufsicht eingeteilt: Warnung.

---

## 4. Geplante Arbeiten

Mehrfachauswahl · `work.types`

- Totholzentnahme
- Kronenpflege
- Kroneneinkürzung
- Kronensicherung (Einbau)
- Kronensicherungsschnitt
- Fällung
- Fällung mit Abseiltechnik (stückweise Abtragung)
- Fällung mit Kran
- Sonstiges (Freitext)

Info Kronensicherungsschnitt: Schnitt, der die Krone entlastet, um Bruchgefahr zu vermindern, z. B. bei Zwieseln oder schweren Ästen.

Info Fällung mit Abseiltechnik: Der Baum wird von oben nach unten in Stücken abgetragen und die Teile werden kontrolliert abgeseilt. Wird gewählt, wenn kein Platz zum Umlegen ist.

---

## 5. Baum (je Baum, mehrere möglich)

**5.1 Baum-Nr.** · optional · `tree.number`

Info: Zum Beispiel die Nummer aus dem Baumkataster oder auf der Plakette.

**5.2 Baumart** · Auswahlliste mit Suche, oder frei · `tree.species`

**5.3 Baumhöhe (m)** · `tree.height`

**5.4 Stammdurchmesser (cm)** · gemessen in 1,30 m Höhe · `tree.diameter`

**5.5 Wuchsform** · Einfachauswahl · `tree.growthForm`

- **Normalbaum**: gerader Wuchs, Schwerpunkt mittig über dem Stammfuß.
- **Vorhänger**: Baum oder Krone neigt sich in die geplante Fällrichtung. Erhöhte Gefahr, dass der Stamm aufreißt (Herausschlagen).
- **Rückhänger**: Baum oder Krone neigt sich gegen die Fällrichtung. Fällhilfen wie Keil oder Seilwinde sind nötig.
- **Seithänger**: Baum oder Krone neigt sich seitlich zur Fällrichtung.
- **Angekippt**: Der Baum hat sich bereits geneigt, der Wurzelteller ist angehoben oder der Boden aufgerissen. **Hohe Gefahr**, der Baum kann jederzeit umstürzen.

Info: Vor-, Rück- und Seithänger beziehen sich auf die geplante Fällrichtung. Bei Pflegearbeiten beschreibt die Angabe die Hauptneigung des Baums.

**5.6 Fotos** · optional, mehrere, Kamera oder Galerie · `tree.photos`

---

## 6. Baumbeurteilung (je Baum)

### 6A Baumumfeld

**Filterfrage: Gibt es Auffälligkeiten im Baumumfeld?** · Nein, unauffällig / Ja, einzeln prüfen · `tree.env.gate`

Bei „Nein“ gelten alle Merkmale dieses Abschnitts als nicht vorhanden und werden nicht einzeln abgefragt (Zusammenfassung/PDF: „keine Auffälligkeiten (n Merkmale geprüft)“). Bei „Ja“ erscheinen die Merkmale; die übrigen können mit einem Knopf als „nicht vorhanden“ markiert werden.

**6.1 GM: Bodenrisse oder angehobener Wurzelteller** · `tree.env.soilCracks`

Info: Risse im Boden oder ein angehobener Wurzelteller auf einer Seite deuten darauf hin, dass der Baum seine Standsicherheit verliert.

**6.2 GM: Nachbarbäume behindern die Arbeiten** · `tree.env.neighbourTrees`

Info: Zum Beispiel Kronen, die ineinander verhakt sind, Totholz oder Hänger im Nachbarbaum, oder ein Nachbarbaum, an dem der gefällte Baum hängen bleiben kann.

**6.3 GM: Verletzte oder gekappte Wurzeln** · `tree.env.rootDamage`

Info: Etwa durch Bauarbeiten, Leitungsgräben oder Bodenverdichtung. Das kann die Standsicherheit verringern, auch wenn es von außen nicht sichtbar ist.

**6.4 GM: Pilzfruchtkörper im Wurzelbereich** · `tree.env.fungi`

Info: Pilze am Wurzelanlauf oder im Boden um den Stamm herum, z. B. Hallimasch oder Riesenporling, können auf Wurzelfäule hinweisen. Erhöhte Gefahr, dass der Baum umstürzt.

### 6B Stammfuß und Stamm

**Filterfrage: Gibt es Auffälligkeiten an Stammfuß oder Stamm?** · `tree.trunk.gate`

**6.5 GM: Risse, Wülste, Beulen oder Rippen** · `tree.trunk.defects`

Info: Der Baum bildet Wülste und Rippen, wo er innere Schäden wie Risse oder Höhlungen ausgleicht. Sie sind ein Hinweis auf Schwachstellen.

**6.6 GM: Pilzfruchtkörper am Stamm** · `tree.trunk.fungi`

**6.7 GM: Faulstellen oder Höhlungen** · `tree.trunk.decay`

Info: Prüfe durch Abklopfen mit dem Schonhammer: Ein hohler Klang deutet auf eine Höhlung hin. Die verbleibende Restwand bestimmt die Bruchsicherheit.

**6.8 GM: Spuren früherer baumchirurgischer Maßnahmen** · `tree.trunk.oldSurgery`

Info: Zum Beispiel ausgefräste Höhlungen, Füllungen, Drainagerohre oder Verschraubungen. Darunter liegen oft größere Schäden.

**6.9 GM: Größere Wunden** · `tree.trunk.wounds`

**6.10 GM: Abgestorbene oder lose Rinde** · `tree.trunk.deadBark`

Info: Darunter ist das Holz oft schon zersetzt. Lose Rinde kann beim Klettern oder Fällen abfallen.

### 6C Krone

**6.11 Vitalität der Krone (Roloff, Laubbäume)** · Pflicht, Einfachauswahl · nur wenn kein Nadelbaum gewählt ist · `tree.crown.vitality`

Info: Vitalitätsstufen nach Roloff, beurteilt an der Verzweigung der Krone (für Laubbäume). Geschwächte Bäume haben ein erhöhtes Bruchrisiko, besonders bei Belastung durch Seile oder Kletterer.

- Stufe 0 – Exploration (vital): lange Langtriebe, gleichmäßig verzweigte, geschlossene Krone
- Stufe 1 – Degeneration (leicht geschwächt): kürzere Triebe, Krone außen spießig/schütter
- Stufe 2 – Stagnation (geschwächt): pinselartige Kurztriebe, deutliche Lücken → Warnung + Pflichtfeld „Maßnahme“
- Stufe 3 – Resignation (stark geschwächt / absterbend): Krone zerfällt von außen → deutliche Warnung + Pflichtfeld „Maßnahme“
- Nicht beurteilbar: z. B. unbelaubt, Nadelbaum, stark geschnittene Krone

Steht vor der Filterfrage, wird also immer abgefragt.

**6.11b Benadelung der Krone (Nadelbäume)** · Pflicht, Einfachauswahl · nur bei Nadelbäumen aus der Baumartenliste · `tree.crown.needleLoss`

Info: Stufen nach Nadelverlust bzw. Kronenverlichtung, geschätzt im Vergleich zu einem voll benadelten Baum gleicher Art. Achte auch auf vergilbte oder braune Nadeln und abgestorbene Wipfel. Lärche, Sumpfzypresse und Urweltmammutbaum werfen im Winter die Nadeln ab – dann „nicht beurteilbar“.

- Stufe 0 – voll benadelt (bis 10 % Nadelverlust)
- Stufe 1 – leicht verlichtet (11–25 %)
- Stufe 2 – mittelstark verlichtet (26–60 %) → Warnung + Pflichtfeld „Maßnahme“
- Stufe 3 – stark verlichtet (über 60 %) → deutliche Warnung + Pflichtfeld „Maßnahme“
- Stufe 4 – abgestorben → deutliche Warnung (nicht beklettern) + Pflichtfeld „Maßnahme“
- Nicht beurteilbar

Die Stufen orientieren sich an den Nadelverlust-Klassen der Waldzustandserhebung (bestätigt 11.11.2026).

**Filterfrage: Gibt es Auffälligkeiten in der Krone?** · `tree.crown.gate`

**6.12 GM: Totholz** · `tree.crown.deadwood`

Info: Abgestorbene Äste können beim Klettern oder durch Erschütterung (Fällung, Seilarbeit) herabfallen. Bei viel Totholz: Kletterweg und Anschlagpunkt besonders sorgfältig wählen.

**6.13 GM: Risse, Wülste oder andere Defekte in der Krone** · `tree.crown.defects`

**6.14 GM: Druckzwiesel** · `tree.crown.compressionFork`

Info: Eine V-förmige Gabelung mit eingewachsener Rinde. Die Verbindung ist schwach und kann aufreißen, besonders bei Belastung durch Seile oder Kletterer.

**6.15 GM: Ausbrüche oder abgebrochene Äste** · `tree.crown.breakouts`

**6.16 GM: Sturmschäden, hängende Äste („Hänger“)** · `tree.crown.stormDamage`

Info: Abgebrochene Äste, die noch in der Krone hängen, können jederzeit herabfallen. Zuerst entfernen oder aus sicherer Entfernung sichern.

**6.17 GM: Insektennester** · `tree.crown.insects`

Info: Wespen, Hornissen oder Gespinste des Eichenprozessionsspinners. Dessen Brennhaare verursachen starke Haut- und Atemwegsreizungen und erfordern Schutzausrüstung bzw. eine Fachfirma. Bei Hornissen gilt Artenschutz.

**6.18 GM: Alte Kronensicherung vorhanden** · `tree.crown.oldBracing`

Info: Der Zustand ist oft unbekannt. Nicht als Anschlagpunkt oder Sicherung verwenden. Beim Entfernen kann Spannung frei werden.

**6.19 GM: Gekappter Baum (Kappung)** · `tree.crown.topped`

Info: Neuaustriebe an Kappungsstellen sind schwach verankert und können ausbrechen, besonders unter Last.

**6.20 GM: Faulstellen in der Krone** · `tree.crown.decay`

**6.21 GM: Pilzfruchtkörper in der Krone** · `tree.crown.fungi`

**6.22 🆕 Vorschlag GM: Geschützte Tiere (Vogelnest, Fledermausquartier, Höhlen)** · `tree.crown.protectedSpecies`

Info: Besetzte Nester und Quartiere sind geschützt (Bundesnaturschutzgesetz). Gegebenenfalls ist eine Abstimmung mit der Naturschutzbehörde nötig.

**6.23 🆕 Vorschlag KP: Anschlagpunkt ausreichend tragfähig** · nur bei SKT · `tree.crown.anchorOk`

Info: Der Anschlagpunkt muss gesund, ausreichend stark und frei von Defekten sein. Im Zweifel einen anderen Punkt, einen Nachbarbaum oder die Hubarbeitsbühne wählen.

### 6D Gewichtsverteilung und Ergebnis

**6.24 Gewichtsverteilung der Krone** · gleichmäßig / einseitig · `tree.crown.balance`

Info: Bei einseitiger Krone zieht der Baum beim Fällen zur schweren Seite. Bei Pflegearbeiten verlagert sich das Gewicht beim Entnehmen von Ästen.

**6.25 Ergebnis: Ist der Baum für die geplanten Arbeiten sicher?** · `tree.result`

- **Ja**: Die Arbeiten können wie geplant ausgeführt werden.
- **Nein**: Rote Warnung: „Der Baum darf mit dem geplanten Verfahren nicht bearbeitet werden. Wähle ein sicheres Verfahren (z. B. Hubarbeitsbühne, Kran, Seilwinde) oder brich die Arbeiten ab.“ Pflichtfeld: **Begründung / geändertes Vorgehen**.
- **Eingehende Untersuchung erforderlich**: Orange Warnung: „Die Sicherheit kann vor Ort nicht ausreichend beurteilt werden. Vor Beginn der Arbeiten ist eine eingehende Untersuchung nötig.“ Pflichtfeld: **Begründung / weiteres Vorgehen**.

**6.26 Bemerkung** · Freitext · `tree.remark`

---

## 7. Einsatzort

**7.1 KP: Die Witterung ist für die Arbeiten geeignet** · ohne „nicht relevant“ · `site.weatherOk`

Info: Kein starker oder böiger Wind, kein Gewitter, keine Vereisung. Nasse oder vereiste Rinde verringert die Griffigkeit. Bei Gewitter sofort aus dem Baum.

**7.2 KP: Der Fall- und Gefahrenbereich ist frei und abgesperrt** · `site.dropZoneClear`

Info: Bei Fällungen mindestens die doppelte Baumlänge. Bei Kronenarbeiten den Bereich, in den Äste fallen oder pendeln können. Keine unbeteiligten Personen, keine Fahrzeuge.

**7.3 KP: Rückweichen sind angelegt und frei** · nur bei Fällung · `site.escapeRoute`

Info: Schräg nach hinten, etwa 45° zur Fällrichtung, frei von Hindernissen und Stolperstellen, für alle am Baum Tätigen.

**7.4 KP: Ruf- und Sichtverbindung oder Funk ist zwischen allen möglich** · `site.communicationPossible`

Info: Zwischen Kletterer bzw. Bühnenbediener, Bodenperson und Sicherungsposten – auch bei laufender Motorsäge oder laufendem Hacker. Wenn nicht: Funk einsetzen oder Sicherungsposten so stellen, dass Sichtkontakt besteht.

(Ersetzt auch den früheren Punkt 8.12 „Ruf- und Sichtverbindung zum Kletterer bzw. Bühnenbediener“.)

**Filterfrage: Gibt es besondere Gefahren am Einsatzort?** · `site.hazards.gate` (betrifft 7.5–7.9; 7.10 bleibt immer sichtbar)

**7.5 GM: Stromleitungen in der Nähe** · `site.powerLines`

Info: Schutzabstände für Nicht-Elektrofachkräfte (❓ bitte prüfen):

- bis 1 kV: 1 m
- bis 110 kV: 3 m
- bis 220 kV: 4 m
- bis 380 kV: 5 m

Das Ausschwingen von Ästen und Seilen ist mitzurechnen. Kann der Abstand nicht sicher eingehalten werden, muss der Netzbetreiber freischalten.

**7.6 GM: Verkehrssicherung notwendig** · `site.trafficControl`

Info: Bei Arbeiten an Straßen, Geh- oder Radwegen. Gegebenenfalls ist eine verkehrsrechtliche Anordnung nötig, außerdem Absperrung, Beschilderung und Sicherungsposten.

**7.7 GM: Abseilen von Ästen oder Stammteilen erforderlich** · `site.riggingRequired`

Info: Wenn Teile nicht frei fallen dürfen, z. B. wegen Gebäuden, Leitungen oder Pflanzungen. Dann sind Abseilausrüstung (siehe 8.4) und eine eingeteilte Bodenperson nötig.

**7.8 🆕 Vorschlag GM: Gebäude, Sachwerte oder Verkehrswege im Fallbereich** · `site.propertyInDropZone`

**7.9 🆕 Vorschlag GM: Unterirdische Leitungen (bei Wurzel- oder Stubbenarbeiten)** · `site.undergroundUtilities`

**7.10 Sonstige Gefahren am Einsatzort** · Freitext · `site.otherHazards`

---

## 8. Ausrüstung & Notfall

Die Punkte sind aus dem Profil „Standard-Ausrüstung“ vorbelegt und müssen vor Ort bestätigt werden.

### 8A Ausrüstung

**8.1 KP: Betriebssichere persönliche Schutzausrüstung (PSA) für alle vorhanden** · ohne „nicht relevant“ · `equip.ppeAvailable`

Info: Helm mit Gesichts- und Gehörschutz, Schnittschutzhose, Sicherheitsschuhe mit Schnittschutz, Handschuhe, Warnkleidung bei Verkehr.

**8.2 KP: PSA vor Benutzung auf Schäden geprüft** · ohne „nicht relevant“ · `equip.ppeChecked`

Info: Sichtprüfung vor jedem Einsatz. Zusätzlich muss die jährliche Prüfung durch eine sachkundige Person gültig sein, besonders bei PSA gegen Absturz.

**8.3 KP: Zwei vollständige Kletterausrüstungen vor Ort** · nur bei SKT · `equip.twoClimbingKits`

Info: Die zweite Ausrüstung ist für die Rettung des Kletterers nötig.

**8.4 KP: Abseilausrüstung vorhanden und geprüft** · nur bei „Abseilen erforderlich“ oder „Fällung mit Abseiltechnik“ · `equip.riggingChecked`

**8.5 KP: Erforderliche Maschinen vorhanden und geprüft** · `equip.machinesChecked`

Info: Zum Beispiel Motorsäge, Hacker, Seilwinde, Hubarbeitsbühne. Täglicher Funktionscheck, Schutzeinrichtungen vollständig.

**8.6 KP: Funkgeräte geprüft** · „nicht relevant“, wenn kein Funk nötig ist · `equip.radiosChecked`

**8.7 KP: Absperr- und Sicherungsmaterial vorhanden** · `equip.barrierMaterial`

### 8B Notfall

**8.8 KP: Erste-Hilfe-Material vorhanden** · ohne „nicht relevant“ · `emergency.firstAidKit`

**8.9 🆕 Vorschlag KP: Mindestens eine ausgebildete Ersthelferin / ein Ersthelfer vor Ort** · ohne „nicht relevant“ · `emergency.firstAider`

**8.10 KP: Rettungsausrüstung vorhanden** · `emergency.rescueKit`

Info: Ausrüstung, mit der eine verletzte Person aus dem Baum oder von der Bühne gerettet werden kann, z. B. ein Rettungs- bzw. Abseilgerät.

**8.11 KP: Rettungsseil vorhanden** · nur bei SKT · `emergency.rescueRope`

Info: Mindestens so lang, dass vom höchsten Arbeitspunkt bis zum Boden abgeseilt werden kann.

~~8.12~~ entfallen, zusammengelegt mit 7.4.

**8.13 KP: Notfallablauf besprochen** · ohne „nicht relevant“ · `emergency.planBriefed`

Info: Wer rettet? Wer setzt den Notruf ab (112)? Wo ist der Treffpunkt für den Rettungsdienst (siehe 2.4)? Eine Person mit Gurtverletzung muss schnell aus dem Seil.

**8.14 Besonderheiten** · Freitext · `equip.notes`

---

## 9. Zusammenfassung & Unterschriften

**Erklärung der aufsichtsführenden Person** · `sign.supervisorStatement`

> „Auf Grundlage der von mir durchgeführten Gefährdungsermittlung und Baumsicherheitsbeurteilung können die geplanten Arbeiten durchgeführt werden.“

**Bestätigung je Teammitglied** · `sign.memberStatement`

> „Ich wurde über die Gefährdungen und Maßnahmen unterwiesen und habe sie verstanden.“

Zu jeder Unterschrift werden automatisch Name, Rolle, Firma (bei Subunternehmern), Datum, Uhrzeit, Ort/GPS und die Art der Unterschrift („vor Ort unterschrieben“ oder „hinterlegte Unterschrift übernommen“) festgehalten.

**Hinweis bei offenen Warnungen:**

> „Es gibt [n] offene Warnungen. Bitte prüfe sie, bevor unterschrieben wird.“

Mit Tippen springt die App zum jeweiligen Punkt. Fehlt bei einer Warnung die Maßnahme, kann nicht abgeschlossen werden.

---

## Fragen zusammengefasst

1. ❓ **SKT-Regel** (Schritt 3): Ist eine zusätzliche Bodenperson neben den 2 SKT-Qualifizierten Pflicht oder nur empfohlen?
2. ❓ **Schutzabstände Stromleitungen** (7.5): Stimmen die Werte so für euren Einsatz?
3. 🆕 **Vorschläge**: 3.2 (Bühnenbedienung / Kran-Rollen), 6.22, 6.23, 7.8, 7.9 und 8.9 jeweils übernehmen oder streichen?
4. **Ohne „nicht relevant“:** Bei 7.1, 8.1, 8.2, 8.8, 8.9 und 8.13 habe ich die Antwort „nicht relevant“ weggelassen, weil diese Punkte bei jedem Einsatz zutreffen. Einverstanden?
5. Fehlen dir Punkte, die ihr in der Praxis immer prüft?

## Maßnahmen zum Antippen

Bei „Nein“ bzw. „vorhanden“ (und bei Auswahlen mit Pflicht-Maßnahme) bietet die App diese Maßnahmen als Knöpfe an. Antippen übernimmt sie ins Maßnahmenfeld, nochmal Antippen entfernt sie; eigener Text ist jederzeit möglich. Bitte prüfen, ergänzen oder streichen.

**Genauer Einsatzort und Zufahrt sind allen im Team bekannt** · `site.locationKnown`

- Einsatzort und Zufahrt vor Beginn mit allen begehen
- Treffpunkt für Rettungsdienst festgelegt und markiert
- Adresse/Koordinaten an alle verschickt

**Notruf ist am Arbeitsplatz möglich (Mobilfunkempfang geprüft)** · `site.emergencyCallPossible`

- Notruf-Standort mit Empfang festgelegt
- Funkkette zum Fahrzeug/Notrufstandort eingerichtet
- Satelliten-Notruf (Handy) mitgeführt

**Der Arbeitsauftrag wurde mit allen besprochen** · `team.briefed`

- Arbeitsauftrag vor Beginn mit allen besprochen
- Ablauf und Gefahrenbereiche vor Ort gezeigt

**Aufgaben und Personal sind eingeteilt** · `team.assigned`

- Aufgaben vor Beginn zugeteilt
- Aufsicht benannt und allen bekannt

**Verständigung ist abgesprochen** · `team.communicationAgreed`

- Handzeichen und Rufkommandos vereinbart
- Funk mit festen Kanälen ausgegeben
- Sichtkontakt Kletterer–Bodenperson sichergestellt

**Alle Beteiligten sind heute gesundheitlich geeignet** · `team.fitForWork`

- Person übernimmt nur Bodenarbeiten
- Person wird ersetzt
- Arbeiten verschoben

**Alle haben ausreichend Erfahrung und Qualifikation für die geplanten Arbeiten** · `team.experienced`

- Arbeiten unter direkter Aufsicht einer erfahrenen Person
- Aufgaben angepasst (nur Bodenarbeiten)
- Erfahrene Person hinzugezogen

**Wuchsform: Angekippt** · `tree.growthForm`

- Neigung und Wurzelteller vor dem Klettern geprüft
- Fällrichtung in Neigungsrichtung
- Hubarbeitsbühne statt Klettern

**Bodenrisse oder angehobener Wurzelteller** · `tree.env.soilCracks`

- Nicht beklettern, Arbeit von der Hubarbeitsbühne
- Baum vor Beginn sichern (Seil/Zug)
- Eingehende Untersuchung veranlasst
- Fallbereich großräumig abgesperrt

**Nachbarbäume behindern die Arbeiten** · `tree.env.neighbourTrees`

- Nachbarbaum vorher freigeschnitten
- Fällrichtung angepasst
- Hänger mit Seilzug/Winde lösen
- Gefahrenbereich erweitert

**Verletzte oder gekappte Wurzeln** · `tree.env.rootDamage`

- Standsicherheit vor dem Klettern geprüft
- Arbeit von der Hubarbeitsbühne
- Zugbelastung des Baums vermeiden

**Pilzfruchtkörper im Wurzelbereich** · `tree.env.fungi`

- Pilz bestimmt, Wurzelfäule angenommen
- Nicht beklettern, Hubarbeitsbühne
- Eingehende Untersuchung veranlasst

**Risse, Wülste, Beulen oder Rippen** · `tree.trunk.defects`

- Schadstelle mit Schonhammer geprüft
- Anschlag oberhalb der Schadstelle vermeiden
- Lasten klein halten, keine Schlagbelastung

**Pilzfruchtkörper am Stamm** · `tree.trunk.fungi`

- Pilz bestimmt, Ausmaß der Fäule geschätzt
- Restwand geprüft (Schonhammer/Bohrung)
- Hubarbeitsbühne statt Klettern

**Faulstellen oder Höhlungen** · `tree.trunk.decay`

- Restwanddicke geprüft
- Fällung mit Halteband/Zugseil, keine Keile in Faulholz
- Hubarbeitsbühne statt Klettern

**Spuren früherer baumchirurgischer Maßnahmen** · `tree.trunk.oldSurgery`

- Alte Füllungen/Verschraubungen geortet
- Säge nicht in Metall/Füllung führen
- Statik der Stelle vor Belastung geprüft

**Größere Wunden** · `tree.trunk.wounds`

- Wunde auf Fäule geprüft
- Anschlag nicht über der Wunde
- Belastung des Bereichs vermeiden

**Abgestorbene oder lose Rinde** · `tree.trunk.deadBark`

- Lose Rinde vorab entfernt
- Steigeisen nicht im Bereich der losen Rinde
- Bodenpersonal außerhalb des Fallbereichs

**Vitalität der Krone (Roloff, Laubbäume): Stufe 2 – Stagnation (geschwächt)** · `tree.crown.vitality`

- Anschlagpunkte besonders sorgfältig geprüft
- Lasten klein halten
- Rückschnitt maßvoll, Baum nicht zusätzlich schwächen

**Vitalität der Krone (Roloff, Laubbäume): Stufe 3 – Resignation (stark geschwächt / absterbend)** · `tree.crown.vitality`

- Hubarbeitsbühne statt Klettern
- Fällung geprüft
- Eingehende Untersuchung veranlasst

**Benadelung der Krone (Nadelbäume): Stufe 2 – mittelstark verlichtet (26–60 %)** · `tree.crown.needleLoss`

- Anschlagpunkte besonders sorgfältig geprüft
- Lasten klein halten

**Benadelung der Krone (Nadelbäume): Stufe 3 – stark verlichtet (über 60 %)** · `tree.crown.needleLoss`

- Hubarbeitsbühne statt Klettern
- Wipfel nicht belasten
- Fällung geprüft

**Benadelung der Krone (Nadelbäume): Stufe 4 – abgestorben** · `tree.crown.needleLoss`

- Fällung von der Hubarbeitsbühne
- Fällung mit Seilwinde/Zugseil
- Nicht beklettern

**Totholz** · `tree.crown.deadwood`

- Totholz vor Beginn der übrigen Arbeiten entfernt
- Starkes Totholz abgeseilt
- Fallbereich abgesperrt

**Risse, Wülste oder andere Defekte in der Krone** · `tree.crown.defects`

- Defekte Äste nicht als Anschlag/Abstützung
- Betroffene Äste zuerst entlastet
- Arbeit von der Hubarbeitsbühne

**Druckzwiesel** · `tree.crown.compressionFork`

- Kein Anschlag im Zwiesel
- Zwiesel vor dem Schnitt gesichert (Gurt/Kronensicherung)
- Schnittfolge so, dass der Zwiesel nicht aufreißt

**Ausbrüche oder abgebrochene Äste** · `tree.crown.breakouts`

- Bruchstellen und lose Teile zuerst entfernt
- Anschlag nicht an beschädigten Ästen
- Fallbereich abgesperrt

**Sturmschäden, hängende Äste („Hänger“)** · `tree.crown.stormDamage`

- Hänger mit Seil gesichert und kontrolliert abgelassen
- Unter Spannung stehendes Holz in Schritten entlastet
- Arbeit von der Hubarbeitsbühne

**Insektennester** · `tree.crown.insects`

- Nest vorab gemeldet/umgesiedelt (Fachbetrieb)
- Arbeit im Bereich verschoben
- Allergiker im Team informiert, Notfallset bereit

**Alte Kronensicherung vorhanden** · `tree.crown.oldBracing`

- Zustand der alten Sicherung geprüft
- Sicherung nicht als Anschlag genutzt
- Neue Kronensicherung vor dem Ausbau eingebaut

**Gekappter Baum (Kappung)** · `tree.crown.topped`

- Austriebe am Kappungsrand nicht als Anschlag
- Faulstellen am Kappungskopf geprüft
- Anschlag unterhalb des Kappungskopfes

**Faulstellen in der Krone** · `tree.crown.decay`

- Faule Äste nicht belasten
- Anschlag in gesundem Holz
- Abschnitte klein halten und abseilen

**Pilzfruchtkörper in der Krone** · `tree.crown.fungi`

- Betroffene Äste nicht belasten
- Hubarbeitsbühne statt Klettern
- Eingehende Untersuchung veranlasst

**Geschützte Tiere (Vogelnest, Fledermausquartier, Höhlen)** · `tree.crown.protectedSpecies`

- Arbeiten im Bereich verschoben
- Artenschutz-Fachperson hinzugezogen
- Untere Naturschutzbehörde informiert

**Anschlagpunkt ausreichend tragfähig** · `tree.crown.anchorOk`

- Anderen Anschlagpunkt gewählt
- Anschlagpunkt im Nachbarbaum
- Hubarbeitsbühne statt Klettern
- Anschlag mit Redundanz (zweiter Anschlagpunkt)

**Ist der Baum für die geplanten Arbeiten sicher?: Nein** · `tree.result`

- Arbeiten mit Hubarbeitsbühne
- Fällung mit Kran
- Auftrag angepasst und mit Kunde besprochen
- Arbeiten abgebrochen

**Ist der Baum für die geplanten Arbeiten sicher?: Eingehende Untersuchung erforderlich** · `tree.result`

- Baumgutachten beauftragt
- Arbeiten bis zur Untersuchung verschoben
- Bereich bis dahin abgesperrt

**Die Witterung ist für die Arbeiten geeignet** · `site.weatherOk`

- Arbeiten verschoben
- Nur Bodenarbeiten
- Windgeschwindigkeit laufend beobachten, Abbruch bei Böen
- Pausen bei Gewitter/Starkregen

**Der Fall- und Gefahrenbereich ist frei und abgesperrt** · `site.dropZoneClear`

- Fallbereich abgesperrt (Flatterband/Absperrgitter)
- Sicherungsposten aufgestellt
- Personen und Fahrzeuge aus dem Fallbereich entfernt

**Rückweichen sind angelegt und frei** · `site.escapeRoute`

- Rückweichen freigeschnitten
- Stolperstellen entfernt
- Rückweichen allen gezeigt

**Ruf- und Sichtverbindung oder Funk ist zwischen allen möglich** · `site.communicationPossible`

- Funkgeräte eingesetzt
- Sicherungsposten mit Sichtkontakt aufgestellt
- Maschinen bei Kommandos abgestellt

**Stromleitungen in der Nähe** · `site.powerLines`

- Netzbetreiber schaltet frei
- Schutzabstand eingehalten, Seilführung weg von der Leitung
- Elektrofachkraft vor Ort
- Leitung abgedeckt (Netzbetreiber)

**Verkehrssicherung notwendig** · `site.trafficControl`

- Verkehrsrechtliche Anordnung liegt vor
- Absperrung nach RSA aufgebaut
- Sicherungsposten mit Warnweste
- Straße/Gehweg kurzzeitig gesperrt

**Abseilen von Ästen oder Stammteilen erforderlich** · `site.riggingRequired`

- Abseiltechnik und Lasten vorab festgelegt
- Abseilpunkt geprüft
- Bodenpersonal außerhalb des Fallbereichs bis Freigabe
- Kommandos für das Ablassen vereinbart

**Gebäude, Sachwerte oder Verkehrswege im Fallbereich** · `site.propertyInDropZone`

- Teile abgeseilt statt fallen gelassen
- Gebäude/Fahrzeuge geschützt oder entfernt
- Fällrichtung angepasst
- Eigentümer informiert

**Unterirdische Leitungen (bei Wurzel- oder Stubbenarbeiten)** · `site.undergroundUtilities`

- Leitungspläne eingeholt
- Ortung vor Beginn
- Stubben ausgefräst statt gerodet

**Betriebssichere persönliche Schutzausrüstung (PSA) für alle vorhanden** · `equip.ppeAvailable`

- Fehlende PSA nachbeschafft
- Arbeiten erst nach Vervollständigung der PSA
- Person ohne vollständige PSA nicht eingesetzt

**PSA vor Benutzung auf Schäden geprüft** · `equip.ppeChecked`

- PSA vor Ort geprüft
- Beschädigte PSA ausgesondert und ersetzt

**Zwei vollständige Kletterausrüstungen vor Ort** · `equip.twoClimbingKits`

- Zweite Kletterausrüstung nachgeholt
- Rettung mit Hubarbeitsbühne sichergestellt
- Klettern erst nach Eintreffen der zweiten Ausrüstung

**Abseilausrüstung vorhanden und geprüft** · `equip.riggingChecked`

- Abseilausrüstung vor Ort geprüft
- Beschädigte Teile ausgesondert und ersetzt

**Erforderliche Maschinen vorhanden und geprüft** · `equip.machinesChecked`

- Maschinen vor Ort geprüft
- Defekte Maschine ausgetauscht
- Arbeiten ohne die Maschine umgeplant

**Funkgeräte geprüft** · `equip.radiosChecked`

- Funkgeräte geladen und Kanal getestet
- Ersatzgerät mitgeführt
- Verständigung über Sichtkontakt und Handzeichen

**Absperr- und Sicherungsmaterial vorhanden** · `equip.barrierMaterial`

- Absperrmaterial nachbeschafft
- Sicherungsposten statt Absperrung

**Erste-Hilfe-Material vorhanden** · `emergency.firstAidKit`

- Verbandkasten aus dem Fahrzeug bereitgelegt
- Erste-Hilfe-Material nachbeschafft

**Mindestens eine ausgebildete Ersthelferin / ein Ersthelfer vor Ort** · `emergency.firstAider`

- Ersthelfer/in hinzugezogen
- Arbeiten erst mit Ersthelfer/in vor Ort

**Rettungsausrüstung vorhanden** · `emergency.rescueKit`

- Rettungsausrüstung nachgeholt
- Rettung mit Hubarbeitsbühne sichergestellt

**Rettungsseil vorhanden** · `emergency.rescueRope`

- Rettungsseil nachgeholt
- Klettern erst mit Rettungsseil vor Ort

**Notfallablauf besprochen** · `emergency.planBriefed`

- Notfallablauf vor Beginn besprochen
- Rettungsperson und Notruf-Verantwortliche/r benannt

## Online-Hilfen (nur mit Internet und GPS-Position)

- **Nächstes Krankenhaus** (`site.hospital`): Knopf „Nächste Notaufnahme suchen“ – bis zu 3 Krankenhäuser im Umkreis von 40 km, Notaufnahmen zuerst, mit Entfernung (Luftlinie), Adresse und Telefon; „Übernehmen“ trägt sie ins Feld ein. Daten aus OpenStreetMap (Nominatim, ersatzweise Photon oder Overpass – die erste Quelle, die antwortet), ohne Gewähr.
- **Witterung** (`site.weatherOk`): aktueller Wind und Böen sowie amtliche Warnungen des Deutschen Wetterdienstes für den Einsatzort. Ab etwa 50 km/h Böen wird rot gewarnt. Die Antwort „Ja/Nein“ trifft weiterhin die Aufsicht.

## Baum wiederfinden

- **Standort des Baums** (`tree.position`, Schritt „Baum“, optional): „Standort am Stamm übernehmen“ speichert die GPS-Position des Baums (Ziel ± 8 m). Sie steht in Zusammenfassung und PDF und ist Teil dessen, was unterschrieben wird.
- **Bäume vom letzten Einsatz hier:** Beim nächsten Einsatz am selben Kunden/Objekt listet die App die Bäume des letzten abgeschlossenen Protokolls – mit Ergebnis und damaligen Befunden, nach Entfernung sortiert, wenn Positionen bekannt sind. „Diesen Baum übernehmen“ übernimmt Baum-Nr., Art, Höhe, Durchmesser, Wuchsform und Standort; die Beurteilung wird neu gemacht.
- **Letzter Befund** (Schritt „Baumbeurteilung“): zeigt bei übernommenen Bäumen, was damals festgestellt wurde – zum Vergleich.
