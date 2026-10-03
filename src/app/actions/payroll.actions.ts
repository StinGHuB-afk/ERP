"use server"

import prisma from "@/lib/prisma"
import { verifySession, getEffectiveTenantId } from "@/lib/auth/session"
import { enforceModuleAccess } from "@/app/actions/entitlements.actions"
import { Role, PayrollStatus, PayslipStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"

/**
 * Creates or updates a staff member's salary structure.
 * Enforces ADMIN/SUPERADMIN authorization and tenant isolation.
 */
export async function upsertSalaryStructure(formData: FormData) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      throw new Error("Unauthorized: Authentication required.")
    }

    if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
      throw new Error("Forbidden: Admin privileges required.")
    }

    const schoolId = await getEffectiveTenantId()
    if (!schoolId) {
      throw new Error("Unauthorized: Active tenant context required.")
    }

    await enforceModuleAccess("PAYROLL")

    const targetUserId =
      formData.get("targetUserId")?.toString() ||
      formData.get("userId")?.toString() ||
      ""

    if (!targetUserId) {
      throw new Error("Target staff user ID is required.")
    }

    const baseSalaryRaw = Number(formData.get("baseSalary"))
    const allowancesRaw = Number(formData.get("allowances"))
    const deductionsRaw = Number(formData.get("deductions"))

    const baseSalary = isNaN(baseSalaryRaw) ? 0 : Math.max(0, baseSalaryRaw)
    const allowances = isNaN(allowancesRaw) ? 0 : Math.max(0, allowancesRaw)
    const deductions = isNaN(deductionsRaw) ? 0 : Math.max(0, deductionsRaw)

    const netSalary = Math.max(0, baseSalary + allowances - deductions)

    // Verify target user belongs to the same tenant context
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, schoolId },
      select: { id: true },
    })

    if (!targetUser) {
      throw new Error("Target user not found within current school tenant.")
    }

    const structure = await prisma.salaryStructure.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        schoolId,
        baseSalary,
        allowances,
        deductions,
        netSalary,
      },
      update: {
        schoolId,
        baseSalary,
        allowances,
        deductions,
        netSalary,
      },
    })

    revalidatePath("/admin/payroll")
    revalidatePath("/admin/finance")

    return { success: true, data: structure }
  } catch (error: any) {
    console.error("Error in upsertSalaryStructure:", error)
    return { success: false, error: error.message || "Failed to update salary structure." }
  }
}

/**
 * Generates a DRAFT PayrollRun for a specified month and year.
 * Prevents duplicate payroll runs for the same school, month, and year.
 */
export async function generatePayrollRun(month: number, year: number) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      throw new Error("Unauthorized: Authentication required.")
    }

    if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
      throw new Error("Forbidden: Admin privileges required.")
    }

    const schoolId = await getEffectiveTenantId()
    if (!schoolId) {
      throw new Error("Unauthorized: Active tenant context required.")
    }

    await enforceModuleAccess("PAYROLL")

    const monthNum = Number(month)
    const yearNum = Number(year)

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      throw new Error("Invalid month provided. Must be between 1 and 12.")
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      throw new Error("Invalid year provided.")
    }

    // Edge Case Guard: Check if a payroll run already exists for this tenant, month & year
    const existingRun = await prisma.payrollRun.findUnique({
      where: {
        schoolId_month_year: {
          schoolId,
          month: monthNum,
          year: yearNum,
        },
      },
    })

    if (existingRun) {
      throw new Error("Payroll for this month already exists")
    }

    // Fetch all configured salary structures for this school
    const salaryStructures = await prisma.salaryStructure.findMany({
      where: { schoolId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    if (salaryStructures.length === 0) {
      throw new Error("No salary structures defined for staff")
    }

    const totalAmount = salaryStructures.reduce((sum, s) => sum + s.netSalary, 0)

    // Execute atomic creation of PayrollRun and individual Payslips
    const payrollRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({
        data: {
          schoolId,
          month: monthNum,
          year: yearNum,
          status: PayrollStatus.DRAFT,
          totalAmount,
        },
      })

      await tx.payslip.createMany({
        data: salaryStructures.map((struct) => ({
          payrollRunId: run.id,
          userId: struct.userId,
          schoolId,
          baseSalary: struct.baseSalary,
          allowances: struct.allowances,
          deductions: struct.deductions,
          netPay: struct.netSalary,
          status: PayslipStatus.PENDING,
        })),
      })

      return run
    })

    revalidatePath("/admin/payroll")
    revalidatePath("/admin/finance")

    return { success: true, data: payrollRun }
  } catch (error: any) {
    console.error("Error in generatePayrollRun:", error)
    return { success: false, error: error.message || "Failed to generate payroll run." }
  }
}

