import { createContext, ReactNode, use, useEffect, useState } from "react"

export type Theme = "light" | "dark" | "system"

type ThemeType = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeType | null>(null)

/** The page background per theme (neutral-50 / neutral-950), used for the status bar. */
const THEME_COLORS = { light: '#fafafa', dark: '#0a0a0a' }

/**
 * index.html picks the status bar colour from the system theme; when the app's own theme
 * differs (or follows the system), every theme-color tag gets the one in use.
 */
function applyThemeColor(theme: keyof typeof THEME_COLORS) {
    document.querySelectorAll('meta[name="theme-color"]')
        .forEach(meta => meta.setAttribute('content', THEME_COLORS[theme]))
}

/**
 * Chromium browsers with forced dark (Samsung Internet, Chrome's "darken websites") repaint any
 * page whose color-scheme lacks dark. "only" opts out, so a chosen light theme stays ours.
 */
function applyColorScheme(scheme: string) {
    document.documentElement.style.colorScheme = scheme
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', scheme)
}

function readTheme(storageKey: string, fallback: Theme): Theme {
    const stored = localStorage.getItem(storageKey)
    return stored === "light" || stored === "dark" || stored === "system" ? stored : fallback
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "shadcn-ui-theme",
}: {
    children: ReactNode
    defaultTheme?: Theme
    storageKey?: string
}) {
    const [theme, setTheme] = useState<Theme>(() => readTheme(storageKey, defaultTheme))

    useEffect(() => {
        const root = window.document.documentElement
        const media = window.matchMedia("(prefers-color-scheme: dark)")

        const apply = () => {
            const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme
            root.classList.remove("light", "dark")
            root.classList.add(resolved)
            applyColorScheme(theme === "system" ? "light dark" : `only ${resolved}`)
            applyThemeColor(resolved)
        }

        apply()
        if (theme !== "system") return

        // Follow the OS live, e.g. a scheduled switch to dark at night.
        media.addEventListener("change", apply)
        return () => media.removeEventListener("change", apply)
    }, [theme])

    return (
        <ThemeContext
            value={{
                theme,
                setTheme: (theme: Theme) => {
                    localStorage.setItem(storageKey, theme)
                    setTheme(theme)
                },
            }}>
            {children}
        </ThemeContext>
    )
}

export function useTheme(): ThemeType {
    const context = use(ThemeContext)

    if (context === null) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }

    return context
}
