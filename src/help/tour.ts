/** Slides of the app tour. It can be restarted any time from the help centre. */
export interface TourSlide {
  icon: string
  title: string
  text: string
  points?: string[]
}

export const tourSlides: TourSlide[] = [
  {
    icon: '🌳',
    title: 'Willkommen',
    text: 'Die App führt dich vor Ort Schritt für Schritt durch die Gefährdungsermittlung und Baumsicherheitsbeurteilung. Am Ende steht ein fertiges PDF mit allen Unterschriften.',
    points: ['Funktioniert komplett ohne Internet.', 'Alles wird sofort gespeichert.'],
  },
  {
    icon: '🏢',
    title: 'Einmal einrichten',
    text: 'Unter „Profile“ trägst du einmal ein, was immer gleich ist. Im Einsatz tippst du es dann nur noch an.',
    points: [
      'Firma: Logo und Firmendaten für das PDF',
      'Team & Partner: Mitarbeiter, Subunternehmer, Qualifikationen',
      'Kunden und Objekte',
      'Standard-Ausrüstung',
    ],
  },
  {
    icon: '📋',
    title: 'Einsatz in 7 Schritten',
    text: 'Auf der Startseite „+ Neue Gefährdungsermittlung“: Einsatz, Standort & Rettung, Team, Baum, Baumbeurteilung, Einsatzort & Ausrüstung, Prüfen & Abschließen.',
    points: [
      'Unterbrechen jederzeit möglich – angefangene Einsätze stehen auf der Startseite.',
      '„Schritt x von 7“ oben öffnet die Liste aller Schritte.',
    ],
  },
  {
    icon: '⚡',
    title: 'Schnell antworten',
    text: 'Die meisten Bäume sind unauffällig. Dafür gibt es Abkürzungen.',
    points: [
      '„Nein, unauffällig“ erledigt einen ganzen Bereich am Baum.',
      '„Alle offenen mit „Ja“ beantworten“ für Kontrollpunkte.',
      'Maßnahmen antippen oder mit „Sprechen“ diktieren.',
      '„⚡ Schnellmodus“: eine Frage pro Bildschirm, riesige Knöpfe – auch mit Handschuhen.',
    ],
  },
  {
    icon: '❓',
    title: 'Erklärung an jeder Frage',
    text: 'Das „?“ neben einer Frage erklärt, was gemeint ist, warum gefragt wird, und gibt ein Beispiel.',
    points: ['Gepunktet unterstrichene Fachbegriffe antippen – dann erscheint eine Kurzerklärung.'],
  },
  {
    icon: '✍',
    title: 'Unterschreiben und abschließen',
    text: 'Zum Schluss unterschreiben Aufsicht und Team auf dem Display. Danach wird das Protokoll gesperrt und als PDF gespeichert.',
    points: [
      'PDF direkt per Mail oder Messenger teilen.',
      'Alle Protokolle findest du im Archiv – Korrekturen nur als neue Version.',
    ],
  },
  {
    icon: '👥',
    title: 'Im Team arbeiten',
    text: 'Mit der Firmen-Kartei (Cloud) teilen alle Geräte der Firma Profile und Protokolle. Neue Kollegen treten mit einem Einladungs-Code bei.',
    points: ['Fertige PDFs gehen dann automatisch ans Büro.'],
  },
  {
    icon: '🛟',
    title: 'Hilfe ist immer da',
    text: 'Das „?“ oben rechts zeigt Hilfe zu genau der Seite, auf der du gerade bist – auch im Einsatz. Daneben bringt „SOS“ im Einsatz jederzeit die Notfallinfo mit 112-Knopf.',
    points: ['Im Hilfe-Center findest du Anleitungen, Begriffe A–Z und diesen Rundgang.'],
  },
]
