"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth/session";

/**
 * Ensures the current user has access to library operations.
 */
async function verifyLibraryAccess() {
  const session = await verifySession();
  
  if (!session) {
    throw new Error("Unauthorized");
  }

  // Assuming effectiveTenantId can be retrieved if needed, but we'll extract it from the user's schoolId for simplicity if not provided
  let schoolId = session.schoolId;
  
  // If we had a getEffectiveTenantId() method in session.ts we'd use it, 
  // but fallback to session.schoolId if not.
  if (!schoolId && session.role === "SUPERADMIN") {
    // For global SUPERADMIN they might need to provide a schoolId, or we fallback.
    // We will just require schoolId to be passed in to the actions.
  }
  
  return session;
}

export async function getBooks(schoolId: string) {
  try {
    await verifyLibraryAccess();
    return await prisma.book.findMany({
      where: { schoolId },
      orderBy: { title: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch books:", error);
    throw new Error("Failed to fetch books.");
  }
}

export async function getBorrowRecords(schoolId: string, userId?: string) {
  try {
    const session = await verifyLibraryAccess();
    
    // Students/Parents should only see their own records
    if (session.role === "STUDENT" || session.role === "PARENT") {
      userId = session.userId;
    }

    const where: any = { schoolId };
    if (userId) {
      where.userId = userId;
    }

    return await prisma.borrowRecord.findMany({
      where,
      include: {
        book: true,
        user: {
          select: { name: true, email: true, role: true }
        }
      },
      orderBy: { borrowedAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to fetch borrow records:", error);
    throw new Error("Failed to fetch borrow records.");
  }
}

export async function upsertBook(formData: FormData) {
  try {
    const session = await verifyLibraryAccess();
    if (!["SUPERADMIN", "ADMIN", "LIBRARIAN"].includes(session.role)) {
      throw new Error("Insufficient permissions to manage books.");
    }

    const id = formData.get("id") as string | null;
    const schoolId = formData.get("schoolId") as string;
    const title = formData.get("title") as string;
    const author = formData.get("author") as string;
    const isbn = formData.get("isbn") as string | null;
    const publisher = formData.get("publisher") as string | null;
    const rackNumber = formData.get("rackNumber") as string | null;
    const totalCopies = parseInt(formData.get("totalCopies") as string) || 1;

    if (!schoolId || !title || !author) {
      throw new Error("Missing required fields.");
    }

    if (id) {
      // Update
      const existing = await prisma.book.findUnique({ where: { id } });
      if (!existing) throw new Error("Book not found.");
      
      const difference = totalCopies - existing.totalCopies;
      const newAvailableCopies = existing.availableCopies + difference;

      if (newAvailableCopies < 0) {
        throw new Error("Cannot reduce total copies below currently borrowed amount.");
      }

      await prisma.book.update({
        where: { id },
        data: {
          title, author, isbn, publisher, rackNumber, totalCopies,
          availableCopies: newAvailableCopies
        }
      });
    } else {
      // Create
      await prisma.book.create({
        data: {
          schoolId, title, author, isbn, publisher, rackNumber, 
          totalCopies, availableCopies: totalCopies
        }
      });
    }

    revalidatePath("/admin/library");
    revalidatePath("/librarian/catalog");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to upsert book:", error);
    return { error: error.message };
  }
}

export async function borrowBook(bookId: string, userId: string, schoolId: string, dueDate: Date) {
  try {
    const session = await verifyLibraryAccess();
    if (!["SUPERADMIN", "ADMIN", "LIBRARIAN"].includes(session.role)) {
      throw new Error("Insufficient permissions to issue books.");
    }

    return await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({ where: { id: bookId } });
      if (!book) throw new Error("Book not found");
      if (book.schoolId !== schoolId) throw new Error("Book does not belong to this school");
      if (book.availableCopies <= 0) throw new Error("No available copies of this book");

      // Decrement available copies
      await tx.book.update({
        where: { id: bookId },
        data: { availableCopies: { decrement: 1 } }
      });

      // Create borrow record
      const record = await tx.borrowRecord.create({
        data: {
          schoolId,
          bookId,
          userId,
          dueDate,
          status: "BORROWED"
        }
      });

      return record;
    });
  } catch (error: any) {
    console.error("Failed to borrow book:", error);
    return { error: error.message };
  } finally {
    revalidatePath("/admin/library");
    revalidatePath("/librarian/circulation");
  }
}

export async function returnBook(borrowRecordId: string, isLost: boolean = false, fineAmount: number = 0) {
  try {
    const session = await verifyLibraryAccess();
    if (!["SUPERADMIN", "ADMIN", "LIBRARIAN"].includes(session.role)) {
      throw new Error("Insufficient permissions to process returns.");
    }

    return await prisma.$transaction(async (tx) => {
      const record = await tx.borrowRecord.findUnique({ where: { id: borrowRecordId } });
      if (!record) throw new Error("Borrow record not found");
      if (record.status !== "BORROWED") throw new Error("Book is not currently borrowed");

      const status = isLost ? "LOST" : "RETURNED";

      // Update borrow record
      const updatedRecord = await tx.borrowRecord.update({
        where: { id: borrowRecordId },
        data: {
          status,
          returnedAt: new Date(),
          fineAmount
        }
      });

      // If not lost, increment available copies
      if (!isLost) {
        await tx.book.update({
          where: { id: record.bookId },
          data: { availableCopies: { increment: 1 } }
        });
      }

      return updatedRecord;
    });
  } catch (error: any) {
    console.error("Failed to return book:", error);
    return { error: error.message };
  } finally {
    revalidatePath("/admin/library");
    revalidatePath("/librarian/circulation");
  }
}
