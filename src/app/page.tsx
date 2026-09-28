import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/auth/session'
import prisma from '@/lib/prisma'

export default async function Home() {
  let session = null
  try {
    session = await verifySession()
  } catch (error) {
    session = null
  }

  if (!session?.userId) {
    redirect('/login')
  }

  let dbUser = null
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    })
  } catch (error) {
    dbUser = null
  }

  if (!dbUser) {
    redirect('/login')
  }

  if (dbUser.role === 'SUPERADMIN') redirect('/superadmin')
  if (dbUser.role === 'ADMIN') redirect('/admin')
  if (dbUser.role === 'TEACHER') redirect('/teacher')
  if (dbUser.role === 'STUDENT') redirect('/student')
  if (dbUser.role === 'PARENT') redirect('/parent')

  redirect('/login')
}
