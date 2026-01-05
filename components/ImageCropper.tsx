'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Check, Square } from 'lucide-react'

interface ImageCropperProps {
  imageFile: File
  onCropComplete: (croppedBlob: Blob) => void
  onCancel: () => void
}

type BackgroundColor = 'white' | 'black' | 'gray'

export default function ImageCropper({ imageFile, onCropComplete, onCancel }: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [containerSize, setContainerSize] = useState(0) // 論理的な正方形コンテナのサイズ (max(w, h))
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 0 })
  const [backgroundColor, setBackgroundColor] = useState<BackgroundColor>('white')
  const [scale, setScale] = useState(1)
  
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isProcessing, setIsProcessing] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(imageFile)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageSrc(url)

    const img = new Image()
    img.onload = () => {
      const w = img.width
      const h = img.height
      const maxDim = Math.max(w, h)
      
      setImageSize({ width: w, height: h })
      setContainerSize(maxDim)

      // 初期クロップエリアを最大サイズ（正方形）に設定
      // これにより長辺がフィットし、短辺には余白が生まれる
      setCropArea({
        x: 0,
        y: 0,
        size: maxDim
      })
    }
    img.src = url

    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  // コンテナサイズやウィンドウリサイズに応じてスケールを更新
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current && containerSize > 0) {
        setScale(containerRef.current.offsetWidth / containerSize)
      }
    }
    
    // 初期化時とリサイズ時に実行
    updateScale()
    
    // 画像ロード完了後少し遅延して再計算（レイアウト安定化のため）
    const timeoutId = setTimeout(updateScale, 100)
    
    window.addEventListener('resize', updateScale)
    return () => {
      window.removeEventListener('resize', updateScale)
      clearTimeout(timeoutId)
    }
  }, [containerSize])

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const handlePointerDown = (corner: string, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(corner)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragging || containerSize === 0) return
    e.preventDefault()

    // scaleステートを使用（RefへのアクセスをRender中に行わないため、イベントハンドラ内でもstate参照が安全）
    const currentScale = scale
    const dx = (e.clientX - dragStart.x) / currentScale
    const dy = (e.clientY - dragStart.y) / currentScale

    setCropArea(prev => {
      let newX = prev.x
      let newY = prev.y
      let newSize = prev.size

      if (dragging === 'move') {
        newX = Math.max(0, Math.min(containerSize - prev.size, prev.x + dx))
        newY = Math.max(0, Math.min(containerSize - prev.size, prev.y + dy))
      }
      else if (dragging === 'top-left') {
        const rightEdge = prev.x + prev.size
        const bottomEdge = prev.y + prev.size
        const delta = Math.min(dx, dy)
        let tentativeX = prev.x + delta
        let tentativeY = prev.y + delta
        
        tentativeX = Math.max(0, tentativeX)
        tentativeY = Math.max(0, tentativeY)
        tentativeX = Math.min(tentativeX, rightEdge - 50)
        tentativeY = Math.min(tentativeY, bottomEdge - 50)
        
        const maxDeltaX = rightEdge - tentativeX
        const maxDeltaY = bottomEdge - tentativeY
        newSize = Math.min(maxDeltaX, maxDeltaY)
        newX = rightEdge - newSize
        newY = bottomEdge - newSize
      }
      else if (dragging === 'top-right') {
        const leftEdge = prev.x
        const bottomEdge = prev.y + prev.size
        let tentativeWidth = prev.size + dx
        let tentativeHeight = prev.size - dy
        
        tentativeWidth = Math.min(tentativeWidth, containerSize - leftEdge)
        const tentativeY = bottomEdge - tentativeHeight
        if (tentativeY < 0) tentativeHeight = bottomEdge
        
        tentativeWidth = Math.max(50, tentativeWidth)
        tentativeHeight = Math.max(50, tentativeHeight)
        
        newSize = Math.min(tentativeWidth, tentativeHeight)
        newX = leftEdge
        newY = bottomEdge - newSize
      }
      else if (dragging === 'bottom-left') {
        const rightEdge = prev.x + prev.size
        const topEdge = prev.y
        let tentativeWidth = prev.size - dx
        let tentativeHeight = prev.size + dy
        
        const tentativeX = rightEdge - tentativeWidth
        if (tentativeX < 0) tentativeWidth = rightEdge
        tentativeHeight = Math.min(tentativeHeight, containerSize - topEdge)
        
        tentativeWidth = Math.max(50, tentativeWidth)
        tentativeHeight = Math.max(50, tentativeHeight)
        
        newSize = Math.min(tentativeWidth, tentativeHeight)
        newX = rightEdge - newSize
        newY = topEdge
      }
      else if (dragging === 'bottom-right') {
        const leftEdge = prev.x
        const topEdge = prev.y
        let tentativeWidth = prev.size + dx
        let tentativeHeight = prev.size + dy
        
        tentativeWidth = Math.min(tentativeWidth, containerSize - leftEdge)
        tentativeHeight = Math.min(tentativeHeight, containerSize - topEdge)
        
        tentativeWidth = Math.max(50, tentativeWidth)
        tentativeHeight = Math.max(50, tentativeHeight)
        
        newSize = Math.min(tentativeWidth, tentativeHeight)
        newX = leftEdge
        newY = topEdge
      }

      return { x: newX, y: newY, size: newSize }
    })

    setDragStart({ x: e.clientX, y: e.clientY })
  }, [dragging, containerSize, dragStart, scale])

  const handlePointerUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      return () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }
    }
  }, [dragging, handlePointerMove, handlePointerUp])

  const handleCrop = async () => {
    if (isProcessing) return
    setIsProcessing(true)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setIsProcessing(false)
      return
    }

    canvas.width = cropArea.size
    canvas.height = cropArea.size

    // 背景色塗りつぶし
    if (backgroundColor === 'white') {
      ctx.fillStyle = '#FFFFFF'
    } else if (backgroundColor === 'black') {
      ctx.fillStyle = '#000000'
    } else if (backgroundColor === 'gray') {
      ctx.fillStyle = '#808080'
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const img = new Image()
    img.src = imageSrc

    img.onload = () => {
      // 論理コンテナ内での画像の位置
      const imageOffsetX = (containerSize - imageSize.width) / 2
      const imageOffsetY = (containerSize - imageSize.height) / 2

      // クロップエリア内での描画位置 = (画像位置 - クロップエリア位置)
      const drawX = imageOffsetX - cropArea.x
      const drawY = imageOffsetY - cropArea.y

      ctx.drawImage(
        img,
        drawX,
        drawY,
        imageSize.width,
        imageSize.height
      )

      canvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob)
        } else {
          setIsProcessing(false)
        }
      }, 'image/jpeg', 0.95)
    }
  }

  const getBackgroundColorValue = (color: BackgroundColor) => {
    switch (color) {
      case 'white': return '#FFFFFF'
      case 'black': return '#000000'
      case 'gray': return '#808080'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-center p-4 border-b dark:border-zinc-800">
          <h2 className="text-lg font-semibold">画像をトリミング</h2>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center gap-4">
          {!imageSrc ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 dark:text-zinc-400">読み込み中...</p>
            </div>
          ) : (
            <>
              {/* 正方形のワークスペースコンテナ */}
              <div
                ref={containerRef}
                className="relative touch-none mx-auto shadow-sm"
                style={{
                  userSelect: 'none',
                  width: '100%',
                  maxWidth: '50vh', // 画面内に収まるように
                  aspectRatio: '1/1',
                  backgroundColor: '#f3f4f6' // コンテナ自体の背景
                }}
              >
                {/* 実際の背景色プレビューレイヤー */}
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundColor: getBackgroundColorValue(backgroundColor)
                  }}
                />

                {/* 画像 (中央配置) */}
                <img
                  src={imageSrc}
                  alt="Crop preview"
                  className="pointer-events-none absolute left-1/2 top-1/2"
                  style={{
                    transform: 'translate(-50%, -50%)',
                    width: imageSize.width >= imageSize.height ? '100%' : 'auto',
                    height: imageSize.height > imageSize.width ? '100%' : 'auto',
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
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
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                  }}
                  onPointerDown={(e) => {
                    if (e.target === e.currentTarget) {
                      handlePointerDown('move', e)
                    }
                  }}
                >
                  {/* グリッド線 */}
                  <div className="absolute inset-0 opacity-30 pointer-events-none flex flex-col">
                    <div className="flex-1 border-b border-white"></div>
                    <div className="flex-1 border-b border-white"></div>
                    <div className="flex-1"></div>
                  </div>
                  <div className="absolute inset-0 opacity-30 pointer-events-none flex">
                    <div className="flex-1 border-r border-white"></div>
                    <div className="flex-1 border-r border-white"></div>
                    <div className="flex-1"></div>
                  </div>

                  {/* 頂点ハンドル */}
                  {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
                    const positions = {
                      'top-left': { top: -6, left: -6 },
                      'top-right': { top: -6, right: -6 },
                      'bottom-left': { bottom: -6, left: -6 },
                      'bottom-right': { bottom: -6, right: -6 },
                    }
                    return (
                      <div
                        key={corner}
                        className="absolute w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
                        style={positions[corner as keyof typeof positions]}
                        onPointerDown={(e) => handlePointerDown(corner, e)}
                      />
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t dark:border-zinc-800 flex flex-col items-center gap-4">
          {imageSrc && (
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-800 p-2 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">背景色:</span>
              
              <button
                onClick={() => setBackgroundColor('white')}
                className={`p-2 rounded border-2 transition-all ${
                  backgroundColor === 'white' 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                    : 'border-transparent hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
                title="白"
              >
                <Square size={20} className="fill-white text-gray-300" />
              </button>
              
              <button
                onClick={() => setBackgroundColor('gray')}
                className={`p-2 rounded border-2 transition-all ${
                  backgroundColor === 'gray' 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                    : 'border-transparent hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
                title="グレー"
              >
                <Square size={20} className="fill-gray-500 text-gray-500" />
              </button>

              <button
                onClick={() => setBackgroundColor('black')}
                className={`p-2 rounded border-2 transition-all ${
                  backgroundColor === 'black' 
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                    : 'border-transparent hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
                title="黒"
              >
                <Square size={20} className="fill-black text-black" />
              </button>
            </div>
          )}

          <div className="flex justify-center gap-2 w-full">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleCrop}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600 transition-colors"
            >
              <Check size={16} />
              {isProcessing ? '処理中...' : '完了'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}