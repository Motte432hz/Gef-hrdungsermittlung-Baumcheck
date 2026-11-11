import { Notice } from '../wizard/inputs/Notice'

/** Shown above forms this device may only look at (cloud rights). */
export function ReadOnlyNotice({ text }: { text: string }) {
  return <Notice level="info">{text}</Notice>
}
