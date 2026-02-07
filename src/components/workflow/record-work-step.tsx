import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useFormConfig } from '@/hooks/use-form-config'
import { DynamicFormField } from './dynamic-form-field'

type IssueNotes = Record<string, string>
type UploadedImage = { name: string; url: string; size?: number }
type ProjectorPart = {
  projector_model: string
  part_number: string
  description: string
}
type RecommendedPart = {
  part_number: string
  description: string
}
type RecordWorkForm = ReturnType<typeof createInitialFormData>

const COLOR_ACCURACY = [
  { name: 'White', fields: ['white2Kx', 'white2Ky', 'white2Kfl', 'white4Kx', 'white4Ky', 'white4Kfl'] },
  { name: 'Red', fields: ['red2Kx', 'red2Ky', 'red2Kfl', 'red4Kx', 'red4Ky', 'red4Kfl'] },
  { name: 'Green', fields: ['green2Kx', 'green2Ky', 'green2Kfl', 'green4Kx', 'green4Ky', 'green4Kfl'] },
  { name: 'Blue', fields: ['blue2Kx', 'blue2Ky', 'blue2Kfl', 'blue4Kx', 'blue4Ky', 'blue4Kfl'] },
] as const

const createInitialFormData = () => ({
  cinemaName: '',
  date: new Date().toISOString().split('T')[0] ?? '',
  address: '',
  contactDetails: '',
  location: '',
  screenNumber: '',
  serviceVisitType: '',
  projectorModel: '',
  projectorSerialNumber: '',
  projectorRunningHours: '',
  reflector: 'OK',
  uvFilter: 'OK',
  integratorRod: 'OK',
  coldMirror: 'OK',
  foldMirror: 'OK',
  touchPanel: 'OK',
  evbBoard: 'OK',
  ImcbBoard: 'OK',
  pibBoard: 'OK',
  IcpBoard: 'OK',
  imbSBoard: 'OK',
  reflectorNote: '',
  uvFilterNote: '',
  integratorRodNote: '',
  coldMirrorNote: '',
  foldMirrorNote: '',
  touchPanelNote: '',
  evbBoardNote: '',
  ImcbBoardNote: '',
  pibBoardNote: '',
  IcpBoardNote: '',
  imbSBoardNote: '',
  serialNumberVerified: '',
  serialNumberVerifiedNote: '',
  AirIntakeLadRad: '',
  AirIntakeLadRadNote: '',
  coolantLevelColor: '',
  coolantLevelColorNote: '',
  lightEngineWhite: '',
  lightEngineRed: '',
  lightEngineGreen: '',
  lightEngineBlue: '',
  lightEngineBlack: '',
  lightEngineWhiteNote: '',
  lightEngineRedNote: '',
  lightEngineGreenNote: '',
  lightEngineBlueNote: '',
  lightEngineBlackNote: '',
  acBlowerVane: 'OK',
  extractorVane: 'OK',
  exhaustCfm: '',
  lightEngineFans: 'OK',
  cardCageFans: 'OK',
  radiatorFanPump: 'OK',
  pumpConnectorHose: 'OK',
  securityLampHouseLock: 'OK',
  securityLampHouseLockNote: '',
  lampLocMechanism: 'OK',
  acBlowerVaneNote: '',
  extractorVaneNote: '',
  exhaustCfmNote: '',
  lightEngineFansNote: '',
  cardCageFansNote: '',
  radiatorFanPumpNote: '',
  pumpConnectorHoseNote: '',
  lampLocMechanismNote: '',
  projectorPlacementEnvironment: '',
  softwareVersion: '',
  screenHeight: '',
  screenWidth: '',
  flatHeight: '',
  flatWidth: '',
  screenGain: '',
  screenMake: '',
  throwDistance: '',
  lampMakeModel: '',
  lampTotalRunningHours: '',
  lampCurrentRunningHours: '',
  pvVsN: '',
  pvVsE: '',
  nvVsE: '',
  flLeft: '',
  flRight: '',
  contentPlayerModel: '',
  acStatus: '',
  leStatus: '',
  leStatusNote: '',
  remarks: '',
  lightEngineSerialNumber: '',
  white2Kx: '',
  white2Ky: '',
  white2Kfl: '',
  white4Kx: '',
  white4Ky: '',
  white4Kfl: '',
  red2Kx: '',
  red2Ky: '',
  red2Kfl: '',
  red4Kx: '',
  red4Ky: '',
  red4Kfl: '',
  green2Kx: '',
  green2Ky: '',
  green2Kfl: '',
  green4Kx: '',
  green4Ky: '',
  green4Kfl: '',
  blue2Kx: '',
  blue2Ky: '',
  blue2Kfl: '',
  blue4Kx: '',
  blue4Ky: '',
  blue4Kfl: '',
  BW_Step_10_2Kx: '',
  BW_Step_10_2Ky: '',
  BW_Step_10_2Kfl: '',
  BW_Step_10_4Kx: '',
  BW_Step_10_4Ky: '',
  BW_Step_10_4Kfl: '',
  focusBoresight: '',
  integratorPosition: '',
  spotsOnScreen: '',
  screenCroppingOk: '',
  convergenceOk: '',
  channelsCheckedOk: '',
  pixelDefects: '',
  imageVibration: '',
  liteloc: '',
  focusBoresightNote: '',
  integratorPositionNote: '',
  spotsOnScreenNote: '',
  screenCroppingNote: '',
  convergenceNote: '',
  channelsCheckedNote: '',
  pixelDefectsNote: '',
  imageVibrationNote: '',
  litelocNote: '',
  hcho: '',
  tvoc: '',
  pm1: '',
  pm2_5: '',
  pm10: '',
  temperature: '',
  humidity: '',
  airPollutionLevel: '',
  startTime: '',
  endTime: '',
  signatures: '',
  reportGenerated: false,
  reportUrl: '',
  photosDriveLink: '',
  logs: '',
  issueNotes: {} as IssueNotes,
  recommendedParts: [] as RecommendedPart[],
})

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-4 pb-4 border-b-2 border-black last:border-b-0">
    <h3 className="font-bold text-black mb-3 text-sm sm:text-base">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
)

