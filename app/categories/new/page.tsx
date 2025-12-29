'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function NewCategoryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!name || !file) {
      setError('名前と画像は必須です。')
      setLoading(false)
      return
    }

    try {
      // 1. Upload image
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('category_images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('category_images')
        .getPublicUrl(fileName)

      // 3. Insert Category
      const { error: insertError } = await supabase
        .from('categories')
        .insert({ name, image_url: publicUrl })

      if (insertError) throw insertError

      router.push('/')
      router.refresh()
    } catch (err: any) {
      console.error('Error creating category:', err)
      setError(err.message || 'カテゴリーの作成に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-2xl py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">新規カテゴリー作成</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-lg border shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor="name">
            カテゴリー名
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 rounded-md border bg-background"
            placeholder="例: アニメ、ゲーム、食べ物"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            カテゴリー画像 (カバー)
          </label>
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 hover:bg-accent/50 transition-colors cursor-pointer relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required
            />
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-h-64 object-cover rounded-md"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <p>{isTouchDevice ? 'タップ' : 'クリック'}してアップロード、またはドラッグ＆ドロップ</p>
                <p className="text-xs">SVG, PNG, JPG, GIF (最大 800x400px)</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium hover:underline"
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? '作成中...' : 'カテゴリーを作成'}
          </button>
        </div>
      </form>
    </div>
  )
}
