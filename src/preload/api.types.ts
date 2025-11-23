import * as theme from './theme'
import * as settings from './settings'
import * as devices from './devices'
import * as exportApi from './export'
import * as system from './system'

export type Api = typeof theme & typeof settings & typeof devices & typeof exportApi & typeof system
