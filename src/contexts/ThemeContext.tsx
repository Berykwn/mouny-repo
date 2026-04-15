import { createContext, ReactNode, useContext } from "react"

type ThemeType = {
    theme: string
    setTheme: (theme: string) => void
}

export const ThemeContext = createContext<ThemeType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
    return (
        <ThemeContext value={{ theme: "light", setTheme: () => { } }}>
            {children}
        </ThemeContext>
    )
}

export function useTheme(): ThemeType {
    const context = useContext(ThemeContext)
    if (!context) throw new Error("useTheme must be used within ThemeProvider")
    return context
}