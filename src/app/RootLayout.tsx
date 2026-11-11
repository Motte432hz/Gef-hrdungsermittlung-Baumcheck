import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { db } from '../db/db'
import { startAutoSync } from '../cloud/syncManager'
import { UpdatePrompt } from '../components/UpdatePrompt'
import { useThemeSync } from '../lib/theme'
import { useBranding } from './useBranding'

/** Shared by the main app shell and the full-screen wizard. */
export function RootLayout() {
  useThemeSync()
  useBranding()
  useEffect(() => startAutoSync(db), [])
  return (
    <>
      <UpdatePrompt />
      <Outlet />
    </>
  )
}
