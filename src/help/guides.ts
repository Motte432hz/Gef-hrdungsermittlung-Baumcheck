/**
 * Short how-to guides ("Wie mache ich …?") and the help shown for each page or
 * wizard step. Plain data, so texts can be revised without touching the UI.
 */
export interface Guide {
  id: string
  title: string
  /** One sentence: what you achieve. */
  summary: string
  steps: string[]
  tips?: string[]
  /** Where to start in the app. */
  start?: { label: string; to: string }
}

export interface GuideGroup {
  title: string
  guides: string[]
}

export const guides: Guide[] = [
  {
    id: 'einsatz',
    title: 'Einen Einsatz durchführen',
    summary: 'Vom Start bis zum fertigen Protokoll – Schritt für Schritt.',
    steps: [
      'Auf der Startseite „+ Neue Gefährdungsermittlung“ antippen.',
      'Die Schritte von oben nach unten ausfüllen. Alles wird sofort gespeichert – du kannst jederzeit unterbrechen und später weitermachen.',
      'Bei „Nein“ oder „vorhanden“ fragt die App nach einer Maßnahme. Typische Maßnahmen kannst du antippen.',
      'Im letzten Schritt „Prüfen & Abschließen“ siehst du, was noch offen ist. Ein Tipp auf einen Punkt springt direkt dorthin.',
      'Alle Personen unterschreiben auf dem Display, dann „Abschließen & PDF erstellen“.',
    ],
    tips: [
      'Oben im Assistenten öffnet „Schritt x von 7“ die Liste aller Schritte. Ein Haken zeigt, was fertig ist.',
      'Funktioniert komplett ohne Internet.',
    ],
    start: { label: 'Zur Startseite', to: '/' },
  },
  {
    id: 'schneller',
    title: 'Schneller ausfüllen',
    summary: 'Abkürzungen, die im Alltag viel Zeit sparen.',
    steps: [
      'Ist ein Bereich am Baum unauffällig, „Nein, unauffällig“ wählen – dann entfallen alle Einzelfragen dieses Bereichs.',
      '„Alle offenen mit „Ja“ beantworten“ beantwortet die restlichen Kontrollpunkte eines Abschnitts auf einmal. Danach kurz durchsehen.',
      'Die Standard-Ausrüstung aus den Profilen ist vorbelegt. Vor Ort prüfen und mit „Alle vorbelegten bestätigen“ übernehmen.',
      'Maßnahmen nicht tippen, sondern vorgeschlagene Maßnahmen antippen – oder mit „Sprechen“ diktieren.',
      'Beantwortete Fragen ohne Befund klappen zu. Ein Tipp darauf öffnet sie wieder.',
    ],
  },
  {
    id: 'baeume',
    title: 'Mehrere Bäume erfassen',
    summary: 'Bäume anlegen, kopieren und beim nächsten Einsatz wiederfinden.',
    steps: [
      'Im Schritt „Baum“ den ersten Baum anlegen.',
      'Für ähnliche Bäume „+ Weiterer Baum wie …“ antippen: Baumart, Größe und Befund werden übernommen und als „bitte prüfen“ markiert.',
      'Oben wechselst du über die Reiter zwischen den Bäumen.',
      'Beim nächsten Einsatz am selben Objekt bietet die App die Bäume vom letzten Mal an – mit dem damaligen Befund.',
    ],
    tips: [
      '„Standort des Baums“ direkt am Stammfuß übernehmen, dann findet die App den Baum sicher wieder.',
    ],
  },
  {
    id: 'fotos',
    title: 'Fotos aufnehmen und markieren',
    summary: 'Schäden am Baum festhalten und im Foto einkreisen.',
    steps: [
      'Im Schritt „Baum“ unter „Fotos“ „📷 Foto aufnehmen“ oder ein Bild aus der Galerie wählen.',
      'Auf ein Foto tippen, um es zu markieren.',
      'Werkzeug wählen (Pfeil, Kreis oder Freihand) und auf dem Foto zeichnen.',
      '„Markierungen speichern“. Das Original bleibt erhalten und kann wiederhergestellt werden.',
    ],
    tips: ['Fotos landen als Anhang im PDF.'],
  },
  {
    id: 'unterschriften',
    title: 'Unterschreiben lassen',
    summary: 'Aufsicht und Team bestätigen die Gefährdungsermittlung.',
    steps: [
      'Im letzten Schritt „Prüfen & Abschließen“ nach unten scrollen.',
      'Die Aufsicht bestätigt mit ihrer Unterschrift, dass die Arbeiten durchgeführt werden können.',
      'Jede Person im Team bestätigt, dass sie unterwiesen wurde und alles verstanden hat.',
      'Bei jeder Person „✍ Jetzt unterschreiben“ antippen, mit dem Finger unterschreiben und bestätigen.',
    ],
    tips: [
      'Erst unterschreiben, wenn alle Gefahren und Maßnahmen besprochen sind.',
      'Mitarbeiter können im Profil eine Unterschrift hinterlegen. Dann reicht es, die gespeicherte Unterschrift zu bestätigen.',
    ],
  },
  {
    id: 'abschliessen',
    title: 'Abschließen und PDF senden',
    summary: 'Protokoll sperren, PDF erzeugen und verschicken.',
    steps: [
      'Wenn alles ausgefüllt und unterschrieben ist: „Abschließen & PDF erstellen“.',
      'Das Protokoll bekommt eine Nummer und kann danach nicht mehr verändert werden.',
      'Mit „Teilen (Mail, WhatsApp …)“ schickst du das PDF direkt vom Gerät.',
      'Mit Cloud und hinterlegten Versand-Adressen geht das PDF automatisch ans Büro – ohne Netz, sobald wieder Empfang ist.',
    ],
    start: { label: 'Versand-Adressen einstellen', to: '/profile/firma' },
  },
  {
    id: 'korrektur',
    title: 'Ein abgeschlossenes Protokoll korrigieren',
    summary: 'Fehler im fertigen Protokoll nachvollziehbar berichtigen.',
    steps: [
      'Im Archiv das Protokoll öffnen.',
      'Unter „Korrektur“ „Neue Version anlegen“ antippen.',
      'Die neue Version ist ein Entwurf mit allen bisherigen Angaben. Korrigieren und neu unterschreiben lassen.',
      'Beim Abschließen verweist die neue Version auf das Original. Das Original bleibt unverändert erhalten.',
    ],
    start: { label: 'Zum Archiv', to: '/archiv' },
  },
  {
    id: 'dokumente',
    title: 'Auftrag oder Rechnung anhängen',
    summary: 'Auftragsbestätigung oder Rechnung beim Protokoll ablegen.',
    steps: [
      'Im Archiv das abgeschlossene Protokoll öffnen.',
      'Unter „Auftrag & Rechnung“ die Art des Dokuments wählen.',
      '„📷 Scannen“ fotografiert das Papier und schneidet es zu – oder eine Datei (Foto, PDF) auswählen.',
    ],
    tips: ['Das Protokoll selbst bleibt dabei unverändert.'],
  },
  {
    id: 'firma',
    title: 'Firma einrichten',
    summary: 'Logo, Firmendaten und Protokollnummern für das PDF.',
    steps: [
      '„Profile“ → „Firma“ öffnen.',
      'Logo hochladen. Die App schlägt passende Farben aus dem Logo vor.',
      'Firmenname, Adresse, Telefon und E-Mail eintragen – sie erscheinen im Kopf jedes PDFs.',
      'Ein Kürzel für die Protokollnummern festlegen, z. B. „ZW“ → ZW-2026-001.',
      'Unter „Versand“ die E-Mail-Adressen eintragen, an die fertige Protokolle gehen.',
    ],
    tips: ['Alles wird automatisch gespeichert.'],
    start: { label: 'Firma öffnen', to: '/profile/firma' },
  },
  {
    id: 'team',
    title: 'Mitarbeiter und Subunternehmer anlegen',
    summary: 'Personen einmal anlegen und bei jedem Einsatz antippen.',
    steps: [
      '„Profile“ → „Team & Partner“ öffnen.',
      'Eigene Mitarbeiter anlegen: Name, Qualifikationen (z. B. SKT A, AS-Baum I) und – falls bekannt – bis wann die Nachweise gelten.',
      'Subunternehmer: die Firma anlegen und ihr die Personen zuordnen.',
      'Im Einsatz unter „Team“ die Personen antippen und Rollen zuweisen.',
    ],
    tips: [
      'Im Einsatz kannst du auch direkt eine neue Person anlegen – sie wird für später gespeichert.',
      'Unter „Fristen“ siehst du, welche Nachweise bald ablaufen.',
    ],
    start: { label: 'Team & Partner öffnen', to: '/profile/team' },
  },
  {
    id: 'einladen',
    title: 'Kollegen oder weiteres Gerät einladen',
    summary: 'Alle Geräte der Firma teilen Profile und Protokolle.',
    steps: [
      'Auf dem ersten Gerät: „Profile“ → „Firma“ → „Firmen-Kartei (Cloud)“, mit E-Mail anmelden und die Firma in die Cloud bringen.',
      '„Einladungs-Code erstellen“ und den Code weitergeben („Code teilen“).',
      'Auf dem neuen Gerät: ebenfalls „Firmen-Kartei (Cloud)“ öffnen, anmelden, „Einer Firma beitreten“ und den Code eingeben.',
      'Auf dem ersten Gerät erscheint eine Beitrittsanfrage. Nach der Freigabe werden alle Profile und Protokolle übernommen.',
    ],
    tips: [
      'Den Anmelde-Code schickt die App per E-Mail. Kommt nichts an: Spam-Ordner prüfen.',
      'Neue Mitglieder können Neues anlegen, aber die Stammdaten der Firma nicht ändern.',
    ],
    start: { label: 'Firmen-Kartei öffnen', to: '/profile/firma/cloud' },
  },
  {
    id: 'ausruestung',
    title: 'Standard-Ausrüstung festlegen',
    summary: 'Was immer dabei ist, wird in jedem Einsatz vorbelegt.',
    steps: [
      '„Profile“ → „Firma“ → „Standard-Ausrüstung“ öffnen.',
      'Ankreuzen, was bei euch immer vorhanden und geprüft ist.',
      'Im Einsatz sind diese Punkte vorbelegt und müssen vor Ort nur bestätigt werden.',
    ],
    start: { label: 'Standard-Ausrüstung öffnen', to: '/profile/ausruestung' },
  },
  {
    id: 'kunden',
    title: 'Kunden und Objekte verwalten',
    summary: 'Auftraggeber und ihre Adressen für schnelle Auswahl.',
    steps: [
      '„Profile“ → „Kunden und Objekte“ öffnen und einen Kunden anlegen, z. B. eine Hausverwaltung.',
      'Zum Kunden die Objekte (Adressen) hinzufügen.',
      'Im Einsatz Kunde und Objekt auswählen – die Adresse wird übernommen.',
    ],
    tips: ['Neue Kunden kannst du auch direkt im Einsatz anlegen.'],
    start: { label: 'Kunden öffnen', to: '/profile/kunden' },
  },
  {
    id: 'backup',
    title: 'Daten sichern',
    summary: 'Ohne Cloud liegen die Daten nur auf diesem Gerät.',
    steps: [
      '„Einstellungen“ → „Datensicherung“ öffnen.',
      '„Backup erstellen“ antippen und die Datei an einem sicheren Ort speichern, z. B. in der Cloud oder per Mail an dich.',
      'Auf einem neuen Gerät lässt sich das Backup dort wieder einspielen.',
    ],
    tips: ['Die App erinnert dich, wenn das letzte Backup zu lange her ist.'],
    start: { label: 'Einstellungen öffnen', to: '/einstellungen' },
  },
  {
    id: 'offline',
    title: 'Ohne Internet arbeiten',
    summary: 'Was ohne Netz geht – und was erst später passiert.',
    steps: [
      'Erfassen, Fotos, Unterschriften und PDF funktionieren komplett ohne Internet.',
      'Ohne Netz nicht verfügbar: Adresse aus GPS, Krankenhaus-Suche und Wetterwarnungen. Diese Angaben kannst du von Hand eintragen.',
      'Abgleich mit der Cloud und der automatische Versand passieren, sobald wieder Empfang ist. Oben zeigt die App „Online“ oder „Offline“.',
    ],
    tips: [
      'Die App einmal mit Internet öffnen und auf dem Startbildschirm installieren – dann startet sie auch ohne Netz.',
    ],
  },
]

