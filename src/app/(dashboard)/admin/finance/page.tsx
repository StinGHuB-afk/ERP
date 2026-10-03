import { getTransactions, getFeeStructures } from "@/app/actions/finance.actions"
import { getClasses } from "@/app/actions/admin"
import { verifySession } from "@/lib/auth/session"
import prisma from "@/lib/prisma"
import { CreateFeeDialog } from "./components/create-fee-dialog"
import { RecordTransactionDialog } from "./components/record-transaction-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Receipt,
  Landmark,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react"
import { getTenantModules } from "@/app/actions/entitlements.actions"
import { LockedModuleTeaser } from "@/components/ui/locked-module-teaser"

export const dynamic = "force-dynamic"

export default async function AdminFinancePage() {
  const session = await verifySession()

  const modules = await getTenantModules()
  if (!modules["FINANCE"]) {
    return <LockedModuleTeaser moduleName="Finance & Unified Ledger" />
  }

  const [transactions, feeStructures, classes] = await Promise.all([
    getTransactions(),
    getFeeStructures(),
    getClasses(),
  ])

  const tenantUsers = await prisma.user.findMany({
    where: session?.schoolId ? { schoolId: session.schoolId } : {},
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  })

  const totalRevenue = transactions
    .filter((t) => t.status === "COMPLETED" && t.type === "FEE_PAYMENT")
    .reduce((sum, t) => sum + t.amount, 0)

  const pendingCount = transactions.filter((t) => t.status === "PENDING").length
  const completedCount = transactions.filter((t) => t.status === "COMPLETED").length

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Financial Management & Unified Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Audit school financial transactions, track fee payments, and manage fee structure templates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CreateFeeDialog classes={classes} />
          <RecordTransactionDialog users={tenantUsers} />
        </div>
      </div>

      {/* Financial Metrics Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Revenue Collected
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xl font-bold text-slate-900">
              ₹{totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="rounded-md bg-emerald-50 p-2 text-emerald-600">
              <Landmark className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Fee Templates Defined
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xl font-bold text-slate-900">{feeStructures.length}</div>
            <div className="rounded-md bg-blue-50 p-2 text-blue-600">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xl font-bold text-slate-900">{completedCount}</div>
            <div className="rounded-md bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-xl font-bold text-slate-900">{pendingCount}</div>
            <div className="rounded-md bg-amber-50 p-2 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger value="ledger" className="text-xs font-medium px-4">
            Unified Transaction Ledger ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="structures" className="text-xs font-medium px-4">
            Fee Structure Templates ({feeStructures.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Ledger */}
        <TabsContent value="ledger" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Transaction Audit Trail
              </h2>
            </div>

            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <Receipt className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-800">No transactions recorded</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Transactions logged across fee payments, payouts, and refunds will appear here.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title & Description</TableHead>
                    <TableHead>User / Payer</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-xs text-slate-500 font-mono whitespace-nowrap" suppressHydrationWarning>
                        {new Date(txn.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-xs">{txn.title}</div>
                        {txn.description && (
                          <div className="text-[11px] text-slate-500">{txn.description}</div>
                        )}
                        {txn.referenceId && (
                          <div className="text-[10px] text-slate-400 font-mono">Ref: {txn.referenceId}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 text-xs">{txn.user?.name || "N/A"}</span>
                          <span className="text-[10px] text-slate-500">{txn.user?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${getTypeBadgeStyle(txn.type)}`}>
                          {txn.type === "FEE_PAYMENT" || txn.type === "FINE" ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {txn.type.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusVariant(txn.status)} className="text-[10px]">
                          {txn.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900 font-mono">
                        ₹{txn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Fee Structures */}
        <TabsContent value="structures" className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Configured Fee Structure Templates
              </h2>
            </div>

            {feeStructures.length === 0 ? (
              <div className="p-8 text-center">
                <FileSpreadsheet className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-800">No fee structures configured</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Define tuition, facility, or transport fee templates to invoice students.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Title</TableHead>
                    <TableHead className="text-center">Scope / Target Class</TableHead>
                    <TableHead className="text-center">Due Date</TableHead>
                    <TableHead className="text-center">Created At</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeStructures.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-semibold text-slate-900 text-xs">
                        {fee.title}
                      </TableCell>
                      <TableCell className="text-center">
                        {fee.class ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                            Class {fee.class.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                            School-Wide
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-600 font-mono" suppressHydrationWarning>
                        {new Date(fee.dueDate).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-center text-xs text-slate-500 font-mono" suppressHydrationWarning>
                        {new Date(fee.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900 font-mono">
                        ₹{fee.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getStatusVariant(status: string): "success" | "warning" | "destructive" | "secondary" {
  switch (status) {
    case "COMPLETED":
      return "success"
    case "PENDING":
      return "warning"
    case "FAILED":
      return "destructive"
    default:
      return "secondary"
  }
}

function getTypeBadgeStyle(type: string): string {
  switch (type) {
    case "FEE_PAYMENT":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "SALARY_PAYOUT":
      return "bg-purple-50 text-purple-700 border-purple-200"
    case "FINE":
      return "bg-orange-50 text-orange-700 border-orange-200"
    case "REFUND":
      return "bg-rose-50 text-rose-700 border-rose-200"
    default:
      return "bg-slate-100 text-slate-700 border-slate-200"
  }
}
