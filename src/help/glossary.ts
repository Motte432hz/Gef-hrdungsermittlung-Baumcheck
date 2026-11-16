/**
 * Technical terms explained in plain German. Terms in labels and explanations are
 * underlined in the wizard and open a short explanation; all of them are listed on
 * the glossary page.
 */
export interface GlossaryEntry {
  /** Stable anchor id for links (#id). */
  id: string
  /** Heading on the glossary page. */
  term: string
  /** Spellings that are recognised in texts (exact, case-sensitive, whole words). */
  forms: string[]
  /** One to three sentences. */
  text: string
  /** Related entries (ids). */
  see?: string[]
}

export const glossary: GlossaryEntry[] = [
  {
    id: 'abseiltechnik',
    term: 'Abseiltechnik (Rigging)',
    forms: ['Abseiltechnik', 'Abseilen', 'abseilen', 'abgeseilt', 'Abseilausrüstung'],
    text: 'Abgeschnittene Äste oder Stammstücke fallen nicht frei, sondern werden an einem Seil über einen Umlenkpunkt im Baum kontrolliert zu Boden gelassen. Nötig, wenn darunter Gebäude, Leitungen oder Pflanzungen sind.',
    see: ['bodenperson', 'anschlagpunkt'],
  },
  {
    id: 'anschlagpunkt',
    term: 'Anschlagpunkt',
    forms: ['Anschlagpunkt', 'Anschlagpunkts', 'Anschlagpunkte'],
    text: 'Die Stelle im Baum, an der das Kletter- oder Abseilseil befestigt wird. Sie muss das Gewicht des Kletterers bzw. der Last sicher tragen – gesundes Holz, ausreichend dick, ohne Risse oder Fäule.',
  },
  {
    id: 'as-baum',
    term: 'AS-Baum I / II',
    forms: ['AS-Baum I', 'AS-Baum II', 'AS-Baum'],
    text: 'Arbeitssicherheit bei Baumarbeiten: Lehrgänge für den sicheren Umgang mit der Motorsäge bei der Baumpflege und Fällung. AS-Baum I ist der Grundkurs, AS-Baum II baut darauf auf (z. B. schwierigere Fällungen).',
    see: ['skt'],
  },
  {
    id: 'aufsicht',
    term: 'Aufsichtsführende Person',
    forms: ['Aufsichtsführende Person', 'Aufsicht'],
    text: 'Die Person, die vor Ort das Sagen hat. Sie macht die Gefährdungsermittlung, teilt das Team ein, darf Anweisungen geben und die Arbeit stoppen. Sie unterschreibt das Protokoll als Verantwortliche.',
  },
  {
    id: 'baumschutzsatzung',
    term: 'Baumschutzsatzung',
    forms: ['Baumschutzsatzung', 'Baumschutzsatzungen'],
    text: 'Regel einer Stadt oder Gemeinde, die Bäume ab einer bestimmten Größe schützt. Fällen oder starkes Einkürzen braucht dann eine Genehmigung. Ob und ab welcher Größe sie gilt, ist von Ort zu Ort verschieden.',
    see: ['schonzeit'],
  },
  {
    id: 'bnatschg',
    term: 'BNatSchG',
    forms: ['BNatSchG', 'Bundesnaturschutzgesetz'],
    text: 'Bundesnaturschutzgesetz. Für Baumarbeiten wichtig: § 39 (Schonzeit 1. März bis 30. September) und § 44 (Nester, Höhlen und Quartiere geschützter Tiere dürfen nie zerstört werden).',
    see: ['schonzeit', 'untere-naturschutzbehoerde'],
  },
  {
    id: 'bodenperson',
    term: 'Bodenperson',
    forms: ['Bodenperson', 'Bodenpersonal'],
    text: 'Unterstützt den Kletterer vom Boden aus: reicht Material an, bedient das Abseilseil, hält den Gefahrenbereich im Blick und muss im Notfall die Rettung einleiten können.',
    see: ['sicherungsposten'],
  },
  {
    id: 'druckzwiesel',
    term: 'Druckzwiesel',
    forms: ['Druckzwiesel', 'Druckzwiesels'],
    text: 'Zwei etwa gleich starke Stämmlinge, die eng V-förmig auseinanderwachsen. Dazwischen ist Rinde eingewachsen, deshalb sind sie kaum miteinander verbunden und können auseinanderbrechen.',
    see: ['zwiesel'],
  },
  {
    id: 'eichenprozessionsspinner',
    term: 'Eichenprozessionsspinner',
    forms: ['Eichenprozessionsspinners', 'Eichenprozessionsspinner'],
    text: 'Raupe an Eichen. Ihre feinen Brennhaare lösen starke Haut-, Augen- und Atemwegsreizungen aus – auch noch Jahre später aus alten Gespinsten. Nur mit Schutzanzug und Atemschutz oder durch eine Fachfirma.',
  },
  {
    id: 'einkuerzung',
    term: 'Kroneneinkürzung',
    forms: ['Kroneneinkürzung'],
    text: 'Die Krone wird in Höhe oder Breite verkleinert, indem Äste auf tiefer liegende Seitenäste zurückgeschnitten werden. Anders als bei einer Kappung bleibt die natürliche Kronenform erhalten.',
    see: ['kappung'],
  },
  {
    id: 'ersthelfer',
    term: 'Ersthelfer/in',
    forms: ['Ersthelferin', 'Ersthelfer'],
    text: 'Person mit gültiger Erste-Hilfe-Ausbildung (Auffrischung alle 2 Jahre). Bei Baumarbeiten sollte immer mindestens eine solche Person vor Ort sein.',
  },
  {
    id: 'fallbereich',
    term: 'Fallbereich / Gefahrenbereich',
    forms: ['Fallbereich', 'Gefahrenbereich', 'Fall- und Gefahrenbereich'],
    text: 'Die Fläche, auf die der Baum, Äste oder Werkzeuge fallen oder pendeln können. Bei Fällungen mindestens die doppelte Baumlänge im Umkreis. Dort darf sich niemand Unbeteiligtes aufhalten.',
    see: ['rueckweiche'],
  },
  {
    id: 'gefahrenmerkmal',
    term: 'Gefahrenmerkmal',
    forms: ['Gefahrenmerkmal', 'Gefahrenmerkmale'],
    text: 'Eine Frage nach einer möglichen Gefahr (z. B. „Totholz“). Antwort „vorhanden“ oder „nicht vorhanden“. Bei „vorhanden“ musst du eine Maßnahme eintragen.',
    see: ['kontrollpunkt', 'massnahme'],
  },
  {
    id: 'gefaehrdungsermittlung',
    term: 'Gefährdungsermittlung',
    forms: ['Gefährdungsermittlung'],
    text: 'Vor Beginn der Arbeiten werden alle Gefahren am Baum und am Einsatzort gesucht und festgelegt, wie man ihnen begegnet. Das Ergebnis wird dem Team erklärt und alle bestätigen es mit ihrer Unterschrift.',
    see: ['unterweisung'],
  },
  {
    id: 'hacker',
    term: 'Hacker',
    forms: ['Hacker'],
    text: 'Maschine, die Äste und Kronenmaterial zu Hackschnitzeln zerkleinert. Sehr laut – Verständigung vorher absprechen. Nie Material mit den Händen nachdrücken.',
  },
  {
    id: 'haenger',
    term: 'Hänger',
    forms: ['Hänger', 'Hängern'],
    text: 'Abgebrochener Ast, der noch in der Krone hängt oder eingeklemmt ist. Er kann ohne Vorwarnung herunterfallen. Zuerst sichern oder entfernen, bevor darunter gearbeitet wird.',
  },
  {
    id: 'hubarbeitsbuehne',
    term: 'Hubarbeitsbühne',
    forms: ['Hubarbeitsbühne', 'Hubarbeitsbühnen', 'Hubarbeitsbühneneinsatz', 'Bühne'],
    text: 'Fahrbare Arbeitsplattform (Korb), mit der man in die Krone gelangt, ohne zu klettern. Bedienung nur mit Einweisung bzw. Bedienerausweis; im Korb mit Auffanggurt angeschlagen.',
  },
  {
    id: 'kappung',
    term: 'Kappung',
    forms: ['Kappung', 'Kappungsstellen', 'Gekappter'],
    text: 'Äste oder Stamm wurden irgendwo mitten im Holz abgeschnitten, ohne Rücksicht auf die Kronenform. An den Schnittstellen wachsen viele dünne Triebe, die schlecht verankert sind und später ausbrechen können.',
    see: ['einkuerzung'],
  },
  {
    id: 'kontrollpunkt',
    term: 'Kontrollpunkt',
    forms: ['Kontrollpunkt', 'Kontrollpunkte'],
    text: 'Eine Frage, ob etwas erledigt oder in Ordnung ist (z. B. „PSA geprüft“). Antwort Ja, Nein oder „nicht relevant“. Bei „Nein“ musst du eine Maßnahme oder Begründung eintragen.',
    see: ['gefahrenmerkmal', 'massnahme'],
  },
  {
    id: 'kronenpflege',
    term: 'Kronenpflege',
    forms: ['Kronenpflege'],
    text: 'Schnitt zur Erhaltung eines gesunden, sicheren Baums: Totholz, kranke, beschädigte oder sich reibende Äste werden entfernt. Die Krone bleibt in ihrer Form erhalten.',
  },
  {
    id: 'kronensicherung',
    term: 'Kronensicherung',
    forms: ['Kronensicherung', 'Kronensicherungen'],
    text: 'Seile oder Gurte, die zwischen Kronenteilen eingebaut werden, damit diese bei Sturm nicht auseinanderbrechen (z. B. bei Zwieseln). Eine alte Kronensicherung ist kein sicherer Anschlagpunkt.',
    see: ['kronensicherungsschnitt'],
  },
  {
    id: 'kronensicherungsschnitt',
    term: 'Kronensicherungsschnitt',
    forms: ['Kronensicherungsschnitt'],
    text: 'Gezieltes Einkürzen von schweren oder gefährdeten Kronenteilen, damit sie weniger Hebelkraft haben und nicht brechen.',
  },
  {
    id: 'massnahme',
    term: 'Maßnahme',
    forms: ['Maßnahme', 'Maßnahmen'],
    text: 'Was ihr tut, damit von einer Gefahr nichts passiert, z. B. „Bereich abgesperrt“ oder „Totholz zuerst entfernt“. Steht im Protokoll neben der Gefahr und wird dem Team erklärt.',
  },
  {
    id: 'pilzfruchtkoerper',
    term: 'Pilzfruchtkörper',
    forms: ['Pilzfruchtkörper', 'Pilzfruchtkörpern'],
    text: 'Der sichtbare Teil eines Pilzes (z. B. Konsole am Stamm, Hut am Boden). Das Pilzgeflecht sitzt im Holz und zersetzt es oft schon lange, bevor man den Fruchtkörper sieht. Hinweis auf Fäule.',
    see: ['restwand'],
  },
  {
    id: 'psa',
    term: 'PSA',
    forms: ['PSA', 'persönliche Schutzausrüstung', 'Schutzausrüstung'],
    text: 'Persönliche Schutzausrüstung: Helm mit Gesichts- und Gehörschutz, Schnittschutzhose, Schnittschutzschuhe, Handschuhe – beim Klettern zusätzlich Gurt, Seile und Karabiner (PSA gegen Absturz).',
  },
  {
    id: 'restwand',
    term: 'Restwand',
    forms: ['Restwand'],
    text: 'Das gesunde Holz, das um eine Höhlung oder Fäule im Stamm noch übrig ist. Je dünner die Restwand, desto leichter bricht der Stamm.',
  },
  {
    id: 'roloff',
    term: 'Vitalität nach Roloff',
    forms: ['Roloff', 'Vitalitätsstufen', 'Vitalität'],
    text: 'Einteilung von Laubbäumen in Stufen 0 (vital) bis 3 (absterbend) anhand der Triebe in der Kronenperipherie. Je höher die Stufe, desto schwächer der Baum und desto größer das Bruchrisiko.',
  },
  {
    id: 'rettungspunkt',
    term: 'Rettungstreffpunkt',
    forms: ['Rettungstreffpunkt', 'Rettungstreffpunkte'],
    text: 'Im Wald ausgeschilderte Punkte mit Nummer, die die Rettungsleitstelle kennt. Dort wartet eine Person auf den Rettungswagen und lotst ihn zum Einsatzort.',
  },
  {
    id: 'rueckweiche',
    term: 'Rückweiche',
    forms: ['Rückweiche', 'Rückweichen'],
    text: 'Freigeräumter Fluchtweg schräg nach hinten (etwa 45° zur Fällrichtung), auf dem man sich beim Fallen des Baums in Sicherheit bringt. Ohne Stolperstellen, für jede Person am Baum.',
  },
  {
    id: 'haengerformen',
    term: 'Vorhänger / Rückhänger / Seithänger',
    forms: ['Vorhänger', 'Rückhänger', 'Seithänger', 'Vor-, Rück- und Seithänger'],
    text: 'Neigung des Baums im Verhältnis zur geplanten Fällrichtung: Vorhänger neigt in Fällrichtung (Stamm kann aufreißen), Rückhänger dagegen (Keil oder Seilwinde nötig), Seithänger zur Seite.',
  },
  {
    id: 'schonhammer',
    term: 'Schonhammer',
    forms: ['Schonhammer'],
    text: 'Hammer mit Kunststoff- oder Gummikopf. Durch Abklopfen des Stamms hört man an einem hohlen Klang, wo eine Höhlung sitzen kann – ohne den Baum zu verletzen.',
  },
  {
    id: 'schonzeit',
    term: 'Schonzeit',
    forms: ['Schonzeit'],
    text: 'Vom 1. März bis 30. September dürfen Bäume außerhalb des Waldes nicht gefällt oder stark zurückgeschnitten werden (§ 39 BNatSchG). Ausnahmen: schonende Pflegeschnitte, dringende Verkehrssicherung, Genehmigung, gärtnerisch genutzte Flächen.',
    see: ['bnatschg'],
  },
  {
    id: 'sicherungsposten',
    term: 'Sicherungsposten',
    forms: ['Sicherungsposten'],
    text: 'Person, die nur darauf achtet, dass niemand in den Gefahrenbereich läuft oder fährt – z. B. an Wegen und Straßen. Sie hat keine andere Aufgabe und warnt sofort.',
    see: ['fallbereich'],
  },
  {
    id: 'skt',
    term: 'SKT (Seilklettertechnik)',
    forms: ['SKT A/B', 'SKT A', 'SKT B', 'SKT K', 'SKT', 'Seilklettertechnik'],
    text: 'Arbeiten im Baum, gesichert mit Seil und Gurt. SKT A ist der Grundlehrgang (Klettern, Retten), SKT B berechtigt zur Arbeit mit der Motorsäge im Baum. Für SKT-Einsätze sind mindestens zwei ausgebildete Personen vor Ort nötig – eine davon für die Rettung.',
    see: ['as-baum'],
  },
  {
    id: 'stammfuss',
    term: 'Stammfuß / Wurzelanlauf',
    forms: ['Stammfuß', 'Wurzelanlauf'],
    text: 'Der unterste Teil des Stamms, wo er in die Wurzeln übergeht. Hier treten Fäule und Pilze oft zuerst auf, und hier entscheidet sich die Standsicherheit.',
    see: ['wurzelteller'],
  },
  {
    id: 'stammdurchmesser',
    term: 'Stammdurchmesser (BHD)',
    forms: ['Stammdurchmesser', 'BHD'],
    text: 'Durchmesser des Stamms in 1,30 m Höhe („Brusthöhe“). Schnell geschätzt: Stammumfang geteilt durch 3,14.',
  },
  {
    id: 'totholz',
    term: 'Totholz',
    forms: ['Totholz', 'Totholzentnahme'],
    text: 'Abgestorbene Äste ohne Laub oder Knospen, oft ohne Rinde. Sie brechen leicht und fallen beim Klettern oder durch Erschütterung herunter.',
  },
  {
    id: 'untere-naturschutzbehoerde',
    term: 'Untere Naturschutzbehörde',
    forms: ['Unteren Naturschutzbehörde', 'Untere Naturschutzbehörde', 'Naturschutzbehörde'],
    text: 'Zuständige Stelle beim Landkreis oder der kreisfreien Stadt für Artenschutz, Schonzeit-Ausnahmen und Befreiungen.',
  },
  {
    id: 'unterweisung',
    term: 'Unterweisung',
    forms: ['Unterweisung', 'unterwiesen'],
    text: 'Das Team wird vor Arbeitsbeginn über die Gefahren und Maßnahmen informiert. Jede Person bestätigt mit ihrer Unterschrift, dass sie es verstanden hat.',
  },
  {
    id: 'verkehrsrechtliche-anordnung',
    term: 'Verkehrsrechtliche Anordnung',
    forms: ['verkehrsrechtliche Anordnung'],
    text: 'Genehmigung der Straßenverkehrsbehörde, wenn für die Arbeiten eine Straße, ein Rad- oder Gehweg gesperrt oder eingeengt wird. Muss meist einige Tage vorher beantragt werden.',
  },
  {
    id: 'what3words',
    term: 'what3words',
    forms: ['what3words'],
    text: 'System, das jede 3 × 3 m-Fläche der Welt mit drei Wörtern bezeichnet (z. B. ///tisch.lampe.wald). Viele Rettungsleitstellen können damit den Einsatzort finden.',
  },
  {
    id: 'wurzelteller',
    term: 'Wurzelteller',
    forms: ['Wurzelteller', 'Wurzeltellers'],
    text: 'Das flache Wurzelwerk mit dem Erdreich direkt um den Stamm. Hebt er sich auf einer Seite an oder reißt der Boden, kippt der Baum möglicherweise schon.',
    see: ['stammfuss'],
  },
  {
    id: 'zwiesel',
    term: 'Zwiesel',
    forms: ['Zwieseln', 'Zwiesel'],
    text: 'Gabelung, an der sich Stamm oder Ast in zwei etwa gleich starke Teile teilt. Eine U-förmige Gabel ist meist stabil, eine enge V-Form mit eingewachsener Rinde nicht (Druckzwiesel).',
    see: ['druckzwiesel'],
  },
]

