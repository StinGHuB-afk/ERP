'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/auth/session'
import prisma from '@/lib/prisma'
import { generateStoragePath, createSignedUploadUrl } from '@/lib/storage'
import { ContentStatus } from '@prisma/client'
import { assertTeacherCanManageContent, requireActiveSessionId } from '@/lib/auth/teacher-authorization'

async function verifyTeacherOwnership(subjectId: string, expectedSessionId?: string, classId?: string) {
  const session = await verifySession()
  if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) throw new Error('Unauthorized')

  const activeSessionId = await requireActiveSessionId()
  if (expectedSessionId && expectedSessionId !== activeSessionId) {
    throw new Error('The active academic session has changed. Please refresh the page.')
  }

  if (session.role === 'ADMIN') return { userId: session.userId, role: session.role, teacherId: 'ADMIN' }

  const teacher = await prisma.teacher.findUnique({ where: { userId: session.userId }, select: { id: true } })
  if (!teacher) throw new Error('Teacher record not found')

  // Direct ownership assertion without nested try/catch wrapper
  await assertTeacherCanManageContent(teacher.id, subjectId, activeSessionId, classId)
  return { userId: session.userId, role: session.role, teacherId: teacher.id }
}

export async function createChapter(data: { subjectId: string, classId?: string, academicSessionId: string, title: string, description?: string }) {
  const { teacherId } = await verifyTeacherOwnership(data.subjectId, data.academicSessionId, data.classId)

  const chapter = await prisma.learningChapter.create({
    data: {
      title: data.title,
      description: data.description,
      subjectId: data.subjectId,
      classId: data.classId || null,
      academicSessionId: data.academicSessionId,
      teacherId,
      status: ContentStatus.PUBLISHED
    }
  })

  revalidatePath(`/teacher/notes/${data.subjectId}`)
  return { success: true, data: chapter }
}

export async function updateChapter(id: string, data: { title: string, description?: string, status?: ContentStatus, expectedSessionId: string }) {
  const chapter = await prisma.learningChapter.findUnique({ where: { id }, select: { subjectId: true, classId: true } })
  if (!chapter) throw new Error('Chapter not found')

  await verifyTeacherOwnership(chapter.subjectId, data.expectedSessionId, chapter.classId || undefined)

  const updated = await prisma.learningChapter.update({
    where: { id },
    data: { title: data.title, description: data.description, status: data.status }
  })

  revalidatePath(`/teacher/notes/${chapter.subjectId}`)
  return { success: true, data: updated }
}

export async function createTopic(data: { chapterId: string, title: string, description?: string, expectedSessionId: string }) {
  const chapter = await prisma.learningChapter.findUnique({ where: { id: data.chapterId }, select: { id: true, subjectId: true, classId: true } })
  if (!chapter) throw new Error('Chapter not found')

  await verifyTeacherOwnership(chapter.subjectId, data.expectedSessionId, chapter.classId || undefined)

  const topic = await prisma.learningTopic.create({
    data: { title: data.title, description: data.description, chapterId: data.chapterId, status: ContentStatus.DRAFT }
  })

  revalidatePath(`/teacher/notes/${chapter.subjectId}/chapter/${chapter.id}`)
  return { success: true, data: topic }
}

export async function updateTopic(id: string, data: { title: string, description?: string, status?: ContentStatus, expectedSessionId: string }) {
  const topic = await prisma.learningTopic.findUnique({ where: { id }, include: { chapter: { select: { subjectId: true, classId: true, id: true } } } })
  if (!topic) throw new Error('Topic not found')

  await verifyTeacherOwnership(topic.chapter.subjectId, data.expectedSessionId, topic.chapter.classId || undefined)

  const updated = await prisma.learningTopic.update({
    where: { id },
    data: { title: data.title, description: data.description, status: data.status }
  })

  revalidatePath(`/teacher/notes/${topic.chapter.subjectId}/chapter/${topic.chapterId}`)
  return { success: true, data: updated }
}

export async function requestFileUploadUrl(data: { 
  topicId: string, title: string, fileName: string, fileSize: number, mimeType: string, type: 'PDF' | 'VIDEO', expectedSessionId: string 
}) {
  const topic = await prisma.learningTopic.findUnique({ where: { id: data.topicId }, include: { chapter: { select: { subjectId: true, classId: true } } } })
  if (!topic) throw new Error('Topic not found')

  await verifyTeacherOwnership(topic.chapter.subjectId, data.expectedSessionId, topic.chapter.classId || undefined)

  if (data.type === 'PDF' && data.mimeType !== 'application/pdf') throw new Error('Invalid MIME type for PDF')

  const extension = data.fileName.split('.').pop() || (data.type === 'PDF' ? 'pdf' : 'mp4')
  const storagePath = generateStoragePath(topic.chapter.subjectId, topic.chapterId, topic.id, extension)
  const bucket = data.type === 'PDF' ? 'learning-notes' : 'learning-videos'

  const created = data.type === 'PDF'
    ? await prisma.learningPdf.create({ data: { topicId: data.topicId, title: data.title, fileName: data.fileName, fileSize: data.fileSize, mimeType: data.mimeType, storagePath, status: ContentStatus.DRAFT } })
    : await prisma.learningVideo.create({ data: { topicId: data.topicId, title: data.title, storagePath, fileName: data.fileName, status: ContentStatus.DRAFT } })

  const uploadData = await createSignedUploadUrl(bucket, storagePath)
  return { success: true, resourceId: created.id, storagePath, signedUrl: uploadData.signedUrl, token: uploadData.token }
}

