"use server"

import prisma from "@/lib/prisma"
import { getEffectiveTenantId, verifySession } from "@/lib/auth/session"
import { revalidatePath } from "next/cache"

export async function getTenantModules(): Promise<Record<string, boolean>> {
  const schoolId = await getEffectiveTenantId()
  
  if (!schoolId) {
    return {}
  }

  const modules = await prisma.tenantModule.findMany({
    where: { schoolId }
  })

  const result: Record<string, boolean> = {}
  for (const mod of modules) {
    result[mod.moduleKey] = mod.isEnabled
  }

  return result
}

export async function enforceModuleAccess(moduleKey: string) {
  const schoolId = await getEffectiveTenantId()
  if (!schoolId) {
    throw new Error("Unauthorized: Active tenant context required.")
  }

  const moduleEntitlement = await prisma.tenantModule.findUnique({
    where: {
      schoolId_moduleKey: {
        schoolId,
        moduleKey
      }
    }
  })

  if (!moduleEntitlement || !moduleEntitlement.isEnabled) {
    throw new Error("MODULE_DISABLED:" + moduleKey)
  }
}

export async function toggleTenantModule(targetSchoolId: string, moduleKey: string, isEnabled: boolean) {
  const session = await verifySession()
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Unauthorized: SUPERADMIN privileges required.")
  }

  await prisma.tenantModule.upsert({
    where: {
      schoolId_moduleKey: {
        schoolId: targetSchoolId,
        moduleKey
      }
    },
    update: {
      isEnabled
    },
    create: {
      schoolId: targetSchoolId,
      moduleKey,
      isEnabled
    }
  })

  revalidatePath('/', 'layout')
}

export async function getModulesForSchool(targetSchoolId: string): Promise<Record<string, boolean>> {
  const session = await verifySession()
  if (!session || session.role !== "SUPERADMIN") {
    throw new Error("Unauthorized: SUPERADMIN privileges required.")
  }

  const modules = await prisma.tenantModule.findMany({
    where: { schoolId: targetSchoolId }
  })

  const result: Record<string, boolean> = {}
  for (const mod of modules) {
    result[mod.moduleKey] = mod.isEnabled
  }

  return result
}
