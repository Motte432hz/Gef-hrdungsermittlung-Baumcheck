import { Outlet } from 'react-router'
import { UpdatePrompt } from '../components/UpdatePrompt'
import { useThemeSync } from '../lib/theme'
import { useBranding } from './useBranding'

/** Shared by the main app shell and the full-screen wizard. */
export function RootLayout() {
  useThemeSync()
  useBranding()
  return (
    <>
      <UpdatePrompt />
      <Outlet />
    </>
  )
}