export const guideGroups: GuideGroup[] = [
  { title: 'Im Einsatz', guides: ['einsatz', 'schneller', 'baeume', 'fotos', 'unterschriften'] },
  { title: 'Nach dem Einsatz', guides: ['abschliessen', 'korrektur', 'dokumente'] },
  { title: 'Einrichten', guides: ['firma', 'team', 'ausruestung', 'kunden', 'einladen'] },
  { title: 'Sicherheit der Daten', guides: ['backup', 'offline'] },
]

const byId = new Map(guides.map((g) => [g.id, g]))

export function getGuide(id: string): Guide | undefined {
  return byId.get(id)
}

/** Help for one page or wizard step. */
export interface PageHelp {
  title: string
  text: string
  /** Practical hints for this page. */
  tips?: string[]
  guides: string[]
}

/** Help for wizard steps, by step id. */
export const stepHelp: Record<string, PageHelp> = {
  job: {
    title: 'Einsatz',
    text: 'Hier legst du fest, was heute gemacht wird. Die Einsatzart und die geplanten Arbeiten bestimmen, welche Fragen später kommen.',
    tips: [
      'Bei einem Objekt, an dem ihr schon wart, zeigt die App den letzten Einsatz und bietet die Bäume von damals an.',
      'Fehlt ein Kunde, kannst du ihn hier direkt anlegen.',
    ],
    guides: ['einsatz', 'kunden'],
  },
  site: {
    title: 'Standort & Rettung',
    text: 'Diese Angaben braucht ihr im Notfall. Am besten direkt am Baum ausfüllen.',
    tips: [
      'Die Notfallinfo unten fasst alles zusammen, was der Leitstelle durchgegeben werden muss.',
      'Ohne Internet Adresse und Krankenhaus von Hand eintragen.',
    ],
    guides: ['offline'],
  },
  team: {
    title: 'Team',
    text: 'Wähle alle Personen aus, die heute arbeiten, und gib ihnen eine Rolle. Danach bestätigst du die Kontrollpunkte vor Arbeitsbeginn.',
    tips: [
      'Die App schlägt Rollen passend zu den Qualifikationen vor.',
      'Bei SKT weist die App darauf hin, wenn zu wenig ausgebildete Personen dabei sind.',
    ],
    guides: ['team', 'schneller'],
  },
  tree: {
    title: 'Baum',
    text: 'Lege für jeden Baum eine Karte an. Baumart, Höhe und Wuchsform helfen bei der Beurteilung im nächsten Schritt.',
    tips: ['Ähnliche Bäume mit „+ Weiterer Baum wie …“ kopieren.'],
    guides: ['baeume', 'fotos'],
  },
  treeAssessment: {
    title: 'Baumbeurteilung',
    text: 'Prüfe den Baum von unten nach oben. Für jeden unauffälligen Bereich reicht „Nein, unauffällig“. Bei Auffälligkeiten fragt die App die einzelnen Merkmale ab.',
    tips: [
      'Am Ende entscheidest du, ob der Baum für die geplanten Arbeiten sicher ist.',
      'Bei „Nein“ oder „Eingehende Untersuchung“ ist eine Begründung nötig.',
    ],
    guides: ['schneller', 'baeume'],
  },
  workplace: {
    title: 'Einsatzort & Ausrüstung',
    text: 'Jetzt geht es um die Umgebung des Baums, den Naturschutz und eure Ausrüstung. Vorbelegte Punkte kommen aus der Standard-Ausrüstung.',
    tips: ['Mit Internet zeigt die App bei der Witterung aktuelle Unwetterwarnungen.'],
    guides: ['schneller', 'ausruestung'],
  },
  summary: {
    title: 'Prüfen & Abschließen',
    text: 'Hier siehst du alle Angaben auf einen Blick. Offene Punkte und Warnungen stehen oben – ein Tipp springt direkt zur Frage.',
    tips: [
      'Erst wenn nichts mehr offen ist und alle unterschrieben haben, lässt sich das Protokoll abschließen.',
    ],
    guides: ['unterschriften', 'abschliessen'],
  },
}

