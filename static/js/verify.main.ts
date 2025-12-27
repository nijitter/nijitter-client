// Verify page script moved from inline to static file
const verifyForm = document.getElementById('verifyForm') as HTMLFormElement | null;
const verifyErrorMessage = document.getElementById('errorMessage') as HTMLElement | null;
const emailDisplay = document.getElementById('emailDisplay') as HTMLElement | null;
const apiBase = document.body.getAttribute('data-api-url') || '/api';

window.addEventListener('load', () => {
  const email = localStorage.getItem('signup_email');
  if (!email) {
    window.location.href = '/signup';
    return;
  }
  if (emailDisplay) emailDisplay.textContent = `メールアドレス: ${email}`;

  // URLクエリにtokenがあれば自動入力する
  const params = new URLSearchParams(window.location.search);
  const tokenFromUrl = params.get('token');
  const tokenInput = document.getElementById('verifyToken') as HTMLInputElement | null;
  if (tokenFromUrl && tokenInput) {
    tokenInput.value = tokenFromUrl;
  }
});

if (verifyForm) {
  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const verifyToken = (document.getElementById('verifyToken') as HTMLInputElement | null)?.value ?? '';
    const userId = (document.getElementById('userId') as HTMLInputElement | null)?.value ?? '';
    const username = (document.getElementById('username') as HTMLInputElement | null)?.value ?? '';
    const password = (document.getElementById('password') as HTMLInputElement | null)?.value ?? '';
    const confirmPassword = (document.getElementById('confirmPassword') as HTMLInputElement | null)?.value ?? '';

    if (password !== confirmPassword) {
      if (verifyErrorMessage) {
        verifyErrorMessage.textContent = 'パスワードが一致しません';
        verifyErrorMessage.classList.add('show');
      }
      return;
    }

    if (password.length < 8) {
      if (verifyErrorMessage) {
        verifyErrorMessage.textContent = 'パスワードは8文字以上である必要があります';
        verifyErrorMessage.classList.add('show');
      }
      return;
    }

    if (!userId.match(/^[a-zA-Z0-9_-]+$/)) {
      if (verifyErrorMessage) {
        verifyErrorMessage.textContent = 'ユーザーIDは英数字とアンダースコア、ハイフンのみです';
        verifyErrorMessage.classList.add('show');
      }
      return;
    }

    try {
      const response = await fetch(`${apiBase}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token: verifyToken,
          user_id: userId,
          username,
          password,
        }),
      });

      if (response.ok) {
        localStorage.removeItem('signup_email');
        const refreshResp = await fetch(`${apiBase}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (refreshResp.ok) {
          const json = await refreshResp.json().catch(() => ({} as any));
          if ((json as any).access_token) {
            localStorage.setItem('accessToken', (json as any).access_token as string);
          }
        }
        await fetch(`${apiBase}/carrot/me`, {
          headers: {
            Authorization: 'Bearer ' + (localStorage.getItem('accessToken') || ''),
          },
          credentials: 'include',
        }).catch(() => { });
        window.location.href = '/';
      } else {
        const error = await response.json().catch(() => ({} as any));
        if (verifyErrorMessage) {
          verifyErrorMessage.textContent = (error as any).error || '認証に失敗しました';
          verifyErrorMessage.classList.add('show');
        }
      }
    } catch (err: any) {
      if (verifyErrorMessage) {
        verifyErrorMessage.textContent = 'エラーが発生しました: ' + (err?.message ?? String(err));
        verifyErrorMessage.classList.add('show');
      }
    }
  });
}
