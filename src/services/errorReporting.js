const ERROR_QUEUE_KEY = 'build-a-booking-client-error-queue';
const MAX_QUEUED_ERRORS = 20;

const safeSerializeError = (error) => {
  if (!error) return { message: 'Unknown error' };
  if (typeof error === 'string') return { message: error };
  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    stack: String(error.stack || '').slice(0, 5000),
    code: error.code || ''
  };
};

const readQueue = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(ERROR_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeQueue = (queue) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ERROR_QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUED_ERRORS)));
  } catch {
    // If storage is unavailable, console logging still leaves the error in browser/dev logs.
  }
};

export const reportClientError = (error, context = {}) => {
  const report = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: context.source || 'client',
    route: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}${window.location.hash}` : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
    visibility: typeof document !== 'undefined' ? document.visibilityState : '',
    error: safeSerializeError(error),
    info: context.info || null,
    createdAtMs: Date.now()
  };

  console.error('Build A Booking client error report', report);
  writeQueue([...readQueue(), report]);
  return report;
};

export const drainClientErrorQueue = async (writer) => {
  const queue = readQueue();
  if (!queue.length || typeof writer !== 'function') return 0;

  const remaining = [];
  let sent = 0;
  for (const item of queue) {
    try {
      await writer(item);
      sent += 1;
    } catch (error) {
      console.warn('Client error report could not be sent yet.', error);
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return sent;
};