const FormRow = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">{children}</div>
)

const FormField = ({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) => (
  <div>
    <label className="block text-xs sm:text-sm font-semibold text-black mb-1">
      {label} {required && '*'}
    </label>
    {children}
  </div>
)

const cleanRepeatedNote = (noteValue: string): string => {
  if (!noteValue || typeof noteValue !== 'string') return noteValue

  const parts = noteValue.split(' - ')
  if (parts.length <= 2) return noteValue

  const firstPart = parts[0]?.trim() || ''
  const secondPart = parts[1]?.trim() || ''

  let isRepeating = true
  for (let i = 2; i < parts.length; i += 2) {
    if ((parts[i]?.trim() || '') !== firstPart) {
      isRepeating = false
      break
    }
    if (i + 1 < parts.length && (parts[i + 1]?.trim() || '') !== secondPart) {
      isRepeating = false
      break
    }
  }

  if (isRepeating && firstPart) {

    if (secondPart) {
      return `${firstPart} - ${secondPart}`
    }
    return firstPart
  }

  return noteValue
}

const StatusSelectWithNote = ({
  field,
  label,
  options,
  noteOptions,
  noteDefault,
  issueValues,
  form,
  required,
}: {
  field: keyof RecordWorkForm & string
  label: string
  options?: Array<{ value: string; label: string; description?: string }>
  noteOptions?: string[]
  noteDefault?: string
  issueValues?: string[]
  form: any
  required?: boolean
}) => {
  const { watch, register, setValue, getValues } = form
  const statusVal = (watch(field as keyof RecordWorkForm) as string)

  const status = statusVal || (options ? '' : 'OK')
  const noteField = `${field}Note` as keyof RecordWorkForm
  const initialChoice = noteDefault || noteOptions?.[0] || ''
  const [noteChoice, setNoteChoice] = useState<string>(initialChoice)
  const [noteText, setNoteText] = useState<string>('')
  const [hasInitialized, setHasInitialized] = useState(false)
  const statusRegister = register(field as keyof RecordWorkForm)

  const selectOptions =
    options && options.length
      ? options
      : [
        { value: 'OK', label: 'OK', description: 'Part is OK' },
        { value: 'YES', label: 'YES', description: 'Needs replacement' },
      ]

  const isIssue = (issueValues && issueValues.length > 0)
    ? issueValues.includes(status)
    : (status === 'YES' || status === 'Concern' || status.startsWith('YES') || status.includes('Concern'))

  const formatNote = (choice: string, text: string) => {
    const c = choice?.trim()
    const t = text?.trim()
    if (c && t) return `${c} - ${t}`
    if (c) return c
    if (t) return t
    return ''
  }

  const parseExistingNote = (noteValue: string): { choice: string; text: string } => {
    if (!noteValue || typeof noteValue !== 'string') {
      return { choice: initialChoice, text: '' }
    }

    const cleanedValue = cleanRepeatedNote(noteValue)

    if (noteOptions && noteOptions.length > 0) {
      for (const opt of noteOptions) {

        if (cleanedValue.startsWith(`${opt} - `)) {
          return { choice: opt, text: cleanedValue.slice(opt.length + 3) }
        }

        if (cleanedValue === opt) {
          return { choice: opt, text: '' }
        }
      }
    }

    return { choice: initialChoice, text: cleanedValue }
  }

  const handleReasonChange = (val: string) => {
    setNoteChoice(val)
    if (isIssue) {

      setValue(noteField, formatNote(val, noteText), { shouldDirty: true })
    }
  }

  const handleNoteTextChange = (text: string) => {
    setNoteText(text)
    if (isIssue) {

      setValue(noteField, formatNote(noteChoice, text), { shouldDirty: true })
    }
  }

  useEffect(() => {
    if (hasInitialized) return

    const existingNote = getValues(noteField)
    if (existingNote && typeof existingNote === 'string' && existingNote.trim()) {
      const parsed = parseExistingNote(existingNote)
      setNoteChoice(parsed.choice)
      setNoteText(parsed.text)
    }
    setHasInitialized(true)
  }, [])

  useEffect(() => {
    if (!isIssue && hasInitialized) {
      const currentNote = getValues(noteField)
      if (noteChoice !== initialChoice) setNoteChoice(initialChoice)
      if (noteText) setNoteText('')
      if (currentNote) setValue(noteField, '', { shouldDirty: true })
    }
  }, [isIssue])

  return (
    <FormField label={label} required={required}>
      <select
        name={statusRegister.name}
        ref={statusRegister.ref}
        onBlur={statusRegister.onBlur}
        required={required}
        value={status}
        onChange={(event) => {
          const value = event.target.value
          setValue(field, value, { shouldDirty: true })
          statusRegister.onChange(event)
        }}
        className="w-full border-2 border-black p-2 text-black text-sm"
      >
        {options && <option value="" disabled>Select Status</option>}
        {selectOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} {option.description && `(${option.description})`}
          </option>
        ))}
      </select>

      {isIssue && noteOptions?.length ? (
        <>
          <select
            className="w-full border-2 border-black p-2 text-black text-sm mt-2"
            value={noteChoice}
            onChange={(e) => handleReasonChange(e.target.value)}
          >
            <option value="" disabled>
              Select reason
            </option>
            {noteOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <Input
            type="text"
            value={noteText}
            onChange={(e) => handleNoteTextChange(e.target.value)}
            placeholder="Add details"
            className="border-2 border-black text-sm mt-2"
          />
        </>
      ) : null}

      {isIssue && !noteOptions?.length && (
        <Input
          {...register(noteField)}
          defaultValue={noteDefault}
          placeholder="Enter details..."
          className="border-2 border-black text-sm mt-2"
        />
      )}
    </FormField>
  )
}

