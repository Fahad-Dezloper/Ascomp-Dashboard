"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react"

export type FieldType = "text" | "number" | "date" | "textarea" | "select" | "checkbox"

export type FieldConfig = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  options?: string[]
  subOptions?: Record<string, string[]>
  subOptionsInput?: Record<string, boolean>
  section?: string
  defaultValue?: string
  min?: number
  max?: number
}

const INPUT_COMPACT = "px-2 py-0.5"
const SELECT_TRIGGER_CLASS = "h-7 text-xs font-medium rounded-md border-border/70 bg-muted/30 hover:bg-muted/50 transition-colors data-[state=open]:bg-muted/50"
const SELECT_CONTENT_CLASS = "rounded-lg border-border/80 shadow-lg py-1"

type FormFieldConfigCardProps = {
  field: FieldConfig
  onUpdate: (updates: Partial<FieldConfig>) => void
  expandedSubOptions: Set<string>
  onToggleSubExpand: (option: string) => void
  onOptionRename?: (oldOption: string, newOption: string) => void
  newOptionValue: string
  onNewOptionChange: (value: string) => void
  onAddOption: () => void
  onRemoveOption: (index: number) => void
  getNewSubOptionValue: (compositeKey: string) => string
  onNewSubOptionChange: (compositeKey: string, value: string) => void
  onAddSubOption: (parentOption: string) => void
  onRemoveSubOption: (parentOption: string, subIdx: number) => void
}

export function FormFieldConfigCard({
  field,
  onUpdate,
  expandedSubOptions,
  onToggleSubExpand,
  onOptionRename,
  newOptionValue,
  onNewOptionChange,
  onAddOption,
  onRemoveOption,
  getNewSubOptionValue,
  onNewSubOptionChange,
  onAddSubOption,
  onRemoveSubOption,
}: FormFieldConfigCardProps) {
  const isSelect = field.type === "select"
  const isNumber = field.type === "number"

  return (
    <div
      className={`rounded-md border border-border/60 bg-white p-2 shadow-sm min-h-0 flex flex-col ${
        isSelect ? "md:col-span-full" : ""
      }`}
    >
      {/* Label + Type */}
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <Input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className={`text-xs font-medium border-border/60 rounded bg-muted/30 focus:bg-white flex-1 min-w-0 ${INPUT_COMPACT}`}
          placeholder="Label"
        />
        <Select value={field.type} onValueChange={(v) => onUpdate({ type: v as FieldType })}>
          <SelectTrigger className={`${SELECT_TRIGGER_CLASS} h-7 min-w-[90px] shrink-0`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={SELECT_CONTENT_CLASS}>
            <SelectItem value="text" className="text-xs py-1.5">Text</SelectItem>
            <SelectItem value="number" className="text-xs py-1.5">Number</SelectItem>
            <SelectItem value="date" className="text-xs py-1.5">Date</SelectItem>
            <SelectItem value="textarea" className="text-xs py-1.5">Textarea</SelectItem>
            <SelectItem value="select" className="text-xs py-1.5">Dropdown</SelectItem>
            <SelectItem value="checkbox" className="text-xs py-1.5">Checkbox</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* <p className="text-[9px] b text-muted-foreground font-mono mb-1">{field.key}</p> */}

      {/* Placeholder + Required */}
      <div className="flex items-center gap-1.5">
        <Input
          value={field.placeholder || ""}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
          className={`py-2 border-border/60  rounded flex-1 min-w-0 ${INPUT_COMPACT}`}
          placeholder="Placeholder"
        />
        <label className="flex items-center gap-1 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={field.required || false}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-border accent-primary"
          />
          <span className="text-[10px] text-muted-foreground">Req</span>
        </label>
      </div>

      {/* Number range */}
      {isNumber && (
        <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Range</span>
          <Input
            type="number"
            value={field.min !== undefined ? String(field.min) : ""}
            onChange={(e) => {
              const v = e.target.value.trim()
              onUpdate({ min: v === "" ? undefined : parseFloat(v) })
            }}
            placeholder="Min"
            className={`border-border/60 w-full rounded ${INPUT_COMPACT}`}
          />
          <Input
            type="number"
            value={field.max !== undefined ? String(field.max) : ""}
            onChange={(e) => {
              const v = e.target.value.trim()
              onUpdate({ max: v === "" ? undefined : parseFloat(v) })
            }}
            placeholder="Max"
            className={`border-border/60 w-full rounded ${INPUT_COMPACT}`}
          />
        </div>
      )}

      {/* Select options */}
      {isSelect && (
        <SelectOptionsSection
          field={field}
          onUpdate={onUpdate}
          expandedSubOptions={expandedSubOptions}
          onToggleSubExpand={onToggleSubExpand}
          onOptionRename={onOptionRename}
          newOptionValue={newOptionValue}
          onNewOptionChange={onNewOptionChange}
          onAddOption={onAddOption}
          onRemoveOption={onRemoveOption}
          getNewSubOptionValue={getNewSubOptionValue}
          onNewSubOptionChange={onNewSubOptionChange}
          onAddSubOption={onAddSubOption}
          onRemoveSubOption={onRemoveSubOption}
        />
      )}
    </div>
  )
}

