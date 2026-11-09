import { Outlet } from 'react-router'
import { UpdatePrompt } from '../components/UpdatePrompt'
import { useThemeSync } from '../lib/theme'

/** Shared by the main app shell and the full-screen wizard. */
export function RootLayout() {
  useThemeSync()
  return (
    <>
      <UpdatePrompt />
      <Outlet />
    </>
  )
}
