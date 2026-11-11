import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from './AppLayout'
import { RootLayout } from './RootLayout'
import { WizardPage } from '../wizard/WizardPage'
import { HomePage } from '../pages/HomePage'
import { ArchivePage } from '../pages/ArchivePage'
import { ProfilesPage } from '../pages/ProfilesPage'
import { SettingsPage } from '../pages/SettingsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { CompanyPage } from '../pages/profiles/CompanyPage'
import { TeamPage } from '../pages/profiles/TeamPage'
import { PersonRoute } from '../pages/profiles/PersonPage'
import { SubcompanyRoute } from '../pages/profiles/SubcompanyPage'
import { OldPersonRedirect } from './OldPersonRedirect'
import { CustomerListPage } from '../pages/profiles/CustomerListPage'
import { CustomerEditPage } from '../pages/profiles/CustomerEditPage'
import { EquipmentPage } from '../pages/profiles/EquipmentPage'
import { ProtocolPage } from '../pages/ProtocolPage'

export const routes = [
  {
    element: <RootLayout />,
    children: [
      { path: '/einsatz/:id/:stepId?', element: <WizardPage /> },
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'archiv', element: <ArchivePage /> },
          { path: 'protokoll/:id', element: <ProtocolPage /> },
          { path: 'profile', element: <ProfilesPage /> },
          { path: 'profile/firma', element: <CompanyPage /> },
          { path: 'profile/team', element: <TeamPage /> },
          { path: 'profile/team/person/:id', element: <PersonRoute /> },
          { path: 'profile/team/firma/:id', element: <SubcompanyRoute /> },
          // Old addresses (bookmarks, home screen) lead to the new pages.
          { path: 'profile/mitarbeiter', element: <Navigate to="/profile/team" replace /> },
          { path: 'profile/subunternehmer', element: <Navigate to="/profile/team" replace /> },
          { path: 'profile/mitarbeiter/:id', element: <OldPersonRedirect kind="employee" /> },
          { path: 'profile/subunternehmer/:id', element: <OldPersonRedirect kind="sub" /> },
          { path: 'profile/kunden', element: <CustomerListPage /> },
          { path: 'profile/kunden/:id', element: <CustomerEditPage /> },
          { path: 'profile/ausruestung', element: <EquipmentPage /> },
          { path: 'einstellungen', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
