"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  upsertSalaryStructure,
  generatePayrollRun,
  executePayrollPayout,
} from "@/app/actions/payroll.actions"
import {
  DollarSign,
  Users,
  UserCheck,
  UserX,
  Calendar,
  Play,
  CheckCircle2,
  Clock,
  Plus,
  Edit,
  Eye,
  AlertCircle,
  TrendingUp,
} from "lucide-react"

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

interface StaffUser {
  id: string
  name: string | null
  email: string
  role: string
}

interface SalaryStructureItem {
  id: string
  userId: string
  schoolId: string
  baseSalary: number
  allowances: number
  deductions: number
  netSalary: number
  createdAt: string | Date
  user: StaffUser
}

interface PayslipItem {
  id: string
  payrollRunId: string
  userId: string
  baseSalary: number
  allowances: number
  deductions: number
  netPay: number
  status: "PENDING" | "PAID"
  transactionId?: string | null
  user: StaffUser
  transaction?: {
    id: string
    referenceId?: string | null
  } | null
}

interface PayrollRunItem {
  id: string
  schoolId: string
  month: number
  year: number
  status: "DRAFT" | "COMPLETED"
  totalAmount: number
  runDate: string | Date
  payslips: PayslipItem[]
}

interface PayrollDashboardClientProps {
  initialData: {
    salaryStructures: SalaryStructureItem[]
    payrollRuns: PayrollRunItem[]
    unconfiguredStaff: StaffUser[]
  }
}

