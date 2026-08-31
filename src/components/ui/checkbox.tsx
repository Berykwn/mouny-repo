import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-[18px] shrink-0 rounded-[5px] border transition-colors outline-none",
        "border-[#e5e5e5] bg-white data-[state=checked]:bg-[#6FA82B] data-[state=checked]:border-[#6FA82B] data-[state=indeterminate]:bg-[#6FA82B] data-[state=indeterminate]:border-[#6FA82B]",
        "focus-visible:ring-[3px] focus-visible:ring-[#6FA82B]/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <Check className="size-3" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