export default function RecordWorkStep({ data, onNext, onBack }: any) {
  const [beforeImages, setBeforeImages] = useState<UploadedImage[]>([])
  const [afterImages, setAfterImages] = useState<UploadedImage[]>([])
  const [brokenImages, setBrokenImages] = useState<UploadedImage[]>([])
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [partsData, setPartsData] = useState<ProjectorPart[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set())
  const [partSearchQuery, setPartSearchQuery] = useState('')
  const [lampModelsData, setLampModelsData] = useState<Array<{ projector_model: string; Models: string[] }>>([])
  const [lampModels, setLampModels] = useState<string[]>([])
  const [softwareVersions, setSoftwareVersions] = useState<string[]>([])
  const [contentPlayers, setContentPlayers] = useState<string[]>([])
  const beforeImagesRef = useRef<UploadedImage[]>([])
  const afterImagesRef = useRef<UploadedImage[]>([])
  const brokenImagesRef = useRef<UploadedImage[]>([])
  const { config: formConfig, loading: configLoading } = useFormConfig()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<RecordWorkForm>({
    defaultValues: createInitialFormData(),
  })

  useEffect(() => {
    const initial = createInitialFormData()
    if (data?.workDetails) {
      reset({
        ...initial,
        ...data.workDetails,

        cinemaName: data.selectedService?.site || data.workDetails.cinemaName || initial.cinemaName,

        date: data.workDetails.date || initial.date,
        address: data.selectedService?.address || data.workDetails.address || initial.address,
        contactDetails: data.selectedService?.contactDetails || data.workDetails.contactDetails || initial.contactDetails,
        projectorModel: data.selectedService?.projectorModel || data.workDetails.projectorModel || initial.projectorModel,
        projectorSerialNumber: data.selectedService?.projector || data.workDetails.projectorSerialNumber || initial.projectorSerialNumber,
        screenNumber: data.selectedService?.screenNumber || data.workDetails.screenNumber || initial.screenNumber,
        issueNotes: data.workDetails.issueNotes || {},
        recommendedParts: data.workDetails.recommendedParts || [],
      })
    } else if (typeof window !== 'undefined' && data?.selectedService?.id) {
      const storageKey = `recordWorkFormData_${data.selectedService.id}`
      const savedFormData = localStorage.getItem(storageKey)
      if (savedFormData) {
        const parsed = JSON.parse(savedFormData)
        reset({
          ...initial,
          ...parsed,

          cinemaName: data.selectedService?.site || parsed.cinemaName || initial.cinemaName,

          date: parsed.date || initial.date,
          address: data.selectedService?.address || parsed.address || initial.address,
          contactDetails: data.selectedService?.contactDetails || parsed.contactDetails || initial.contactDetails,
          projectorModel: data.selectedService?.projectorModel || parsed.projectorModel || initial.projectorModel,
          projectorSerialNumber: data.selectedService?.projector || parsed.projectorSerialNumber || initial.projectorSerialNumber,
          screenNumber: data.selectedService?.screenNumber || parsed.screenNumber || initial.screenNumber,
          issueNotes: parsed.issueNotes || {},
          recommendedParts: parsed.recommendedParts || [],
        })
      } else {

        reset({
          ...initial,
          cinemaName: data.selectedService?.site || initial.cinemaName,

          date: initial.date,
          address: data.selectedService?.address || initial.address,
          contactDetails: data.selectedService?.contactDetails || initial.contactDetails,
          projectorModel: data.selectedService?.projectorModel || initial.projectorModel,
          projectorSerialNumber: data.selectedService?.projector || initial.projectorSerialNumber,
          screenNumber: data.selectedService?.screenNumber || initial.screenNumber,
        })
      }
    }

    if (data?.workImages) {
      setBeforeImages(data.workImages.images || [])
      setAfterImages(data.workImages.afterImages || [])
      setBrokenImages(data.workImages.brokenImages || [])
    } else if (typeof window !== 'undefined' && data?.selectedService?.id) {
      const storageKey = `recordWorkImages_${data.selectedService.id}`
      const savedImages = localStorage.getItem(storageKey)
      if (savedImages) {
        const parsed = JSON.parse(savedImages)
        setBeforeImages(parsed.before || [])
        setAfterImages(parsed.after || [])
        setBrokenImages(parsed.broken || [])
      }
    }
  }, [data, reset])

  useEffect(() => {
    if (typeof window === 'undefined' || !data?.selectedService?.id) return
    const subscription = watch((value) => {
      const storageKey = `recordWorkFormData_${data.selectedService.id}`
      localStorage.setItem(storageKey, JSON.stringify(value))
    })
    return () => subscription.unsubscribe()
  }, [watch, data?.selectedService?.id])

  useEffect(() => {
    const lastServiceData = data?.selectedService?.lastServiceData
    if (!lastServiceData) return

    const preFillLastServiceData = () => {
      const currentValues = getValues()

      const fieldsToPreFill: Array<{
        key: keyof RecordWorkForm
        value: string | number | null | undefined
      }> = [
          { key: 'softwareVersion', value: lastServiceData.softwareVersion },
          { key: 'screenGain', value: lastServiceData.screenGain },
          { key: 'screenMake', value: lastServiceData.screenMake },
          { key: 'throwDistance', value: lastServiceData.throwDistance },
          { key: 'screenHeight', value: lastServiceData.screenHeight },
          { key: 'screenWidth', value: lastServiceData.screenWidth },
          { key: 'flatHeight', value: lastServiceData.flatHeight },
          { key: 'flatWidth', value: lastServiceData.flatWidth },
        ]

      let hasUpdates = false
      fieldsToPreFill.forEach(({ key, value }) => {

        const currentValue = currentValues[key]
        if ((!currentValue || currentValue === '') && value != null && value !== '') {

          const stringValue = typeof value === 'number' ? String(value) : String(value)
          setValue(key, stringValue, { shouldDirty: false })
          hasUpdates = true
        }
      })

      if (hasUpdates && typeof window !== 'undefined' && data?.selectedService?.id) {
        const updatedValues = getValues()
        const storageKey = `recordWorkFormData_${data.selectedService.id}`
        localStorage.setItem(storageKey, JSON.stringify(updatedValues))
      }
    }

    const timeoutId = setTimeout(() => {
      preFillLastServiceData()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [data?.selectedService?.lastServiceData, getValues, setValue, data?.selectedService?.id])

  useEffect(() => {
    beforeImagesRef.current = beforeImages
  }, [beforeImages])

  useEffect(() => {
    afterImagesRef.current = afterImages
  }, [afterImages])

  useEffect(() => {
    brokenImagesRef.current = brokenImages
  }, [brokenImages])

  useEffect(() => {
    const loadPartsData = async () => {
      try {
        const response = await fetch('/api/admin/data-files/projector')
        if (response.ok) {
          const data = await response.json()
          setPartsData(data.data || [])
        }
      } catch (error) {
        console.error('Failed to load projector parts data:', error)
      }
    }
    loadPartsData()
  }, [])

  useEffect(() => {
    const loadLampModelsData = async () => {
      try {
        const response = await fetch('/api/admin/data-files/lamp-models')
        if (!response.ok) return
        const data = await response.json()
        setLampModelsData(data.data || [])
      } catch (error) {
        console.error('Failed to load lamp models data:', error)
      }
    }
    loadLampModelsData()
  }, [])

  useEffect(() => {
    const projectorModel = watch('projectorModel')
    if (!projectorModel || lampModelsData.length === 0) {
      setLampModels([])
      return
    }

    const matchingProjector = lampModelsData.find(
      (item) => item.projector_model?.toLowerCase() === projectorModel.toLowerCase()
    )

    if (matchingProjector && Array.isArray(matchingProjector.Models)) {

      const cleaned = matchingProjector.Models.filter(
        (model): model is string => typeof model === 'string' && model.trim().length > 0 && model.toUpperCase() !== 'NA'
      )
      setLampModels(cleaned)
    } else {
      setLampModels([])
    }
  }, [watch('projectorModel'), lampModelsData])

  useEffect(() => {
    const loadSoftwareVersions = async () => {
      try {
        const response = await fetch('/api/admin/data-files/software')
        if (!response.ok) return
        const data = await response.json()
        setSoftwareVersions(data.values || [])
      } catch (error) {
        console.error('Failed to load software versions:', error)
      }
    }
    loadSoftwareVersions()
  }, [])

  useEffect(() => {
    const loadContentPlayers = async () => {
      try {
        const response = await fetch('/api/admin/data-files/content-player')
        if (!response.ok) return
        const data = await response.json()
        setContentPlayers(data.values || [])
      } catch (error) {
        console.error('Failed to load content players:', error)
      }
    }
    loadContentPlayers()
  }, [])

  useEffect(() => {
    if (isDialogOpen) {
      const currentParts = getValues('recommendedParts') || []
      if (Array.isArray(currentParts) && currentParts.length > 0) {
        setSelectedPartIds(new Set(currentParts.map((p: RecommendedPart) => p.part_number)))
      } else {
        setSelectedPartIds(new Set())
      }

      setPartSearchQuery('')
    }
  }, [isDialogOpen, getValues])

  const persistImages = (before: UploadedImage[], after: UploadedImage[], broken: UploadedImage[]) => {
    setBeforeImages(before)
    setAfterImages(after)
    setBrokenImages(broken)
    if (typeof window !== 'undefined' && data?.selectedService?.id) {
      const storageKey = `recordWorkImages_${data.selectedService.id}`
      localStorage.setItem(storageKey, JSON.stringify({ before, after, broken }))
    }
  }

  const uploadToBlob = async (file: File, category: 'before' | 'after' | 'broken' | 'logs'): Promise<UploadedImage> => {
    let fileToUpload = file
    let folderName = `${category}-images`

    if (category !== 'logs') {
      const { compressImage } = await import('@/lib/image-compression')
      const compressedBlob = await compressImage(file, 1200, 1200, 0.8)

      fileToUpload = new File(
        [compressedBlob],
        file.name.replace(/\.[^/.]+$/, '.jpg'),
        { type: 'image/jpeg' }
      )
    } else {
      folderName = 'projector-logs'
    }

    const formData = new FormData()
    formData.append('file', fileToUpload)
    formData.append('folder', folderName)

    const response = await fetch('/api/blob/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const message = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(message.error || 'Upload failed')
    }

    const result = await response.json()
    return { name: file.name, url: result.url, size: result.size }
  }

  const handleLogsUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const file = files[0]
      if (file) {
        const upload = await uploadToBlob(file, 'logs')
        setValue('logs', upload.url, { shouldDirty: true })
        setImageError(null)
      }
    } catch (error) {
      console.error('Logs upload failed:', error)
      setImageError('Failed to upload logs. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleImageUpload = async (type: 'before' | 'after' | 'broken', files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const uploads = await Promise.all(Array.from(files).map((file) => uploadToBlob(file, type)))
      setImageError(null)

      const nextBefore = type === 'before' ? [...beforeImagesRef.current, ...uploads] : beforeImagesRef.current
      const nextAfter = type === 'after' ? [...afterImagesRef.current, ...uploads] : afterImagesRef.current
      const nextBroken = type === 'broken' ? [...brokenImagesRef.current, ...uploads] : brokenImagesRef.current

      persistImages(nextBefore, nextAfter, nextBroken)
    } catch (error) {
      console.error('Image upload failed:', error)
      setImageError('Failed to upload images. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = (type: 'before' | 'after' | 'broken', index: number) => {
    if (type === 'before') {
      const newImages = [...beforeImages]
      newImages.splice(index, 1)
      persistImages(newImages, afterImages, brokenImages)
    } else if (type === 'after') {
      const newImages = [...afterImages]
      newImages.splice(index, 1)
      persistImages(beforeImages, newImages, brokenImages)
    } else {
      const newImages = [...brokenImages]
      newImages.splice(index, 1)
      persistImages(beforeImages, afterImages, newImages)
    }
  }

  const handleResetForm = () => {
    if (typeof window !== 'undefined' && !window.confirm('Reset all saved data?')) {
      return
    }
    reset(createInitialFormData())
    persistImages([], [], [])
    setImageError(null)
    if (typeof window !== 'undefined' && data?.selectedService?.id) {
      localStorage.removeItem(`recordWorkFormData_${data.selectedService.id}`)
      localStorage.removeItem(`recordWorkImages_${data.selectedService.id}`)
    }
  }

  const projectorModel = watch('projectorModel')
  const filteredParts = partsData.filter((part) => {
    const matchesModel = part.projector_model.toLowerCase() === projectorModel?.toLowerCase()
    if (!matchesModel) return false

    if (!partSearchQuery) return true

    const searchLower = partSearchQuery.toLowerCase()
    const matchesDescription = part.description.toLowerCase().includes(searchLower)
    const matchesPartNumber = part.part_number.toLowerCase().includes(searchLower)

    return matchesDescription || matchesPartNumber
  })

  const isOutOfRange = (value: unknown, min: number, max: number) => {
    if (value === undefined || value === null || value === '') return false
    const num = Number(value)
    if (!Number.isFinite(num)) return false
    return num < min || num > max
  }

  const handlePartToggle = (part: ProjectorPart) => {
    const newSelectedIds = new Set(selectedPartIds)
    if (newSelectedIds.has(part.part_number)) {
      newSelectedIds.delete(part.part_number)
    } else {
      newSelectedIds.add(part.part_number)
    }
    setSelectedPartIds(newSelectedIds)
  }

  const handleSaveSelectedParts = () => {
    const selectedParts: RecommendedPart[] = filteredParts
      .filter((part) => selectedPartIds.has(part.part_number))
      .map((part) => ({
        part_number: part.part_number,
        description: part.description,
      }))
    setValue('recommendedParts', selectedParts, { shouldDirty: true })
    setIsDialogOpen(false)
  }

  const recommendedParts = watch('recommendedParts') || []

  const renderFieldsBySection = (sectionTitle: string) => {
    if (!formConfig || formConfig.length === 0) {
      return null
    }

    const excludedFields = ['screenHeight', 'screenWidth', 'flatHeight', 'flatWidth']
    const sectionFields = formConfig.filter((f) => {
      if (f.section === sectionTitle) {

        if (sectionTitle === 'Software & Screen Information' && excludedFields.includes(f.key)) {
          return false
        }
        return true
      }
      return false
    })
    if (sectionFields.length === 0) {
      return null
    }

    const rows: typeof sectionFields[] = []
    let currentRow: typeof sectionFields = []

    sectionFields.forEach((field, idx) => {
      currentRow.push(field)

      if (currentRow.length >= 2 || field.type === 'textarea' || idx === sectionFields.length - 1) {
        rows.push([...currentRow])
        currentRow = []
      }
    })

    return (
      <>
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className={row.length > 1 && row[0]?.type !== 'textarea' ? "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" : ""}>
            {row.map((field) => {
              if (!field) return null

              if (field.componentType === "statusSelectWithNote") {
                const selectOptions = field.options?.map(opt => ({
                  value: opt,
                  label: opt,
                  description: field.optionDescriptions?.[opt] || ""
                })) || [
                    { value: 'OK', label: 'OK', description: 'Part is OK' },
                    { value: 'YES', label: 'YES', description: 'Needs replacement' },
                  ]

                return (
                  <StatusSelectWithNote
                    key={field.key}
                    field={field.key as keyof RecordWorkForm & string}
                    label={field.label}
                    options={selectOptions}
                    noteOptions={field.noteOptions}
                    noteDefault={field.noteDefault}
                    issueValues={field.issueValues}
                    form={{ watch, register, setValue, getValues }}
                    required={field.required}
                  />
                )
              }

              if (field.key === 'softwareVersion' && softwareVersions.length > 0) {
                return (
                  <FormField key={field.key} label={field.label} required={field.required}>
                    <select
                      {...register(field.key as keyof RecordWorkForm)}
                      className="w-full border-2 border-black p-2 text-sm bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Select software version</option>
                      {softwareVersions.map((version) => (
                        <option key={version} value={version}>{version}</option>
                      ))}
                    </select>
                  </FormField>
                )
              }

              if (field.key === 'lampMakeModel' && lampModels.length > 0) {
                return (
                  <FormField key={field.key} label={field.label} required={field.required}>
                    <select
                      {...register(field.key as keyof RecordWorkForm)}
                      className="w-full border-2 border-black p-2 text-sm bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Select lamp model</option>
                      {lampModels.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </FormField>
                )
              }

              if (field.key === 'contentPlayerModel' && contentPlayers.length > 0) {
                return (
                  <FormField key={field.key} label={field.label} required={field.required}>
                    <select
                      {...register(field.key as keyof RecordWorkForm)}
                      className="w-full border-2 border-black p-2 text-sm bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Select content player</option>
                      {contentPlayers.map((player) => (
                        <option key={player} value={player}>{player}</option>
                      ))}
                    </select>
                  </FormField>
                )
              }

              if (field.key === 'projectorRunningHours') {
                const runningHours = watch('projectorRunningHours')
                const min = field.min !== undefined ? field.min : -Infinity
                const max = field.max !== undefined ? field.max : Infinity
                const isInvalid = isOutOfRange(runningHours, min, max)
                return (
                  <FormField key={field.key} label={field.label} required={field.required}>
                    <DynamicFormField
                      field={field}
                      register={register}
                      className="border-2 border-black text-black text-sm"
                    />
                    {isInvalid && (
                      <p className="text-xs text-red-600 mt-1">
                        {field.min !== undefined && field.max !== undefined
                          ? `Enter between ${field.min} and ${field.max}.`
                          : field.min !== undefined
                            ? `Enter ${field.min} or greater.`
                            : `Enter ${field.max} or less.`}
                      </p>
                    )}
                  </FormField>
                )
              }

              if (field.key === 'lampTotalRunningHours' || field.key === 'lampCurrentRunningHours') {
                const hours = watch(field.key as keyof RecordWorkForm)
                const min = field.min !== undefined ? field.min : -Infinity
                const max = field.max !== undefined ? field.max : Infinity
                const isInvalid = isOutOfRange(hours, min, max)
                return (
                  <FormField key={field.key} label={field.label} required={field.required}>
                    <DynamicFormField
                      field={field}
                      register={register}
                      className="border-2 border-black text-sm"
                    />
                    {isInvalid && (
                      <p className="text-xs text-red-600 mt-1">
                        {field.min !== undefined && field.max !== undefined
                          ? `Enter between ${field.min} and ${field.max}.`
                          : field.min !== undefined
                            ? `Enter ${field.min} or greater.`
                            : `Enter ${field.max} or less.`}
                      </p>
                    )}
                  </FormField>
                )
              }

              if (field.type === 'number' && (field.min !== undefined || field.max !== undefined)) {
                const value = watch(field.key as keyof RecordWorkForm)
                const min = field.min !== undefined ? field.min : -Infinity
                const max = field.max !== undefined ? field.max : Infinity
                const isInvalid = isOutOfRange(value, min, max)

                return (
                  <FormField key={field.key} label={field.label} required={field.required}>
                    <DynamicFormField
                      field={field}
                      register={register}
                      className="border-2 border-black text-sm"
                    />
                    {isInvalid && (
                      <p className="text-xs text-red-600 mt-1">
                        {field.min !== undefined && field.max !== undefined
                          ? `Enter between ${field.min} and ${field.max}.`
                          : field.min !== undefined
                            ? `Enter ${field.min} or greater.`
                            : `Enter ${field.max} or less.`}
                      </p>
                    )}
                  </FormField>
                )
              }

              return (
                <FormField key={field.key} label={field.label} required={field.required}>
                  <DynamicFormField
                    field={field}
                    register={register}
                    className="border-2 border-black text-sm"
                  />
                </FormField>
              )
            })}
          </div>
        ))}
      </>
    )
  }

  const onSubmit = (values: RecordWorkForm) => {
    const validationErrors: string[] = []
    if (formConfig && Array.isArray(formConfig)) {
      formConfig.forEach((field) => {
        if (field.type === 'number' && (field.min !== undefined || field.max !== undefined)) {
          const fieldValue = values[field.key as keyof RecordWorkForm]
          const min = field.min !== undefined ? field.min : -Infinity
          const max = field.max !== undefined ? field.max : Infinity

          if (isOutOfRange(fieldValue, min, max)) {
            const rangeText = field.min !== undefined && field.max !== undefined
              ? `between ${field.min} and ${field.max}`
              : field.min !== undefined
                ? `${field.min} or greater`
                : `${field.max} or less`
            validationErrors.push(`${field.label} must be ${rangeText}.`)
          }
        }
      })
    }

    if (validationErrors.length > 0) {
      setImageError(validationErrors.join(' '))
      return
    }

    const formattedValues = {
      ...values,
      exhaustCfm: values.exhaustCfm ? `${values.exhaustCfm} M/s` : '',
    }

    onNext({
      workDetails: formattedValues,
      workImages: {
        images: beforeImages,
        afterImages: afterImages,
        brokenImages: brokenImages,
      },
    })
  }

  useEffect(() => {

  }, [configLoading, formConfig])

  if (configLoading && formConfig.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Loading form configuration...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h2 className="text-lg sm:text-xl font-bold text-black mb-2">Record Work Details</h2>
      <p className="text-sm text-gray-700 mb-4">Document work performed, issues found, and component status.</p>

      <div className="mb-3 flex justify-end">
        <Button
          type="button"
          onClick={handleResetForm}
          variant="outline"
          className="border-2 border-red-600 text-red-600 hover:bg-red-50 text-sm"
        >
          Reset Form
        </Button>
      </div>

      <div className="border-2 border-black p-3 sm:p-4 mb-4 space-y-6" key={`form-${formConfig.length}`}>
        <FormSection title="Cinema Details">
          {renderFieldsBySection("Cinema Details")}
        </FormSection>

        <FormSection title="Projector Information">
          {renderFieldsBySection("Projector Information")}
        </FormSection>

        <FormSection title="Opticals">
          {renderFieldsBySection("Opticals")}
        </FormSection>

        <FormSection title="Electronics">
          {renderFieldsBySection("Electronics")}
        </FormSection>

        <FormSection title="Serial Number Verified">
          {renderFieldsBySection("Serial Number Verified")}
        </FormSection>

        <FormSection title="Disposable Consumables">
          {renderFieldsBySection("Disposable Consumables")}
        </FormSection>

        <FormSection title="Coolant">
          {renderFieldsBySection("Coolant")}
        </FormSection>

        <FormSection title="Light Engine Test Pattern">
          {renderFieldsBySection("Light Engine Test Pattern")}
        </FormSection>

        <FormSection title="Mechanical">
          {renderFieldsBySection("Mechanical")}
        </FormSection>

        <FormSection title="Software & Screen Information">
          {renderFieldsBySection("Software & Screen Information")}
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Scope Dimensions</p>
            <FormRow>
              <FormField label="Screen Height (m)">
                <Input type="number" step="0.01" {...register('screenHeight')} placeholder="Height" className="border-2 border-black text-sm" />
              </FormField>
              <FormField label="Screen Width (m)">
                <Input type="number" step="0.01" {...register('screenWidth')} placeholder="Width" className="border-2 border-black text-sm" />
              </FormField>
            </FormRow>
          </div>
          <div className="mb-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">Flat Dimensions</p>
            <FormRow>
              <FormField label="Flat Height (m)">
                <Input type="number" step="0.01" {...register('flatHeight')} placeholder="Height" className="border-2 border-black text-sm" />
              </FormField>
              <FormField label="Flat Width (m)">
                <Input type="number" step="0.01" {...register('flatWidth')} placeholder="Width" className="border-2 border-black text-sm" />
              </FormField>
            </FormRow>
          </div>
        </FormSection>

        <FormSection title="Lamp Information">
          {renderFieldsBySection("Lamp Information")}
        </FormSection>

        <FormSection title="Voltage Parameters">
          {renderFieldsBySection("Voltage Parameters")}
        </FormSection>

        <FormSection title="fL Measurements">
          {renderFieldsBySection("fL Measurements")}
        </FormSection>

        <FormSection title="Content Player & AC Status">
          {renderFieldsBySection("Content Player & AC Status")}
        </FormSection>

        <FormSection title="Color Accuracy - MCGD">
          {COLOR_ACCURACY.map(({ name, fields }) => (
            <div key={name} className="mb-4">
              <p className="font-semibold text-black text-sm mb-2">{name}</p>
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">2K Values</p>
                <FormRow>
                  <FormField label="X">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[0] as keyof RecordWorkForm)}
                      placeholder="X"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                  <FormField label="Y">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[1] as keyof RecordWorkForm)}
                      placeholder="Y"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                  <FormField label="fL">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[2] as keyof RecordWorkForm)}
                      placeholder="fL"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                </FormRow>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">4K Values</p>
                <FormRow>
                  <FormField label="X">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[3] as keyof RecordWorkForm)}
                      placeholder="X"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                  <FormField label="Y">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[4] as keyof RecordWorkForm)}
                      placeholder="Y"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                  <FormField label="fL">
                    <Input
                      type="number"
                      step="0.001"
                      {...register(fields[5] as keyof RecordWorkForm)}
                      placeholder="fL"
                      className="border-2 border-black text-black text-sm"
                    />
                  </FormField>
                </FormRow>
              </div>
            </div>
          ))}
        </FormSection>

        <FormSection title="Color Accuracy - CIE XYZ">
          <div className="mb-4">
            <p className="font-semibold text-black text-sm mb-2">BW Step 10</p>
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">2K Values</p>
              <FormRow>
                <FormField label="X">
                  <Input
                    type="number"
                    step="0.001"
                    {...register('BW_Step_10_2Kx')}
                    placeholder="X"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
                <FormField label="Y">
                  <Input
                    type="number"
                    step="0.001"
                    {...register('BW_Step_10_2Ky')}
                    placeholder="Y"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
                <FormField label="fL">
                  <Input
                    type="number"
                    step="0.001"
                    {...register('BW_Step_10_2Kfl')}
                    placeholder="fL"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
              </FormRow>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">4K Values</p>
              <FormRow>
                <FormField label="X">
                  <Input
                    type="number"
                    step="0.001"
                    {...register('BW_Step_10_4Kx')}
                    placeholder="X"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
                <FormField label="Y">
                  <Input
                    type="number"
                    step="0.001"
                    {...register('BW_Step_10_4Ky')}
                    placeholder="Y"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
                <FormField label="fL">
                  <Input
                    type="number"
                    step="0.001"
                    {...register('BW_Step_10_4Kfl')}
                    placeholder="fL"
                    className="border-2 border-black text-black text-sm"
                  />
                </FormField>
              </FormRow>
            </div>
          </div>
        </FormSection>

        <FormSection title="Image Evaluation">
          {renderFieldsBySection("Image Evaluation")}
        </FormSection>

        <FormSection title="Air Pollution Data">
          {renderFieldsBySection("Air Pollution Data")}
        </FormSection>

        <FormSection title="Recommended Parts">
          <div className="space-y-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-2 border-black text-black hover:bg-gray-100"
                  disabled={!projectorModel}
                >
                  {recommendedParts.length > 0
                    ? `Update Selected Parts (${recommendedParts.length})`
                    : 'Select Recommended Parts'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>
                    Select Recommended Parts
                    {projectorModel && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        for {projectorModel}
                      </span>
                    )}
                  </DialogTitle>
                  <DialogDescription>
                    {projectorModel
                      ? `Select parts recommended for projector model ${projectorModel}`
                      : 'Please enter a projector model first to view available parts'}
                  </DialogDescription>
                </DialogHeader>
                {projectorModel && (
                  <div className="pb-2">
                    <Input
                      type="text"
                      placeholder="Search by part name or number..."
                      value={partSearchQuery}
                      onChange={(e) => setPartSearchQuery(e.target.value)}
                      className="border-2 border-gray-300 focus:border-black text-sm"
                    />
                  </div>
                )}
                <div className="flex-1 overflow-y-auto px-1">
                  {!projectorModel ? (
                    <p className="text-sm text-gray-600 py-4">
                      Please enter a projector model in the form above to view available parts.
                    </p>
                  ) : filteredParts.length === 0 ? (
                    <p className="text-sm text-gray-600 py-4">
                      No parts found for projector model "{projectorModel}". Please check the model
                      name.
                    </p>
                  ) : (
                    <div className="space-y-3 py-2">
                      {filteredParts.map((part) => {
                        const isSelected = selectedPartIds.has(part.part_number)
                        return (
                          <div
                            key={part.part_number}
                            className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-md hover:border-black transition-colors"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handlePartToggle(part)}
                              id={part.part_number}
                              className="mt-1"
                            />
                            <Label
                              htmlFor={part.part_number}
                              className="flex-1 cursor-pointer text-sm"
                            >
                              <div className="font-semibold text-black">{part.description}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                Part Number: {part.part_number}
                              </div>
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-2 border-black text-black hover:bg-gray-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveSelectedParts}
                    disabled={!projectorModel || filteredParts.length === 0}
                    className="bg-black text-white hover:bg-gray-800 border-2 border-black"
                  >
                    Save Selected ({selectedPartIds.size})
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {recommendedParts.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs sm:text-sm font-semibold text-black">Selected Parts:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-gray-200 p-3 rounded-md">
                  {recommendedParts.map((part: RecommendedPart, index: number) => (
                    <div
                      key={`${part.part_number}-${index}`}
                      className="text-xs sm:text-sm border-b border-gray-200 pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="font-semibold text-black">{part.description}</div>
                      <div className="text-gray-600">Part Number: {part.part_number}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!projectorModel && (
              <p className="text-xs text-gray-600">
                Please enter a projector model above to select recommended parts.
              </p>
            )}
          </div>
        </FormSection>

        <FormSection title="Remarks">
          {renderFieldsBySection("Remarks")}
        </FormSection>

        <FormSection title="Service Images">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-sm text-black mb-2">Before Images (Optional)</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload('before', e.target.files)}
                className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50"
              />
              {beforeImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {beforeImages.map((file, index) => (
                    <div key={`before-${index}`} className="relative border border-gray-200 p-1 group">
                      <img src={file.url} alt={file.name} className="w-full h-24 object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('before', index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        ✕
                      </button>
                      <p className="text-[11px] text-gray-600 truncate mt-1">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold text-sm text-black mb-2">After Images (Optional)</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload('after', e.target.files)}
                className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50"
              />
              {afterImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {afterImages.map((file, index) => (
                    <div key={`after-${index}`} className="relative border border-gray-200 p-1 group">
                      <img src={file.url} alt={file.name} className="w-full h-24 object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('after', index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        ✕
                      </button>
                      <p className="text-[11px] text-gray-600 truncate mt-1">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold text-sm text-black mb-2">Broken Parts Images (Optional)</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageUpload('broken', e.target.files)}
                className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50"
              />
              {brokenImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {brokenImages.map((file, index) => (
                    <div key={`broken-${index}`} className="relative border border-gray-200 p-1 group">
                      <img src={file.url} alt={file.name} className="w-full h-24 object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('broken', index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        ✕
                      </button>
                      <p className="text-[11px] text-gray-600 truncate mt-1">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="font-semibold text-sm text-black mb-2">Projector Logs (Zip/Folder)</p>
              <input
                type="file"
                accept=".zip,.rar,.7z"
                onChange={(e) => handleLogsUpload(e.target.files)}
                className="w-full border-2 border-dashed border-black p-4 text-sm bg-gray-50"
              />
              {watch('logs') && (
                <div className="mt-2 p-2 border-2 border-black bg-gray-50 flex items-center justify-between">
                  <span className="text-xs font-medium truncate flex-1">Logs Uploaded</span>
                  <button
                    type="button"
                    onClick={() => setValue('logs', '', { shouldDirty: true })}
                    className="text-red-500 text-xs font-bold ml-2"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          {imageError && <p className="text-sm text-red-600 mt-2">{imageError}</p>}
          {uploading && <p className="text-xs text-gray-500 mt-2">Uploading...</p>}
        </FormSection>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="border-2 border-black text-black hover:bg-gray-100 flex-1"
        >
          Back
        </Button>
        <Button
          type="submit"
          className="bg-black text-white hover:bg-gray-800 border-2 border-black font-bold flex-1"
        >
          Continue to Signatures
        </Button>
      </div>
    </form>
  )
}
