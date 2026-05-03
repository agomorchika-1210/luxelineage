import { NextResponse } from 'next/server'
import { z } from 'zod'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, code }, { status })
}

export async function parseJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const raw = await request.json().catch(() => {
    throw new ApiError('Invalid JSON body', 400)
  })

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError('Validation error', 400, parsed.error.flatten().formErrors.join('; '))
  }

  return parsed.data
}