export function PayrollDashboardClient({ initialData }: PayrollDashboardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // State
  const { salaryStructures, payrollRuns, unconfiguredStaff } = initialData

  // Feedback messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Generate Run Form State
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(currentDate.getMonth() + 1)
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    String(currentDate.getFullYear())
  )

  // Modal State for Salary Setup/Edit
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string>("")
  const [editingUserName, setEditingUserName] = useState<string>("")
  const [baseSalaryInput, setBaseSalaryInput] = useState<string>("0")
  const [allowancesInput, setAllowancesInput] = useState<string>("0")
  const [deductionsInput, setDeductionsInput] = useState<string>("0")

  // Modal State for View Payslips
  const [selectedRunForView, setSelectedRunForView] = useState<PayrollRunItem | null>(null)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val)
  }

  // Calculate Overview Metrics
  const activeCount = salaryStructures.length
  const pendingCount = unconfiguredStaff.length
  const totalMonthlyPayroll = salaryStructures.reduce(
    (sum, s) => sum + s.netSalary,
    0
  )

  // Handlers
  const handleOpenSalaryModal = (user: StaffUser, existingStructure?: SalaryStructureItem) => {
    setErrorMsg(null)
    setEditingUserId(user.id)
    setEditingUserName(user.name || user.email)

    if (existingStructure) {
      setBaseSalaryInput(String(existingStructure.baseSalary))
      setAllowancesInput(String(existingStructure.allowances))
      setDeductionsInput(String(existingStructure.deductions))
    } else {
      setBaseSalaryInput("3000")
      setAllowancesInput("300")
      setDeductionsInput("100")
    }
    setIsSalaryModalOpen(true)
  }

  const handleSaveSalaryStructure = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const formData = new FormData()
    formData.append("targetUserId", editingUserId)
    formData.append("baseSalary", baseSalaryInput)
    formData.append("allowances", allowancesInput)
    formData.append("deductions", deductionsInput)

    startTransition(async () => {
      const res = await upsertSalaryStructure(formData)
      if (res.success) {
        setSuccessMsg("Salary structure updated successfully.")
        setIsSalaryModalOpen(false)
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to update salary structure.")
      }
    })
  }

  const handleGeneratePayrollRun = () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const m = parseInt(selectedMonth, 10)
    const y = parseInt(selectedYear, 10)

    startTransition(async () => {
      const res = await generatePayrollRun(m, y)
      if (res.success) {
        setSuccessMsg(`Draft payroll run for ${MONTH_NAMES[m - 1]} ${y} created!`)
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to generate payroll run.")
      }
    })
  }

  const handleExecutePayout = (payrollRunId: string, month: number, year: number) => {
    if (
      !confirm(
        `Are you sure you want to execute payout for ${MONTH_NAMES[month - 1]} ${year}? This will create ledger transactions and mark all payslips as PAID.`
      )
    ) {
      return
    }

    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await executePayrollPayout(payrollRunId)
      if (res.success) {
        setSuccessMsg(`Payout completed for ${MONTH_NAMES[month - 1]} ${year}. Ledger updated!`)
        router.refresh()
      } else {
        setErrorMsg(res.error || "Failed to execute payout.")
      }
    })
  }

  const calculatedNetPreview = Math.max(
    0,
    (Number(baseSalaryInput) || 0) +
      (Number(allowancesInput) || 0) -
      (Number(deductionsInput) || 0)
  )

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs Container */}
      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="overview" className="text-xs font-semibold">
            Overview
          </TabsTrigger>
          <TabsTrigger value="structures" className="text-xs font-semibold">
            Salary Structures ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="runs" className="text-xs font-semibold">
            Payroll Runs ({payrollRuns.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Salary Structures
                </CardTitle>
                <UserCheck className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{activeCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Configured staff profiles</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Setup
                </CardTitle>
                <UserX className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{pendingCount}</div>
                <p className="text-[11px] text-slate-500 mt-1">Staff awaiting salary structure</p>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Monthly Payroll
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(totalMonthlyPayroll)}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Sum of active net salaries</p>
              </CardContent>
            </Card>
          </div>

          {/* Action Card: Generate Payroll Run */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base font-bold text-slate-900">
                  Generate Monthly Payroll Run
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Select the target month and year to generate an itemized DRAFT payroll run for all configured staff members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-end gap-4 max-w-xl">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Month</Label>
                  <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
                    <SelectTrigger className="h-9 bg-white text-xs">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((mName, idx) => (
                        <SelectItem key={idx + 1} value={String(idx + 1)} className="text-xs">
                          {mName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-32 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Year</Label>
                  <Select value={selectedYear} onValueChange={(val) => val && setSelectedYear(val)}>
                    <SelectTrigger className="h-9 bg-white text-xs">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025" className="text-xs">2025</SelectItem>
                      <SelectItem value="2026" className="text-xs">2026</SelectItem>
                      <SelectItem value="2027" className="text-xs">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGeneratePayrollRun}
                  disabled={isPending || activeCount === 0}
                  className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  {isPending ? "Generating..." : "Generate Run"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: SALARY STRUCTURES */}
        <TabsContent value="structures" className="space-y-6">
          {/* Active Configured Structures Table */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Configured Staff Salary Structures
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Staff members with an active base salary, allowances, and deductions.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {salaryStructures.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No salary structures have been created yet. Set up salary structures below.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-xs font-semibold text-slate-700">Staff Member</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Role</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Base Salary</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Allowances</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Deductions</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Net Salary</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryStructures.map((struct) => (
                      <TableRow key={struct.id}>
                        <TableCell className="py-3">
                          <div className="font-semibold text-xs text-slate-900">{struct.user.name || "Staff Member"}</div>
                          <div className="text-[11px] text-slate-500">{struct.user.email}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {struct.user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-xs font-medium text-slate-800">
                          {formatCurrency(struct.baseSalary)}
                        </TableCell>
                        <TableCell className="py-3 text-xs font-medium text-emerald-600">
                          +{formatCurrency(struct.allowances)}
                        </TableCell>
                        <TableCell className="py-3 text-xs font-medium text-red-600">
                          -{formatCurrency(struct.deductions)}
                        </TableCell>
                        <TableCell className="py-3 text-xs font-bold text-slate-900">
                          {formatCurrency(struct.netSalary)}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenSalaryModal(struct.user, struct)}
                            className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Unconfigured Staff Table */}
          {unconfiguredStaff.length > 0 && (
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900">
                  Unconfigured Staff ({unconfiguredStaff.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Staff members who require a salary structure configuration before payroll generation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-xs font-semibold text-slate-700">Staff Member</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Role</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unconfiguredStaff.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="py-3">
                          <div className="font-semibold text-xs text-slate-900">{staff.name || "Staff Member"}</div>
                          <div className="text-[11px] text-slate-500">{staff.email}</div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {staff.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
                            Pending Setup
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleOpenSalaryModal(staff)}
                            className="h-7 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Setup Salary
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: PAYROLL RUNS */}
        <TabsContent value="runs" className="space-y-6">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Historical Payroll Runs
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Review monthly payroll batches, itemized staff payslips, and execute payouts to the master ledger.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payrollRuns.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No payroll runs generated yet. Generate your first payroll run from the Overview tab.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-xs font-semibold text-slate-700">Period</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Staff Count</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Total Amount</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Run Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="py-3">
                          <div className="font-bold text-xs text-slate-900">
                            {MONTH_NAMES[run.month - 1]} {run.year}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-xs font-medium text-slate-700">
                          {run.payslips.length} Staff
                        </TableCell>
                        <TableCell className="py-3 text-xs font-bold text-slate-900">
                          {formatCurrency(run.totalAmount)}
                        </TableCell>
                        <TableCell className="py-3 text-xs text-slate-500">
                          {new Date(run.runDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-3">
                          {run.status === "COMPLETED" ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              PAID
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold gap-1">
                              <Clock className="h-3 w-3 text-amber-600" />
                              DRAFT
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRunForView(run)}
                              className="h-7 text-xs gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Payslips
                            </Button>

                            {run.status === "DRAFT" && (
                              <Button
                                size="sm"
                                onClick={() => handleExecutePayout(run.id, run.month, run.year)}
                                disabled={isPending}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              >
                                <Play className="h-3.5 w-3.5 mr-1" />
                                Execute Payout
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: SETUP / EDIT SALARY STRUCTURE */}
      <Dialog open={isSalaryModalOpen} onOpenChange={setIsSalaryModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Configure Salary Structure
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set the base salary, monthly allowances, and deductions for {editingUserName}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSalaryStructure} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Staff Member</Label>
              <Input value={editingUserName} disabled className="bg-slate-100 text-xs font-medium" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Base Salary ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={baseSalaryInput}
                onChange={(e) => setBaseSalaryInput(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Allowances ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={allowancesInput}
                  onChange={(e) => setAllowancesInput(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Deductions ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deductionsInput}
                  onChange={(e) => setDeductionsInput(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Live Computed Net Salary Preview */}
            <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Calculated Net Salary:</span>
              <span className="text-base font-bold text-emerald-600">
                {formatCurrency(calculatedNetPreview)}
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSalaryModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isPending ? "Saving..." : "Save Salary Structure"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: ITEMISED PAYSLIPS VIEW */}
      <Dialog
        open={Boolean(selectedRunForView)}
        onOpenChange={(open) => !open && setSelectedRunForView(null)}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Itemized Payslips breakdown —{" "}
              {selectedRunForView && `${MONTH_NAMES[selectedRunForView.month - 1]} ${selectedRunForView.year}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Individual staff payslips for this batch run.
            </DialogDescription>
          </DialogHeader>

          {selectedRunForView && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Total Batch Amount</div>
                  <div className="text-lg font-bold text-slate-900">
                    {formatCurrency(selectedRunForView.totalAmount)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 text-right">Status</div>
                  {selectedRunForView.status === "COMPLETED" ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                      COMPLETED / PAID
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold">
                      DRAFT
                    </Badge>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-xs font-semibold text-slate-700">Staff Member</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Base</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Allowances</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Deductions</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700">Net Pay</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-700 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRunForView.payslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell className="py-2.5">
                        <div className="font-semibold text-xs text-slate-900">
                          {payslip.user?.name || "Staff Member"}
                        </div>
                        <div className="text-[10px] text-slate-500">{payslip.user?.email}</div>
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-slate-700">
                        {formatCurrency(payslip.baseSalary)}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-emerald-600 font-medium">
                        +{formatCurrency(payslip.allowances)}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs text-red-600 font-medium">
                        -{formatCurrency(payslip.deductions)}
                      </TableCell>
                      <TableCell className="py-2.5 text-xs font-bold text-slate-900">
                        {formatCurrency(payslip.netPay)}
                      </TableCell>
                      <TableCell className="py-2.5 text-right">
                        {payslip.status === "PAID" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                            PAID
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-semibold">
                            PENDING
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRunForView(null)}
              className="text-xs h-8"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
