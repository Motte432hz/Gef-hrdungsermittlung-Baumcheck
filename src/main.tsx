import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { db } from './db/db'
import { ensureOrganization } from './db/repo'
import { requestPersistentStorage } from './lib/storage'
import { StartupError } from './app/StartupError'
import './index.css'

// Ask the browser not to evict our local data (important on iOS Safari).
void requestPersistentStorage()

const root = createRoot(document.getElementById('root')!)

ensureOrganization(db)
  .then(() =>
    root.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>,
    ),
  )
  .catch((error: unknown) => {
    console.error(error)
    root.render(<StartupError />)
  })
