import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * A compact pill at the top centre: an ink pill in light mode, a raised dark surface with a
 * hairline in dark mode (never a bright slab on a dark screen). Either way it reads as dark,
 * so the accent and status colours are the light ones. Only the icon carries the status colour.
 * Sonner's own rules size and place toasts, so the overrides here need `!`.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-center"
      gap={8}
      offset={{ top: 12 }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 8px)", left: 16, right: 16 }}
      // On phones Sonner gives the list `width: 100%` on top of its side offsets, which pushes
      // a centred toast off-centre; letting the offsets set the width keeps it in the middle.
      className="toaster group max-[600px]:!w-auto"
      icons={{
        success: <CircleCheckIcon className="size-[18px]" />,
        info: <InfoIcon className="size-[18px]" />,
        warning: <TriangleAlertIcon className="size-[18px]" />,
        error: <OctagonXIcon className="size-[18px]" />,
        loading: <Loader2Icon className="size-[18px] animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: [
            "inset-x-0 !mx-auto !w-fit !max-w-full",
            "!rounded-[22px] !border-0 dark:!border dark:!border-line-strong !py-2.5 !pl-3.5 !pr-4 !gap-2.5",
            "!bg-ink !text-on-ink dark:!bg-raised dark:!text-ink",
            "!shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
            "!font-sans !text-[13.5px] !font-medium !leading-snug",
          ].join(" "),
          icon: "!m-0 !size-[18px] shrink-0",
          description: "!text-on-ink/60 dark:!text-muted-ink !text-[12.5px] !font-normal",
          actionButton: [
            "!ml-1.5 !h-auto !p-0 !bg-transparent !rounded-none",
            "!text-[13.5px] !font-semibold !text-toast-accent",
          ].join(" "),
          cancelButton: "!ml-1.5 !h-auto !p-0 !bg-transparent !text-[13.5px] !text-on-ink/60 dark:!text-muted-ink",
          success: "[&_[data-icon]]:text-toast-accent",
          error: "[&_[data-icon]]:text-red-400",
          warning: "[&_[data-icon]]:text-amber-400",
          info: "[&_[data-icon]]:text-sky-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
