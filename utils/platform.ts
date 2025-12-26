'use client'

import { Capacitor } from '@capacitor/core'

/**
 * Check if the app is running in a native mobile environment
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Check if the app is running on iOS native app
 */
export function isNativeIOS(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

/**
 * Check if the app is running on Android native app
 */
export function isNativeAndroid(): boolean {
  return Capacitor.getPlatform() === 'android'
}

/**
 * Check if the app is running in web browser
 */
export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web'
}

/**
 * Get current platform
 */
export function getPlatform(): string {
  return Capacitor.getPlatform()
}
