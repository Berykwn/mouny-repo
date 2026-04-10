import { Toaster } from './components/ui/sonner'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppRouter } from '@/routes/index'

export default function App() {
    return (
        <ThemeProvider>
            <AppRouter />
            <Toaster richColors position='top-right'/>
        </ThemeProvider>
    )
}
