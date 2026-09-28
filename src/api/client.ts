import type { ApiError, SlideDetail, SlideListResponse } from './types';

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(res.status, body?.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const PAGE_SIZE = 20;

export function fetchSlides(params: { q: string; page: number }, signal?: AbortSignal) {
  const search = new URLSearchParams({ page: String(params.page), pageSize: String(PAGE_SIZE) });
  if (params.q) search.set('q', params.q);
  return request<SlideListResponse>(`/api/slides?${search}`, signal);
}

export function fetchSlide(id: string, signal?: AbortSignal) {
  return request<SlideDetail>(`/api/slides/${encodeURIComponent(id)}`, signal);
}
