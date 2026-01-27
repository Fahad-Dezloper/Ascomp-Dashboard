import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { type UseFormRegister, type FieldValues, type Path } from 'react-hook-form'
import type { FieldConfig } from '@/hooks/use-form-config'

type DynamicFormFieldProps<T extends FieldValues> = {
  field: FieldConfig
  register: UseFormRegister<T>
  value?: any
  onChange?: (value: any) => void
  className?: string
}

export function DynamicFormField<T extends FieldValues>({
  field,
  register,
  value,
  onChange,
  className = "border-2 border-black text-sm",
}: DynamicFormFieldProps<T>) {
  const fieldKey = (field.key || (field as any).id) as Path<T>

  if (field.type === "select") {
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
