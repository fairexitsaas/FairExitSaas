import { db } from '../config/db'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'

export const ALLOWED_DOC_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
}

export const storageService = {
  /** Signed URL the client PUTs the file to (Supabase Storage "upload to signed URL"). Valid 2 hours. */
  async signedUpload(path: string) {
    const { data, error } = await db().storage.from(env.DOCUMENTS_BUCKET).createSignedUploadUrl(path)
    if (error || !data) throw new ApiError(500, `Could not create upload URL: ${error?.message}`, undefined, false)
    return { uploadUrl: data.signedUrl, uploadToken: data.token, path: data.path }
  },

  async upload(bucket: string, path: string, body: Buffer, contentType: string) {
    const { error } = await db().storage.from(bucket).upload(path, body, { contentType, upsert: true })
    if (error) throw new ApiError(500, `Upload failed: ${error.message}`, undefined, false)
  },

  async download(bucket: string, path: string): Promise<Buffer> {
    const { data, error } = await db().storage.from(bucket).download(path)
    if (error || !data) throw ApiError.notFound(`File not found in storage (${path})`)
    return Buffer.from(await data.arrayBuffer())
  },

  async exists(bucket: string, path: string): Promise<{ exists: boolean; size?: number }> {
    const dir = path.split('/').slice(0, -1).join('/')
    const name = path.split('/').pop()
    const { data, error } = await db().storage.from(bucket).list(dir, { search: name })
    if (error) return { exists: false }
    const hit = (data || []).find((f) => f.name === name)
    return { exists: !!hit, size: (hit?.metadata as { size?: number } | undefined)?.size }
  },

  async remove(bucket: string, paths: string[]) {
    if (!paths.length) return
    const { error } = await db().storage.from(bucket).remove(paths)
    if (error) throw new ApiError(500, `Delete failed: ${error.message}`, undefined, false)
  },
}
