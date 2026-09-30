export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';

export function logout() {
  ['ed_token', 'ed_user', 'ed_shop'].forEach((k) => localStorage.removeItem(k));
  window.location.href = '/login';
}

export async function gql<T = any>(query: string, variables?: any): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ed_token') : null;
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors[0].message;
    if (msg === 'Unauthorized' && token) logout();
    throw new Error(msg);
  }
  return json.data;
}

export const taka = (n: number) => '৳' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
export const timeOf = (d: string) => new Date(d).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
export const dateOf = (d: string) => new Date(d).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
