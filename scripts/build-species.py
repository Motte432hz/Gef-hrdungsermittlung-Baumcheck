"""Generates src/form/definitions/tree-species-1.0.json (source of truth: this script's data).
Kept as a script so the long list stays readable and reviewable."""
import json, re, unicodedata

H = {}
def hz(id, title, text, **advice):
    H[id] = {"id": id, "title": title, "text": text, "advice": advice}

# ---- Hazard catalogue -------------------------------------------------------
# advice keys: general, climbing, pruning, felling, rigging, chipping
hz("sooty_bark", "Rußrindenkrankheit",
   "Erreger Cryptostroma corticale, vor allem am Berg-Ahorn. Unter abplatzender Rinde liegen schwarze, staubende Sporenlager. Eingeatmete Sporen können eine schwere Lungenentzündung (Alveolitis) auslösen. Befallene Bäume sterben ab, das Holz wird schnell brüchig.",
   general="Bei Verdacht: Atemschutz mindestens FFP2, besser FFP3, Einweg-Schutzanzug und Schutzbrille. Möglichst bei feuchtem Wetter arbeiten, Unbeteiligte fernhalten.",
   climbing="Absterbende, befallene Kronen nicht ungeprüft besteigen – Bruchgefahr. Hubarbeitsbühne bevorzugen.",
   felling="Staubentwicklung vermeiden, befallene Stammteile nicht unnötig zersägen.",
   chipping="Befallenes Material nicht in Wohnnähe hacken; beim Transport abdecken und nach örtlichen Vorgaben entsorgen.")
hz("oak_processionary", "Eichenprozessionsspinner",
   "Die Brennhaare der Raupen (etwa Mai bis Juli) und alte Gespinstnester lösen Hautausschlag sowie Augen- und Atemwegsreizungen aus – auch noch Monate bis Jahre später.",
   general="Krone vor Arbeitsbeginn auf Nester und Raupen absuchen. Bei Befall nur mit Schutzausrüstung (Schutzanzug, Atemschutz FFP2/FFP3, Schutzbrille, Handschuhe) arbeiten oder die Bekämpfung durch eine Fachfirma abwarten.",
   climbing="Nester nicht berühren; Seile und Ausrüstung nach dem Einsatz reinigen, Kleidung getrennt waschen.",
   chipping="Nester und befallenes Material nicht hacken, sondern gesondert entsorgen.")
hz("ash_dieback", "Eschentriebsterben",
   "Pilz Hymenoscyphus fraxineus. Kronen sterben ab, oft mit Stammfußnekrosen und Wurzelfäule (häufig Hallimasch). Befallene Eschen können ohne äußere Vorwarnung umstürzen oder abbrechen; totes Eschenholz wird schnell spröde.",
   climbing="Stammfuß und Wurzelanlauf vor dem Aufstieg genau prüfen (Rindennekrosen, Pilze, Klopfprobe). Bei deutlichem Befall nicht besteigen – Hubarbeitsbühne oder Kran verwenden.",
   felling="Die Bruchleiste kann versagen, die Fällrichtung ist unsicher: Seilzug oder Seilwinde einsetzen und den Sicherheitsabstand vergrößern.",
   rigging="Anschlag- und Umlenkpunkte in geschädigten Kronen nicht belasten.")
hz("barber_chair", "Aufreißgefahr beim Fällen",
   "Das Holz neigt beim Fällen dazu, längs aufzureißen und nach oben herauszuschlagen – besonders bei Vorhängern.",
   felling="Bei Vorhang eine geeignete Fälltechnik mit Halteband und Stechschnitt verwenden, den Stamm bei Bedarf vorher mit Kette oder Gurt umschlingen. Rückweiche frei halten und sofort nutzen.")
hz("massaria", "Massaria-Krankheit",
   "Pilz Splanchnonema platani an Platanen. Befällt meist die Oberseite von Ästen: Rinde rötlich bis violett verfärbt, darunter stirbt ein Holzstreifen ab. Befallene Äste können innerhalb weniger Monate plötzlich abbrechen und sind von unten oft kaum zu erkennen.",
   climbing="Äste von oben bzw. aus der Hubarbeitsbühne kontrollieren, bevor sie als Anschlag- oder Standpunkt dienen.",
   pruning="Befallene Äste vorrangig entfernen; Fallbereich großzügig absperren.")
hz("irritant_hairs", "Reizende Haare und Staub",
   "Feine Sternhaare an jungen Blättern und Fruchtständen lösen Husten sowie Augen- und Hautreizungen aus, besonders im Frühjahr und beim Zerfall der Fruchtkugeln.",
   general="Schutzbrille und Staubmaske (FFP2) tragen.",
   chipping="Beim Hacken auf Staubentwicklung achten, Windrichtung berücksichtigen.")
