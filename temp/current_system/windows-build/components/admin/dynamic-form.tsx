"use client"

import { useState, useEffect } from "react"
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "sonner"

interface DynamicFormProps {
  formKey: string
  onSubmit?: (data: any) => void
  onCancel?: () => void
  defaultValues?: any
  submitButtonText?: string
  cancelButtonText?: string
  className?: string
}

export function DynamicForm({ 
  formKey, 
  onSubmit, 
  onCancel, 
  defaultValues = {}, 
  submitButtonText = "Submit",
  cancelButtonText = "Cancel",
  className = ""
}: DynamicFormProps) {
  const [formSchema, setFormSchema] = useState<any>(null)
  const [formConfig, setFormConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchFormConfig()
  }, [formKey])

  const fetchFormConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/forms?form_key=${formKey}`)
      const data = await response.json()
      
      if (data.success && data.data.length > 0) {
        const config = data.data[0]
        setFormConfig(config)
        setFormSchema(JSON.parse(config.form_schema))
      }
    } catch (error) {
      console.error("Failed to fetch form config:", error)
      toast.error("Failed to load form configuration")
    } finally {
      setLoading(false)
    }
  }

  const buildValidationSchema = (schema: any) => {
    const fields: Record<string, any> = {}
    
    Object.keys(schema).forEach(key => {
      const field = schema[key]
      switch (field.type) {
        case "string":
          fields[key] = z.string().min(field.min || 0, field.required ? "This field is required" : undefined)
          if (field.max) fields[key] = (fields[key] as any).max(field.max)
          break
        case "number":
          fields[key] = z.number()
          if (field.min !== undefined) fields[key] = (fields[key] as any).min(field.min)
          if (field.max !== undefined) fields[key] = (fields[key] as any).max(field.max)
          break
        case "boolean":
          fields[key] = z.boolean()
          break
        case "enum":
          fields[key] = z.enum(field.values)
          break
        case "array":
          fields[key] = z.array(z.string())
          break
        default:
          fields[key] = z.string()
      }
      
      if (field.required) {
        fields[key] = (fields[key] as any).refine((val: any) => val !== undefined && val !== null && val !== "")
      }
    })

    return z.object(fields)
  }

  const getInitialValues = (schema: any) => {
    const values: Record<string, any> = {}
    Object.keys(schema).forEach(key => {
      const field = schema[key]
      if (defaultValues[key] !== undefined) {
        values[key] = defaultValues[key]
      } else {
        values[key] = field.default ?? (field.type === "boolean" ? false : "")
      }
    })
    return values
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading form...</div>
      </div>
    )
  }

  if (!formSchema) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Form configuration not found</div>
      </div>
    )
  }

  const validationSchema = buildValidationSchema(formSchema)
  const initialValues = getInitialValues(formSchema)

  const form = useForm<z.infer<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues
  })

  const handleSubmit = async (values: z.infer<typeof validationSchema>) => {
    try {
      setSubmitting(true)
      if (onSubmit) {
        await onSubmit(values)
      }
      toast.success("Form submitted successfully")
    } catch (error) {
      console.error("Form submission error:", error)
      toast.error("Failed to submit form")
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (fieldName: string, fieldConfig: any) => {
    const { type, label, description, placeholder, options, min, max } = fieldConfig

    switch (type) {
      case "string":
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input 
                placeholder={placeholder} 
                {...form.register(fieldName)} 
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )

      case "textarea":
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Textarea 
                placeholder={placeholder} 
                {...form.register(fieldName)} 
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )

      case "number":
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input 
                type="number"
                min={min}
                max={max}
                placeholder={placeholder?.toString()} 
                {...form.register(fieldName, { valueAsNumber: true })} 
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )

      case "boolean":
        return (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">{label}</FormLabel>
              {description && <FormDescription>{description}</FormDescription>}
            </div>
            <FormControl>
              <Switch
                checked={form.watch(fieldName)}
                onCheckedChange={(checked) => form.setValue(fieldName, checked)}
              />
            </FormControl>
          </FormItem>
        )

      case "enum":
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select 
              onValueChange={(value) => form.setValue(fieldName, value)}
              defaultValue={form.watch(fieldName)}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {options?.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )

      case "array":
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="space-y-2">
              {options?.map((option: any) => (
                <FormField
                  key={option.value}
                  control={form.control}
                  name={fieldName}
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={option.value}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(option.value)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), option.value])
                                : field.onChange(
                                    field.value?.filter(
                                      (value: any) => value !== option.value
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {option.label}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
            </div>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )

      default:
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input placeholder={placeholder} {...form.register(fieldName)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )
    }
  }

  return (
    <div className={className}>
      {formConfig?.form_name && (
        <h2 className="text-2xl font-bold mb-6">{formConfig.form_name}</h2>
      )}
      
      {formConfig?.form_description && (
        <p className="text-muted-foreground mb-6">{formConfig.form_description}</p>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {Object.keys(formSchema).map(fieldName => (
            <div key={fieldName}>
              {renderField(fieldName, formSchema[fieldName])}
            </div>
          ))}
          
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? "Submitting..." : submitButtonText}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={submitting}
              >
                {cancelButtonText}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}