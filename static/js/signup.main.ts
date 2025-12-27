// Signup page script moved from inline to static file
const signupForm = document.getElementById('signupForm') as HTMLFormElement | null;
const signupErrorMessage = document.getElementById('errorMessage') as HTMLElement | null;

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (document.getElementById('email') as HTMLInputElement | null)?.value ?? '';
    const apiBase = document.body.getAttribute('data-api-url') || '/api';

    try {
      const response = await fetch(`${apiBase}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        localStorage.setItem('signup_email', email);
        window.location.href = '/verify';
      } else {
        const error = await response.json().catch(() => ({} as any));
        if (signupErrorMessage) {
          signupErrorMessage.textContent = (error as any).error || '確認メール送信に失敗しました';
          signupErrorMessage.classList.add('show');
        }
      }
    } catch (err: any) {
      if (signupErrorMessage) {
        signupErrorMessage.textContent = 'エラーが発生しました: ' + (err?.message ?? String(err));
        signupErrorMessage.classList.add('show');
      }
    }
  });
}