hz("summer_drop", "Grünastbruch (Sommerbruch)",
   "An heißen, meist windstillen Sommertagen können gesund aussehende, waagerechte Starkäste ohne Vorwarnung abbrechen.",
   general="Fallbereich im Sommer auch während Pausen abgesperrt lassen.",
   climbing="Lange, waagerechte Starkäste nicht als Anschlagpunkt nutzen; nicht unter langen Seitenästen aufhalten.",
   pruning="Lange Hebel durch Einkürzen entlasten.")
hz("brittle_wood", "Bruchanfälliges Holz",
   "Das Holz ist weich oder spröde. Äste und Zwiesel brechen leichter als bei anderen Arten, oft ohne Vorwarnung.",
   climbing="Anschlagpunkt besonders tragfähig wählen (möglichst am Stamm oder starken Stämmling) und Redundanz einplanen.",
   rigging="Nur kleine Stücke abseilen, Umlenkpunkte nicht überlasten, Fallstrecke kurz halten.")
hz("heavy_deadwood", "Schweres Totholz",
   "Abgestorbene Starkäste sind schwer und bleiben lange in der Krone. Sie brechen bei Erschütterungen durch Seilarbeit oder Fällung.",
   climbing="Totholz im Kletterweg zuerst entfernen oder umgehen.",
   felling="Beim Fällschnitt nach oben sehen und die Rückweiche sofort nutzen.")
hz("heavy_wood", "Hohes Holzgewicht",
   "Das Holz ist sehr schwer; Äste und Stammteile wiegen deutlich mehr als geschätzt.",
   rigging="Gewicht vorher abschätzen (Frischholz bis etwa 1 t pro m³), Abseilsystem und Anschlagpunkt entsprechend auslegen, kürzere Stücke schneiden.")
hz("beech_fungi", "Stammfuß- und Wurzelpilze",
   "Brandkrustenpilz (Kretzschmaria deusta) und Riesenporling (Meripilus giganteus) zersetzen Stammfuß und Wurzeln. Bäume können trotz voller Belaubung plötzlich umbrechen (Sprödbruch).",
   climbing="Stammfuß rundum prüfen (schwarze Krusten, Fruchtkörper, Klopfprobe). Bei Befund nicht besteigen.",
   felling="Bei Fäule am Stammfuß versagt die Bruchleiste: Fällrichtung mit Seilzug sichern, Fällung gegebenenfalls maschinell.")
hz("slippery_bark", "Glatte Rinde",
   "Die glatte Rinde ist bei Nässe sehr rutschig.",
   climbing="Bei Nässe besonders auf sicheren Halt achten und durchgehend am Seil gesichert bleiben.")
hz("rapid_decay", "Schnelle Zersetzung nach dem Absterben",
   "Abgestorbenes Holz wird innerhalb kurzer Zeit morsch. Tote oder stark geschwächte Bäume sind sehr bruchgefährdet.",
   climbing="Abgestorbene Bäume nicht besteigen – Hubarbeitsbühne einsetzen oder vom Boden fällen.",
   felling="Tote Bäume brechen beim Fällen unkontrolliert, die Krone kann abbrechen: Seilzug einsetzen, nach oben sichern.")
hz("shallow_roots", "Flachwurzler – Windwurfgefahr",
   "Flaches Wurzelsystem: Bei Wind, nassem Boden oder Wurzelschäden ist die Umsturzgefahr hoch.",
   general="Nicht bei starkem Wind arbeiten; Wurzelteller auf Risse und Anheben prüfen.")
hz("bark_beetle", "Borkenkäfer",
   "Befallene Fichten (Bohrmehl, abfallende Rinde, verfärbte Nadeln) sterben schnell ab; Wipfel und Äste werden brüchig.",
   climbing="Abgestorbene oder stark befallene Fichten nicht besteigen.",
   general="Befallenes Holz zügig aus dem Bestand bringen.")
hz("conifer_root_rot", "Wurzel- und Stammfußfäule",
   "Hallimasch und Wurzelschwamm (Heterobasidion) verursachen Fäule im Wurzel- und Stammfußbereich – von außen oft nicht zu sehen.",
   climbing="Stammfuß prüfen, auf Harzfluss und Fruchtkörper am Stammfuß achten.",
   felling="Fäule im Fällschnitt kann die Bruchleiste schwächen; Fällrichtung zusätzlich sichern.")
hz("resin", "Harz",
   "Starker Harzfluss verklebt Seile, Handschuhe und Werkzeug und macht Griffe rutschig.",
   general="Ausrüstung nach dem Einsatz reinigen, Seile auf Verklebungen prüfen.")
