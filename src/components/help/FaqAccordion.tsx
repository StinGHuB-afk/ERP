"use client"

import { useState } from "react"
import { Search, ChevronDown, HelpCircle, BookOpen, ShieldCheck, Cpu } from "lucide-react"
import { Input } from "@/components/ui/input"

export type FaqItem = {
  id: string
  question: string
  answer: string
  category: string
  tags?: string[]
}

type FaqAccordionProps = {
  faqs: FaqItem[]
  categories?: string[]
  title?: string
  subtitle?: string
}

export function FaqAccordion({
  faqs,
  categories,
  title = "Frequently Asked Questions",
  subtitle = "Find quick answers to common questions and workflows.",
}: FaqAccordionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  const allCategories = categories || Array.from(new Set(faqs.map((f) => f.category)))

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === "ALL" || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30">
            <HelpCircle className="h-6 w-6 text-blue-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <p className="text-sm text-blue-200">{subtitle}</p>
          </div>
        </div>

        <div className="relative mt-4 max-w-xl">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search FAQs, guides, terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-blue-200/60 focus-visible:ring-blue-400 h-10"
          />
        </div>
      </div>

      {/* Category Pills */}
      {allCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedCategory === "ALL"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Questions ({faqs.length})
          </button>
          {allCategories.map((cat) => {
            const count = faqs.filter((f) => f.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-600">No matching help articles found</p>
            <p className="text-xs text-slate-400 mt-1">Try refining your search terms or select another category.</p>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = !!openItems[faq.id]
            return (
              <div
                key={faq.id}
                className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-slate-300"
              >
                <button
                  onClick={() => toggleItem(faq.id)}
                  className="flex w-full items-center justify-between p-4 text-left font-medium text-slate-900 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 pr-4">
                    <span className="inline-flex h-6 px-2 items-center justify-center rounded-md bg-blue-50 text-[11px] font-semibold text-blue-700 flex-shrink-0">
                      {faq.category}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{faq.question}</span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? "rotate-180 text-blue-600" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3.5 text-xs text-slate-600 leading-relaxed space-y-2">
                    <p className="whitespace-pre-line">{faq.answer}</p>
                    {faq.tags && faq.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/60">
                        {faq.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-block rounded-xs bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