const byId = new Map(glossary.map((e) => [e.id, e]))

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return byId.get(id)
}

export type TermPart = string | { text: string; entry: GlossaryEntry }

const WORD = '\\p{L}\\p{N}'
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

// Longest spellings first, so "SKT A/B" wins over "SKT".
const forms = glossary
  .flatMap((entry) => entry.forms.map((form) => ({ form, entry })))
  .sort((a, b) => b.form.length - a.form.length)
const formEntry = new Map(forms.map((f) => [f.form, f.entry]))
const pattern = new RegExp(
  `(?<![${WORD}])(${forms.map((f) => escape(f.form)).join('|')})(?![${WORD}])`,
  'gu',
)

/**
 * Splits a text into plain parts and glossary terms. Each term is marked only once
 * per text; a text that is nothing but the term itself is not marked.
 */
export function splitTerms(text: string, exclude: ReadonlySet<string> = new Set()): TermPart[] {
  const parts: TermPart[] = []
  const seen = new Set(exclude)
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const term = match[1] ?? ''
    const entry = formEntry.get(term)
    if (!entry || seen.has(entry.id) || term === text.trim()) continue
    seen.add(entry.id)
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push({ text: term, entry })
    last = match.index + term.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/** Entries that match a search, by term, spelling or explanation. */
export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.trim().toLocaleLowerCase('de')
  const sorted = [...glossary].sort((a, b) => a.term.localeCompare(b.term, 'de'))
  if (!q) return sorted
  const score = (e: GlossaryEntry) =>
    e.term.toLocaleLowerCase('de').includes(q) ||
    e.forms.some((f) => f.toLocaleLowerCase('de').includes(q))
      ? 0
      : e.text.toLocaleLowerCase('de').includes(q)
        ? 1
        : 2
  return sorted.filter((e) => score(e) < 2).sort((a, b) => score(a) - score(b))
}
