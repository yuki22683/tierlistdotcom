'use client'

import { useState, useRef, useEffect } from 'react'
import { Check } from 'lucide-react'

interface ImageCropperProps {
  imageFile: File
  onCropComplete: (croppedBlob: Blob) => void
  onCancel: () => void
}

export default function ImageCropper({ imageFile, onCropComplete, onCancel }: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 0 })
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isProcessing, setIsProcessing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(imageFile)
    setImageSrc(url)

    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })

      // 初期クロップエリアを中央に設定（正方形）
      const minSide = Math.min(img.width, img.height)
      setCropArea({
        x: (img.width - minSide) / 2,
        y: (img.height - minSide) / 2,
        size: minSide
      })
    }
    img.src = url

    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  // モーダルが開いている間、背景のスクロールを無効化
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const getDisplayScale = () => {
    if (!imageRef.current) return 1
    return imageRef.current.width / imageSize.width
  }

  const handlePointerDown = (corner: string, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(corner)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!dragging) return
    e.preventDefault()

    const scale = getDisplayScale()
    const dx = (e.clientX - dragStart.x) / scale
    const dy = (e.clientY - dragStart.y) / scale

    setCropArea(prev => {
      let newX = prev.x
      let newY = prev.y
      let newSize = prev.size

      // エリア全体の移動
      if (dragging === 'move') {
        newX = Math.max(0, Math.min(imageSize.width - prev.size, prev.x + dx))
        newY = Math.max(0, Math.min(imageSize.height - prev.size, prev.y + dy))
      }
      // 各頂点のドラッグ処理（正方形を維持、画像の枠外に出ない）
      else if (dragging === 'top-left') {
        // 左上の頂点を動かす：右下は固定
        const rightEdge = prev.x + prev.size
        const bottomEdge = prev.y + prev.size

        // マウスの移動量の小さい方を採用（正方形を維持）
        const delta = Math.min(dx, dy)

        // 新しい位置を計算
        let tentativeX = prev.x + delta
        let tentativeY = prev.y + delta

        // 境界チェック：左と上が0未満にならないように
        tentativeX = Math.max(0, tentativeX)
        tentativeY = Math.max(0, tentativeY)

        // 最小サイズ50を確保
        tentativeX = Math.min(tentativeX, rightEdge - 50)
        tentativeY = Math.min(tentativeY, bottomEdge - 50)

        // 正方形を維持するため、制限が厳しい方に合わせる
        const maxDeltaX = rightEdge - tentativeX
        const maxDeltaY = bottomEdge - tentativeY
        newSize = Math.min(maxDeltaX, maxDeltaY)

        newX = rightEdge - newSize
        newY = bottomEdge - newSize
      }
      else if (dragging === 'top-right') {
        // 右上の頂点を動かす：左下は固定
        const leftEdge = prev.x
        const bottomEdge = prev.y + prev.size

        // 右方向と上方向の移動
        const deltaX = dx
        const deltaY = dy

        // 新しいサイズを計算（正方形を維持）
        let tentativeWidth = prev.size + deltaX
        let tentativeHeight = prev.size - deltaY

        // 右端が画像の幅を超えない
        tentativeWidth = Math.min(tentativeWidth, imageSize.width - leftEdge)

        // 上端が0未満にならない
        const tentativeY = bottomEdge - tentativeHeight
        if (tentativeY < 0) {
          tentativeHeight = bottomEdge
        }

        // 最小サイズ50を確保
        tentativeWidth = Math.max(50, tentativeWidth)
        tentativeHeight = Math.max(50, tentativeHeight)

        // 正方形を維持
        newSize = Math.min(tentativeWidth, tentativeHeight)
        newX = leftEdge
        newY = bottomEdge - newSize
      }
      else if (dragging === 'bottom-left') {
        // 左下の頂点を動かす：右上は固定
        const rightEdge = prev.x + prev.size
        const topEdge = prev.y

        const deltaX = dx
        const deltaY = dy

        // 新しいサイズを計算
        let tentativeWidth = prev.size - deltaX
        let tentativeHeight = prev.size + deltaY

        // 左端が0未満にならない
        const tentativeX = rightEdge - tentativeWidth
        if (tentativeX < 0) {
          tentativeWidth = rightEdge
        }

        // 下端が画像の高さを超えない
        tentativeHeight = Math.min(tentativeHeight, imageSize.height - topEdge)

        // 最小サイズ50を確保
        tentativeWidth = Math.max(50, tentativeWidth)
        tentativeHeight = Math.max(50, tentativeHeight)

        // 正方形を維持
        newSize = Math.min(tentativeWidth, tentativeHeight)
        newX = rightEdge - newSize
        newY = topEdge
      }
      else if (dragging === 'bottom-right') {
        // 右下の頂点を動かす：左上は固定
        const leftEdge = prev.x
        const topEdge = prev.y

        const deltaX = dx
        const deltaY = dy

        // 新しいサイズを計算
        let tentativeWidth = prev.size + deltaX
        let tentativeHeight = prev.size + deltaY

        // 右端が画像の幅を超えない
        tentativeWidth = Math.min(tentativeWidth, imageSize.width - leftEdge)

        // 下端が画像の高さを超えない
        tentativeHeight = Math.min(tentativeHeight, imageSize.height - topEdge)

        // 最小サイズ50を確保
        tentativeWidth = Math.max(50, tentativeWidth)
        tentativeHeight = Math.max(50, tentativeHeight)

        // 正方形を維持
        newSize = Math.min(tentativeWidth, tentativeHeight)
        newX = leftEdge
        newY = topEdge
      }

      return { x: newX, y: newY, size: newSize }
    })

    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handlePointerUp = () => {
    setDragging(null)
  }

  useEffect(() => {
    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      return () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }
    }
  }, [dragging, dragStart])

  const handleCrop = async () => {
    if (isProcessing) return
    setIsProcessing(true)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setIsProcessing(false)
      return
    }

    // 元の解像度を保持（Cloudflare Imagesは枚数課金なのでサイズ制限不要）
    canvas.width = cropArea.size
    canvas.height = cropArea.size

    const img = new Image()
    img.src = imageSrc

    img.onload = () => {
      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.size,
        cropArea.size,
        0,
        0,
        cropArea.size,
        cropArea.size
      )

      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob)
        }
        // 処理完了後に状態をリセット（実際にはコンポーネントが閉じられる可能性が高い）
        setIsProcessing(false)
      }, 'image/jpeg', 0.95)
    }
  }

  const scale = getDisplayScale()

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-center p-4 border-b">
          <h2 className="text-lg font-semibold">画像をトリミング</h2>
        </div>

        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          {!imageSrc ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative inline-block touch-none"
              style={{ userSelect: 'none' }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="max-w-full h-auto pointer-events-none"
                style={{ maxHeight: '60vh' }}
              />

            {/* クロップオーバーレイ */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `
                  linear-gradient(to right, rgba(0,0,0,0.5) ${cropArea.x * scale}px, transparent ${cropArea.x * scale}px, transparent ${(cropArea.x + cropArea.size) * scale}px, rgba(0,0,0,0.5) ${(cropArea.x + cropArea.size) * scale}px),
                  linear-gradient(to bottom, rgba(0,0,0,0.5) ${cropArea.y * scale}px, transparent ${cropArea.y * scale}px, transparent ${(cropArea.y + cropArea.size) * scale}px, rgba(0,0,0,0.5) ${(cropArea.y + cropArea.size) * scale}px)
                `,
              }}
            />

            {/* クロップボックス */}
            <div
              className="absolute border-2 border-white cursor-move touch-none"
              style={{
                left: cropArea.x * scale,
                top: cropArea.y * scale,
                width: cropArea.size * scale,
                height: cropArea.size * scale,
              }}
              onPointerDown={(e) => {
                // 頂点ハンドル以外の場合のみ移動モードを開始
                if (e.target === e.currentTarget) {
                  handlePointerDown('move', e)
                }
              }}
            >
              {/* 頂点ハンドル */}
              {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
                const positions = {
                  'top-left': { top: -12, left: -12 },
                  'top-right': { top: -12, right: -12 },
                  'bottom-left': { bottom: -12, left: -12 },
                  'bottom-right': { bottom: -12, right: -12 },
                }
                return (
                  <div
                    key={corner}
                    className="absolute w-6 h-6 bg-white cursor-nwse-resize hover:bg-indigo-500 touch-none shadow-lg"
                    style={{
                      ...positions[corner as keyof typeof positions],
                      border: '4px solid rgb(99, 102, 241)',
                    }}
                    onPointerDown={(e) => handlePointerDown(corner, e)}
                  />
                )
              })}
            </div>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2 p-4 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            キャンセル
          </button>
          <button
            onClick={handleCrop}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          >
            <Check size={16} />
            {isProcessing ? '処理中...' : 'トリミング完了'}
          </button>
        </div>
      </div>
    </div>
  )
}