hz("toxic", "Giftige Pflanzenteile",
   "Teile des Baumes sind giftig (siehe Hinweis zur Art). Gefahr vor allem beim Verschlucken; Säge- und Hackstaub kann Haut und Atemwege reizen.",
   general="Handschuhe tragen, während der Arbeit nicht essen oder rauchen, danach Hände waschen. Schnittgut nicht auf Weiden liegen lassen und nicht an Tiere verfüttern (Pferde, Rinder, Schafe).",
   chipping="Hackgut nicht als Einstreu oder Futter abgeben.")
hz("thorns", "Dornen und stechende Blätter",
   "Dornen oder stechende Blätter verletzen Haut und Augen und können Seile, Gurte und Kleidung beschädigen.",
   general="Visier bzw. Schutzbrille geschlossen halten, feste Handschuhe tragen.",
   climbing="Seile und Gurte nicht über Dornen führen, Seile nach dem Einsatz prüfen.")
hz("skin_sap", "Hautreizender Pflanzensaft",
   "Saft oder Pflanzenteile können Haut und Augen reizen oder Allergien auslösen.",
   general="Hautkontakt vermeiden: lange Ärmel, Handschuhe, Schutzbrille.")
hz("bleeding_canker", "Rindenkrankheit mit Schleimfluss",
   "Bakterielle Rindenkrankheit (Pseudomonas syringae pv. aesculi) mit dunklen, blutenden Rindenstellen. Darunter folgen rasch Holzfäule und Astbrüche.",
   climbing="Befallene Stämme und Äste nicht als Anschlagpunkt nutzen.",
   pruning="Abgestorbene Kronenteile vorrangig entfernen.")
hz("hollows", "Neigung zu Höhlungen",
   "Die Art bildet häufig Stamm- und Asthöhlungen (Kernfäule). Viele Bäume bleiben lange stabil – entscheidend ist die verbleibende Restwand.",
   climbing="Anschlagpunkt und Stämmlinge auf Höhlungen prüfen (Klopfprobe, Löcher, Spechthöhlen).",
   felling="Höhlungen schwächen die Bruchleiste – Fälltechnik anpassen, das Halteband kann versagen.")
hz("included_bark", "Neigung zu Druckzwieseln",
   "Die Art bildet häufig Zwiesel mit eingewachsener Rinde, die unter Last aufreißen können.",
   climbing="Anschlagpunkt nicht über einem Druckzwiesel wählen; Zwiesel bei Bedarf mit Rundschlinge sichern.",
   pruning="Druckzwiesel bei Einkürzung und Kronensicherung berücksichtigen.")
hz("honeydew", "Honigtau",
   "Blattläuse scheiden klebrigen Honigtau aus. Rinde, Ausrüstung und Boden werden klebrig und rutschig.",
   general="Rutschgefahr auf Wegen und Leitern beachten, Ausrüstung reinigen.")
hz("elm_disease", "Ulmensterben",
   "Pilzkrankheit (Holländische Ulmenkrankheit). Abgestorbene Ulmen und Kronenteile werden spröde und brechen leicht.",
   climbing="Abgestorbene Kronenteile nicht belasten.")
hz("chestnut_blight", "Kastanienrindenkrebs",
   "Pilz Cryphonectria parasitica. Rindenkrebs lässt Äste und Kronenteile absterben, die dann brechen können.",
   climbing="Abgestorbene Kronenteile nicht als Anschlag- oder Standpunkt nutzen.")
hz("very_tall", "Sehr große Bäume",
   "Die Art erreicht große Höhen; Fallbereich und Rettungswege sind entsprechend groß.",
   climbing="Das Rettungsseil muss von der höchsten Arbeitsposition bis zum Boden reichen. Verständigung über große Höhe per Funk sicherstellen.",
   felling="Fallbereich mindestens doppelte Baumlänge; oft ist stückweise Abtragung nötig.")
hz("heavy_limbs", "Schwere, weit ausladende Äste",
   "Lange, schwere Seitenäste mit großer Hebelwirkung.",
   rigging="Äste in Stücken abseilen und Pendelbewegungen einplanen.",
   pruning="Lange Hebel schrittweise einkürzen statt am Stamm abzusetzen.")

# ---- Species ----------------------------------------------------------------
# (German name, Latin name, group laub|nadel, native True/False, hazards, note, aliases)
S = []
def sp(de, la, group, native, hazards=(), note=None, aliases=()):
    S.append((de, la, group, native, list(hazards), note, list(aliases)))

