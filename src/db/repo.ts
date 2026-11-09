import type { BaumCheckDB } from './db'
import { LockedError } from './db'
import type {
  Answer,
  Assessment,
  AuditAction,
  AuditEntry,
  BaseRecord,
  ID,
  Organization,
  Tree,
} from '../domain/types'
import { counterKey, formatProtocolNumber } from '../domain/protocolNumber'

export const nowIso = () => new Date().toISOString()
export const newId = (): ID => crypto.randomUUID()

/** Today as YYYY-MM-DD in local time. */
export function todayLocal(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function baseRecord(organizationId: ID): BaseRecord {
  const ts = nowIso()
  // 'pending' = not yet uploaded; the phase 2 sync queue picks these up.
  return { id: newId(), organizationId, createdAt: ts, updatedAt: ts, syncState: 'pending' }
}

const META_CURRENT_ORG = 'currentOrganizationId'
export const META_DEVICE_CODE = 'deviceCode'

/** Phase 1: a single local organization, created on first start. */
export async function ensureOrganization(
  db: BaumCheckDB,
  defaults: Partial<Organization> = {},
): Promise<Organization> {
  return db.transaction('rw', db.organizations, db.meta, async () => {
    const current = await db.meta.get(META_CURRENT_ORG)
    if (current) {
      const org = await db.organizations.get(current.value as ID)
      if (org) return org
    }
    const base = baseRecord('')
    const org: Organization = {
      ...base,
      organizationId: base.id,
      name: '',
      numberPrefix: 'BC',
      reportEmails: [],
      ...defaults,
    }
    await db.organizations.add(org)
    await db.meta.put({ key: META_CURRENT_ORG, value: org.id })
    return org
  })
}

export async function getDeviceCode(db: BaumCheckDB): Promise<string | undefined> {
  const entry = await db.meta.get(META_DEVICE_CODE)
  return (entry?.value as string | undefined) || undefined
}

export async function audit(
  db: BaumCheckDB,
  organizationId: ID,
  action: AuditAction,
  entity: AuditEntry['entity'],
  entityId?: ID,
  details?: string,
): Promise<void> {
  await db.auditLog.add({
    id: newId(),
    organizationId,
    at: nowIso(),
    action,
    entity,
    entityId,
    details,
    syncState: 'pending',
  })
}

export async function createAssessment(
  db: BaumCheckDB,
  organizationId: ID,
  formVersion: string,
  init: Partial<Pick<Assessment, 'answers' | 'customerId' | 'siteId' | 'date'>> = {},
): Promise<Assessment> {
  const assessment: Assessment = {
    ...baseRecord(organizationId),
    status: 'draft',
    formVersion,
    version: 1,
    date: init.date ?? todayLocal(),
    team: [],
    answers: init.answers ?? {},
    customerId: init.customerId,
    siteId: init.siteId,
  }
  await db.transaction('rw', db.assessments, db.auditLog, async () => {
    await db.assessments.add(assessment)
    await audit(db, organizationId, 'created', 'assessment', assessment.id)
  })
  return assessment
}

async function requireDraft(db: BaumCheckDB, assessmentId: ID): Promise<Assessment> {
  const a = await db.assessments.get(assessmentId)
  if (!a) throw new Error(`Assessment ${assessmentId} not found`)
  if (a.status !== 'draft') throw new LockedError()
  return a
}

type EditableAssessmentFields = Partial<
  Omit<
    Assessment,
    | keyof BaseRecord
    | 'status'
    | 'protocolNumber'
    | 'completedAt'
    | 'sentAt'
    | 'contentHash'
    | 'pdfHash'
    | 'version'
    | 'previousVersionId'
  >
>

export async function updateAssessment(
  db: BaumCheckDB,
  id: ID,
  changes: EditableAssessmentFields,
): Promise<void> {
  await db.transaction('rw', db.assessments, async () => {
    await requireDraft(db, id)
    await db.assessments.update(id, { ...changes, updatedAt: nowIso(), syncState: 'pending' })
  })
}

export async function setAnswer(
  db: BaumCheckDB,
  assessmentId: ID,
  itemId: string,
  answer: Answer | undefined,
): Promise<void> {
  await db.transaction('rw', db.assessments, async () => {
    const a = await requireDraft(db, assessmentId)
    const answers = { ...a.answers }
    if (answer === undefined) delete answers[itemId]
    else answers[itemId] = answer
    await db.assessments.update(assessmentId, {
      answers,
      updatedAt: nowIso(),
      syncState: 'pending',
    })
  })
}

export async function addTree(db: BaumCheckDB, assessmentId: ID): Promise<Tree> {
  return db.transaction('rw', db.assessments, db.trees, async () => {
    const a = await requireDraft(db, assessmentId)
    const count = await db.trees.where('assessmentId').equals(assessmentId).count()
    const tree: Tree = { ...baseRecord(a.organizationId), assessmentId, index: count, answers: {} }
    await db.trees.add(tree)
    return tree
  })
}

export async function setTreeAnswer(
  db: BaumCheckDB,
  treeId: ID,
  itemId: string,
  answer: Answer | undefined,
): Promise<void> {
  await db.transaction('rw', db.assessments, db.trees, async () => {
    const tree = await db.trees.get(treeId)
    if (!tree) throw new Error(`Tree ${treeId} not found`)
    await requireDraft(db, tree.assessmentId)
    const answers = { ...tree.answers }
    if (answer === undefined) delete answers[itemId]
    else answers[itemId] = answer
    await db.trees.update(treeId, { answers, updatedAt: nowIso(), syncState: 'pending' })
  })
}

export async function removeTree(db: BaumCheckDB, treeId: ID): Promise<void> {
  await db.transaction('rw', db.assessments, db.trees, db.attachments, async () => {
    const tree = await db.trees.get(treeId)
    if (!tree) return
    await requireDraft(db, tree.assessmentId)
    await db.attachments.where('treeId').equals(treeId).delete()
    await db.trees.delete(treeId)
    // Keep indexes contiguous.
    const rest = await db.trees.where('assessmentId').equals(tree.assessmentId).sortBy('index')
    await Promise.all(
      rest.map((t, i) => (t.index === i ? null : db.trees.update(t.id, { index: i }))),
    )
  })
}

export async function getTrees(db: BaumCheckDB, assessmentId: ID): Promise<Tree[]> {
  return db.trees.where('assessmentId').equals(assessmentId).sortBy('index')
}

/** Allocates the next protocol number. Must run inside a transaction that includes db.meta. */
async function allocateProtocolNumber(
  db: BaumCheckDB,
  prefix: string,
  year: number,
  deviceCode?: string,
): Promise<string> {
  const key = counterKey(prefix, year, deviceCode)
  const current = ((await db.meta.get(key))?.value as number | undefined) ?? 0
  const seq = current + 1
  await db.meta.put({ key, value: seq })
  return formatProtocolNumber({ prefix, year, seq, deviceCode })
}

export interface CompletionData {
  contentHash: string
  pdfHash?: string
  deviceInfo?: string
}

/** Locks the assessment and assigns the final protocol number. */
export async function completeAssessment(
  db: BaumCheckDB,
  id: ID,
  data: CompletionData,
): Promise<Assessment> {
  return db.transaction(
    'rw',
    [db.assessments, db.organizations, db.meta, db.auditLog],
    async () => {
      const a = await requireDraft(db, id)
      const org = await db.organizations.get(a.organizationId)
      const deviceCode = await getDeviceCode(db)
      const year = Number(a.date.slice(0, 4))
      const protocolNumber = await allocateProtocolNumber(
        db,
        org?.numberPrefix ?? 'BC',
        year,
        deviceCode,
      )
      const ts = nowIso()
      const changes = {
        status: 'completed' as const,
        protocolNumber,
        completedAt: ts,
        updatedAt: ts,
        syncState: 'pending' as const,
        ...data,
      }
      await db.assessments.update(id, changes)
      await audit(db, a.organizationId, 'completed', 'assessment', id, protocolNumber)
      return { ...a, ...changes }
    },
  )
}

export async function markSent(db: BaumCheckDB, id: ID): Promise<void> {
  await db.transaction('rw', db.assessments, db.auditLog, async () => {
    const a = await db.assessments.get(id)
    if (!a || a.status === 'draft') throw new Error('Only completed protocols can be sent')
    const ts = nowIso()
    await db.assessments.update(id, { status: 'sent', sentAt: ts, updatedAt: ts })
    await audit(db, a.organizationId, 'sent', 'assessment', id)
  })
}

/**
 * Correction of a completed protocol: creates a new draft that references the original.
 * Answers, team, trees and tree photos are copied; signatures are not (everyone signs again).
 */
export async function createNewVersion(db: BaumCheckDB, id: ID): Promise<Assessment> {
  return db.transaction('rw', db.assessments, db.trees, db.attachments, db.auditLog, async () => {
    const original = await db.assessments.get(id)
    if (!original) throw new Error(`Assessment ${id} not found`)
    if (original.status === 'draft') throw new Error('A draft can be edited directly')
    const base = baseRecord(original.organizationId)
    const copy: Assessment = {
      ...base,
      status: 'draft',
      formVersion: original.formVersion,
      version: original.version + 1,
      previousVersionId: original.id,
      customerId: original.customerId,
      siteId: original.siteId,
      date: original.date,
      supervisorMemberId: original.supervisorMemberId,
      team: structuredClone(original.team),
      position: original.position,
      answers: structuredClone(original.answers),
    }
    await db.assessments.add(copy)
    const trees = await getTrees(db, id)
    for (const t of trees) {
      const treeCopy: Tree = {
        ...baseRecord(original.organizationId),
        assessmentId: copy.id,
        index: t.index,
        answers: structuredClone(t.answers),
      }
      await db.trees.add(treeCopy)
      // Tree photos belong to the content and are carried over; order/invoice scans stay with the original.
      const photos = await db.attachments.where('treeId').equals(t.id).toArray()
      for (const photo of photos) {
        await db.attachments.add({
          ...photo,
          ...baseRecord(original.organizationId),
          assessmentId: copy.id,
          treeId: treeCopy.id,
        })
      }
    }
    await audit(db, original.organizationId, 'new_version', 'assessment', copy.id, original.id)
    return copy
  })
}
