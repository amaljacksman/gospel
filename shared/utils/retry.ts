export interface RetryDecision {
  retry: boolean;
  permanent: boolean;
  delaySeconds: number;
}
export function retryDecision(
  status: number | undefined,
  attempt: number,
  max: number,
): RetryDecision {
  const retryable = status === undefined || status === 429 || status >= 500;
  if (!retryable) return { retry: false, permanent: true, delaySeconds: 0 };
  if (attempt >= max) return { retry: false, permanent: true, delaySeconds: 0 };
  return {
    retry: true,
    permanent: false,
    delaySeconds: Math.min(3600, 30 * 2 ** Math.max(0, attempt - 1)),
  };
}