L, N = "laub", "nadel"
# Native broadleaf
sp("Feld-Ahorn", "Acer campestre", L, True, ["sooty_bark"], "Rußrindenkrankheit kommt auch am Feld-Ahorn vor, seltener als am Berg-Ahorn.", ["Maßholder"])
sp("Spitz-Ahorn", "Acer platanoides", L, True, ["sooty_bark", "honeydew"], "Rußrindenkrankheit seltener als am Berg-Ahorn, aber möglich.")
sp("Berg-Ahorn", "Acer pseudoplatanus", L, True, ["sooty_bark", "honeydew"], "Hauptwirt der Rußrindenkrankheit – bei abplatzender Rinde und schwarzem Belag sofort Schutzmaßnahmen.")
sp("Schwarz-Erle", "Alnus glutinosa", L, True, ["brittle_wood", "rapid_decay"], "Phytophthora-Erlensterben: Teerflecken am Stammfuß, Kronen lichten aus.", ["Rot-Erle"])
sp("Grau-Erle", "Alnus incana", L, True, ["brittle_wood", "rapid_decay"])
sp("Hänge-Birke", "Betula pendula", L, True, ["rapid_decay"], "Abgestorbene Birken werden durch Birkenporling sehr schnell morsch.", ["Sand-Birke", "Weiß-Birke"])
sp("Moor-Birke", "Betula pubescens", L, True, ["rapid_decay"])
sp("Hainbuche", "Carpinus betulus", L, True, ["heavy_wood", "slippery_bark", "included_bark"], None, ["Weißbuche"])
sp("Rot-Buche", "Fagus sylvatica", L, True, ["beech_fungi", "slippery_bark", "heavy_wood"], "Nach plötzlicher Freistellung Rindenbrand möglich, danach rasche Holzfäule.", ["Buche"])
sp("Gemeine Esche", "Fraxinus excelsior", L, True, ["ash_dieback", "barber_chair"], None, ["Esche"])
sp("Holz-Apfel", "Malus sylvestris", L, True, [], None, ["Wild-Apfel"])
sp("Silber-Pappel", "Populus alba", L, True, ["brittle_wood", "summer_drop", "hollows"])
sp("Schwarz-Pappel", "Populus nigra", L, True, ["brittle_wood", "summer_drop", "barber_chair"])
sp("Zitter-Pappel", "Populus tremula", L, True, ["brittle_wood", "rapid_decay"], None, ["Espe", "Aspe"])
sp("Vogel-Kirsche", "Prunus avium", L, True, [], None, ["Wild-Kirsche", "Süß-Kirsche"])
sp("Gewöhnliche Traubenkirsche", "Prunus padus", L, True, ["toxic"], "Blätter, Rinde und Samen enthalten Blausäureglykoside.")
sp("Schlehe", "Prunus spinosa", L, True, ["thorns"], None, ["Schwarzdorn"])
sp("Wild-Birne", "Pyrus pyraster", L, True, ["thorns"])
sp("Stiel-Eiche", "Quercus robur", L, True, ["oak_processionary", "heavy_deadwood", "heavy_wood", "summer_drop"], None, ["Eiche", "Sommer-Eiche"])
sp("Trauben-Eiche", "Quercus petraea", L, True, ["oak_processionary", "heavy_deadwood", "heavy_wood"], None, ["Winter-Eiche"])
sp("Flaum-Eiche", "Quercus pubescens", L, True, ["oak_processionary", "heavy_wood"])
sp("Silber-Weide", "Salix alba", L, True, ["brittle_wood", "summer_drop", "hollows"], "Kopfweiden sind fast immer hohl; Austriebe am Kopf sind schwach verankert.")
sp("Bruch-Weide", "Salix fragilis", L, True, ["brittle_wood", "summer_drop", "hollows"], "Name ist Programm: Zweige und Äste brechen sehr leicht.", ["Knack-Weide"])
sp("Sal-Weide", "Salix caprea", L, True, ["brittle_wood", "rapid_decay"])
sp("Eberesche", "Sorbus aucuparia", L, True, [], None, ["Vogelbeere"])
sp("Echte Mehlbeere", "Sorbus aria", L, True, [])
sp("Elsbeere", "Sorbus torminalis", L, True, [])
sp("Speierling", "Sorbus domestica", L, True, [])
sp("Winter-Linde", "Tilia cordata", L, True, ["hollows", "included_bark", "honeydew"])
sp("Sommer-Linde", "Tilia platyphyllos", L, True, ["hollows", "included_bark", "honeydew"])
sp("Holländische Linde", "Tilia × europaea", L, True, ["hollows", "included_bark", "honeydew"], "Bildet viele Stammaustriebe (Stockausschläge), die den Stammfuß verdecken.", ["Kaiser-Linde"])
sp("Berg-Ulme", "Ulmus glabra", L, True, ["elm_disease"])
sp("Flatter-Ulme", "Ulmus laevis", L, True, ["elm_disease"])
sp("Feld-Ulme", "Ulmus minor", L, True, ["elm_disease"])
sp("Eingriffliger Weißdorn", "Crataegus monogyna", L, True, ["thorns"])
sp("Zweigriffliger Weißdorn", "Crataegus laevigata", L, True, ["thorns"])
sp("Rotdorn", "Crataegus laevigata 'Paul's Scarlet'", L, False, ["thorns"], "Gefüllt rot blühende Sorte des Weißdorns, häufiger Straßenbaum.")
sp("Europäische Stechpalme", "Ilex aquifolium", L, True, ["toxic", "thorns"], "Beeren und Blätter sind giftig, Blätter stechend.", ["Ilex"])
sp("Schwarzer Holunder", "Sambucus nigra", L, True, ["brittle_wood", "toxic"], "Rinde, Blätter, Samen und unreife Beeren sind roh giftig.")
sp("Gemeine Hasel", "Corylus avellana", L, True, [], None, ["Haselnuss"])
sp("Edelkastanie", "Castanea sativa", L, True, ["chestnut_blight", "hollows", "heavy_wood"], "Seit der Römerzeit eingebürgert.", ["Esskastanie", "Marone"])
sp("Walnuss", "Juglans regia", L, True, ["heavy_limbs"], "Seit der Römerzeit eingebürgert.", ["Echte Walnuss"])
sp("Spätblühende Traubenkirsche", "Prunus serotina", L, False, ["toxic"], "Invasiv. Blätter, Rinde und Samen enthalten Blausäureglykoside.", ["Amerikanische Traubenkirsche"])
# Native conifers
sp("Weiß-Tanne", "Abies alba", N, True, ["resin"], None, ["Tanne", "Edel-Tanne"])
sp("Gemeine Fichte", "Picea abies", N, True, ["shallow_roots", "bark_beetle", "conifer_root_rot", "resin"], "Häufig Wipfel- und Kronenbruch nach Trockenjahren.", ["Fichte", "Rot-Fichte", "Rottanne"])
sp("Wald-Kiefer", "Pinus sylvestris", N, True, ["brittle_wood", "conifer_root_rot", "resin"], "Äste sind spröde; Schneebruch häufig.", ["Kiefer", "Föhre"])
sp("Berg-Kiefer", "Pinus mugo", N, True, ["resin"], None, ["Latsche", "Latschenkiefer"])
sp("Zirbel-Kiefer", "Pinus cembra", N, True, ["resin"], None, ["Zirbe", "Arve"])
sp("Europäische Lärche", "Larix decidua", N, True, ["resin", "conifer_root_rot"], None, ["Lärche"])
sp("Europäische Eibe", "Taxus baccata", N, True, ["toxic"], "Nadeln, Holz, Rinde und Samen sind stark giftig (Taxine) – schon kleine Mengen können für Menschen und Tiere, besonders Pferde, tödlich sein. Nur der rote Samenmantel ist ungiftig. Sägestaub nicht einatmen.", ["Eibe"])
sp("Gemeiner Wacholder", "Juniperus communis", N, True, ["thorns"], None, ["Wacholder"])
# Non-native broadleaf
sp("Silber-Ahorn", "Acer saccharinum", L, False, ["brittle_wood", "included_bark", "summer_drop"], "Sehr bruchanfällig; neigt zu großen, schwachen Zwieseln.")
sp("Eschen-Ahorn", "Acer negundo", L, False, ["brittle_wood"], None, ["Eschenblättriger Ahorn"])
sp("Rot-Ahorn", "Acer rubrum", L, False, [])
sp("Zucker-Ahorn", "Acer saccharum", L, False, [])
sp("Fächer-Ahorn", "Acer palmatum", L, False, [], None, ["Japanischer Ahorn"])
sp("Gewöhnliche Rosskastanie", "Aesculus hippocastanum", L, False, ["summer_drop", "bleeding_canker", "hollows", "included_bark"], None, ["Rosskastanie", "Kastanie"])
sp("Rotblühende Rosskastanie", "Aesculus × carnea", L, False, ["bleeding_canker", "included_bark"])
sp("Götterbaum", "Ailanthus altissima", L, False, ["brittle_wood", "skin_sap"], "Invasiv. Pflanzensaft und Blütenstaub können Haut, Augen und Atemwege reizen.")
sp("Gewöhnliche Robinie", "Robinia pseudoacacia", L, False, ["toxic", "thorns", "heavy_wood"], "Rinde, Samen und Blätter sind giftig. Junge Triebe tragen kräftige Dornen.", ["Robinie", "Scheinakazie", "Akazie"])
sp("Amerikanische Gleditschie", "Gleditsia triacanthos", L, False, ["thorns"], "Wildform mit sehr langen, verzweigten Dornen am Stamm; Sorten wie 'Skyline' sind dornenlos.", ["Lederhülsenbaum", "Gleditschie"])
sp("Ahornblättrige Platane", "Platanus × hispanica", L, False, ["massaria", "irritant_hairs", "summer_drop"], None, ["Platane", "Gewöhnliche Platane"])
sp("Morgenländische Platane", "Platanus orientalis", L, False, ["massaria", "irritant_hairs"])
sp("Rot-Eiche", "Quercus rubra", L, False, ["heavy_wood", "oak_processionary"], "Eichenprozessionsspinner seltener als an heimischen Eichen.", ["Amerikanische Eiche"])
sp("Zerr-Eiche", "Quercus cerris", L, False, ["heavy_wood", "oak_processionary"])
sp("Sumpf-Eiche", "Quercus palustris", L, False, ["heavy_wood"])
sp("Blumen-Esche", "Fraxinus ornus", L, False, ["ash_dieback"], "Weniger anfällig für Eschentriebsterben als die Gemeine Esche.", ["Manna-Esche"])
sp("Rot-Esche", "Fraxinus pennsylvanica", L, False, ["ash_dieback"], None, ["Pennsylvanische Esche"])
sp("Amberbaum", "Liquidambar styraciflua", L, False, [])
sp("Tulpenbaum", "Liriodendron tulipifera", L, False, ["brittle_wood", "very_tall"])
sp("Ginkgo", "Ginkgo biloba", L, False, ["skin_sap"], "Fächerblattbaum (eigene Pflanzengruppe). Samenschale weiblicher Bäume ist hautreizend und riecht stark.", ["Fächerblattbaum"])
sp("Gewöhnlicher Trompetenbaum", "Catalpa bignonioides", L, False, ["brittle_wood"], None, ["Trompetenbaum"])
sp("Blauglockenbaum", "Paulownia tomentosa", L, False, ["brittle_wood"], "Sehr leichtes, weiches Holz; schnellwüchsig.", ["Kaiserbaum"])
sp("Japanischer Schnurbaum", "Styphnolobium japonicum", L, False, ["toxic"], "Samen und Hülsen sind giftig.", ["Sophora japonica", "Schnurbaum"])
sp("Gewöhnlicher Goldregen", "Laburnum anagyroides", L, False, ["toxic"], "Alle Teile, besonders die Samen, sind stark giftig (Cytisin).", ["Goldregen"])
sp("Tulpen-Magnolie", "Magnolia × soulangeana", L, False, ["brittle_wood"], None, ["Magnolie"])
sp("Weiße Maulbeere", "Morus alba", L, False, [])
sp("Schwarznuss", "Juglans nigra", L, False, ["heavy_limbs", "heavy_wood"], None, ["Schwarze Walnuss"])
sp("Kaukasische Flügelnuss", "Pterocarya fraxinifolia", L, False, ["brittle_wood"])
sp("Südlicher Zürgelbaum", "Celtis australis", L, False, [])
sp("Hopfenbuche", "Ostrya carpinifolia", L, False, ["heavy_wood"])
sp("Purpur-Erle", "Alnus × spaethii", L, False, ["brittle_wood"])
sp("Italienische Erle", "Alnus cordata", L, False, ["brittle_wood"], None, ["Herzblättrige Erle"])
sp("Silber-Linde", "Tilia tomentosa", L, False, ["hollows", "included_bark"])
sp("Krim-Linde", "Tilia × euchlora", L, False, ["included_bark", "honeydew"])
sp("Baum-Hasel", "Corylus colurna", L, False, [], None, ["Türkische Hasel"])
sp("Japanische Blütenkirsche", "Prunus serrulata", L, False, [], None, ["Zierkirsche"])
sp("Kirschpflaume", "Prunus cerasifera", L, False, ["thorns"], "Blutpflaume ist die rotlaubige Sorte.", ["Blutpflaume"])
sp("Kirschlorbeer", "Prunus laurocerasus", L, False, ["toxic"], "Blätter und Samen enthalten Blausäureglykoside; beim Hacken kann Blausäuregeruch entstehen.", ["Lorbeerkirsche"])
sp("Chinesische Wildbirne", "Pyrus calleryana", L, False, ["included_bark", "brittle_wood"], "Sorten wie 'Chanticleer' neigen zu steilen, schwachen Zwieseln, die aufreißen.", ["Stadtbirne"])
sp("Schwedische Mehlbeere", "Sorbus intermedia", L, False, [])
sp("Kulturapfel", "Malus domestica", L, False, [], None, ["Apfel", "Apfelbaum"])
sp("Kultur-Birne", "Pyrus communis", L, False, [], None, ["Birne", "Birnbaum"])
sp("Pflaume, Zwetschge", "Prunus domestica", L, False, ["brittle_wood"], None, ["Zwetschge", "Zwetsche", "Pflaume"])
sp("Sauer-Kirsche", "Prunus cerasus", L, False, [], None, ["Weichsel"])
sp("Quitte", "Cydonia oblonga", L, False, [])
sp("Kuchenbaum", "Cercidiphyllum japonicum", L, False, [], None, ["Katsurabaum"])
sp("Japanische Zelkove", "Zelkova serrata", L, False, ["included_bark"])
sp("Sibirische Ulme", "Ulmus pumila", L, False, ["brittle_wood"])
sp("Korkenzieher-Weide", "Salix matsudana 'Tortuosa'", L, False, ["brittle_wood"])
sp("Trauer-Weide", "Salix × sepulcralis", L, False, ["brittle_wood", "summer_drop", "hollows"], None, ["Hänge-Weide"])
sp("Hybrid-Pappel", "Populus × canadensis", L, False, ["brittle_wood", "summer_drop", "barber_chair"], "Oft große, schnell gewachsene Bäume mit weichem Holz.", ["Kanadische Pappel", "Bastard-Pappel"])
sp("Balsam-Pappel", "Populus balsamifera", L, False, ["brittle_wood", "summer_drop"])
sp("Säulen-Pappel", "Populus nigra 'Italica'", L, False, ["brittle_wood", "summer_drop"], None, ["Pyramiden-Pappel"])
sp("Himalaya-Birke", "Betula utilis", L, False, ["rapid_decay"])
sp("Schmalblättrige Ölweide", "Elaeagnus angustifolia", L, False, ["thorns"])
sp("Essigbaum", "Rhus typhina", L, False, ["skin_sap", "brittle_wood"], "Milchsaft reizt Haut und Augen.", ["Hirschkolbensumach"])
sp("Kornelkirsche", "Cornus mas", L, False, [])
sp("Kupfer-Felsenbirne", "Amelanchier lamarckii", L, False, [], None, ["Felsenbirne"])
sp("Judasbaum", "Cercis siliquastrum", L, False, [])
sp("Persisches Eisenholz", "Parrotia persica", L, False, [])
sp("Taschentuchbaum", "Davidia involucrata", L, False, [])
# Non-native conifers
sp("Douglasie", "Pseudotsuga menziesii", N, False, ["very_tall", "resin", "conifer_root_rot"], None, ["Douglas-Fichte", "Douglas-Tanne"])
sp("Stech-Fichte", "Picea pungens", N, False, ["thorns", "resin"], "Sehr spitze, stechende Nadeln.", ["Blau-Fichte", "Blaufichte"])
sp("Serbische Fichte", "Picea omorika", N, False, ["resin", "shallow_roots"], None, ["Omorika"])
sp("Sitka-Fichte", "Picea sitchensis", N, False, ["thorns", "resin", "shallow_roots"])
sp("Nordmann-Tanne", "Abies nordmanniana", N, False, ["resin"])
sp("Küsten-Tanne", "Abies grandis", N, False, ["very_tall", "brittle_wood", "conifer_root_rot"], "Wipfelbruch häufig.", ["Große Küsten-Tanne"])
sp("Kolorado-Tanne", "Abies concolor", N, False, ["resin"], None, ["Grau-Tanne"])
sp("Schwarz-Kiefer", "Pinus nigra", N, False, ["resin", "brittle_wood"], None, ["Österreichische Schwarzkiefer"])
sp("Weymouth-Kiefer", "Pinus strobus", N, False, ["brittle_wood", "resin"], "Blasenrost kann Stämme und Äste absterben lassen.", ["Strobe"])
sp("Tränen-Kiefer", "Pinus wallichiana", N, False, ["brittle_wood", "resin"])
sp("Japanische Lärche", "Larix kaempferi", N, False, ["resin"])
sp("Abendländischer Lebensbaum", "Thuja occidentalis", N, False, ["toxic", "skin_sap"], "Alle Teile giftig (Thujon); Kontakt kann Hautreizungen auslösen.", ["Thuja", "Lebensbaum"])
sp("Riesen-Lebensbaum", "Thuja plicata", N, False, ["toxic", "skin_sap"], "Alle Teile giftig (Thujon); Holzstaub kann Asthma auslösen.")
sp("Lawsons Scheinzypresse", "Chamaecyparis lawsoniana", N, False, ["skin_sap"], None, ["Scheinzypresse"])
sp("Leyland-Zypresse", "× Cuprocyparis leylandii", N, False, ["shallow_roots"], "Sehr schnellwüchsig; hohe, dichte Hecken werden oft kopflastig.", ["Bastardzypresse"])
sp("Riesen-Mammutbaum", "Sequoiadendron giganteum", N, False, ["very_tall"], "Häufig Blitzschäden im Kronenbereich.", ["Mammutbaum", "Wellingtonie"])
sp("Urweltmammutbaum", "Metasequoia glyptostroboides", N, False, ["very_tall"])
sp("Sumpfzypresse", "Taxodium distichum", N, False, [])
sp("Atlas-Zeder", "Cedrus atlantica", N, False, ["heavy_limbs", "summer_drop", "resin"], None, ["Zeder"])
sp("Libanon-Zeder", "Cedrus libani", N, False, ["heavy_limbs", "summer_drop", "resin"])
sp("Himalaya-Zeder", "Cedrus deodara", N, False, ["heavy_limbs", "resin"])
sp("Kanadische Hemlocktanne", "Tsuga canadensis", N, False, [], None, ["Hemlocktanne"])
sp("Chilenische Araukarie", "Araucaria araucana", N, False, ["thorns"], "Harte, sehr spitze Schuppenblätter.", ["Andentanne", "Affenschwanzbaum"])

