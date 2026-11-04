import crypto from 'crypto'
import { db, check } from '../config/db'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'
import { caseService } from './case.service'
import { storageService, ALLOWED_DOC_TYPES } from './storage.service'
import type { CaseRow, CaseDocumentRow, DocKind, ContractStatus } from '../fairexit/types'

const MAX_PAGES_PER_DOC = 20

export function resolveDocExt(mimeType: string, fileName?: string): string | null {
  if (ALLOWED_DOC_TYPES[mimeType]) return ALLOWED_DOC_TYPES[mimeType]
  const lowerName = (fileName || '').toLowerCase()
  if (lowerName.endsWith('.docx')) return 'docx'
  if (lowerName.endsWith('.doc')) return 'doc'
  if (lowerName.endsWith('.pdf')) return 'pdf'
  if (lowerName.endsWith('.txt')) return 'txt'
  if (lowerName.endsWith('.png')) return 'png'
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'jpg'
  if (lowerName.endsWith('.webp')) return 'webp'
  return null
}

function assertCanChangeDocs(c: CaseRow) {
  if (!caseService.isEntitled(c)) throw new ApiError(402, 'Payment is needed before adding documents')
  if (c.status === 'reading' || c.status === 'building') throw ApiError.conflict('Documents are being read. Wait until it finishes.')
  if (c.docs_deleted_at) throw ApiError.conflict('Documents for this report were deleted under the 30-day retention rule')
}

function docView(d: CaseDocumentRow) {
  return { id: d.id, kind: d.kind, page: d.page, mimeType: d.mime_type, sizeBytes: d.size_bytes, fileName: d.original_name, status: d.status, createdAt: d.created_at }
}

async function nextPage(caseId: string, kind: DocKind): Promise<number> {
  const docs = (await caseService.documents(caseId)).filter((d) => d.kind === kind && d.status === 'uploaded')
  if (docs.length >= MAX_PAGES_PER_DOC) throw ApiError.badRequest(`At most ${MAX_PAGES_PER_DOC} files per document`)
  return docs.reduce((m, d) => Math.max(m, d.page), 0) + 1
}

async function afterUpload(c: CaseRow, kind: DocKind) {
  const patch: Partial<CaseRow> = {}
  if (kind === 'contract') patch.contract_status = 'added'
  if (!c.docs_delete_after) patch.docs_delete_after = new Date(Date.now() + env.RETENTION_DOCS_DAYS * 864e5).toISOString()
  if (Object.keys(patch).length) await caseService.update(c.id, patch)
}

