import {
  createRouter,
  createRootRoute,
  createRoute,
  createHashHistory
} from '@tanstack/react-router'
import Root from './routes/Root'
import Home from './routes/Home'
import Library from './routes/Library'
import Settings from './routes/Settings'
import Devices from './routes/Devices'
import DeviceDetail from './routes/DeviceDetail'

const rootRoute = createRootRoute({ component: Root })
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home })
const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/library',
  component: Library
})
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings
})
const devicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/devices',
  component: Devices
})
const deviceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/devices/$id',
  component: DeviceDetail
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  libraryRoute,
  settingsRoute,
  devicesRoute,
  deviceDetailRoute
])

export const router = createRouter({ routeTree, history: createHashHistory() })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