def slug(la):
    s = unicodedata.normalize("NFKD", la).encode("ascii", "ignore").decode()
    s = s.lower().replace("×", "x")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

species = []
ids = set()
for de, la, group, native, hazards, note, aliases in S:
    i = slug(la)
    assert i not in ids, i
    ids.add(i)
    for h in hazards:
        assert h in H, (la, h)
    e = {"id": i, "de": de, "la": la, "group": group, "native": native, "hazards": hazards}
    if note: e["note"] = note
    if aliases: e["aliases"] = aliases
    species.append(e)

species.sort(key=lambda e: e["de"].lower())
out = {"version": "1.0", "hazards": list(H.values()), "species": species}
with open("src/form/definitions/tree-species-1.0.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(len(species), "species,", len(H), "hazards,", sum(1 for e in species if e["native"]), "native")

# ---- Human-readable review document -----------------------------------------
LABELS = {"general": "Allgemein", "climbing": "Beim Klettern", "pruning": "Bei der Kronenpflege",
          "felling": "Bei der Fällung", "rigging": "Beim Abseilen", "chipping": "Beim Hacken"}
lines = [
    "# Baumarten und typische Gefahren – Entwurf zur Durchsicht", "",
    f"Stand: Version {out['version']} · {len(species)} Baumarten · {len(H)} Gefahren",
    "",
    "Diese Datei wird aus `scripts/build-species.py` erzeugt. Korrekturen bitte direkt an mich, z. B. „Robinie: Hinweis X ergänzen“ oder „Gefahr Y Text ändern in …“.",
    "",
    "In der App erscheinen bei einer Baumart deren typische Gefahren. Hervorgehoben werden die Hinweise, die zu den geplanten Arbeiten passen (Klettern bei SKT, Kronenpflege, Fällung, Abseilen); „Allgemein“ und „Beim Hacken“ werden immer gezeigt.",
    "", "## Gefahrenkatalog", "",
]
for h in H.values():
    lines.append(f"### {h['title']} (`{h['id']}`)")
    lines.append("")
    lines.append(h["text"])
    lines.append("")
    for k in ["general", "climbing", "pruning", "felling", "rigging", "chipping"]:
        if k in h["advice"]:
            lines.append(f"- **{LABELS[k]}:** {h['advice'][k]}")
    users = [e["de"] for e in species if h["id"] in e["hazards"]]
    lines.append("")
    lines.append(f"Betrifft: {', '.join(users) if users else '–'}")
    lines.append("")
for title, native in [("Heimische und eingebürgerte Arten", True), ("Nicht heimische Arten (Stadt, Park, Forst, Garten)", False)]:
    lines += [f"## {title}", "", "| Deutsch | Botanisch | Typ | Typische Gefahren | Hinweis |", "|---|---|---|---|---|"]
    for e in species:
        if e["native"] != native:
            continue
        hz_titles = ", ".join(H[x]["title"] for x in e["hazards"]) or "–"
        alias = f" ({', '.join(e['aliases'])})" if e.get("aliases") else ""
        lines.append(f"| {e['de']}{alias} | *{e['la']}* | {'Nadel' if e['group']=='nadel' else 'Laub'} | {hz_titles} | {e.get('note','')} |")
    lines.append("")
with open("docs/BAUMARTEN.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("docs/BAUMARTEN.md written")
