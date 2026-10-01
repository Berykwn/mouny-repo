import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
    delayMs?: number
    moveThresholdPx?: number
    /** Called on a plain click — never right after a long press fired. */
    onTap?: () => void
}

export function useLongPress(onLongPress: () => void, options?: UseLongPressOptions) {
    const delayMs = options?.delayMs ?? 500
    const moveThresholdPx = options?.moveThresholdPx ?? 10

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const startRef = useRef<{ x: number; y: number } | null>(null)
    const firedRef = useRef(false)
    const onTap = options?.onTap

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const onPointerDown = useCallback((event: React.PointerEvent) => {
        startRef.current = { x: event.clientX, y: event.clientY }
        firedRef.current = false
        clearTimer()
        timerRef.current = setTimeout(() => {
            timerRef.current = null
            firedRef.current = true
            onLongPress()
        }, delayMs)
    }, [clearTimer, delayMs, onLongPress])

    const onPointerMove = useCallback((event: React.PointerEvent) => {
        if (!startRef.current) return
        const dx = event.clientX - startRef.current.x
        const dy = event.clientY - startRef.current.y
        if (Math.sqrt(dx * dx + dy * dy) > moveThresholdPx) {
            clearTimer()
        }
    }, [clearTimer, moveThresholdPx])

    const onPointerUp = useCallback(() => {
        clearTimer()
    }, [clearTimer])

    const onPointerLeave = useCallback(() => {
        clearTimer()
    }, [clearTimer])

    const onPointerCancel = useCallback(() => {
        clearTimer()
    }, [clearTimer])

    const onContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault()
    }, [])

    const onClick = useCallback(() => {
        if (firedRef.current) { firedRef.current = false; return }
        onTap?.()
    }, [onTap])

    return {
        onClick,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerLeave,
        onPointerCancel,
        onContextMenu,
    }
}
