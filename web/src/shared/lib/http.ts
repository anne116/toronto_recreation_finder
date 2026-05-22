function apiUrl(path: string): string {
  return path
}

export async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}