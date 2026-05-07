import { useState, useEffect } from "react"
import {
  RECOMMENDED_CFM_MODEL_RULES,
  type CfmModelRule,
} from "@/lib/cfm-model-rules"
import { sanitizeLaserProjectorModels } from "@/lib/laser-projector-models"

export type { CfmModelRule }

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
  componentType?: "statusSelectWithNote" // Special component type
  noteOptions?: string[] // Options for the note dropdown (when status is YES)
  noteDefault?: string // Default value for note field
  optionDescriptions?: Record<string, string> // Map option values to descriptions
  issueValues?: string[] // Values that trigger the note field (defaults to ['YES', 'Concern'])
}

const DEFAULT_CONFIG: FieldConfig[] = [
  { key: "cinemaName", label: "Cinema Name", type: "text", required: true, section: "Cinema Details" },
  { key: "date", label: "Date", type: "date", required: true, section: "Cinema Details" },
  { key: "address", label: "Address", type: "textarea", required: true, section: "Cinema Details" },
  { key: "contactDetails", label: "Contact Details", type: "text", section: "Cinema Details" },
  { key: "screenNumber", label: "Screen No", type: "number", section: "Cinema Details" },
  {
    key: "serviceVisitType",
    label: "Service Visit Type",
    type: "select",
    section: "Cinema Details",
    options: ["1", "2", "3", "4", "5", "6", "special"],
  },
  { key: "projectorModel", label: "Projector Model", type: "text", required: true, section: "Projector Information" },
  { key: "projectorSerialNumber", label: "Serial Number", type: "text", required: true, section: "Projector Information" },
  { key: "projectorRunningHours", label: "Running Hours", type: "number", required: true, section: "Projector Information" },
]

export function useFormConfig() {
  const [config, setConfig] = useState<FieldConfig[]>(DEFAULT_CONFIG)
  const [cfmModelRules, setCfmModelRules] = useState<CfmModelRule[]>(
    RECOMMENDED_CFM_MODEL_RULES,
  )
  const [laserProjectorModels, setLaserProjectorModels] = useState<string[]>(
    [],
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch(`/api/admin/form-config?t=${Date.now()}`, {
          credentials: "include",
          cache: "no-store",
        })
        if (res.ok) {
          const data = await res.json()
          if (data.config && Array.isArray(data.config) && data.config.length > 0) {
            setConfig(data.config)
          }
          const rules: CfmModelRule[] = Array.isArray(data.cfmModelRules)
            ? data.cfmModelRules
            : []
          setCfmModelRules(
            rules.length > 0 ? rules : RECOMMENDED_CFM_MODEL_RULES,
          )
          setLaserProjectorModels(
            sanitizeLaserProjectorModels(data.laserProjectorModels),
          )
        } else {
          console.error("Failed to fetch form config:", res.status, res.statusText)
        }
      } catch (error) {
        console.error("Failed to load form config:", error)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()

    const interval = setInterval(loadConfig, 10000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return { config, cfmModelRules, laserProjectorModels, loading }
}
