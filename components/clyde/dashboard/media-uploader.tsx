'use client'

import { useRef, useState } from 'react'
import { ImagePlus, LoaderCircle, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function MediaUploader({
  businessId,
  kind = 'image',
  value,
  onChange,
  accept = 'image/*,video/*',
  multiple = false,
  label = 'Ajouter un média',
}: {
  businessId: string
  kind?: 'logo' | 'profile' | 'cover' | 'product' | 'gallery' | 'video' | 'image'
  value?: string | string[]
  onChange: (value: string | string[]) => void
  accept?: string
  multiple?: boolean
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const items = Array.isArray(value) ? value : value ? [value] : []

  async function upload(files: FileList | File[]) {
    const selected = Array.from(files)
    if (!selected.length) return
    setError(null)
    setUploading(true)

    try {
      const uploaded: string[] = []
      for (const file of selected) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('businessId', businessId)
        formData.append('kind', kind)
        const response = await fetch('/api/media/upload', { method: 'POST', body: formData })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error ?? 'Upload impossible')
        uploaded.push(payload.url)
      }
      const next = multiple ? [...items, ...uploaded] : uploaded[0]
      onChange(next)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Le téléversement a échoué.')
    } finally {
      setUploading(false)
    }
  }

  function remove(url: string) {
    const next = items.filter((item) => item !== url)
    onChange(multiple ? next : '')
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => event.target.files && upload(event.target.files)}
      />
      <button
        type="button"
        className={cn(
          'flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center transition-colors',
          dragging ? 'border-brand bg-brand/10' : 'border-border bg-muted/30 hover:bg-muted/60',
        )}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files) }}
        disabled={uploading}
      >
        {uploading ? <LoaderCircle className="size-5 animate-spin text-brand" aria-hidden /> : <Upload className="size-5 text-brand" aria-hidden />}
        <span className="text-sm font-semibold">{uploading ? 'Téléversement…' : label}</span>
        <span className="text-xs text-muted-foreground">Téléphone, galerie, caméra ou glisser-déposer</span>
      </button>
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((url) => (
            <div key={url} className="group relative overflow-hidden rounded-lg border bg-muted">
              {kind === 'video' ? <video src={url} className="aspect-video w-full object-cover" muted /> : <img src={url} alt="Média téléversé" className="aspect-square w-full object-cover" />}
              <Button type="button" size="icon-xs" variant="secondary" className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => remove(url)} aria-label="Supprimer le média">
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}
      {error ? <p role="alert" className="text-xs font-medium text-destructive">{error}</p> : null}
      {!items.length && !uploading ? <p className="flex items-center gap-1 text-xs text-muted-foreground"><ImagePlus className="size-3.5" /> JPG, PNG, WebP, MP4 ou WebM</p> : null}
    </div>
  )
}
