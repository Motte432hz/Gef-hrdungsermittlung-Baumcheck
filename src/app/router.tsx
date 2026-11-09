import { createBrowserRouter } from 'react-router'
import { AppLayout } from './AppLayout'
import { HomePage } from '../pages/HomePage'
import { ArchivePage } from '../pages/ArchivePage'
import { ProfilesPage } from '../pages/ProfilesPage'
import { SettingsPage } from '../pages/SettingsPage'
import { NotFoundPage } from '../pages/NotFoundPage'

export const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'archiv', element: <ArchivePage /> },
      { path: 'profile', element: <ProfilesPage /> },
      { path: 'einstellungen', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
