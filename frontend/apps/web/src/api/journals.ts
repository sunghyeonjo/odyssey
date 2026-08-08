import type { Journal, JournalRequest, JournalFilter, JournalImageMeta, JournalComment, JournalCommentRequest, JournalLikeRequest, PageResponse } from '@buffett-diary/shared'
import client from './client'

export const journalsApi = {
  list(filter: JournalFilter = {}) {
    return client.get<PageResponse<Journal>>('/journals', { params: filter })
  },
  get(id: number) {
    return client.get<Journal>(`/journals/${id}`)
  },
  create(data: JournalRequest) {
    return client.post<Journal>('/journals', data)
  },
  update(id: number, data: JournalRequest) {
    return client.put<Journal>(`/journals/${id}`, data)
  },
  delete(id: number) {
    return client.delete(`/journals/${id}`)
  },
}

export const journalLikeApi = {
  update(journalId: number, data: JournalLikeRequest) {
    return client.put<Journal>(`/journals/${journalId}/like`, data)
  },
}

export const journalCommentsApi = {
  list(journalId: number) {
    return client.get<JournalComment[]>(`/journals/${journalId}/comments`)
  },
  create(journalId: number, data: JournalCommentRequest) {
    return client.post<JournalComment>(`/journals/${journalId}/comments`, data)
  },
  reply(journalId: number, commentId: number, data: JournalCommentRequest) {
    return client.post<JournalComment>(`/journals/${journalId}/comments/${commentId}/replies`, data)
  },
  update(journalId: number, commentId: number, data: JournalCommentRequest) {
    return client.put<JournalComment>(`/journals/${journalId}/comments/${commentId}`, data)
  },
  delete(journalId: number, commentId: number) {
    return client.delete(`/journals/${journalId}/comments/${commentId}`)
  },
}

export const journalImagesApi = {
  upload(journalId: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return client.post<JournalImageMeta>(`/journals/${journalId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete(journalId: number, imageId: number) {
    return client.delete(`/journals/${journalId}/images/${imageId}`)
  },
  fetchBlob(journalId: number, imageId: number) {
    return client.get<Blob>(`/journals/${journalId}/images/${imageId}`, {
      responseType: 'blob',
    })
  },
}
