/**
 * Carrot Detail App
 * carrot.htmlの初期化スクリプト
 */

import api, { type TimelineCarrot } from './api.js';

interface RepliesState {
  replies: TimelineCarrot[];
  nextCursor: number | null;
  isLoading: boolean;
  hasMore: boolean;
}

class CarrotDetailApp {
  private carrotId: number;
  private imageBase: string;
  private state: RepliesState = {
    replies: [],
    nextCursor: null,
    isLoading: false,
    hasMore: true,
  };

  constructor() {
    const carrotIdStr = document.body.getAttribute('data-carrot-id');
    this.carrotId = parseInt(carrotIdStr || '0', 10);
    this.imageBase = document.body.getAttribute('data-image-url') || '';
  }

  /**
   * アプリを初期化
   */
  async initialize(): Promise<void> {
    try {
      // サイドバーを初期化
      await this.initializeSidebar();

      // 戻るボタンのイベントリスナー（モバイル・デスクトップ両方）
      const backBtns = document.querySelectorAll('#backBtn');
      backBtns.forEach((btn) => {
        btn.addEventListener('click', () => window.history.back());
      });

      // ログアウトボタンのイベントリスナー
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.onLogoutClick());
      }

      // もっと表示ボタンのイベントリスナー
      const loadMoreBtn = document.getElementById('loadMoreBtn');
      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => this.loadReplies());
      }

      // 返信ボタンのイベントリスナー
      const replyButton = document.getElementById('replyButton');
      if (replyButton) {
        replyButton.addEventListener('click', () => this.openReplyModal());
      }

      const desktopReplyButton = document.getElementById('desktopReplyButton');
      if (desktopReplyButton) {
        desktopReplyButton.addEventListener('click', () => this.openReplyModal());
      }

      // 返信モーダルのイベントリスナー
      this.setupReplyModal();

      // キャロット詳細を取得
      const carrotResponse = await api.getCarrot(this.carrotId);
      this.renderCarrot(carrotResponse.carrot);

      // リプライを取得
      await this.loadReplies();

      // スクロールイベントをリッスン
      window.addEventListener('scroll', () => this.onScroll());
    } catch (error) {
      console.error('Failed to load carrot:', error);
      this.showError('投稿の読み込みに失敗しました');
    }
  }

  /**
   * リプライを読み込む
   */
  private async loadReplies(): Promise<void> {
    if (this.state.isLoading || !this.state.hasMore) return;

    this.state.isLoading = true;

    try {
      const response = await api.getReplies(
        this.carrotId,
        this.state.nextCursor || undefined
      );

      this.state.replies.push(...response.carrots);
      this.state.nextCursor = response.next_cursor;
      this.state.hasMore = response.next_cursor !== null;

      this.renderReplies();
    } catch (error) {
      console.error('Failed to load replies:', error);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * スクロール時の処理
   */
  private onScroll(): void {
    const scrollPercentage =
      (window.innerHeight + window.scrollY) / document.body.offsetHeight;

    if (scrollPercentage > 0.8) {
      this.loadReplies();
    }
  }

  /**
   * キャロットをレンダリング
   */
  private renderCarrot(carrot: TimelineCarrot): void {
    const postDetail = document.getElementById('postDetail');
    if (!postDetail) return;

    const imagesHtml = this.renderImages(carrot.images);

    postDetail.innerHTML = `
      <div class="carrot-item" style="padding: 24px; border-bottom: 1px solid var(--color-gray-light);">
        <div class="carrot-user" style="margin-bottom: 16px;">
          <div class="avatar avatar-medium" style="background: #EC407A; color: #fff; display: flex; align-items: center; justify-content: center;">
            ${carrot.icon_path ? `<img src="${carrot.icon_path}" alt="avatar" />` : 'ユーザー'}
          </div>
          <div>
            <div class="carrot-username">${this.escapeHtml(carrot.username)}</div>
            <div class="carrot-userid">@${this.escapeHtml(carrot.user_id)}</div>
          </div>
        </div>
        <div class="carrot-content" style="font-size: 18px; margin-bottom: 16px;">${this.escapeHtml(carrot.content)}</div>
        <div class="carrot-time" style="color: var(--color-gray); margin-bottom: 16px;">${new Date(carrot.created_at).toLocaleString('ja-JP')}</div>
        ${imagesHtml}
      </div>
    `;
  }

  /**
   * リプライをレンダリング
   */
  private renderReplies(): void {
    const repliesList = document.getElementById('repliesList');
    if (!repliesList) return;

    this.state.replies.forEach((reply) => {
      if (!document.querySelector(`[data-reply-id="${reply.id}"]`)) {
        const replyElement = document.createElement('div');
        replyElement.className = 'carrot-item';
        replyElement.style.cssText = 'padding: 16px; border-bottom: 1px solid var(--color-gray-lighter);';
        replyElement.dataset.replyId = reply.id.toString();
        replyElement.innerHTML = `
          <div class="carrot-user" style="margin-bottom: 8px;">
            <div class="avatar avatar-small" style="background: #EC407A; color: #fff; display: flex; align-items: center; justify-content: center;">
              ${reply.icon_path ? `<img src="${reply.icon_path}" alt="avatar" />` : 'U'}
            </div>
            <div>
              <div class="carrot-username">${this.escapeHtml(reply.username)}</div>
              <div class="carrot-userid">@${this.escapeHtml(reply.user_id)}</div>
            </div>
          </div>
          <div class="carrot-content">${this.escapeHtml(reply.content)}</div>
          ${this.renderImages(reply.images)}
          <div class="carrot-time" style="color: var(--color-gray); font-size: 14px; margin-top: 8px;">${new Date(reply.created_at).toLocaleString('ja-JP')}</div>
        `;

        repliesList.appendChild(replyElement);
      }
    });

    // もっと表示ボタンの表示/非表示
    const loadMoreContainer = document.getElementById('loadMoreReplies');
    if (loadMoreContainer) {
      loadMoreContainer.style.display = this.state.hasMore ? 'block' : 'none';
    }
  }

  /**
   * HTMLエスケープ
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /** 画像レンダリング */
  private renderImages(images?: string[]): string {
    if (!images || images.length === 0) return '';
    const base = this.imageBase.replace(/\/$/, '');

    // モバイルかデスクトップかを判定
    const isMobile = window.innerWidth <= 600;
    const maxWidth = isMobile ? 400 : 600;

    const safe = images
      .filter((u) => !!u)
      .map((u) => this.toAbsoluteUrl(u, base))
      .map((u) => this.escapeHtml(u))
      .map((u) => {
        // 画像URLにwidth/heightパラメータを追加
        const url = new URL(u);
        url.searchParams.set('width', maxWidth.toString());
        url.searchParams.set('height', maxWidth.toString());
        return `<div class="post-image-item"><img src="${url.toString()}" alt="image" class="post-image" /></div>`;
      })
      .join('');
    return `<div class="post-images">${safe}</div>`;
  }

  private toAbsoluteUrl(url: string, base: string): string {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (!base) return url;
    if (url.startsWith('/')) {
      return `${base}${url}`;
    }
    return `${base}/${url}`;
  }

  /**
   * 返信モーダルを開く
   */
  private openReplyModal(): void {
    const modal = document.getElementById('replyModal');
    if (modal) {
      modal.classList.add('show');
      const replyText = document.getElementById('replyText') as HTMLTextAreaElement;
      if (replyText) {
        replyText.focus();
      }
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * 返信モーダルを閉じる
   */
  private closeReplyModal(): void {
    const modal = document.getElementById('replyModal');
    if (modal) {
      modal.classList.remove('show');
      const replyText = document.getElementById('replyText') as HTMLTextAreaElement;
      if (replyText) {
        replyText.value = '';
      }
      const charCounter = document.getElementById('replyCharCounter');
      if (charCounter) {
        charCounter.textContent = '0 / 280';
      }
      document.body.style.overflow = '';
    }
  }

  /**
   * 返信モーダルのセットアップ
   */
  private setupReplyModal(): void {
    // テキストエリアの文字数カウント
    const replyText = document.getElementById('replyText') as HTMLTextAreaElement;
    if (replyText) {
      replyText.addEventListener('input', () => {
        const charCounter = document.getElementById('replyCharCounter');
        const count = replyText.value.length;
        if (charCounter) {
          charCounter.textContent = `${count} / 280`;
          charCounter.classList.remove('warning', 'error');
          if (count > 250) {
            charCounter.classList.add('warning');
          }
          if (count > 280) {
            charCounter.classList.add('error');
            replyText.value = replyText.value.substring(0, 280);
          }
        }
      });
    }

    // モーダルを閉じるボタン
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
      modalClose.addEventListener('click', () => this.closeReplyModal());
    }

    const modalCancel = document.getElementById('modalCancel');
    if (modalCancel) {
      modalCancel.addEventListener('click', () => this.closeReplyModal());
    }

    // 返信送信ボタン
    const replySubmit = document.getElementById('replySubmit');
    if (replySubmit) {
      replySubmit.addEventListener('click', () => this.submitReply());
    }

    // モーダル外をクリックで閉じる
    const modal = document.getElementById('replyModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeReplyModal();
        }
      });
    }
  }

  /**
   * 返信を送信
   */
  private async submitReply(): Promise<void> {
    const replyText = document.getElementById('replyText') as HTMLTextAreaElement;
    if (!replyText || !replyText.value.trim()) {
      this.showReplyError('返信内容を入力してください');
      return;
    }

    try {
      await api.postCarrot({
        content: replyText.value,
        reply_to: this.carrotId,
      });

      this.closeReplyModal();
      // ページをリロードして返信を表示
      window.location.reload();
    } catch (error) {
      console.error('Failed to post reply:', error);
      this.showReplyError('返信の投稿に失敗しました');
    }
  }

  /**
   * 返信エラーを表示
   */
  private showReplyError(message: string): void {
    const errorDiv = document.getElementById('replyError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      errorDiv.style.color = '#f44336';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 4000);
    }
  }

  /**
   * サイドバーを初期化
   */
  private async initializeSidebar(): Promise<void> {
    try {
      const meResponse = await api.getMe();
      const user = meResponse.me;

      // デスクトップビューのサイドバー
      const desktopUserName = document.getElementById('desktopUserName');
      const desktopUserId = document.getElementById('desktopUserId');
      const desktopAvatar = document.getElementById('desktopUserAvatar');

      if (desktopUserName) {
        desktopUserName.textContent = user.username;
      }
      if (desktopUserId) {
        desktopUserId.textContent = `@${user.user_id}`;
      }
      if (desktopAvatar && user.icon_path) {
        desktopAvatar.innerHTML = `<img src="${user.icon_path}" alt="avatar" style="width: 100%; height: 100%; object-fit: cover;" />`;
      }
    } catch (error) {
      console.error('Failed to initialize sidebar:', error);
    }
  }

  /**
   * ログアウトボタンクリック
   */
  private async onLogoutClick(): Promise<void> {
    try {
      const apiUrl = document.body.getAttribute('data-api-url') || '/api';
      await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api.getAccessToken()}`,
        },
      });
      api.clearTokens();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  /**
   * エラーメッセージを表示
   */
  private showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.textContent = message;
    document.body.prepend(errorDiv);
  }
}

// DOMContentLoaded待機
document.addEventListener('DOMContentLoaded', () => {
  const app = new CarrotDetailApp();
  app.initialize().catch(console.error);
});
