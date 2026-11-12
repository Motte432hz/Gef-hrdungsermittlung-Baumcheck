import type { BaumCheckDB } from './db'
import { LockedError } from './db'
import type {
  Signature,
  Attachment,
  StoredFile,
  Answer,
  Answers,
  GeoPosition,
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

export const META_CURRENT_ORG = 'currentOrganizationId'
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

/** Changes of several answers at once; `undefined` removes an answer. */
export type AnswerChanges = Record<string, Answer | undefined>

function applyChanges(answers: Record<string, Answer>, changes: AnswerChanges) {
  const out = { ...answers }
  for (const [id, a] of Object.entries(changes)) {
    if (a === undefined) delete out[id]
    else out[id] = a
  }
  return out
}

export async function setAnswer(
  db: BaumCheckDB,
  assessmentId: ID,
  itemId: string,
  answer: Answer | undefined,
): Promise<void> {
  await setAnswers(db, assessmentId, { [itemId]: answer })
}

/** Writes several answers in one transaction (e.g. a gate plus the answers it clears). */
export async function setAnswers(
  db: BaumCheckDB,
  assessmentId: ID,
  changes: AnswerChanges,
): Promise<void> {
  await db.transaction('rw', db.assessments, async () => {
    const a = await requireDraft(db, assessmentId)
    await db.assessments.update(assessmentId, {
      answers: applyChanges(a.answers, changes),
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

/** Position of a tree (taken at the trunk); undefined removes it. */
export async function setTreePosition(
  db: BaumCheckDB,
  treeId: ID,
  position: GeoPosition | undefined,
): Promise<void> {
  await db.transaction('rw', db.assessments, db.trees, async () => {
    const tree = await db.trees.get(treeId)
    if (!tree) throw new Error(`Tree ${treeId} not found`)
    await requireDraft(db, tree.assessmentId)
    await db.trees.update(treeId, { position, updatedAt: nowIso(), syncState: 'pending' })
  })
}

/** Basic data of a tree that stays the same from visit to visit. */
export const TREE_BASIC_IDS = [
  'tree.number',
  'tree.species',
  'tree.height',
  'tree.diameter',
  'tree.growthForm',
] as const

/**
 * The same tree as in an earlier assessment: basic data and position are taken over, the
 * assessment is done anew (the earlier findings are shown for comparison).
 */
export async function addTreeFromPrevious(
  db: BaumCheckDB,
  assessmentId: ID,
  earlier: Tree,
): Promise<Tree> {
  const previous = (await db.trees.get(earlier.id)) ?? earlier
  const tree = await addTree(db, assessmentId)
  const answers: Answers = {}
  for (const id of TREE_BASIC_IDS)
    if (previous.answers[id]) answers[id] = structuredClone(previous.answers[id]!)
  const changes = {
    answers,
    position: previous.position ? structuredClone(previous.position) : undefined,
    previousTreeId: previous.id,
  }
  await db.trees.update(tree.id, changes)
  return { ...tree, ...changes }
}

export async function setTreeAnswer(
  db: BaumCheckDB,
  treeId: ID,
  itemId: string,
  answer: Answer | undefined,
): Promise<void> {
  await setTreeAnswers(db, treeId, { [itemId]: answer })
}

export async function setTreeAnswers(
  db: BaumCheckDB,
  treeId: ID,
  changes: AnswerChanges,
): Promise<void> {
  await db.transaction('rw', db.assessments, db.trees, async () => {
    const tree = await db.trees.get(treeId)
    if (!tree) throw new Error(`Tree ${treeId} not found`)
    await requireDraft(db, tree.assessmentId)
    await db.trees.update(treeId, {
      answers: applyChanges(tree.answers, changes),
      updatedAt: nowIso(),
      syncState: 'pending',
    })
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

/**
 * The number the assessment will get on completion (nothing is reserved). The PDF is built
 * with it before completing; completeAssessment verifies it is still the next number.
 */
export async function peekProtocolNumber(db: BaumCheckDB, id: ID): Promise<string> {
  const a = await requireDraft(db, id)
  const org = await db.organizations.get(a.organizationId)
  const deviceCode = await getDeviceCode(db)
  const prefix = org?.numberPrefix ?? 'BC'
  const year = Number(a.date.slice(0, 4))
  const current =
    ((await db.meta.get(counterKey(prefix, year, deviceCode)))?.value as number | undefined) ?? 0
  return formatProtocolNumber({ prefix, year, seq: current + 1, deviceCode })
}

export class NumberConflictError extends Error {
  constructor() {
    super('Protocol number was taken in the meantime')
    this.name = 'NumberConflictError'
  }
}

export interface CompletionData {
  contentHash: string
  pdfHash?: string
  deviceInfo?: string
  /** Number printed in the PDF; must still be the next free number. */
  expectedNumber?: string
  completedAt?: string
  /** The final PDF; stored as attachment 'protocol_pdf'. */
  pdf?: StoredFile
}

/** Locks the assessment, assigns the final protocol number and stores the PDF – atomically. */
export async function completeAssessment(
  db: BaumCheckDB,
  id: ID,
  data: CompletionData,
): Promise<Assessment> {
  return db.transaction(
    'rw',
    [db.assessments, db.organizations, db.meta, db.auditLog, db.attachments],
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
      if (data.expectedNumber && data.expectedNumber !== protocolNumber)
        throw new NumberConflictError()
      const ts = data.completedAt ?? nowIso()
      const changes = {
        status: 'completed' as const,
        protocolNumber,
        completedAt: ts,
        updatedAt: ts,
        syncState: 'pending' as const,
        contentHash: data.contentHash,
        pdfHash: data.pdfHash,
        deviceInfo: data.deviceInfo,
      }
      await db.assessments.update(id, changes)
      if (data.pdf) {
        await db.attachments.add({
          ...baseRecord(a.organizationId),
          assessmentId: id,
          kind: 'protocol_pdf',
          fileName: `Gefaehrdungsermittlung_${protocolNumber}.pdf`,
          file: data.pdf,
          capturedAt: ts,
        })
      }
      await audit(db, a.organizationId, 'completed', 'assessment', id, protocolNumber)
      return { ...a, ...changes }
    },
  )
}

export async function getProtocolPdf(
  db: BaumCheckDB,
  assessmentId: ID,
): Promise<Attachment | undefined> {
  const list = await db.attachments.where('assessmentId').equals(assessmentId).toArray()
  return list.find((x) => x.kind === 'protocol_pdf')
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

/** Deletes a draft with its trees, signatures and attachments. Completed protocols cannot be deleted. */
export async function deleteDraft(db: BaumCheckDB, id: ID): Promise<void> {
  await db.transaction(
    'rw',
    [db.assessments, db.trees, db.signatures, db.attachments, db.auditLog],
    async () => {
      const a = await requireDraft(db, id)
      await db.trees.where('assessmentId').equals(id).delete()
      await db.signatures.where('assessmentId').equals(id).delete()
      await db.attachments.where('assessmentId').equals(id).delete()
      await db.assessments.delete(id)
      await audit(db, a.organizationId, 'deleted', 'assessment', id)
    },
  )
}

/** Confirms all prefilled answers (e.g. after checking the equipment on site). */
export async function confirmPrefilled(db: BaumCheckDB, assessmentId: ID, itemIds: string[]) {
  await db.transaction('rw', db.assessments, async () => {
    const a = await requireDraft(db, assessmentId)
    const answers = { ...a.answers }
    for (const id of itemIds) {
      const ans = answers[id]
      if (ans?.prefilled)
        answers[id] = { value: ans.value, note: ans.note, otherText: ans.otherText }
    }
    await db.assessments.update(assessmentId, {
      answers,
      updatedAt: nowIso(),
      syncState: 'pending',
    })
  })
}

/** Adds a photo to a tree of a draft. */
export async function addTreePhoto(
  db: BaumCheckDB,
  treeId: ID,
  file: StoredFile,
  fileName: string,
  capturedAt = nowIso(),
): Promise<Attachment> {
  return db.transaction('rw', db.assessments, db.trees, db.attachments, async () => {
    const tree = await db.trees.get(treeId)
    if (!tree) throw new Error(`Tree ${treeId} not found`)
    await requireDraft(db, tree.assessmentId)
    const att: Attachment = {
      ...baseRecord(tree.organizationId),
      assessmentId: tree.assessmentId,
      treeId,
      kind: 'tree_photo',
      fileName,
      file,
      capturedAt,
    }
    await db.attachments.add(att)
    return att
  })
}

/** Removes an attachment of a draft. */
export async function removeAttachment(db: BaumCheckDB, id: ID): Promise<void> {
  await db.transaction('rw', db.assessments, db.attachments, async () => {
    const att = await db.attachments.get(id)
    if (!att) return
    await requireDraft(db, att.assessmentId)
    await db.attachments.delete(id)
  })
}

/** Saves a marked version of a photo; the unmarked original is kept the first time. */
export async function markPhoto(db: BaumCheckDB, id: ID, marked: StoredFile): Promise<void> {
  await db.transaction('rw', db.assessments, db.attachments, async () => {
    const att = await db.attachments.get(id)
    if (!att) throw new Error(`Attachment ${id} not found`)
    await requireDraft(db, att.assessmentId)
    await db.attachments.update(id, {
      original: att.original ?? att.file,
      file: marked,
      updatedAt: nowIso(),
      syncState: 'pending',
    })
  })
}

/** Removes all marks: the original photo is used again. */
export async function restoreOriginalPhoto(db: BaumCheckDB, id: ID): Promise<void> {
  await db.transaction('rw', db.assessments, db.attachments, async () => {
    const att = await db.attachments.get(id)
    if (!att?.original) return
    await requireDraft(db, att.assessmentId)
    await db.attachments.update(id, {
      file: att.original,
      original: undefined,
      updatedAt: nowIso(),
      syncState: 'pending',
    })
  })
}

/** Documents that belong to a job (also after completion): not part of the signed content. */
export const DOCUMENT_KINDS = ['order_confirmation', 'invoice', 'other'] as const
export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

export async function addDocument(
  db: BaumCheckDB,
  assessmentId: ID,
  kind: DocumentKind,
  file: StoredFile,
  fileName: string,
): Promise<Attachment> {
  const a = await db.assessments.get(assessmentId)
  if (!a) throw new Error(`Assessment ${assessmentId} not found`)
  const att: Attachment = {
    ...baseRecord(a.organizationId),
    assessmentId,
    kind,
    fileName,
    file,
    capturedAt: nowIso(),
  }
  await db.attachments.add(att)
  await audit(db, a.organizationId, 'updated', 'assessment', assessmentId, `Dokument: ${fileName}`)
  return att
}

export async function getDocuments(db: BaumCheckDB, assessmentId: ID): Promise<Attachment[]> {
  const list = await db.attachments.where('assessmentId').equals(assessmentId).toArray()
  return list
    .filter((x) => (DOCUMENT_KINDS as readonly string[]).includes(x.kind))
    .sort((x, y) => x.capturedAt.localeCompare(y.capturedAt))
}

/** Removes a document (never photos or the protocol PDF). */
export async function removeDocument(db: BaumCheckDB, id: ID): Promise<void> {
  const att = await db.attachments.get(id)
  if (!att || !(DOCUMENT_KINDS as readonly string[]).includes(att.kind)) return
  await db.attachments.delete(id)
}

export async function getTreePhotos(db: BaumCheckDB, treeId: ID): Promise<Attachment[]> {
  const list = await db.attachments.where('treeId').equals(treeId).toArray()
  return list
    .filter((a) => a.kind === 'tree_photo')
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
}

export type SignatureInput = Omit<Signature, keyof BaseRecord | 'assessmentId'>

/** Stores a signature for a draft (several per member are allowed; the newest counts). */
export async function addSignature(
  db: BaumCheckDB,
  assessmentId: ID,
  input: SignatureInput,
): Promise<Signature> {
  return db.transaction('rw', db.assessments, db.signatures, async () => {
    const a = await requireDraft(db, assessmentId)
    const sig: Signature = { ...baseRecord(a.organizationId), assessmentId, ...input }
    await db.signatures.add(sig)
    return sig
  })
}

/** Removes all signatures of a member for a statement (re-sign). */
export async function removeSignatures(
  db: BaumCheckDB,
  assessmentId: ID,
  memberId: ID,
  statement: Signature['statement'],
): Promise<void> {
  await db.transaction('rw', db.assessments, db.signatures, async () => {
    await requireDraft(db, assessmentId)
    const list = await db.signatures.where('assessmentId').equals(assessmentId).toArray()
    await db.signatures.bulkDelete(
      list.filter((x) => x.memberId === memberId && x.statement === statement).map((x) => x.id),
    )
  })
}

export async function getSignatures(db: BaumCheckDB, assessmentId: ID): Promise<Signature[]> {
  return db.signatures.where('assessmentId').equals(assessmentId).toArray()
}
