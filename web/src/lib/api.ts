/**
 * API client — base URL aware fetch wrapper.
 */

const BASE_URL = '/api/tron'

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${path}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`
    try {
      const err = await response.json()
      errorMsg = err.detail || err.message || errorMsg
    } catch {}
    throw new Error(errorMsg)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  postFile: <T>(path: string, formData: FormData) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
    }).then(async (r) => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        throw new Error(err.detail || `HTTP ${r.status}`)
      }
      return r.json() as Promise<T>
    }),
}

export default api
