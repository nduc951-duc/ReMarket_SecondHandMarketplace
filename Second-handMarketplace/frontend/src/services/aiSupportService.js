const DEFAULT_BACKEND_URL = 'http://localhost:4000';

function getBackendUrl() {
  return import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
}

export async function askAiSupport(message) {
  const response = await fetch(`${getBackendUrl()}/api/ai-support/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || 'Khong the ket noi tro ly AI.');
  }

  return result.data;
}
