"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  type UseFormReturn,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

// Form provider wrapper compatible with: <Form {...form}>
export type FormProps<TFieldValues extends FieldValues = FieldValues, TContext = any> = {
  children: React.ReactNode
} & UseFormReturn<TFieldValues, TContext>

export function Form<TFieldValues extends FieldValues, TContext>({
  children,
  ...form
}: FormProps<TFieldValues, TContext>) {
  return <FormProvider {...(form as UseFormReturn<TFieldValues, TContext>)}>{children}</FormProvider>
}

// Internal context to expose current field name to nested components like FormMessage
const FormFieldContext = React.createContext<{ name: string } | undefined>(undefined)

export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext)
  const methods = useFormContext()
  const name = fieldContext?.name

  const get = (obj: any, path?: string) => {
    if (!path) return undefined
    return path.split(".").reduce((acc: any, key: string) => acc?.[key], obj)
  }

  const error = name ? get(methods.formState.errors, name) : undefined

  return {
    name,
    formItemId: name ? `${name}-form-item` : undefined,
    formDescriptionId: name ? `${name}-form-item-description` : undefined,
    formMessageId: name ? `${name}-form-item-message` : undefined,
    error,
  }
}

export type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = Omit<ControllerProps<TFieldValues, TName>, "render"> & {
  render: ControllerProps<TFieldValues, TName>["render"]
}

export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
  props: FormFieldProps<TFieldValues, TName>
) {
  const { name, control, render, ...rest } = props as ControllerProps<TFieldValues, TName>
  return (
    <FormFieldContext.Provider value={{ name: name as string }}>
      <Controller name={name} control={control} render={render} {...rest} />
    </FormFieldContext.Provider>
  )
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { formItemId } = useFormField()
    return (
      <div ref={ref} className={cn("space-y-2", className)} id={formItemId} {...props} />
    )
  }
)
FormItem.displayName = "FormItem"

export const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { formItemId } = useFormField()
  return <Label ref={ref} className={cn(className)} htmlFor={formItemId} {...props} />
})
FormLabel.displayName = "FormLabel"

export const FormControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { formItemId, formDescriptionId, formMessageId } = useFormField()
  return (
    <Slot
      ref={ref as any}
      className={className}
      aria-describedby={cn(formDescriptionId, formMessageId)}
      id={formItemId}
      {...(props as any)}
    />
  )
})
FormControl.displayName = "FormControl"

export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()
  return (
    <p ref={ref} className={cn("text-[0.8rem] text-muted-foreground", className)} id={formDescriptionId} {...props} />
  )
})
FormDescription.displayName = "FormDescription"

export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const body = (error as any)?.message as string | undefined
  if (!body && !children) return null

  return (
    <p
      ref={ref}
      className={cn("text-[0.8rem] font-medium text-destructive", className)}
      id={formMessageId}
      {...props}
    >
      {children ?? body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"
