import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { BottomDrawer } from '@/components/bottom-drawer'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { OFFLINE_REASON } from '@/components/offline-banner'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { FIELD_INPUT, FIELD_LABEL, SUBMIT_BUTTON } from '@/features/auth/components/auth-styles'
import { BusyLabel } from '@/components/busy-label'

const MAX_NAME = 60

interface EditNameDrawerProps {
    open: boolean
    onClose: () => void
    currentName: string | null
}

/**
 * The name Mouny greets you with, saved on the account itself (auth user metadata),
 * so every signed-in device picks it up.
 */
export function EditNameDrawer({ open, onClose, currentName }: EditNameDrawerProps) {
    return (
        <BottomDrawer open={open} onClose={onClose} title="Your name">
            {/* Remounted on every open, so it starts from the saved name. */}
            {open && <NameForm currentName={currentName} onDone={onClose} />}
        </BottomDrawer>
    )
}

function NameForm({ currentName, onDone }: { currentName: string | null; onDone: () => void }) {
    const online = useOnlineStatus()
    const [name, setName] = useState(currentName ?? '')
    const [saving, setSaving] = useState(false)
    const trimmed = name.trim().replace(/\s+/g, ' ')
    const unchanged = trimmed === (currentName ?? '')

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (!online) { toast(OFFLINE_REASON); return }
        if (!trimmed || unchanged) return
        setSaving(true)
        const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
        setSaving(false)
        if (error) { toast.error(error.message || 'Couldn’t save your name.'); return }
        // A first name gets a hello; changing one is just a change.
        if (currentName) toast.success('Name updated')
        else toast.success(`Nice to meet you, ${trimmed.split(' ')[0]}.`)
        onDone()
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 pb-2">
            <div className="space-y-2">
                <label htmlFor="display-name" className={FIELD_LABEL}>What should Mouny call you?</label>
                <Input
                    id="display-name"
                    value={name}
                    onChange={e => setName(e.target.value.slice(0, MAX_NAME))}
                    placeholder="e.g. Budi Santoso"
                    autoComplete="name"
                    autoFocus
                    className={FIELD_INPUT}
                />
                <p className="text-[12.5px] text-subtle-ink">Shown on Home and in Settings. Only you see it.</p>
            </div>
            <button type="submit" disabled={saving || !trimmed || unchanged} className={SUBMIT_BUTTON}>
                <BusyLabel busy={saving}>Save name</BusyLabel>
            </button>
        </form>
    )
}
