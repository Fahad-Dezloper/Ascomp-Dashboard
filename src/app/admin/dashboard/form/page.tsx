"use client"

import { useState, useEffect } from "react"
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Save, RefreshCw } from "lucide-react"
import { FormFieldConfigCard } from "@/components/admin/form-field-config-card"
import { toast } from "sonner"

type FieldType = "text" | "number" | "date" | "textarea" | "select" | "checkbox"

type FieldConfig = {
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

type ProjectorPart = {
  projector_model: string
  part_number: string
  description: string
}

const FORM_SECTIONS = [
  "Cinema Details",
  "Projector Information",
  "Opticals",
  "Electronics",
  "Serial Number Verified",
  "Disposable Consumables",
  "Coolant",
  "Light Engine Test Pattern",
  "Mechanical",
  "Software & Screen Information",
  "Lamp Information",
  "Voltage Parameters",
  "fL Measurements",
  "Content Player & AC Status",
  "Color Accuracy - MCGD",
  "Color Accuracy - CIE XYZ",
  "Image Evaluation",
  "Air Pollution Data",
  "Recommended Parts",
  "Remarks",
  "Service Images",
]

const getInitialFieldConfigs = (): FieldConfig[] => {
  return [
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
    { key: "reflector", label: "Reflector", type: "select", section: "Opticals", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "uvFilter", label: "UV Filter", type: "select", section: "Opticals", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "integratorRod", label: "Integrator Rod", type: "select", section: "Opticals", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "coldMirror", label: "Cold Mirror", type: "select", section: "Opticals", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "foldMirror", label: "Fold Mirror", type: "select", section: "Opticals", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "touchPanel", label: "Touch Panel", type: "select", section: "Electronics", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "evbBoard", label: "EVB Board", type: "select", section: "Electronics", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "ImcbBoard", label: "IMCB Board", type: "select", section: "Electronics", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "pibBoard", label: "PIB Board", type: "select", section: "Electronics", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "IcpBoard", label: "ICP Board", type: "select", section: "Electronics", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "imbSBoard", label: "IMB/S Board", type: "select", section: "Electronics", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "acBlowerVane", label: "AC Blower Vane", type: "select", section: "Mechanical", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "extractorVane", label: "Extractor Vane", type: "select", section: "Mechanical", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "lightEngineFans", label: "Light Engine Fans", type: "select", section: "Mechanical", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "cardCageFans", label: "Card Cage Fans", type: "select", section: "Mechanical", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "radiatorFanPump", label: "Radiator Fan Pump", type: "select", section: "Mechanical", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "pumpConnectorHose", label: "Pump Connector & Hose", type: "select", section: "Mechanical", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "securityLampHouseLock", label: "Security & Lamp Lock", type: "select", section: "Mechanical", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "lampLocMechanism", label: "Lamp LOC Mechanism", type: "select", section: "Mechanical", options: ["OK", "YES"], defaultValue: "OK" },
    { key: "exhaustCfm", label: "Exhaust CFM (M/s)", type: "number", section: "Mechanical" },
    { key: "projectorPlacementEnvironment", label: "Projector Placement & Environment", type: "textarea", section: "Mechanical" },
    { key: "softwareVersion", label: "Software Version", type: "select", section: "Software & Screen Information" },
    { key: "screenHeight", label: "Screen Height (m)", type: "number", section: "Software & Screen Information" },
    { key: "screenWidth", label: "Screen Width (m)", type: "number", section: "Software & Screen Information" },
    { key: "flatHeight", label: "Flat Height (m)", type: "number", section: "Software & Screen Information" },
    { key: "flatWidth", label: "Flat Width (m)", type: "number", section: "Software & Screen Information" },
    { key: "screenGain", label: "Screen Gain", type: "number", section: "Software & Screen Information" },
    { key: "screenMake", label: "Screen Make", type: "text", section: "Software & Screen Information" },
    { key: "throwDistance", label: "Throw Distance (m)", type: "number", section: "Software & Screen Information" },
    { key: "lampMakeModel", label: "Lamp Make & Model", type: "select", section: "Lamp Information" },
    { key: "lampTotalRunningHours", label: "Total Running Hours", type: "number", section: "Lamp Information" },
    { key: "lampCurrentRunningHours", label: "Current Running Hours", type: "number", section: "Lamp Information" },
    { key: "pvVsN", label: "P vs N", type: "number", section: "Voltage Parameters" },
    { key: "pvVsE", label: "P vs E", type: "number", section: "Voltage Parameters" },
    { key: "nvVsE", label: "N vs E", type: "number", section: "Voltage Parameters" },
    { key: "flLeft", label: "Before", type: "number", section: "fL Measurements" },
    { key: "flRight", label: "After", type: "number", section: "fL Measurements" },
    { key: "contentPlayerModel", label: "Content Player Model", type: "select", section: "Content Player & AC Status" },
    { key: "acStatus", label: "AC Status", type: "select", section: "Content Player & AC Status", options: ["Working", "Not Working", "Not Available"] },
    { key: "leStatus", label: "LE Status", type: "select", section: "Content Player & AC Status", options: ["Removed", "Not removed – Good fL", "Not removed – De-bonded"] },
    { key: "focusBoresight", label: "Focus/Boresight OK", type: "select", section: "Image Evaluation", options: ["OK", "YES"] },
    { key: "integratorPosition", label: "Integrator Position OK", type: "select", section: "Image Evaluation", options: ["OK", "YES"] },
    { key: "spotsOnScreen", label: "Spots on Screen OK", type: "select", section: "Image Evaluation", options: ["OK", "YES"] },
    { key: "screenCroppingOk", label: "Screen Cropping OK", type: "select", section: "Image Evaluation", options: ["OK", "YES"] },
    { key: "convergenceOk", label: "Convergence OK", type: "select", section: "Image Evaluation", options: ["OK", "YES"] },
    { key: "channelsCheckedOk", label: "Channels Checked OK", type: "select", section: "Image Evaluation", options: ["OK", "YES"] },
    { key: "pixelDefects", label: "Pixel Defects", type: "select", section: "Image Evaluation", options: ["OK", "YES"] },
    { key: "imageVibration", label: "Image Vibration", type: "select", section: "Image Evaluation", options: ["OK", "YES"] },
    { key: "liteloc", label: "LiteLOC Status", type: "select", section: "Image Evaluation", options: ["OK", "YES"] },
    { key: "hcho", label: "HCHO", type: "number", section: "Air Pollution Data" },
    { key: "tvoc", label: "TVOC", type: "number", section: "Air Pollution Data" },
    { key: "pm1", label: "PM1", type: "number", section: "Air Pollution Data" },
    { key: "pm2_5", label: "PM2.5", type: "number", section: "Air Pollution Data" },
    { key: "pm10", label: "PM10", type: "number", section: "Air Pollution Data" },
    { key: "temperature", label: "Temperature (°C)", type: "number", section: "Air Pollution Data" },
    { key: "humidity", label: "Humidity (%)", type: "number", section: "Air Pollution Data" },
    { key: "airPollutionLevel", label: "Air Pollution Level", type: "text", section: "Air Pollution Data" },
    { key: "remarks", label: "Remarks", type: "textarea", section: "Remarks" },
    { key: "lightEngineSerialNumber", label: "Light Engine Serial Number", type: "text", section: "Remarks" },
  ]
}

export default function FormBuilderPage() {
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>(getInitialFieldConfigs())
  const [newOption, setNewOption] = useState<Record<string, string>>({})
  const [newSubOption, setNewSubOption] = useState<Record<string, string>>({})
  const [expandedSubOptions, setExpandedSubOptions] = useState<Set<string>>(new Set())

  const [contentPlayers, setContentPlayers] = useState<string[]>([])
  const [lampModelsData, setLampModelsData] = useState<Array<{ projector_model: string; Models: string[] }>>([])
  const [softwareVersions, setSoftwareVersions] = useState<string[]>([])
  const [projectorPartsData, setProjectorPartsData] = useState<ProjectorPart[]>([])
  
  const [newDataValue, setNewDataValue] = useState<Record<string, string>>({})
  const [newLampModelValue, setNewLampModelValue] = useState<Record<string, string>>({})
  const [newProjectorModel, setNewProjectorModel] = useState("")
  
  const [selectedProjectorIndex, setSelectedProjectorIndex] = useState<number | null>(null)

  const [selectedPartsProjector, setSelectedPartsProjector] = useState<string | null>(null)
  const [newPartValue, setNewPartValue] = useState<{ part_number: string; description: string }>({ part_number: "", description: "" })
  const [newPartsProjectorModel, setNewPartsProjectorModel] = useState("")

  const [loadingDataFiles, setLoadingDataFiles] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetch("/api/admin/form-config", { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          if (data.config && Array.isArray(data.config) && data.config.length > 0) {
            setFieldConfigs(data.config)
          }
        }
      } catch (error) {
        console.error("Failed to load form config:", error)
      }
    }
    loadConfig()
  }, [])

  useEffect(() => {
    const loadDataFiles = async () => {
      setLoadingDataFiles(true)
      try {
        const results = await Promise.all([
          fetch("/api/admin/data-files/content-player?t=" + Date.now(), { credentials: "include", cache: "no-store" }),
          fetch("/api/admin/data-files/lamp-models?t=" + Date.now(), { credentials: "include", cache: "no-store" }),
          fetch("/api/admin/data-files/software?t=" + Date.now(), { credentials: "include", cache: "no-store" }),
          fetch("/api/admin/data-files/projector?t=" + Date.now(), { credentials: "include", cache: "no-store" }),
        ])
        const [contentRes, lampRes, softwareRes, projectorRes] = results

        if (contentRes.ok) {
          const data = await contentRes.json()
          setContentPlayers(data.values || [])
        } else {
          const errorText = await contentRes.text()
          console.error("Failed to load content players:", contentRes.status, errorText)
        }
        
        if (lampRes.ok) {
          const data = await lampRes.json()
          setLampModelsData(data.data || [])
        } else {
          const errorText = await lampRes.text()
          console.error("Failed to load lamp models:", lampRes.status, errorText)
        }
        
        if (softwareRes.ok) {
          const data = await softwareRes.json()
          setSoftwareVersions(data.values || [])
        } else {
          const errorText = await softwareRes.text()
          console.error("Failed to load software versions:", softwareRes.status, errorText)
        }

        if (projectorRes.ok) {
          const data = await projectorRes.json()
          setProjectorPartsData(data.data || [])
        } else {
           const errorText = await projectorRes.text()
           console.error("Failed to load projector parts:", projectorRes.status, errorText)
        }
      } catch (error) {
        console.error("Failed to load data files:", error)
      } finally {
        setLoadingDataFiles(false)
      }
    }
    loadDataFiles()
  }, [])

  const uniquePartsModels = Array.from(new Set(projectorPartsData.map(p => p.projector_model))).filter(Boolean).sort()

  useEffect(() => {
    if (uniquePartsModels.length > 0 && selectedPartsProjector === null) {
      setSelectedPartsProjector(uniquePartsModels[0] as string)
    }
  }, [uniquePartsModels, selectedPartsProjector])

  useEffect(() => {
    if (lampModelsData.length > 0) {
      if (selectedProjectorIndex === null) {
        setSelectedProjectorIndex(0)
      } else if (selectedProjectorIndex < 0 || selectedProjectorIndex >= lampModelsData.length) {
        setSelectedProjectorIndex(0)
      }
    } else {
      setSelectedProjectorIndex(null)
    }
  }, [lampModelsData, selectedProjectorIndex])

  const saveConfig = async () => {
    try {
      const payload = { config: fieldConfigs }
      
      const res = await fetch("/api/admin/form-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      
      if (res.ok) {
        const result = await res.json()
        toast.success(`Form configuration saved! ${result.savedFields || fieldConfigs.length} fields.`)
      } else {
        const errorText = await res.text()
        console.error("Failed to save config - Response:", errorText)
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        toast.error(`Failed to save: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Failed to save form config - Exception:", error)
      toast.error(`Failed to save: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const updateField = (key: string, updates: Partial<FieldConfig>) => {
    setFieldConfigs((prev) =>
      prev.map((field) => (field.key === key ? { ...field, ...updates } : field))
    )
  }

  const addOption = (fieldKey: string) => {
    const option = newOption[fieldKey]?.trim()
    if (!option) return

    updateField(fieldKey, {
      options: [...(fieldConfigs.find((f) => f.key === fieldKey)?.options || []), option],
    })
    setNewOption((prev) => ({ ...prev, [fieldKey]: "" }))
  }

  const removeOption = (fieldKey: string, optionIndex: number) => {
    const field = fieldConfigs.find((f) => f.key === fieldKey)
    if (!field?.options) return

    const removedOption = field.options[optionIndex]
    const newOptions = field.options.filter((_, i) => i !== optionIndex)
    const currentSubOptions = { ...(field.subOptions || {}) }
    const currentSubOptionsInput = { ...(field.subOptionsInput || {}) }
    if (removedOption) {
      delete currentSubOptions[removedOption]
      delete currentSubOptionsInput[removedOption]
    }

    updateField(fieldKey, {
      options: newOptions,
      subOptions: Object.keys(currentSubOptions).length > 0 ? currentSubOptions : undefined,
      subOptionsInput: Object.keys(currentSubOptionsInput).length > 0 ? currentSubOptionsInput : undefined,
    })
  }

  const toggleSubOptionExpand = (fieldKey: string, option: string) => {
    const key = `${fieldKey}:${option}`
    setExpandedSubOptions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  const addSubOption = (fieldKey: string, parentOption: string) => {
    const compositeKey = `${fieldKey}:${parentOption}`
    const subOption = newSubOption[compositeKey]?.trim()
    if (!subOption) return

    const field = fieldConfigs.find((f) => f.key === fieldKey)
    const currentSubOptions = field?.subOptions || {}
    const parentSubOptions = currentSubOptions[parentOption] || []

    updateField(fieldKey, {
      subOptions: {
        ...currentSubOptions,
        [parentOption]: [...parentSubOptions, subOption],
      },
    })

    setNewSubOption((prev) => ({ ...prev, [compositeKey]: "" }))
  }

  const removeSubOption = (fieldKey: string, parentOption: string, subIdx: number) => {
    const field = fieldConfigs.find((f) => f.key === fieldKey)
    const currentSubOptions = { ...(field?.subOptions || {}) }
    const parentSubOptions = currentSubOptions[parentOption] || []

    const newParentSubOptions = parentSubOptions.filter((_, i) => i !== subIdx)
    if (newParentSubOptions.length === 0) {
      delete currentSubOptions[parentOption]
    } else {
      currentSubOptions[parentOption] = newParentSubOptions
    }

    updateField(fieldKey, {
      subOptions: Object.keys(currentSubOptions).length > 0 ? currentSubOptions : undefined,
    })
  }

  const saveDataFile = async (fileType: "content-player" | "lamp-models" | "software" | "projector", values: any, silent = false) => {
    try {
      let bodyData: any = {}
      if (fileType === "lamp-models") {
        bodyData = { data: values }
      } else if (fileType === "projector") {
        bodyData = { data: values }
      } else {
        bodyData = { values }
      }

      const res = await fetch(`/api/admin/data-files/${fileType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bodyData),
      })

      if (res.ok) {
        const result = await res.json()
        if (!silent) {
          toast.success(`Saved ${result.saved} ${fileType.replace('-', ' ')} items`)
        }
        if (fileType === "content-player") setContentPlayers(values as string[])
        if (fileType === "lamp-models") setLampModelsData(values as Array<{ projector_model: string; Models: string[] }>)
        if (fileType === "software") setSoftwareVersions(values as string[])
        if (fileType === "projector") setProjectorPartsData(values as ProjectorPart[])
      } else {
        const errorText = await res.text()
        console.error(`Failed to save ${fileType} - Response:`, errorText)
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        toast.error(`Failed to save ${fileType}: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error(`Failed to save ${fileType}:`, error)
      toast.error(`Failed to save ${fileType}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const addDataValue = (fileType: "content-player" | "lamp-models" | "software") => {
    const value = newDataValue[fileType]?.trim()
    if (!value) return

    if (fileType === "content-player") {
      const updated = [...contentPlayers, value]
      saveDataFile(fileType, updated)
    } else if (fileType === "software") {
      const updated = [...softwareVersions, value]
      saveDataFile(fileType, updated)
    }
    
    setNewDataValue((prev) => ({ ...prev, [fileType]: "" }))
  }

  const removeDataValue = (fileType: "content-player" | "lamp-models" | "software", index: number) => {
    if (fileType === "content-player") {
      const updated = contentPlayers.filter((_, i) => i !== index)
      saveDataFile(fileType, updated)
    } else if (fileType === "software") {
      const updated = softwareVersions.filter((_, i) => i !== index)
      saveDataFile(fileType, updated)
    }
  }

  const updateDataValue = (fileType: "content-player" | "lamp-models" | "software", index: number, newValue: string) => {
    if (fileType === "content-player") {
      const updated = [...contentPlayers]
      updated[index] = newValue
      setContentPlayers(updated)
    } else if (fileType === "software") {
      const updated = [...softwareVersions]
      updated[index] = newValue
      setSoftwareVersions(updated)
    }
  }

  const saveDataValueOnBlur = (fileType: "content-player" | "lamp-models" | "software") => {
    if (fileType === "content-player") {
      saveDataFile(fileType, contentPlayers, true)
    } else if (fileType === "software") {
      saveDataFile(fileType, softwareVersions, true)
    }
  }

  const addProjectorPart = () => {
    if (!selectedPartsProjector || !newPartValue.part_number || !newPartValue.description) return
    const newPart: ProjectorPart = {
      projector_model: selectedPartsProjector,
      part_number: newPartValue.part_number.trim(),
      description: newPartValue.description.trim()
    }
    const updated = [...projectorPartsData, newPart]
    saveDataFile("projector", updated)
    setNewPartValue({ part_number: "", description: "" })
  }

  const removeProjectorPart = (partToRemove: ProjectorPart) => {
    const updated = projectorPartsData.filter(p => 
      !(p.projector_model === partToRemove.projector_model && 
        p.part_number === partToRemove.part_number &&
        p.description === partToRemove.description)
    )
    saveDataFile("projector", updated)
  }

  const updateProjectorPart = (originalPart: ProjectorPart, field: keyof ProjectorPart, value: string) => {
    const updated = projectorPartsData.map(p => {
       if (p === originalPart) {
         return { ...p, [field]: value }
       }
       return p
    })
    setProjectorPartsData(updated)
  }

  const saveProjectorPartsOnBlur = () => {
    saveDataFile("projector", projectorPartsData, true)
  }

  const addNewPartsProjectorModel = () => {
    if (!newPartsProjectorModel.trim()) return
    setSelectedPartsProjector(newPartsProjectorModel.trim())
    setNewPartsProjectorModel("")
  }

  const removeProjectorModelFromParts = (model: string) => {
    if (!confirm(`Are you sure you want to delete all parts for ${model}?`)) return
    const updated = projectorPartsData.filter(p => p.projector_model !== model)
    saveDataFile("projector", updated)
    if (selectedPartsProjector === model) {
      setSelectedPartsProjector(null)
    }
  }

  const addLampModel = (projectorModelIndex: number) => {
    const value = newLampModelValue[projectorModelIndex]?.trim()
    if (!value) return

    const updated = [...lampModelsData]
    if (updated[projectorModelIndex] && Array.isArray(updated[projectorModelIndex].Models)) {
      updated[projectorModelIndex] = {
        ...updated[projectorModelIndex],
        Models: [...updated[projectorModelIndex].Models, value]
      }
      saveDataFile("lamp-models", updated)
    }
    
    setNewLampModelValue((prev) => ({ ...prev, [projectorModelIndex]: "" }))
  }

  const removeLampModel = (projectorModelIndex: number, modelIndex: number) => {
    const updated = [...lampModelsData]
    if (updated[projectorModelIndex] && Array.isArray(updated[projectorModelIndex].Models)) {
      updated[projectorModelIndex] = {
        ...updated[projectorModelIndex],
        Models: updated[projectorModelIndex].Models.filter((_, i) => i !== modelIndex)
      }
      saveDataFile("lamp-models", updated)
    }
  }

  const updateLampModel = (projectorModelIndex: number, modelIndex: number, newValue: string) => {
    const updated = [...lampModelsData]
    if (updated[projectorModelIndex] && Array.isArray(updated[projectorModelIndex].Models)) {
      updated[projectorModelIndex] = {
        ...updated[projectorModelIndex],
        Models: updated[projectorModelIndex].Models.map((model, i) => i === modelIndex ? newValue : model)
      }
      setLampModelsData(updated)
    }
  }

  const saveLampModelOnBlur = () => {
    saveDataFile("lamp-models", lampModelsData, true)
  }

  const addProjectorModel = () => {
    const projectorModel = newProjectorModel.trim()
    if (!projectorModel) return

    const updated = [...lampModelsData, { projector_model: projectorModel, Models: [] }]
    saveDataFile("lamp-models", updated)
    setSelectedProjectorIndex(updated.length - 1)
    setNewProjectorModel("")
  }

  const removeProjectorModel = (index: number) => {
    const updated = lampModelsData.filter((_, i) => i !== index)
    saveDataFile("lamp-models", updated)
  }

  const updateProjectorModelName = (index: number, newName: string) => {
    const updated = [...lampModelsData]
    if (updated[index]) {
      updated[index] = { 
        ...updated[index], 
        projector_model: newName,
        Models: updated[index].Models || []
      }
      setLampModelsData(updated)
    }
  }

  const fieldsBySection = fieldConfigs.reduce((acc, field) => {
    const section = field.section || "Other"
    if (!acc[section]) acc[section] = []
    acc[section].push(field)
    return acc
  }, {} as Record<string, FieldConfig[]>)

  const sectionDataFileMap: Record<string, "content-player" | "lamp-models" | "software" | "projector" | null> = {
    "Lamp Information": "lamp-models",
    "Software & Screen Information": "software",
    "Content Player & AC Status": "content-player",
    "Recommended Parts": "projector",
  }

  const selectTriggerClass = "h-7 text-xs font-medium rounded-md border-border/70 bg-muted/30 hover:bg-muted/50"
  const selectContentClass = "rounded-lg border-border/80 shadow-lg py-1"
  const inputCompact = "px-2 py-0.5"

  const handleOptionRename = (fieldKey: string, oldOption: string, newOption: string) => {
    const oldKey = `${fieldKey}:${oldOption}`
    const newKey = `${fieldKey}:${newOption}`
    if (expandedSubOptions.has(oldKey)) {
      setExpandedSubOptions((prev) => {
        const next = new Set(prev)
        next.delete(oldKey)
        next.add(newKey)
        return next
      })
    }
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-6 w-full">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border/60">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Form Builder</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Customize form fields and dropdown options</p>
          </div>
          <Button onClick={saveConfig} size="sm" className="h-8 px-3 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="h-3 w-3 mr-1.5" />
            Save
          </Button>
        </div>

        <div className="space-y-3">
          {FORM_SECTIONS.map((section) => {
            const fields = fieldsBySection[section] || []
            if (fields.length === 0) return null
            const associatedDataFile = sectionDataFileMap[section]

            return (
              <div key={section} className="border  border-border/60 bg-card shadow-sm rounded-lg overflow-hidden">
                <div className="py-2.5 px-4 border-b border-border/50 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground tracking-tight">{section}</div>
                    {associatedDataFile && (
                      <span className="text-[10px] text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-md">
                        Data file
                      </span>
                    )}
                  </div>
                </div>
                <CardContent className="p-2.5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {fields.map((field) => (
                    <FormFieldConfigCard
                      key={field.key}
                      field={field}
                      onUpdate={(updates) => updateField(field.key, updates)}
                      expandedSubOptions={expandedSubOptions}
                      onToggleSubExpand={(option) => toggleSubOptionExpand(field.key, option)}
                      onOptionRename={(oldOpt, newOpt) => handleOptionRename(field.key, oldOpt, newOpt)}
                      newOptionValue={newOption[field.key] || ""}
                      onNewOptionChange={(v) => setNewOption((prev) => ({ ...prev, [field.key]: v }))}
                      onAddOption={() => addOption(field.key)}
                      onRemoveOption={(idx) => removeOption(field.key, idx)}
                      getNewSubOptionValue={(k) => newSubOption[k] || ""}
                      onNewSubOptionChange={(k, v) => setNewSubOption((prev) => ({ ...prev, [k]: v }))}
                      onAddSubOption={(opt) => addSubOption(field.key, opt)}
                      onRemoveSubOption={(opt, subIdx) => removeSubOption(field.key, opt, subIdx)}
                    />
                  ))}
                  </div>

                  {associatedDataFile === "software" && (
                    <div className="mt-3 pt-3 border-t border-dashed border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Software Versions</span>
                        <span className="text-[10px] text-muted-foreground">{softwareVersions.length} items</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {softwareVersions.map((version, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded text-xs group">
                            <span>{version}</span>
                            <button type="button" onClick={() => removeDataValue("software", idx)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <Input
                          value={newDataValue["software"] || ""}
                          onChange={(e) => setNewDataValue((prev) => ({ ...prev, "software": e.target.value }))}
                          placeholder="Add version..."
                          className={`h-7 text-xs border-border/60 flex-1 max-w-[180px] rounded-md ${inputCompact}`}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDataValue("software") } }}
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => addDataValue("software")} className="h-7 w-7 p-0 rounded-md">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {associatedDataFile === "content-player" && (
                    <div className="mt-3 pt-3 border-t border-dashed border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Content Players</span>
                        <span className="text-[10px] text-muted-foreground">{contentPlayers.length} items</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {contentPlayers.map((player, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded text-xs group">
                            <span>{player}</span>
                            <button type="button" onClick={() => removeDataValue("content-player", idx)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <Input
                          value={newDataValue["content-player"] || ""}
                          onChange={(e) => setNewDataValue((prev) => ({ ...prev, "content-player": e.target.value }))}
                          placeholder="Add player..."
                          className={`h-7 text-xs border-border/60 flex-1 max-w-[180px] rounded-md ${inputCompact}`}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDataValue("content-player") } }}
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => addDataValue("content-player")} className="h-7 w-7 p-0 rounded-md">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {associatedDataFile === "lamp-models" && (
                    <div className="mt-3 pt-3 border-t border-dashed border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Lamp Models</span>
                        <span className="text-[10px] text-muted-foreground">{lampModelsData.length} projectors</span>
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 max-w-[200px]">
                          <Select
                            value={selectedProjectorIndex !== null ? String(selectedProjectorIndex) : ""}
                            onValueChange={(value) => setSelectedProjectorIndex(value ? parseInt(value, 10) : null)}
                          >
                            <SelectTrigger className={selectTriggerClass}>
                              <SelectValue placeholder="Projector..." />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                              {lampModelsData.map((projectorData, idx) => (
                                <SelectItem key={idx} value={String(idx)} className="text-xs py-1.5">
                                  {projectorData.projector_model} ({projectorData.Models?.length || 0})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            value={newProjectorModel}
                            onChange={(e) => setNewProjectorModel(e.target.value)}
                            placeholder="New projector..."
                            className={`h-7 text-xs border-border/60 w-28 rounded-md ${inputCompact}`}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addProjectorModel() } }}
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={addProjectorModel} className="h-7 w-7 p-0 rounded-md">
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {selectedProjectorIndex !== null && lampModelsData[selectedProjectorIndex] && (
                        <div className="mt-2 p-2 bg-muted/20 rounded-lg">
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            {lampModelsData[selectedProjectorIndex].Models?.map((model, modelIdx) => (
                              <div key={modelIdx} className="flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded text-xs group border border-border/50">
                                <span>{model}</span>
                                <button type="button" onClick={() => removeLampModel(selectedProjectorIndex, modelIdx)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <Input
                              value={newLampModelValue[selectedProjectorIndex] || ""}
                              onChange={(e) => setNewLampModelValue((prev) => ({ ...prev, [selectedProjectorIndex]: e.target.value }))}
                              placeholder="Add lamp..."
                              className={`h-6 text-xs border-border/60 flex-1 rounded ${inputCompact}`}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLampModel(selectedProjectorIndex) } }}
                            />
                            <Button type="button" variant="ghost" size="sm" onClick={() => addLampModel(selectedProjectorIndex)} className="h-6 w-6 p-0 rounded">
                              <Plus className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Data Files</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Software, Content Players & Lamp Models are edited inline above. Parts below.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              disabled={loadingDataFiles}
              onClick={() => {
                setLoadingDataFiles(true)
                const loadDataFiles = async () => {
                  try {
                     const results = await Promise.all([
                      fetch("/api/admin/data-files/content-player?t=" + Date.now(), { credentials: "include", cache: "no-store" }),
                      fetch("/api/admin/data-files/lamp-models?t=" + Date.now(), { credentials: "include", cache: "no-store" }),
                      fetch("/api/admin/data-files/software?t=" + Date.now(), { credentials: "include", cache: "no-store" }),
                      fetch("/api/admin/data-files/projector?t=" + Date.now(), { credentials: "include", cache: "no-store" }),
                    ])
                    const [contentRes, lampRes, softwareRes, projectorRes] = results

                    if (contentRes.ok) {
                      const data = await contentRes.json()
                      setContentPlayers(data.values || [])
                    }
                    if (lampRes.ok) {
                      const data = await lampRes.json()
                      setLampModelsData(data.data || [])
                    }
                    if (softwareRes.ok) {
                      const data = await softwareRes.json()
                      setSoftwareVersions(data.values || [])
                    }
                    if (projectorRes.ok) {
                      const data = await projectorRes.json()
                      setProjectorPartsData(data.data || [])
                    }
                  } catch (error) {
                    console.error("Failed to refresh data files:", error)
                  } finally {
                    setLoadingDataFiles(false)
                  }
                }
                loadDataFiles()
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingDataFiles ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="border py-2 border-border/60 bg-card rounded-lg overflow-hidden">
              <div className="py-2 px-3 border-b border-border/50 bg-muted/20">
                <div className="text-xs font-semibold">Content Players</div>
              </div>
              <CardContent className="p-3 space-y-2">
                {loadingDataFiles ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : contentPlayers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">None. Add below.</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">{contentPlayers.length} items</p>
                )}
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {contentPlayers.map((value, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <Input
                        value={value}
                        onChange={(e) => updateDataValue("content-player", idx, e.target.value)}
                        onBlur={() => saveDataValueOnBlur("content-player")}
                        className={`border-border/60 flex-1 rounded ${inputCompact}`}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeDataValue("content-player", idx)} className="h-6 w-6 p-0 rounded text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                  <Input
                    value={newDataValue["content-player"] || ""}
                    onChange={(e) => setNewDataValue((prev) => ({ ...prev, "content-player": e.target.value }))}
                    placeholder="Add player"
                    className={`text-xs border-border/60 flex-1 rounded ${inputCompact}`}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDataValue("content-player") } }}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => addDataValue("content-player")} className="h-6 w-6 p-0 rounded">
                    <Plus className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </CardContent>
            </div>

            <div className="border py-2 border-border/60 bg-card rounded-lg overflow-hidden col-span-2">
              <div className="py-2 px-3 border-b border-border/50 bg-muted/20">
                <div className="text-xs font-semibold">Lamp Models</div>
              </div>
              <CardContent className="p-3 space-y-3">
                {loadingDataFiles ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : lampModelsData.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No projectors. Add below.</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedProjectorIndex !== null ? String(selectedProjectorIndex) : ""}
                        onValueChange={(value) => setSelectedProjectorIndex(value ? parseInt(value, 10) : null)}
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="Projector..." />
                        </SelectTrigger>
                        <SelectContent className={selectContentClass}>
                          {lampModelsData.map((projectorData, idx) => (
                            <SelectItem key={idx} value={String(idx)} className="text-xs py-1.5">
                              {projectorData.projector_model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedProjectorIndex !== null && lampModelsData[selectedProjectorIndex] && (
                      <div className="border border-border/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            value={lampModelsData[selectedProjectorIndex].projector_model}
                            onChange={(e) => updateProjectorModelName(selectedProjectorIndex, e.target.value)}
                            onBlur={() => saveLampModelOnBlur()}
                            className={`text-xs border-border/60 flex-1 max-w-[180px] rounded-md ${inputCompact}`}
                            placeholder="Projector"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => { removeProjectorModel(selectedProjectorIndex); setSelectedProjectorIndex(null) }}
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {lampModelsData[selectedProjectorIndex].Models?.length ? (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {lampModelsData[selectedProjectorIndex].Models.map((model, modelIdx) => (
                                <div key={modelIdx} className="flex items-center gap-1.5">
                                  <Input
                                    value={model}
                                    onChange={(e) => updateLampModel(selectedProjectorIndex, modelIdx, e.target.value)}
                                    onBlur={() => saveLampModelOnBlur()}
                                    className={`text-xs border-border/60 flex-1 rounded ${inputCompact}`}
                                  />
                                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLampModel(selectedProjectorIndex, modelIdx)} className="h-6 w-6 p-0 rounded text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground italic">No lamps</p>
                          )}
                          <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                            <Input
                              value={newLampModelValue[selectedProjectorIndex] || ""}
                              onChange={(e) => setNewLampModelValue((prev) => ({ ...prev, [selectedProjectorIndex]: e.target.value }))}
                              placeholder="Add lamp"
                              className={`text-xs border-border/60 flex-1 rounded ${inputCompact}`}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLampModel(selectedProjectorIndex) } }}
                            />
                            <Button type="button" variant="ghost" size="sm" onClick={() => addLampModel(selectedProjectorIndex)} className="h-6 w-6 p-0 rounded">
                              <Plus className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
                  <Input
                    value={newProjectorModel}
                    onChange={(e) => setNewProjectorModel(e.target.value)}
                    placeholder="New projector (e.g. CP2220)"
                    className={`text-xs border-border/60 flex-1 rounded-md ${inputCompact}`}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addProjectorModel() } }}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={addProjectorModel} className="h-7 w-7 p-0 rounded-md">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </div>

            <div className="border py-2 border-border/60 bg-card rounded-lg overflow-hidden">
              <div className="py-2 px-3 border-b border-border/50 bg-muted/20">
                <div className="text-xs font-semibold">Software Versions</div>
              </div>
              <CardContent className="p-3 space-y-2">
                {loadingDataFiles ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : softwareVersions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">None. Add below.</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">{softwareVersions.length} items</p>
                )}
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {softwareVersions.map((value, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <Input
                        value={value}
                        onChange={(e) => updateDataValue("software", idx, e.target.value)}
                        onBlur={() => saveDataValueOnBlur("software")}
                        className={`text-xs border-border/60 flex-1 rounded ${inputCompact}`}
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeDataValue("software", idx)} className="h-6 w-6 p-0 rounded text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                  <Input
                    value={newDataValue["software"] || ""}
                    onChange={(e) => setNewDataValue((prev) => ({ ...prev, "software": e.target.value }))}
                    placeholder="Add version"
                    className={`text-xs border-border/60 flex-1 rounded ${inputCompact}`}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDataValue("software") } }}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => addDataValue("software")} className="h-6 w-6 p-0 rounded">
                    <Plus className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </CardContent>
            </div>

            <div className="border py-2 border-border/60 bg-card rounded-lg overflow-hidden col-span-2">
              <div className="py-2 px-3 border-b border-border/50 bg-muted/20">
                <div className="text-xs font-semibold">Recommended Parts</div>
              </div>
              <CardContent className="p-3 space-y-3">
                {loadingDataFiles ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Select value={selectedPartsProjector || ""} onValueChange={(value) => setSelectedPartsProjector(value)}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="Projector..." />
                        </SelectTrigger>
                        <SelectContent className={selectContentClass}>
                          {uniquePartsModels.map((model, idx) => (
                            <SelectItem key={idx} value={model} className="text-xs py-1.5">{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeProjectorModelFromParts(selectedPartsProjector!)} className="h-7 text-xs text-muted-foreground hover:text-destructive" disabled={!selectedPartsProjector}>
                        <Trash2 className="h-3 w-3 mr-1" /> Remove model
                      </Button>
                    </div>

                    {selectedPartsProjector && (
                      <div className="border border-border/50 rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-5 gap-1.5 text-[10px] text-muted-foreground font-medium">
                          <div className="col-span-2">Description</div>
                          <div className="col-span-2">Part #</div>
                          <div className="col-span-1" />
                        </div>
                        <div className="space-y-1.5 max-h-56 overflow-y-auto">
                          {projectorPartsData
                            .filter(p => p.projector_model === selectedPartsProjector)
                            .map((part, pIdx) => (
                              <div key={pIdx} className="grid grid-cols-5 gap-1.5 items-center">
                                <Input value={part.description} onChange={(e) => updateProjectorPart(part, "description", e.target.value)} onBlur={saveProjectorPartsOnBlur} className={`col-span-2 text-xs border-border/60 rounded ${inputCompact}`} placeholder="Description" />
                                <Input value={part.part_number} onChange={(e) => updateProjectorPart(part, "part_number", e.target.value)} onBlur={saveProjectorPartsOnBlur} className={`col-span-2 text-xs border-border/60 rounded ${inputCompact}`} placeholder="Part #" />
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeProjectorPart(part)} className="col-span-1 h-6 w-6 p-0 rounded text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-border/40">
                          <Input value={newPartValue.description} onChange={(e) => setNewPartValue(prev => ({ ...prev, description: e.target.value }))} className={`col-span-2 text-xs border-border/60 rounded ${inputCompact}`} placeholder="Description" />
                          <Input value={newPartValue.part_number} onChange={(e) => setNewPartValue(prev => ({ ...prev, part_number: e.target.value }))} className={`col-span-2 text-xs border-border/60 rounded ${inputCompact}`} placeholder="Part #" onKeyDown={(e) => { if (e.key === "Enter") addProjectorPart() }} />
                          <Button type="button" variant="ghost" size="sm" onClick={addProjectorPart} className="col-span-1 h-6 w-6 p-0 rounded" disabled={!newPartValue.description || !newPartValue.part_number}>
                            <Plus className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-2 border-t border-border/40">
                      <Input value={newPartsProjectorModel} onChange={(e) => setNewPartsProjectorModel(e.target.value)} placeholder="New projector model" className={`text-xs border-border/60 flex-1 rounded-md ${inputCompact}`} onKeyDown={(e) => { if (e.key === "Enter") addNewPartsProjectorModel() }} />
                      <Button type="button" variant="ghost" size="sm" onClick={addNewPartsProjectorModel} className="h-7 w-7 p-0 rounded-md">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
