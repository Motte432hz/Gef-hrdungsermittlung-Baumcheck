/**
 * Domain model. Every record carries organizationId and sync metadata from day one,
 * so that phase 2 (Supabase sync, multi-tenant) needs no data migration.
 */

export type ID = string
/** ISO 8601 timestamp, e.g. 2026-11-09T08:14:00.000Z */
export type ISODate = string

export type SyncState = 'local' | 'pending' | 'synced'

/** Binary file content (image, PDF). ArrayBuffer instead of Blob for IndexedDB compatibility. */
export interface StoredFile {
  type: string
  data: ArrayBuffer
}

export interface BaseRecord {
  id: ID
  organizationId: ID
  createdAt: ISODate
  updatedAt: ISODate
  /** Soft delete, so deletions can be synced. */
  deletedAt?: ISODate
  syncState: SyncState
  /** Cloud user who created the record (set by the server; absent for local-only records). */
  createdBy?: string
}

export type PdfLayout = 'standard' | 'compact' | 'table' | 'modern' | 'sidebar'

export interface Organization extends BaseRecord {
  name: string
  /** Short code for protocol numbers, e.g. "ZW". */
  numberPrefix: string
  logo?: StoredFile
  street?: string
  postalCode?: string
  city?: string
  phone?: string
  email?: string
  /** Brand colour (#rrggbb), e.g. detected from the logo. */
  brandColor?: string
  /** Optional second brand colour for accents. */
  brandColor2?: string
  /** Use the brand colour for the app's look on this organisation's devices. */
  brandInApp?: boolean
  /** Use the brand colour in the PDF. */
  brandInPdf?: boolean
  /** PDF layout variant. */
  pdfLayout?: PdfLayout
  /** Where finished protocols are sent (phase 2). */
  reportEmails: string[]
  taxNumber?: string
}

export const QUALIFICATIONS = ['as_baum_1', 'as_baum_2', 'skt_a', 'skt_b', 'skt_k'] as const
export type QualificationType = (typeof QUALIFICATIONS)[number]

export const QUALIFICATION_LABELS: Record<QualificationType, string> = {
  as_baum_1: 'AS-Baum I',
  as_baum_2: 'AS-Baum II',
  skt_a: 'SKT A',
  skt_b: 'SKT B',
  skt_k: 'SKT K',
}

export interface Qualification {
  type: QualificationType
  /** Expiry date of the certificate (YYYY-MM-DD), optional. */
  validUntil?: string
}

/** A piece of personal protective equipment or gear of a person. */
export interface GearItem {
  id: ID
  name: string
  /** Category key from the gear catalogue ('other' for free entries). */
  category: string
  /** Catalogue entry, if picked from the list. */
  catalogId?: string
  serialNumber?: string
  /** Next due inspection (YYYY-MM-DD), e.g. yearly check of fall protection PPE. */
  nextInspection?: string
  note?: string
}

export type PersonKind = 'employee' | 'subcontractor'

/** Saved person profile: own employee or subcontractor. */
/** Subcontractor company with its people (workers with kind "subcontractor"). */
export interface Company extends BaseRecord {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  notes?: string
}

export interface Worker extends BaseRecord {
  kind: PersonKind
  name: string
  /** Call name used on site, e.g. "Kalle". */
  nickname?: string
  /** Subcontractor company (kind "subcontractor"). */
  companyId?: ID
  /** Company name, kept in sync with the company record (display and team snapshots). */
  company?: string
  phone?: string
  qualifications: Qualification[]
  /** Personal PPE and gear. */
  gear?: GearItem[]
  /** Optional stored signature (PNG). */
  signature?: StoredFile
  active: boolean
}

export interface EquipmentPreset extends BaseRecord {
  name: string
  /** Form item id → preset answer, e.g. { "equip.ppeAvailable": "yes" } */
  answers: Record<string, string>
}

export interface CustomerSite {
  id: ID
  name: string
  street?: string
  postalCode?: string
  city?: string
  notes?: string
}

