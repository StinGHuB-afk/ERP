import { upsertAttendance, UpsertAttendanceInput } from "@/app/actions/attendance"

export interface OfflineAttendanceItem extends UpsertAttendanceInput {
  timestamp: number
}

const QUEUE_STORAGE_KEY = "offlineAttendanceQueue"

export function getOfflineQueue(): OfflineAttendanceItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error("Failed to read offline attendance queue from localStorage:", err)
    return []
  }
}

export function addToOfflineQueue(item: UpsertAttendanceInput): OfflineAttendanceItem[] {
  if (typeof window === "undefined") return []
  try {
    const current = getOfflineQueue()
    // Replace duplicate pending item for same student and date if present
    const filtered = current.filter(
      (q) => !(q.studentId === item.studentId && q.date === item.date)
    )
    const newItem: OfflineAttendanceItem = { ...item, timestamp: Date.now() }
    const updated = [...filtered, newItem]
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error("Failed to add item to offline attendance queue:", err)
    return []
  }
}

export function clearOfflineQueue(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY)
  } catch (err) {
    console.error("Failed to clear offline queue:", err)
  }
}

export async function syncOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
  if (typeof window === "undefined") return { syncedCount: 0, remainingCount: 0 }

  const queue = getOfflineQueue()
  if (queue.length === 0) return { syncedCount: 0, remainingCount: 0 }

  const remainingItems: OfflineAttendanceItem[] = []
  let syncedCount = 0

  for (const item of queue) {
    try {
      const res = await upsertAttendance(item)
      if (res.error) {
        console.error(`Failed to sync item for student ${item.studentId}:`, res.error)
        remainingItems.push(item)
      } else {
        syncedCount++
      }
    } catch (err) {
      console.error(`Network error syncing item for student ${item.studentId}:`, err)
      remainingItems.push(item)
    }
  }

  if (remainingItems.length > 0) {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingItems))
  } else {
    clearOfflineQueue()
  }

  return { syncedCount, remainingCount: remainingItems.length }
}