/** Help for app pages, by path prefix (longest match wins). */
const pageHelpByPath: Record<string, PageHelp> = {
  '/': {
    title: 'Startseite',
    text: 'Von hier startest du einen neuen Einsatz oder machst mit einem angefangenen weiter.',
    guides: ['einsatz', 'firma', 'team'],
  },
  '/archiv': {
    title: 'Archiv',
    text: 'Alle abgeschlossenen Protokolle. Suche nach Nummer, Kunde, Objekt, Adresse, Person oder Baumart.',
    guides: ['abschliessen', 'korrektur', 'dokumente'],
  },
  '/protokoll': {
    title: 'Protokoll',
    text: 'Ein abgeschlossenes Protokoll: PDF ansehen und teilen, Auftrag oder Rechnung anhängen oder eine Korrektur anlegen.',
    guides: ['abschliessen', 'dokumente', 'korrektur'],
  },
  '/profile': {
    title: 'Profile',
    text: 'Was du hier einmal einträgst, steht in jedem Einsatz zur Auswahl bereit.',
    guides: ['firma', 'team', 'kunden', 'ausruestung'],
  },
  '/profile/firma': {
    title: 'Firma',
    text: 'Logo und Firmendaten erscheinen auf jedem PDF. Unter „Versand“ legst du fest, wohin fertige Protokolle gehen.',
    guides: ['firma', 'einladen', 'ausruestung'],
  },
  '/profile/firma/cloud': {
    title: 'Firmen-Kartei (Cloud)',
    text: 'Mit der Firmen-Kartei teilen alle Geräte der Firma Profile und Protokolle, und fertige PDFs gehen automatisch ans Büro.',
    guides: ['einladen'],
  },
  '/profile/team': {
    title: 'Team & Partner',
    text: 'Eigene Mitarbeiter und Subunternehmer mit ihren Qualifikationen. Unter „Fristen“ siehst du ablaufende Nachweise.',
    guides: ['team'],
  },
  '/profile/kunden': {
    title: 'Kunden und Objekte',
    text: 'Auftraggeber mit ihren Objekten. Im Einsatz wird die Adresse des Objekts übernommen.',
    guides: ['kunden'],
  },
  '/profile/ausruestung': {
    title: 'Standard-Ausrüstung',
    text: 'Was hier angekreuzt ist, wird in jedem Einsatz vorbelegt und vor Ort nur bestätigt.',
    guides: ['ausruestung'],
  },
  '/einstellungen': {
    title: 'Einstellungen',
    text: 'Darstellung, Datensicherung und Geräte-Einstellungen.',
    guides: ['backup', 'offline'],
  },
}

export function pageHelp(path: string): PageHelp | undefined {
  const key = Object.keys(pageHelpByPath)
    .filter((p) => path === p || (p !== '/' && path.startsWith(`${p}/`)))
    .sort((a, b) => b.length - a.length)[0]
  return key ? pageHelpByPath[key] : undefined
}