export interface Customer extends BaseRecord {
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  street?: string
  postalCode?: string
  city?: string
  sites: CustomerSite[]
}

/** draft = editable; completed = locked (PDF created); sent = locked and delivered. */
export type AssessmentStatus = 'draft' | 'completed' | 'sent'

export type AnswerValue = string | string[] | number | boolean | null

export interface Answer {
  value: AnswerValue
  /** Measure / reason, required for "no", "present" and certain choices. */
  note?: string
  /** Free text for an "other" option. */
  otherText?: string
  /** Pre-filled (equipment preset or copied from another tree), not yet confirmed on site. */
  prefilled?: boolean
  /** Where a prefilled answer came from, e.g. "Baum 1" (default: equipment preset). */
  prefilledFrom?: string
}

export type Answers = Record<string, Answer>

export const ROLES = [
  'supervisor',
  'climber',
  'ground',
  'safety_lookout',
  'platform_operator',
  'crane_signaller',
] as const
export type Role = (typeof ROLES)[number]

/** A person on site. Snapshot of the profile at the time of the assessment. */
export interface TeamMember {
  id: ID
  /** Profile reference, if the person was picked from saved profiles. */
  workerId?: ID
  kind: PersonKind | 'guest'
  name: string
  nickname?: string
  company?: string
  qualifications: Qualification[]
  gear?: GearItem[]
  roles: Role[]
}

export interface GeoPosition {
  lat: number
  lng: number
  /** Accuracy radius in metres. */
  accuracy?: number
  capturedAt: ISODate
}

export interface Assessment extends BaseRecord {
  status: AssessmentStatus
  /** Assigned on completion, never changed afterwards. */
  protocolNumber?: string
  /** Version of the form definition used, e.g. "1.0". */
  formVersion: string
  /** Correction chain: id of the original this version replaces. */
  previousVersionId?: ID
  version: number
  customerId?: ID
  siteId?: ID
  /** YYYY-MM-DD */
  date: string
  supervisorMemberId?: ID
  team: TeamMember[]
  position?: GeoPosition
  answers: Answers
  completedAt?: ISODate
  sentAt?: ISODate
  /** Hash over answers, signatures and form version (printed in PDF footer). */
  contentHash?: string
  /** SHA-256 of the final PDF file. */
  pdfHash?: string
  deviceInfo?: string
}

export interface Tree extends BaseRecord {
  assessmentId: ID
  /** Order within the assessment. */
  index: number
  answers: Answers
}

export type SignatureMethod = 'drawn' | 'stored'

export interface Signature extends BaseRecord {
  assessmentId: ID
  memberId: ID
  name: string
  roles: Role[]
  statement: 'supervisor' | 'member'
  method: SignatureMethod
  /** For stored signatures: who confirmed the use of the stored image. */
  confirmedBy?: string
  image: StoredFile
  signedAt: ISODate
  position?: GeoPosition
  /** Content hash of the assessment at signing time; a later change invalidates the signature. */
  contentHash: string
}

export type AttachmentKind =
  'tree_photo' | 'protocol_pdf' | 'order_confirmation' | 'invoice' | 'other'

export interface Attachment extends BaseRecord {
  assessmentId: ID
  treeId?: ID
  kind: AttachmentKind
  fileName: string
  file: StoredFile
  /** Photo before marks were drawn on it (only for marked photos). */
  original?: StoredFile
  capturedAt: ISODate
}

export type AuditAction =
  'created' | 'updated' | 'completed' | 'sent' | 'new_version' | 'deleted' | 'exported' | 'imported'

export interface AuditEntry {
  id: ID
  organizationId: ID
  at: ISODate
  action: AuditAction
  entity: 'assessment' | 'worker' | 'company' | 'customer' | 'organization' | 'equipment' | 'backup'
  entityId?: ID
  actor?: string
  details?: string
  syncState: SyncState
}

export interface MetaEntry {
  key: string
  value: unknown
}
