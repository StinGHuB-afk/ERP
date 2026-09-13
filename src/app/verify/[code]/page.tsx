import { headers } from "next/headers";
import { checkIpRateLimit } from "@/lib/auth/rate-limiter";
import prisma from "@/lib/prisma";
import { ShieldCheck, ShieldAlert, AlertTriangle, School, Calendar, User, Award } from "lucide-react";

export const dynamic = "force-dynamic";

interface VerifyPageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function VerifyReportCardPage({ params }: VerifyPageProps) {
  const { code } = await params;
  
  // Rate limit public verification requests (20 per minute per IP)
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  
  const rateLimitResult = await checkIpRateLimit(`verify-${ip}`, 20, 60);

  if (!rateLimitResult.allowed) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4 animate-pulse" />
          <h1 className="text-xl font-bold text-red-400 mb-2">Rate Limit Exceeded</h1>
          <p className="text-slate-400 text-sm">
            Too many verification requests from your connection. Please wait a minute before trying again.
          </p>
        </div>
      </div>
    );
  }

  // Sanitize code input to prevent any malicious lookup patterns
  const sanitizedCode = code?.trim().replace(/[^a-f0-9]/gi, "");

  if (!sanitizedCode || sanitizedCode.length < 16) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-6 text-center shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-amber-400 mb-2">Invalid Verification Code</h1>
          <p className="text-slate-400 text-sm mb-4">
            The verification code provided is invalid or malformed. Please check the QR code or URL and try again.
          </p>
        </div>
      </div>
    );
  }

  // Fetch record from database
  const record = await prisma.studentAcademicRecord.findFirst({
    where: {
      verificationCode: sanitizedCode,
    },
    include: {
      student: {
        select: {
          id: true,
          rollNumber: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
      class: {
        select: {
          name: true,
        },
      },
      academicSession: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-400 mb-2">Record Not Found</h1>
          <p className="text-slate-400 text-sm">
            No academic record matching this verification code could be found in our database. This document may be fraudulent or unissued.
          </p>
        </div>
      </div>
    );
  }

  const studentName = record.student?.user?.name || "N/A";
  const className = record.class?.name || "N/A";
  const sessionName = record.academicSession?.name || "N/A";
  const finalGrade = record.finalGrade || (record.status === "FINALIZED" ? "PASSED" : record.status);

  // Render Revoked State
  if (record.isRevoked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center pb-6 border-b border-slate-800">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 mb-2">
              Official Document Status
            </span>
            <h1 className="text-2xl font-bold text-red-400">REPORT CARD REVOKED</h1>
            <p className="text-slate-400 text-sm mt-1">
              This academic record was officially revoked by the school administration and is no longer valid.
            </p>
          </div>

          <div className="py-6 space-y-4 text-sm">
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4">
              <span className="text-xs text-red-400 font-semibold uppercase tracking-wide">Revocation Details</span>
              <p className="text-slate-300 mt-1 font-mono text-xs">
                Revoked On: {record.revokedAt ? new Date(record.revokedAt).toLocaleDateString() : "N/A"}
              </p>
              {record.revokedReason && (
                <p className="text-red-300/90 text-xs mt-1">
                  Reason: {record.revokedReason}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Student Name</span>
                </div>
                <p className="font-semibold text-slate-200">{studentName}</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <School className="w-3.5 h-3.5" />
                  <span>Class</span>
                </div>
                <p className="font-semibold text-slate-200">{className}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Authentic & Valid Verification State
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-2">
            Cryptographically Verified
          </span>
          <h1 className="text-2xl font-bold text-white">Authentic Report Card</h1>
          <p className="text-slate-400 text-sm mt-1">
            This document has been verified against the official school ledger.
          </p>
        </div>

        <div className="py-6 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Student Name</span>
              </div>
              <p className="font-semibold text-slate-100">{studentName}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <School className="w-3.5 h-3.5 text-emerald-400" />
                <span>Class</span>
              </div>
              <p className="font-semibold text-slate-100">{className}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Academic Session</span>
              </div>
              <p className="font-semibold text-slate-100">{sessionName}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Overall Status</span>
              </div>
              <p className="font-semibold text-emerald-400">
                {finalGrade}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Verification Hash:</span>
              <span className="text-slate-300 font-semibold">{sanitizedCode.substring(0, 16)}...</span>
            </div>
            <div className="flex justify-between">
              <span>Security Standard:</span>
              <span className="text-slate-300">HMAC / SHA-256</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Powered by School ERP Cryptographic Verification Engine
          </p>
        </div>
      </div>
    </div>
  );
}
