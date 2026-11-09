import { createBrowserRouter } from 'react-router'
import { AppLayout } from './AppLayout'
import { RootLayout } from './RootLayout'
import { WizardPage } from '../wizard/WizardPage'
import { HomePage } from '../pages/HomePage'
import { ArchivePage } from '../pages/ArchivePage'
import { ProfilesPage } from '../pages/ProfilesPage'
import { SettingsPage } from '../pages/SettingsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { CompanyPage } from '../pages/profiles/CompanyPage'
import { WorkerListPage } from '../pages/profiles/WorkerListPage'
import { WorkerEditPage } from '../pages/profiles/WorkerEditPage'
import { CustomerListPage } from '../pages/profiles/CustomerListPage'
import { CustomerEditPage } from '../pages/profiles/CustomerEditPage'
import { EquipmentPage } from '../pages/profiles/EquipmentPage'

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
          { path: 'profile', element: <ProfilesPage /> },
          { path: 'profile/firma', element: <CompanyPage /> },
          { path: 'profile/mitarbeiter', element: <WorkerListPage kind="employee" /> },
          {
            path: 'profile/mitarbeiter/neu',
            element: <WorkerEditPage key="new-employee" kind="employee" />,
          },
          { path: 'profile/mitarbeiter/:id', element: <WorkerEditPage kind="employee" /> },
          { path: 'profile/subunternehmer', element: <WorkerListPage kind="subcontractor" /> },
          {
            path: 'profile/subunternehmer/neu',
            element: <WorkerEditPage key="new-subcontractor" kind="subcontractor" />,
          },
          { path: 'profile/subunternehmer/:id', element: <WorkerEditPage kind="subcontractor" /> },
          { path: 'profile/kunden', element: <CustomerListPage /> },
          { path: 'profile/kunden/neu', element: <CustomerEditPage key="new-customer" /> },
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
