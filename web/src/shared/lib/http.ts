const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function get<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  
  
  const res = await fetch(url, options);
  
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} - ${url}`);
  }
  
  return res.json() as Promise<T>;
}

export async function post<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  
  const res = await fetch(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} - ${url}`);
  }
  
  return res.json() as Promise<T>;
}