import type { Answers, Assessment, Organization, PdfLayout, Tree } from '../domain/types'
import type { FormItem } from '../form/schema'
import { currentDefinition } from '../form/definition'
import { buildProtocolPdf } from './protocolPdf'
import type { FontBytes } from './writer'

/** Plausible demo answer (no warnings) – for the layout preview only. */
function demoAnswer(item: FormItem): Answers[string] | undefined {
  switch (item.type) {
    case 'checkpoint':
      return { value: 'yes' }
    case 'hazard':
      return { value: 'absent' }
    case 'single':
    case 'multi': {
      const o = item.options.find((x) => !x.warning && !x.requiresNote && !x.isOther)!
      return { value: item.type === 'multi' ? [o.value] : o.value }
    }
    default:
      return undefined
  }
}

function demoAnswers(scope: 'assessment' | 'tree'): Answers {
  const out: Answers = {}
  for (const step of currentDefinition.steps) {
    if ((step.repeat === 'tree') !== (scope === 'tree')) continue
    for (const item of step.sections.flatMap((s) => s.items)) {
      if (item.visibleIf) continue
      const a = demoAnswer(item)
      if (a) out[item.id] = a
    }
  }
  return out
}

/** Example protocol with the organisation's data and the chosen layout/colour. */
export async function buildSamplePdf(
  org: Organization,
  style: { layout: PdfLayout; brandColor?: string },
  fonts: FontBytes,
): Promise<Uint8Array> {
  const now = new Date().toISOString()
  const base = {
    organizationId: org.id,
    createdAt: now,
    updatedAt: now,
    syncState: 'local' as const,
  }
  const answers: Answers = {
    ...demoAnswers('assessment'),
    'site.address': { value: 'Musterstraße 1, 12345 Musterstadt' },
    'site.rescueAccess': { value: 'Einfahrt Hofseite, Treffpunkt am Tor' },
    'site.powerLines': {
      value: 'present',
      note: 'Beispiel: Abstand 1 m einhalten, Äste abseilen.',
    },
    'job.timeFrom': { value: '08:00' },
    'job.timeTo': { value: '15:00' },
  }
  const assessment: Assessment = {
    ...base,
    id: 'muster',
    status: 'completed',
    formVersion: currentDefinition.version,
    version: 1,
    date: now.slice(0, 10),
    team: [
      {
        id: 'm1',
        kind: 'employee',
        name: 'Erika Muster',
        qualifications: [],
        roles: ['supervisor', 'climber'],
      },
      { id: 'm2', kind: 'employee', name: 'Max Beispiel', qualifications: [], roles: ['ground'] },
    ],
    supervisorMemberId: 'm1',
    position: { lat: 50.110924, lng: 8.682127, accuracy: 5, capturedAt: now },
    answers,
  }
  const tree: Tree = {
    ...base,
    id: 't1',
    assessmentId: 'muster',
    index: 0,
    answers: {
      ...demoAnswers('tree'),
      'tree.species': { value: 'tilia-cordata' },
      'tree.height': { value: 18 },
      'tree.diameter': { value: 45 },
    },
  }
  return buildProtocolPdf(
    {
      definition: currentDefinition,
      organization: org,
      assessment,
      protocolNumber: `${org.numberPrefix || 'BC'}-MUSTER`,
      completedAt: now,
      trees: [tree],
      signatures: [],
      photos: [],
      contentHash: '0'.repeat(64),
      layout: style.layout,
      brandColor: style.brandColor,
    },
    fonts,
  )
}
