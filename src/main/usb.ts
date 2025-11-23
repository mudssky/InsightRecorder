import { BrowserWindow } from 'electron'
import usbDetect from 'usb-detection'
import log from 'electron-log'

export function initUsbMonitoring(): void {
  try {
    usbDetect.startMonitoring()
  } catch (e) {
    log.warn('usb-detection startMonitoring failed', e)
  }
  try {
    usbDetect.on('add', () => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('device:changed', { action: 'added', ts: Date.now() })
    })
    usbDetect.on('remove', () => {
      const win = BrowserWindow.getAllWindows()[0]
      win?.webContents.send('device:changed', { action: 'removed', ts: Date.now() })
    })
  } catch (e) {
    log.warn('usb-detection events bind failed', e)
  }
}

export function stopUsbMonitoring(): void {
  try {
    usbDetect.stopMonitoring()
  } catch (e) {
    log.warn('usb-detection stopMonitoring failed', e)
  }
}
