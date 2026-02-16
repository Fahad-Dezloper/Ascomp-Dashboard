import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { type UseFormRegister, type UseFormWatch, type UseFormSetValue, type FieldValues, type Path } from 'react-hook-form'
import type { FieldConfig } from '@/hooks/use-form-config'

type DynamicFormFieldProps<T extends FieldValues> = {
  field: FieldConfig
  register: UseFormRegister<T>
  watch?: UseFormWatch<T>
  setValue?: UseFormSetValue<T>
  value?: any
  onChange?: (value: any) => void
  className?: string
}

function parseNestedValue(value: string): { main: string; sub: string } {
  if (!value) return { main: "", sub: "" }
  const idx = value.indexOf(" - ")
  if (idx === -1) return { main: value, sub: "" }
  return { main: value.substring(0, idx), sub: value.substring(idx + 3) }
}

export function DynamicFormField<T extends FieldValues>({
  field,
  register,
  watch,
  setValue,
  value,
  onChange,
  className = "border-2 border-black text-sm",
}: DynamicFormFieldProps<T>) {
  const fieldKey = (field.key || (field as any).id) as Path<T>

  if (field.type === "select") {
    const hasSubOptions = (field.subOptions && Object.keys(field.subOptions).length > 0) ||
      (field.subOptionsInput && Object.keys(field.subOptionsInput).length > 0)

    if (hasSubOptions && watch && setValue) {
      const rawValue = (watch(fieldKey) as string) || ""
      const { main, sub } = parseNestedValue(rawValue)
      const currentSubOptions = field.subOptions?.[main] || []
      const hasCustomInput = field.subOptionsInput?.[main] || false
      const hasSeparator = rawValue.includes(" - ")
      const isOtherSelected = hasCustomInput && hasSeparator && !currentSubOptions.includes(sub)
      const inputOnly = hasCustomInput && currentSubOptions.length === 0

      return (
        <div className="space-y-2">
          <select
            className={`w-full ${className} p-2 bg-white`}
            value={main}
            onChange={(e) => {
              const newMain = e.target.value
              setValue(fieldKey, newMain as any, { shouldDirty: true })
            }}
          >
            <option value="" disabled={!field.defaultValue}>
              {field.placeholder || `Select ${field.label}`}
            </option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {main && inputOnly && (
            <Input
              className={`w-full ${className}`}
              placeholder="Type your answer..."
              value={sub}
              onChange={(e) => {
                setValue(fieldKey, `${main} - ${e.target.value}` as any, { shouldDirty: true })
              }}
            />
          )}
          {main && !inputOnly && (currentSubOptions.length > 0 || hasCustomInput) && (
            <select
              className={`w-full ${className} p-2 bg-white`}
              value={isOtherSelected ? "__other__" : sub}
              onChange={(e) => {
                const val = e.target.value
                if (val === "__other__") {
                  setValue(fieldKey, `${main} - ` as any, { shouldDirty: true })
                } else {
                  setValue(fieldKey, `${main} - ${val}` as any, { shouldDirty: true })
                }
              }}
            >
              <option value="" disabled>
                Select sub-option
              </option>
              {currentSubOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              {hasCustomInput && (
                <option value="__other__">Other (specify)</option>
              )}
            </select>
          )}
          {!inputOnly && hasCustomInput && isOtherSelected && (
            <Input
              className={`w-full ${className}`}
              placeholder="Type your answer..."
              value={sub}
              onChange={(e) => {
                setValue(fieldKey, `${main} - ${e.target.value}` as any, { shouldDirty: true })
              }}
            />
          )}
        </div>
      )
    }

    return (
      <select
        {...register(fieldKey)}
        className={`w-full ${className} p-2 bg-white`}
        defaultValue={field.defaultValue || ""}
      >
        <option value="" disabled={!field.defaultValue}>
          {field.placeholder || `Select ${field.label}`}
        </option>
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === "textarea") {
    return (
      <textarea
        {...register(fieldKey)}
        placeholder={field.placeholder}
        className={`w-full ${className} p-2`}
        rows={field.key === "address" ? 2 : 3}
      />
    )
  }

  if (field.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          {...register(fieldKey)}
          checked={value || false}
          onCheckedChange={onChange}
        />
        <Label className="text-sm">{field.label}</Label>
      </div>
    )
  }

  if (field.type === "date") {
    return (
      <Input
        type="date"
        {...register(fieldKey)}
        className={className}
      />
    )
  }

  if (field.type === "number") {
    return (
      <Input
        type="number"
        step="any"
        {...register(fieldKey)}
        placeholder={field.placeholder}
        className={className}
      />
    )
  }

  // Default to text input
  return (
    <Input
      {...register(fieldKey)}
      placeholder={field.placeholder}
      className={className}
    />
  )
}
