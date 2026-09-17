"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createChapter, createTopic, updateTopic, requestFileUploadUrl, confirmFileUpload, saveExplanation } from "@/app/actions/notes"
import { Loader2, Plus, FileText, Video, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { ExplanationEditor } from "@/components/ui/explanation-editor"
import { ASTNode } from "@/components/ui/explanation-renderer"

export interface ManagerTopic {
  id: string
  title: string
  status: string
  explanation?: { content: string } | null
}

export interface ManagerChapter {
  id: string
  title: string
  topics?: ManagerTopic[]
}

export function TeacherHubManager({ subjectId, activeSessionId, initialChapters, classId }: { subjectId: string; activeSessionId: string; initialChapters: ManagerChapter[]; classId?: string }) {
  const router = useRouter()
  const [newChapterTitle, setNewChapterTitle] = useState("")
  const [newTopicTitle, setNewTopicTitle] = useState("")
  const [creatingTopicFor, setCreatingTopicFor] = useState<string | null>(null)
  const [isCreatingChapter, setIsCreatingChapter] = useState(false)
  const [uploadingTopicId, setUploadingTopicId] = useState<string | null>(null)
  const [editingExplanationFor, setEditingExplanationFor] = useState<string | null>(null)
  const [explanationData, setExplanationData] = useState<ASTNode[]>([])

  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim()) return
    try {
      setIsCreatingChapter(true)
      await createChapter({ subjectId, classId, academicSessionId: activeSessionId, title: newChapterTitle })
      toast.success("Chapter created!")
      setNewChapterTitle("")
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create chapter")
    } finally {
      setIsCreatingChapter(false)
    }
  }

  const handleCreateTopic = async (chapterId: string) => {
    if (!newTopicTitle.trim()) return
    try {
      await createTopic({ chapterId, title: newTopicTitle, expectedSessionId: activeSessionId })
      toast.success("Topic created!")
      setNewTopicTitle("")
      setCreatingTopicFor(null)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create topic")
    }
  }

  const handlePublishTopic = async (topicId: string, currentTitle: string) => {
    try {
      await updateTopic(topicId, { title: currentTitle, status: "PUBLISHED", expectedSessionId: activeSessionId })
      toast.success("Published!")
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to publish")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, topicId: string, type: "PDF" | "VIDEO") => {
    const file = e.target.files?.[0]
    if (!file) return
    if (type === "PDF" && file.type !== "application/pdf") return toast.error("File must be a PDF")

    try {
      setUploadingTopicId(topicId)
      const { resourceId, signedUrl } = await requestFileUploadUrl({
        topicId,
        title: file.name,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        type,
        expectedSessionId: activeSessionId,
      })

      const uploadRes = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
      if (!uploadRes.ok) throw new Error("Upload failed")

      await confirmFileUpload({ resourceId, type, expectedSessionId: activeSessionId })
      toast.success("Upload complete!")
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadingTopicId(null)
    }
  }

  const handleSaveExplanation = async (topicId: string) => {
    try {
      await saveExplanation({ topicId, ast: explanationData, status: "PUBLISHED", expectedSessionId: activeSessionId })
      toast.success("Explanation saved!")
      setEditingExplanationFor(null)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save explanation")
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-md border">
        <h2 className="text-xl font-semibold">Chapters</h2>
        <div className="flex gap-2">
          <Input placeholder="New Chapter Title" value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} />
          <Button onClick={handleCreateChapter} disabled={isCreatingChapter}>
            {isCreatingChapter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Add Chapter
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {initialChapters.map((chapter) => (
          <div key={chapter.id} className="border rounded-md shadow-sm bg-white overflow-hidden">
            <div className="bg-slate-100 p-4 border-b font-medium text-lg flex justify-between">
              {chapter.title}
              <Button variant="outline" size="sm" onClick={() => setCreatingTopicFor(chapter.id)}>
                <Plus className="h-4 w-4 mr-2" /> Add Topic
              </Button>
            </div>

            <div className="p-4 space-y-4">
              {creatingTopicFor === chapter.id && (
                <div className="flex gap-2 bg-slate-50 p-2 rounded-md border">
                  <Input placeholder="New Topic Title" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} />
                  <Button onClick={() => handleCreateTopic(chapter.id)}>Save Topic</Button>
                  <Button variant="ghost" onClick={() => setCreatingTopicFor(null)}>Cancel</Button>
                </div>
              )}

              {chapter.topics?.map((topic) => (
                <div key={topic.id} className="border border-slate-200 rounded-md p-4 bg-slate-50">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="font-semibold text-lg">{topic.title}</h3>
                    <div className="flex gap-2 items-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${topic.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {topic.status}
                      </span>
                      {topic.status !== "PUBLISHED" && (
                        <Button variant="outline" size="sm" onClick={() => handlePublishTopic(topic.id, topic.title)}>Publish</Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm text-slate-500 mb-2 uppercase flex items-center gap-1"><FileText className="h-4 w-4" /> PDFs</h4>
                      <div className="flex items-center gap-2">
                        <Input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, topic.id, "PDF")} disabled={uploadingTopicId === topic.id} />
                        {uploadingTopicId === topic.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-slate-500 mb-2 uppercase flex items-center gap-1"><Video className="h-4 w-4" /> Videos</h4>
                      <Input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, topic.id, "VIDEO")} disabled={uploadingTopicId === topic.id} />
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-slate-500 mb-2 uppercase flex items-center gap-1"><MessageSquare className="h-4 w-4" /> AST Explanation</h4>
                      {topic.explanation ? (
                        <Button variant="outline" size="sm" onClick={() => { setExplanationData(JSON.parse(topic.explanation!.content)); setEditingExplanationFor(topic.id) }}>Edit Explanation</Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => { setExplanationData([{ type: "text", content: "Start typing..." }]); setEditingExplanationFor(topic.id) }}>Create Explanation</Button>
                      )}

                      {editingExplanationFor === topic.id && (
                        <div className="mt-4 p-4 border-2 border-blue-200 bg-blue-50 rounded-md space-y-4">
                          <ExplanationEditor initialNodes={explanationData} onChange={setExplanationData} />
                          <div className="flex gap-2">
                            <Button onClick={() => handleSaveExplanation(topic.id)}>Save AST</Button>
                            <Button variant="ghost" onClick={() => setEditingExplanationFor(null)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