export const documentService = {
  view: docView,

  async getById(docId: string): Promise<CaseDocumentRow> {
    return check(
      await db().from('case_documents').select('*').eq('id', docId).single(),
      'Document'
    ) as CaseDocumentRow
  },

  async viewDocById(docId: string) {
    const doc = await this.getById(docId)
    return { ...docView(doc), caseId: doc.case_id }
  },

  async list(c: CaseRow) {
    const docs = await caseService.documents(c.id)
    return { documents: docs.map(docView), ...caseService.readiness(c, docs), contractStatus: c.contract_status }
  },

  /** Step 1 of the direct-to-storage upload: returns a signed URL the client PUTs the bytes to. */
  async createUploadSlot(c: CaseRow, input: { kind: DocKind; fileName?: string; mimeType: string; sizeBytes?: number }) {
    assertCanChangeDocs(c)
    const ext = resolveDocExt(input.mimeType, input.fileName)
    if (!ext) throw ApiError.badRequest(`Unsupported file type ${input.mimeType}. Use PDF, Word (.docx, .doc), JPEG, PNG, WEBP or plain text (iPhone HEIC photos must be converted to JPEG).`)
    const resolvedMime = Object.entries(ALLOWED_DOC_TYPES).find(([, val]) => val === ext)?.[0] || input.mimeType || 'application/octet-stream'
    if (input.sizeBytes && input.sizeBytes > env.MAX_UPLOAD_MB * 1024 * 1024) throw ApiError.badRequest(`File too large (max ${env.MAX_UPLOAD_MB} MB)`)
    // Clean up any stale uncompleted pending slot for the same case and filename to prevent duplicate rows on retry
    if (input.fileName) {
      const existingPending = await db()
        .from('case_documents')
        .select('id, storage_path')
        .eq('case_id', c.id)
        .eq('kind', input.kind)
        .eq('original_name', input.fileName)
        .eq('status', 'pending')
      if (existingPending.data && existingPending.data.length > 0) {
        await storageService.remove(env.DOCUMENTS_BUCKET, existingPending.data.map((d: any) => d.storage_path)).catch(() => undefined)
        await db().from('case_documents').delete().in('id', existingPending.data.map((d: any) => d.id))
      }
    }

    const page = await nextPage(c.id, input.kind)
    const path = `${c.id}/${input.kind}/${String(page).padStart(2, '0')}-${crypto.randomUUID()}.${ext}`
    const signed = await storageService.signedUpload(path)
    const doc = check(
      await db().from('case_documents').insert({
        case_id: c.id, kind: input.kind, page, storage_path: path, mime_type: resolvedMime,
        size_bytes: input.sizeBytes || null, original_name: input.fileName || null, status: 'pending',
      }).select('*').single(),
      'document',
    ) as CaseDocumentRow
    return {
      document: docView(doc),
      upload: { method: 'PUT', url: signed.uploadUrl, token: signed.uploadToken, headers: { 'Content-Type': input.mimeType }, expiresInSeconds: 7200 },
    }
  },

  /** Step 2: the client says the PUT finished; we check the object exists. */
  async complete(c: CaseRow, docId: string) {
    const doc = check(await db().from('case_documents').select('*').eq('id', docId).eq('case_id', c.id).single(), 'Document') as CaseDocumentRow
    if (doc.status === 'uploaded') return docView(doc)
    const { exists, size } = await storageService.exists(env.DOCUMENTS_BUCKET, doc.storage_path)
    if (!exists) throw ApiError.badRequest('The file was not received. Upload it to the signed URL first.')
    const updated = check(
      await db().from('case_documents').update({ status: 'uploaded', size_bytes: size ?? doc.size_bytes }).eq('id', doc.id).select('*').single(),
      'document',
    ) as CaseDocumentRow
    await afterUpload(c, doc.kind)
    return docView(updated)
  },

  /** One-call alternative for small files: JSON body with base64 data (max ~7 MB of file). */
  async uploadBase64(c: CaseRow, input: { kind: DocKind; fileName?: string; mimeType: string; dataBase64: string }) {
    assertCanChangeDocs(c)
    const ext = resolveDocExt(input.mimeType, input.fileName)
    if (!ext) throw ApiError.badRequest(`Unsupported file type ${input.mimeType}. Use PDF, Word (.docx, .doc), JPEG, PNG, WEBP or plain text.`)
    const resolvedMime = Object.entries(ALLOWED_DOC_TYPES).find(([, val]) => val === ext)?.[0] || input.mimeType || 'application/octet-stream'
    const buf = Buffer.from(input.dataBase64.replace(/^data:[^;]+;base64,/, ''), 'base64')
    if (!buf.length) throw ApiError.badRequest('Empty file')
    if (buf.length > env.MAX_UPLOAD_MB * 1024 * 1024) throw ApiError.badRequest(`File too large (max ${env.MAX_UPLOAD_MB} MB)`)
    // Clean up any stale uncompleted pending slot for the same case and filename to prevent duplicate rows on retry
    if (input.fileName) {
      const existingPending = await db()
        .from('case_documents')
        .select('id, storage_path')
        .eq('case_id', c.id)
        .eq('kind', input.kind)
        .eq('original_name', input.fileName)
        .eq('status', 'pending')
      if (existingPending.data && existingPending.data.length > 0) {
        await storageService.remove(env.DOCUMENTS_BUCKET, existingPending.data.map((d: any) => d.storage_path)).catch(() => undefined)
        await db().from('case_documents').delete().in('id', existingPending.data.map((d: any) => d.id))
      }
    }

    const page = await nextPage(c.id, input.kind)
    const path = `${c.id}/${input.kind}/${String(page).padStart(2, '0')}-${crypto.randomUUID()}.${ext}`
    await storageService.upload(env.DOCUMENTS_BUCKET, path, buf, resolvedMime)
    const doc = check(
      await db().from('case_documents').insert({
        case_id: c.id, kind: input.kind, page, storage_path: path, mime_type: resolvedMime,
        size_bytes: buf.length, original_name: input.fileName || null, status: 'uploaded',
      }).select('*').single(),
      'document',
    ) as CaseDocumentRow
    await afterUpload(c, input.kind)
    return docView(doc)
  },

  async updateKind(c: CaseRow, docId: string, kind: DocKind) {
    assertCanChangeDocs(c)
    const doc = check(await db().from('case_documents').select('*').eq('id', docId).eq('case_id', c.id).single(), 'Document') as CaseDocumentRow
    if (doc.kind === kind) return docView(doc)
    const page = await nextPage(c.id, kind)
    const updated = check(
      await db().from('case_documents').update({ kind, page }).eq('id', doc.id).select('*').single(),
      'document'
    ) as CaseDocumentRow
    await afterUpload(c, kind)
    if (doc.kind === 'contract' && kind !== 'contract') {
      const left = (await caseService.documents(c.id)).filter((d) => d.kind === 'contract' && d.status === 'uploaded')
      if (!left.length && c.contract_status === 'added') await caseService.update(c.id, { contract_status: null })
    }
    return docView(updated)
  },

  async remove(c: CaseRow, docId: string) {
    assertCanChangeDocs(c)
    const doc = check(await db().from('case_documents').select('*').eq('id', docId).eq('case_id', c.id).single(), 'Document') as CaseDocumentRow
    await storageService.remove(env.DOCUMENTS_BUCKET, [doc.storage_path]).catch(() => undefined)
    check(await db().from('case_documents').delete().eq('id', doc.id), 'document')
    if (doc.kind === 'contract') {
      const left = (await caseService.documents(c.id)).filter((d) => d.kind === 'contract' && d.status === 'uploaded')
      if (!left.length && c.contract_status === 'added') await caseService.update(c.id, { contract_status: null })
    }
  },

  /** The no-contract modal: "never" = never signed one; "missing" = signed one but can't add it / not sure. */
  async setContractStatus(c: CaseRow, status: Exclude<ContractStatus, 'added'>) {
    if (!caseService.isEntitled(c)) throw new ApiError(402, 'Payment is needed first')
    const docs = await caseService.documents(c.id)
    if (docs.some((d) => d.kind === 'contract' && d.status === 'uploaded')) {
      throw ApiError.conflict('A contract is already added. Remove it first if you meant to continue without one.')
    }
    return caseService.update(c.id, { contract_status: status })
  },

  /** Files for Claude, in order: letter pages then contract pages. */
  async loadForAi(c: CaseRow, kinds: DocKind[] = ['letter', 'contract']) {
    const docs = (await caseService.documents(c.id)).filter((d) => d.status === 'uploaded' && kinds.includes(d.kind))
    const out: Array<{ kind: DocKind; page: number; pages: number; mime: string; data: Buffer; storagePath: string }> = []
    for (const d of docs) {
      out.push({
        kind: d.kind,
        page: d.page,
        pages: docs.filter((x) => x.kind === d.kind).length,
        mime: d.mime_type,
        data: await storageService.download(env.DOCUMENTS_BUCKET, d.storage_path),
        storagePath: d.storage_path,
      })
    }
    return out
  },

  /** Retention / delete-my-data: remove every stored file for a case. */
  async purge(caseId: string) {
    const docs = check(await db().from('case_documents').select('*').eq('case_id', caseId), 'documents') as CaseDocumentRow[]
    await storageService.remove(env.DOCUMENTS_BUCKET, docs.map((d) => d.storage_path)).catch(() => undefined)
    check(await db().from('case_documents').update({ deleted_at: new Date().toISOString() }).eq('case_id', caseId).is('deleted_at', null), 'documents')
    return docs.length
  },
}
