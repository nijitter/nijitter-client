// Login page script moved from inline to static file
const form = document.getElementById('loginForm') as HTMLFormElement | null;
const errorMessage = document.getElementById('errorMessage') as HTMLElement | null;

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailorid = (document.getElementById('emailorid') as HTMLInputElement | null)?.value ?? '';
    const password = (document.getElementById('password') as HTMLInputElement | null)?.value ?? '';
    const apiBase = document.body.getAttribute('data-api-url') || '/api';

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'include',
        body: new URLSearchParams({
          emailorid,
          password,
        }),
      });

      if (response.ok) {
        const refreshResp = await fetch(`${apiBase}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (refreshResp.ok) {
          const json = await refreshResp.json().catch(() => ({} as any));
          if ((json as any).access_token) {
            localStorage.setItem('accessToken', (json as any).access_token as string);
          }
        }
        window.location.href = '/';
      } else {
        const error = await response.json().catch(() => ({} as any));
        if (errorMessage) {
          errorMessage.textContent = (error as any).error || 'ログインに失敗しました';
          errorMessage.classList.add('show');
        }
      }
    } catch (err: any) {
      if (errorMessage) {
        errorMessage.textContent = 'エラーが発生しました: ' + (err?.message ?? String(err));
        errorMessage.classList.add('show');
      }
    }
  });
}
