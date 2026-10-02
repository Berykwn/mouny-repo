import { createContext, ReactNode, use, useEffect, useState } from "react"

type ThemeType = {
    theme: string
    setTheme: (theme: string) => void
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

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "shadcn-ui-theme",
}: {
    children: ReactNode
    defaultTheme?: string
    storageKey?: string
}) {
    const [theme, setTheme] = useState(
        () => localStorage.getItem(storageKey) ?? defaultTheme
    )

    useEffect(() => {
        const root = window.document.documentElement

        root.classList.remove("light", "dark")

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                .matches
                ? "dark"
                : "light"

            root.classList.add(systemTheme)
            root.style.colorScheme = systemTheme
            applyThemeColor(systemTheme)
            return
        }

        root.classList.add(theme)
        root.style.colorScheme = theme
        applyThemeColor(theme === 'dark' ? 'dark' : 'light')
    }, [theme])

    return (
        <ThemeContext
            value={{
                theme,
                setTheme: (theme: string) => {
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
