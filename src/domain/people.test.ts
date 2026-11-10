import { describe, expect, it } from 'vitest'
import { personLabel } from './people'

describe('personLabel', () => {
  it('adds the call name in German quotes', () => {
    expect(personLabel({ name: 'Karl Kletter', nickname: 'Kalle' })).toBe('Karl Kletter „Kalle“')
  })
  it('only the name without (or with an identical) call name', () => {
    expect(personLabel({ name: 'Anna Ast' })).toBe('Anna Ast')
    expect(personLabel({ name: 'Anna Ast', nickname: '  ' })).toBe('Anna Ast')
    expect(personLabel({ name: 'Anna Ast', nickname: 'Anna Ast' })).toBe('Anna Ast')
  })
})
