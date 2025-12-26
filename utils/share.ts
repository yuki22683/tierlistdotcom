'use client'

import { Share } from '@capacitor/share'
import { isNativeApp } from './platform'

export interface ShareOptions {
  title: string
  text: string
  url: string
}

/**
 * ネイティブアプリではネイティブシェア、Webでは既存の処理を使用
 */
export async function shareContent(options: ShareOptions): Promise<boolean> {
  try {
    // ネイティブアプリの場合
    if (isNativeApp()) {
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: 'シェア',
      })
      return true
    }

    // Web版の場合 - Web Share APIを試す
    if (navigator.share) {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      })
      return true
    }

    // Web Share APIが使えない場合はfalseを返す（既存の処理にフォールバック）
    return false
  } catch (error) {
    console.error('Share failed:', error)
    return false
  }
}

/**
 * シェア機能が利用可能かチェック
 */
export function canShare(): boolean {
  return isNativeApp() || !!navigator.share
}