type SelectOptionsSectionProps = {
  field: FieldConfig
  onUpdate: (updates: Partial<FieldConfig>) => void
  expandedSubOptions: Set<string>
  onToggleSubExpand: (option: string) => void
  onOptionRename?: (oldOption: string, newOption: string) => void
  newOptionValue: string
  onNewOptionChange: (value: string) => void
  onAddOption: () => void
  onRemoveOption: (index: number) => void
  getNewSubOptionValue: (compositeKey: string) => string
  onNewSubOptionChange: (compositeKey: string, value: string) => void
  onAddSubOption: (parentOption: string) => void
  onRemoveSubOption: (parentOption: string, subIdx: number) => void
}

function SelectOptionsSection({
  field,
  onUpdate,
  expandedSubOptions,
  onToggleSubExpand,
  onOptionRename,
  newOptionValue,
  onNewOptionChange,
  onAddOption,
  onRemoveOption,
  getNewSubOptionValue,
  onNewSubOptionChange,
  onAddSubOption,
  onRemoveSubOption,
}: SelectOptionsSectionProps) {
  return (
    <div className="mt-1 pt-1 border-t border-border/40">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Options</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Default:</span>
          <Select
            value={field.defaultValue || "__none__"}
            onValueChange={(v) => onUpdate({ defaultValue: v === "__none__" ? undefined : v })}
          >
            <SelectTrigger className={`${SELECT_TRIGGER_CLASS} h-6 min-w-[90px]`}>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className={SELECT_CONTENT_CLASS}>
              <SelectItem value="__none__" className="text-xs py-1.5 text-muted-foreground">None</SelectItem>
              {field.options?.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-xs py-1.5">{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        {field.options?.map((option, idx) => {
          const compositeKey = `${field.key}:${option}`
          const isExpanded = expandedSubOptions.has(compositeKey)
          const subOpts = field.subOptions?.[option] || []
          const hasSubOpts = subOpts.length > 0

          return (
            <div key={idx} className="group">
              <div className="flex items-center gap-1">
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(field.options || [])]
                    const oldOption = newOptions[idx]
                    const newOptionValue = e.target.value
                    newOptions[idx] = newOptionValue

                    const currentSubOptions = { ...(field.subOptions || {}) }
                    const currentSubOptionsInput = { ...(field.subOptionsInput || {}) }
                    if (oldOption && oldOption !== newOptionValue) {
                      if (currentSubOptions[oldOption]) {
                        currentSubOptions[newOptionValue] = currentSubOptions[oldOption]
                        delete currentSubOptions[oldOption]
                      }
                      if (currentSubOptionsInput[oldOption] !== undefined) {
                        currentSubOptionsInput[newOptionValue] = currentSubOptionsInput[oldOption]
                        delete currentSubOptionsInput[oldOption]
                      }
                      onOptionRename?.(oldOption, newOptionValue)
                    }

                    onUpdate({
                      options: newOptions,
                      subOptions: Object.keys(currentSubOptions).length > 0 ? currentSubOptions : undefined,
                      subOptionsInput: Object.keys(currentSubOptionsInput).length > 0 ? currentSubOptionsInput : undefined,
                    })
                  }}
                  className={`py-4 text-xs border-border/60 flex-1 rounded bg-white ${INPUT_COMPACT}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleSubExpand(option)}
                  className={`rounded shrink-0 ${hasSubOpts ? "border-primary/50 text-primary" : "border-border/60 text-muted-foreground"}`}
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveOption(idx)}
                  className="rounded shrink-0 border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {isExpanded && (
                <div className="ml-2 pl-2 border-l border-border/50 space-y-0.5 py-0.5">
                  <p className="text-[9px] text-muted-foreground">Sub for &ldquo;{option}&rdquo;</p>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.subOptionsInput?.[option] || false}
                      onChange={(e) => {
                        const currentInput = { ...(field.subOptionsInput || {}) }
                        if (e.target.checked) currentInput[option] = true
                        else delete currentInput[option]
                        onUpdate({
                          subOptionsInput: Object.keys(currentInput).length > 0 ? currentInput : undefined,
                        })
                      }}
                      className="w-3 h-3 rounded border-border"
                    />
                    <span className="text-[10px] text-muted-foreground">Custom input</span>
                  </label>
                  {subOpts.map((subOpt, subIdx) => (
                    <div key={subIdx} className="flex items-center gap-1">
                      <Input
                        value={subOpt}
                        onChange={(e) => {
                          const newSubOpts = [...subOpts]
                          newSubOpts[subIdx] = e.target.value
                          onUpdate({
                            subOptions: { ...(field.subOptions || {}), [option]: newSubOpts },
                          })
                        }}
                        className={`h-5 text-[11px] border-border/60 flex-1 rounded ${INPUT_COMPACT}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveSubOption(option, subIdx)}
                        className="h-5 w-5 p-0 rounded text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-2 w-2" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <Input
                      value={getNewSubOptionValue(compositeKey)}
                      onChange={(e) => onNewSubOptionChange(compositeKey, e.target.value)}
                      placeholder="Add sub..."
                      className={`h-5 text-[11px] border-border/60 flex-1 rounded ${INPUT_COMPACT}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          onAddSubOption(option)
                        }
                      }}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => onAddSubOption(option)} className="h-5 w-5 p-0 rounded">
                      <Plus className="h-2 w-2" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <div className="flex items-center gap-1 pt-0.5">
          <Input
            value={newOptionValue}
            onChange={(e) => onNewOptionChange(e.target.value)}
            placeholder="Add option..."
            className={`h-6 text-xs border-dashed border-border/60 flex-1 rounded ${INPUT_COMPACT}`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                onAddOption()
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={onAddOption} className="h-6 px-2 rounded shrink-0 text-xs">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