/**
 * Executes payroll payout: marks PayrollRun as COMPLETED, creates Transaction ledger records,
 * and sets all payslips to PAID within an atomic $transaction.
 */
export async function executePayrollPayout(payrollRunId: string) {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      throw new Error("Unauthorized: Authentication required.")
    }

    if (session.role !== Role.ADMIN && session.role !== Role.SUPERADMIN) {
      throw new Error("Forbidden: Admin privileges required.")
    }

    const schoolId = await getEffectiveTenantId()
    if (!schoolId) {
      throw new Error("Unauthorized: Active tenant context required.")
    }

    await enforceModuleAccess("PAYROLL")

    if (!payrollRunId) {
      throw new Error("Payroll run ID is required.")
    }

    const payrollRun = await prisma.payrollRun.findFirst({
      where: { id: payrollRunId, schoolId },
      include: { payslips: true },
    })

    if (!payrollRun) {
      throw new Error("Payroll run not found for this tenant.")
    }

    if (payrollRun.status !== PayrollStatus.DRAFT) {
      throw new Error("Payroll run has already been processed or completed.")
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark PayrollRun as COMPLETED
      await tx.payrollRun.update({
        where: { id: payrollRun.id },
        data: { status: PayrollStatus.COMPLETED },
      })

      // 2. Loop through each payslip to create Transaction ledger entries and mark payslips as PAID
      for (const payslip of payrollRun.payslips) {
        const transaction = await tx.transaction.create({
          data: {
            schoolId,
            userId: payslip.userId,
            amount: payslip.netPay,
            type: "SALARY_PAYOUT",
            status: "COMPLETED",
            title: `Salary Payout - ${payrollRun.month}/${payrollRun.year}`,
            description: `Automated salary payout for user ID ${payslip.userId}`,
            referenceId: `PAYSLIP-${payslip.id}`,
          },
        })

        await tx.payslip.update({
          where: { id: payslip.id },
          data: {
            status: PayslipStatus.PAID,
            transactionId: transaction.id,
          },
        })
      }
    })

    revalidatePath("/admin/payroll")
    revalidatePath("/admin/finance")

    return { success: true }
  } catch (error: any) {
    console.error("Error in executePayrollPayout:", error)
    return { success: false, error: error.message || "Failed to execute payroll payout." }
  }
}

/**
 * Fetches dashboard data for Payroll Management: salary structures, payroll runs,
 * and unconfigured staff members within the active school tenant.
 */
export async function getPayrollDashboardData() {
  try {
    const session = await verifySession()
    if (!session || !session.isAuth) {
      return { salaryStructures: [], payrollRuns: [], unconfiguredStaff: [] }
    }

    const schoolId = await getEffectiveTenantId()
    if (!schoolId) {
      return { salaryStructures: [], payrollRuns: [], unconfiguredStaff: [] }
    }

    const salaryStructures = await prisma.salaryStructure.findMany({
      where: { schoolId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const payrollRuns = await prisma.payrollRun.findMany({
      where: { schoolId },
      include: {
        payslips: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
            transaction: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })

    const configuredUserIds = salaryStructures.map((s) => s.userId)

    const unconfiguredStaff = await prisma.user.findMany({
      where: {
        schoolId,
        role: { in: [Role.TEACHER, Role.ADMIN] },
        isArchived: false,
        id: { notIn: configuredUserIds.length > 0 ? configuredUserIds : ["__none__"] },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    })

    return {
      salaryStructures,
      payrollRuns,
      unconfiguredStaff,
    }
  } catch (error: any) {
    console.error("Error in getPayrollDashboardData:", error)
    return { salaryStructures: [], payrollRuns: [], unconfiguredStaff: [] }
  }
}
