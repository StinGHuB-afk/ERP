"use client"

import { Phone, Mail, Clock, MapPin, ShieldAlert, Headphones, FileText } from "lucide-react"

export type ContactCardItem = {
  title: string
  role: string
  email: string
  phone?: string
  hours?: string
  description?: string
  badgeText?: string
}

type ContactCardsProps = {
  contacts: ContactCardItem[]
  title?: string
}

export function ContactCards({ contacts, title = "Helpdesk & Office Directory" }: ContactCardsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Headphones className="h-4 w-4 text-blue-600" />
        {title}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((c, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-200 hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{c.title}</h4>
                <p className="text-xs font-medium text-blue-600">{c.role}</p>
              </div>
              {c.badgeText && (
                <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {c.badgeText}
                </span>
              )}
            </div>

            {c.description && <p className="text-xs text-slate-500 leading-normal">{c.description}</p>}

            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline truncate">
                  {c.email}
                </a>
              </div>
              {c.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <span>{c.phone}</span>
                </div>
              )}
              {c.hours && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{c.hours}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