export async function confirmFileUpload(data: { resourceId: string, type: 'PDF' | 'VIDEO', expectedSessionId: string }) {
  if (data.type === 'PDF') {
    const pdf = await prisma.learningPdf.findUnique({ where: { id: data.resourceId }, include: { topic: { include: { chapter: { select: { subjectId: true, classId: true } } } } } })
    if (!pdf) throw new Error('PDF record not found')
    await verifyTeacherOwnership(pdf.topic.chapter.subjectId, data.expectedSessionId, pdf.topic.chapter.classId || undefined)

    await prisma.learningPdf.update({ where: { id: data.resourceId }, data: { status: ContentStatus.PUBLISHED } })
    revalidatePath(`/teacher/notes/${pdf.topic.chapter.subjectId}/chapter/${pdf.topic.chapterId}`)
  } else {
    const video = await prisma.learningVideo.findUnique({ where: { id: data.resourceId }, include: { topic: { include: { chapter: { select: { subjectId: true, classId: true } } } } } })
    if (!video) throw new Error('Video record not found')
    await verifyTeacherOwnership(video.topic.chapter.subjectId, data.expectedSessionId, video.topic.chapter.classId || undefined)

    await prisma.learningVideo.update({ where: { id: data.resourceId }, data: { status: ContentStatus.PUBLISHED } })
    revalidatePath(`/teacher/notes/${video.topic.chapter.subjectId}/chapter/${video.topic.chapterId}`)
  }
  return { success: true }
}

export async function cancelFileUpload(data: { resourceId: string, type: 'PDF' | 'VIDEO' }) {
  if (data.type === 'PDF') {
    await prisma.learningPdf.delete({ where: { id: data.resourceId, status: ContentStatus.DRAFT } })
  } else {
    await prisma.learningVideo.delete({ where: { id: data.resourceId, status: ContentStatus.DRAFT } })
  }
  return { success: true }
}

function validateExplanationAST(ast: any, currentDepth = 0): void {
  if (currentDepth > 5) throw new Error('Explanation AST exceeds maximum allowed nesting depth of 5')
  if (!Array.isArray(ast)) throw new Error('Explanation AST must be an array of nodes')

  for (const node of ast) {
    if (!node.type || (node.type !== 'text' && node.type !== 'annotation')) throw new Error(`Invalid node type: ${node.type}`)
    if (node.type === 'text' && typeof node.content !== 'string') throw new Error('Text node must contain string content')
    if (node.type === 'annotation') {
      if (typeof node.content !== 'string') throw new Error('Annotation node must have selected text')
      if (!node.explanation) throw new Error('Annotation node must have an explanation')
      validateExplanationAST(node.explanation, currentDepth + 1)
    }
  }
}

export async function saveExplanation(data: { topicId: string, ast: any, status: ContentStatus, expectedSessionId: string }) {
  const topic = await prisma.learningTopic.findUnique({ where: { id: data.topicId }, include: { chapter: { select: { subjectId: true, classId: true } } } })
  if (!topic) throw new Error('Topic not found')

  await verifyTeacherOwnership(topic.chapter.subjectId, data.expectedSessionId, topic.chapter.classId || undefined)

  validateExplanationAST(data.ast)
  const contentStr = JSON.stringify(data.ast)
  if (contentStr.length > 500000) throw new Error('Explanation payload too large')

  // Direct Prisma upsert instead of findUnique + if/else
  await prisma.learningExplanation.upsert({
    where: { topicId: data.topicId },
    update: {
      content: contentStr,
      status: data.status,
      ...(data.status === ContentStatus.PUBLISHED ? { publishedAt: new Date() } : {})
    },
    create: {
      topicId: data.topicId,
      content: contentStr,
      status: data.status,
      publishedAt: data.status === ContentStatus.PUBLISHED ? new Date() : null
    }
  })

  revalidatePath(`/teacher/notes/${topic.chapter.subjectId}/chapter/${topic.chapterId}`)
  return { success: true }
}
