import { describe, expect, it } from 'vitest'
import { rightsFor } from './useCloudRights'

const link = (role: 'owner' | 'admin' | 'member') => ({
  organizationId: 'o',
  userId: 'me',
  role,
  workerId: 'my-profile',
})

describe('rightsFor', () => {
  it('without the cloud the device may do everything', () => {
    const r = rightsFor(undefined)
    expect([r.cloud, r.isAdmin, r.isOwner, r.canDelete({ createdBy: 'x' }, 'record')]).toEqual([
      false,
      true,
      true,
      true,
    ])
  })

  it('members: change own records and own profile, delete own drafts only', () => {
    const r = rightsFor(link('member'))
    expect(r.isAdmin).toBe(false)
    expect(r.canEdit({ createdBy: 'me' })).toBe(true)
    expect(r.canEdit({ createdBy: 'other' })).toBe(false)
    expect(r.canEdit({ id: 'my-profile', createdBy: 'other' })).toBe(true)
    expect(r.canEdit({})).toBe(true) // not yet synced = created here
    expect(r.canDelete({ createdBy: 'me' }, 'draft')).toBe(true)
    expect(r.canDelete({ createdBy: 'other' }, 'draft')).toBe(false)
    expect(r.canDelete({ createdBy: 'me' }, 'record')).toBe(false)
    expect(r.canDelete({}, 'record')).toBe(true)
  })

  it('admins change everything but do not delete; the owner deletes', () => {
    const admin = rightsFor(link('admin'))
    expect([
      admin.canEdit({ createdBy: 'other' }),
      admin.canDelete({ createdBy: 'other' }, 'record'),
    ]).toEqual([true, false])
    const owner = rightsFor(link('owner'))
    expect(owner.canDelete({ createdBy: 'other' }, 'record')).toBe(true)
  })
})
