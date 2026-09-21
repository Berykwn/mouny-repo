import { useCallback, useRef } from 'react'

interface UseLongPressOptions {
    delayMs?: number
    moveThresholdPx?: number
}

export function useLongPress(onLongPress: () => void, options?: UseLongPressOptions) {
    const delayMs = options?.delayMs ?? 500
    const moveThresholdPx = options?.moveThresholdPx ?? 10

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const startRef = useRef<{ x: number; y: number } | null>(null)

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const onPointerDown = useCallback((event: React.PointerEvent) => {
        startRef.current = { x: event.clientX, y: event.clientY }
        clearTimer()
        timerRef.current = setTimeout(() => {
            timerRef.current = null
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

    return {
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerLeave,
        onPointerCancel,
        onContextMenu,
    }
}
