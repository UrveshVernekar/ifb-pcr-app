"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
        ),
        info: (
          <InfoIcon className="size-4 text-blue-600 dark:text-blue-400" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-red-600 dark:text-red-450" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-blue-500" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          success: "!bg-emerald-50/90 !text-emerald-900 !border-emerald-200 dark:!bg-emerald-950/20 dark:!text-emerald-400 dark:!border-emerald-800/50",
          error: "!bg-red-50/90 !text-red-900 !border-red-200 dark:!bg-red-950/20 dark:!text-red-400 dark:!border-red-800/50",
          info: "!bg-blue-50/90 !text-blue-900 !border-blue-200 dark:!bg-blue-950/20 dark:!text-blue-400 dark:!border-blue-800/50",
          warning: "!bg-amber-50/90 !text-amber-900 !border-amber-200 dark:!bg-amber-950/20 dark:!text-amber-400 dark:!border-amber-800/50",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
