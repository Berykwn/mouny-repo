import { PostgrestError } from '@supabase/supabase-js'

export interface ServiceResult<T> {
    data: T | null
    error: string | null
}

export function handleError(error: PostgrestError | Error | unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error !== null && 'message' in error) {
        return (error as PostgrestError).message
    }
    return 'Something went wrong. Please try again.'
}