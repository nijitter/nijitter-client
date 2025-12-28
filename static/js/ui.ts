/**
 * UI Components Manager
 * HTML要素の操作とイベントハンドリング
 */

import api, { type TimelineCarrot, type UserData } from './api.js';
import { TimelineManager, type TimelineState } from './timeline.js';
import PostFormManager from './postform.js';

export class UIManager {
  private timelineManager: TimelineManager;
  private postFormManager: PostFormManager | null = null;
  private imageBase: string;

  constructor(timelineManager: TimelineManager) {
    this.timelineManager = timelineManager;
    this.postFormManager = new PostFormManager();
    this.imageBase = document.body.getAttribute('data-image-url') || '';
    this.setupEventListeners();
    this.subscribeToTimelineUpdates();
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // タブ切り替え
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => this.onTabChange(e));
    });

    // 投稿ボタン（モバイル）
    const postButtons = document.querySelectorAll('.btn-post');
    postButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.onPostButtonClick());
    });

    // 投稿ボタン（デスクトップ）
    const desktopPostButton = document.getElementById('desktopPostButton');
    if (desktopPostButton) {
      desktopPostButton.addEventListener('click', () => this.onPostButtonClick());
    }

    // ログアウトボタン
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.onLogoutClick());
    });

    // 通知ボタン
    const mobileNotificationBtn = document.getElementById('mobileNotificationBtn');
    const desktopNotificationBtn = document.getElementById('desktopNotificationBtn');
    if (mobileNotificationBtn) {
      mobileNotificationBtn.addEventListener('click', () => this.openNotificationPanel());
    }
    if (desktopNotificationBtn) {
      desktopNotificationBtn.addEventListener('click', () => this.openNotificationPanel());
    }

    // 通知パネル閉じる
    const notificationClose = document.getElementById('notificationClose');
    if (notificationClose) {
      notificationClose.addEventListener('click', () => this.closeNotificationPanel());
    }

    // 検索ボタン（モバイル）
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    if (mobileSearchBtn) {
      mobileSearchBtn.addEventListener('click', () => this.openSearchPanel());
    }

    // 検索パネル閉じる（モバイル）
    const searchBackBtn = document.getElementById('searchBackBtn');
    if (searchBackBtn) {
      searchBackBtn.addEventListener('click', () => this.closeSearchPanel());
    }

    // 検索入力（デスクトップ）
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    if (searchInput) {
      let searchTimeout: number;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
          const query = searchInput.value.trim();
          if (query) {
            this.performSearch(query);
          } else {
            this.clearSearchResults();
          }
        }, 300);
      });
    }

    // 検索入力（モバイル）
    const mobileSearchInput = document.getElementById('mobileSearchInput') as HTMLInputElement;
    if (mobileSearchInput) {
      let searchTimeout: number;
      mobileSearchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(() => {
          const query = mobileSearchInput.value.trim();
          if (query) {
            this.performMobileSearch(query);
          } else {
            this.clearMobileSearchResults();
          }
        }, 300);
      });
    }

    // ホームボタン
    const homeButtons = document.querySelectorAll('#mobileHomeBtn, #desktopHomeBtn');
    homeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = '/timeline';
      });
    });

    // 無限スクロール
    window.addEventListener('scroll', () => this.onScroll());

    // 未読通知数を定期的に取得
    this.startNotificationPolling();
  }

  /**
   * タイムラインの更新をリッスン
   */
  private subscribeToTimelineUpdates(): void {
    this.timelineManager.subscribe((state) => {
      this.renderTimeline(state);
    });
  }

  /**
   * タブ変更時の処理
   */
  private onTabChange(e: Event): void {
    const target = e.target as HTMLElement;
    const tabs = document.querySelectorAll('.tab');

    tabs.forEach((tab) => tab.classList.remove('active'));
    target.classList.add('active');

    const isLatest = target.textContent?.includes('最新');
    this.timelineManager.setTimelineType(isLatest ? 'latest' : 'following');

    // 既存の投稿をクリア
    const mobilePostList = document.getElementById('mobilePostList');
    const desktopPostList = document.getElementById('desktopPostList');
    if (mobilePostList) mobilePostList.innerHTML = '';
    if (desktopPostList) desktopPostList.innerHTML = '';

    this.timelineManager.loadTimeline().catch(console.error);
  }

  /**
   * 投稿ボタンクリック
   */
  private onPostButtonClick(): void {
    if (this.postFormManager) {
      this.postFormManager.openModal();
    }
  }

  /**
   * ログアウトボタンクリック
   */
  private async onLogoutClick(): Promise<void> {
    try {
      await fetch(`${this.getApiUrl()}/auth/logout`, {
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
   * スクロール時の処理（無限スクロール）
   */
  private onScroll(): void {
    const scrollPercentage =
      (window.innerHeight + window.scrollY) / document.body.offsetHeight;

    if (scrollPercentage > 0.8) {
      this.timelineManager.loadMore().catch(console.error);
    }
  }

  /**
   * タイムラインをレンダリング
   */
  private renderTimeline(state: TimelineState): void {
    const mobilePostList = document.getElementById('mobilePostList');
    const desktopPostList = document.getElementById('desktopPostList');

    if (!mobilePostList || !desktopPostList) return;

    // 完全に再描画（タイムライン切り替え時）
    if (state.carrots.length > 0 && mobilePostList.children.length === 0) {
      mobilePostList.innerHTML = '';
      desktopPostList.innerHTML = '';
    }

    // 既存のローダーを除去
    mobilePostList.querySelector('.loader')?.remove();
    desktopPostList.querySelector('.loader')?.remove();

    // 新しい投稿を追加（重複チェック）
    state.carrots.forEach((carrot) => {
      if (!mobilePostList.querySelector(`[data-carrot-id="${carrot.id}"]`)) {
        const mobileElement = this.createPostElement(carrot);
        mobilePostList.appendChild(mobileElement);

        const desktopElement = this.createPostElement(carrot);
        desktopPostList.appendChild(desktopElement);
      }
    });

    // ローディング表示
    if (state.isLoading) {
      const loaderHTML = '<div class="loader">読み込み中...</div>';
      mobilePostList.insertAdjacentHTML('beforeend', loaderHTML);
      desktopPostList.insertAdjacentHTML('beforeend', loaderHTML);
    }
  }

  /**
   * 投稿要素を作成
   */
  private createPostElement(carrot: TimelineCarrot): HTMLElement {
    const postItem = document.createElement('div');
    postItem.className = 'post-item';
    postItem.dataset.carrotId = carrot.id.toString();

    const iconPath = carrot.icon_path || '#EC407A';
    const createdAt = new Date(carrot.created_at).toLocaleString('ja-JP');
    const isLiked = carrot.is_liked || false;

    postItem.innerHTML = `
      <div class="avatar avatar-small" 
        style="background: ${iconPath}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px;">
        ${iconPath.startsWith('#') ? 'ユーザー' : `<img src="${iconPath}" alt="avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`}
      </div>
      <div class="post-content">
        <div class="post-header">
          <span class="post-username">${carrot.username}</span>
          <span class="post-userid">@${carrot.user_id}</span>
          <span class="post-time">${createdAt}</span>
        </div>
        <div class="post-text">${this.escapeHtml(carrot.content)}</div>
        ${this.renderImages(carrot.images)}
        <div class="post-actions">
          <button class="action-btn reply-btn" data-carrot-id="${carrot.id}">💬 返信</button>
          <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-carrot-id="${carrot.id}">❤️ いいね</button>
          <button class="action-btn share-btn" data-carrot-id="${carrot.id}">🔗 リンクをコピー</button>
        </div>
      </div>
    `;

    // イベントリスナー
    postItem
      .querySelector('.reply-btn')
      ?.addEventListener('click', () => this.onReplyClick(carrot.id));
    postItem
      .querySelector('.like-btn')
      ?.addEventListener('click', () => this.onLikeClick(carrot.id));
    postItem
      .querySelector('.share-btn')
      ?.addEventListener('click', () => this.onShareClick(carrot.id));

    return postItem;
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
      .map((u) => this.escapeHtml(this.toAbsoluteUrl(u, base)))
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
   * 返信ボタンクリック
   */
  private onReplyClick(carrotId: number): void {
    window.location.href = `/carrot/${carrotId}`;
  }

  /**
   * いいねボタンクリック
   */
  private async onLikeClick(carrotId: number): Promise<void> {
    const btn = document.querySelector(
      `.like-btn[data-carrot-id="${carrotId}"]`
    ) as HTMLButtonElement;
    if (!btn) return;

    const isLiked = btn.classList.contains('liked');

    try {
      if (isLiked) {
        await api.deleteLike(carrotId);
        btn.classList.remove('liked');
      } else {
        await api.postLike(carrotId);
        btn.classList.add('liked');
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  }

  /**
   * シェアボタンクリック（リンクをコピー）
   */
  private async onShareClick(carrotId: number): Promise<void> {
    try {
      const url = `${window.location.origin}/carrot/${carrotId}`;
      await navigator.clipboard.writeText(url);
      this.showToast('リンクをコピーしました');
    } catch (error) {
      console.error('Failed to copy link:', error);
      this.showToast('コピーに失敗しました', true);
    }
  }

  /**
   * フォローボタンクリック
   */
  private async onFollowClick(userId: string, isFollowing: boolean): Promise<void> {
    try {
      if (isFollowing) {
        await api.deleteFollow(userId);
        this.showToast('フォローを解除しました');
      } else {
        await api.postFollow(userId);
        this.showToast('フォローしました');
      }
      // プロフィールを再読み込み
      await this.displayUserProfile(userId);
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      this.showToast('フォロー操作に失敗しました', true);
    }
  }

  /**
   * トースト通知を表示
   */
  private showToast(message: string, isError: boolean = false): void {
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' toast-error' : '');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${isError ? '#f44336' : '#4CAF50'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000;
      animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * HTMLエスケープ
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * APIのベースURLを取得
   */
  private getApiUrl(): string {
    const url = document.body.getAttribute('data-api-url');
    return url || '/api';
  }

  /**
   * ユーザープロフィールを表示
   */
  async displayUserProfile(userId: string): Promise<void> {
    try {
      const response = await api.getUser(userId);
      this.renderUserProfile(response.user, response.carrots);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  /**
   * ユーザープロフィールをレンダリング
   */
  private renderUserProfile(user: UserData, carrots: TimelineCarrot[]): void {
    // モバイルビュー
    const mobileProfileName = document.getElementById('mobileProfileName');
    const mobileProfileId = document.getElementById('mobileProfileId');
    const mobileProfileBio = document.getElementById('mobileProfileBio');
    const mobileProfileAvatar = document.getElementById('mobileProfileAvatar');
    const mobileFollowerCount = document.getElementById('mobileFollowerCount');
    const mobileFollowingCount = document.getElementById('mobileFollowingCount');
    const mobileUserPosts = document.getElementById('mobileUserPosts');

    if (mobileProfileName) mobileProfileName.textContent = user.username;
    if (mobileProfileId) mobileProfileId.textContent = `@${user.user_id}`;
    if (mobileProfileBio) mobileProfileBio.textContent = user.bio || '自己紹介文はまだ登録されていません';
    if (mobileProfileAvatar) {
      const iconUrl = user.icon_path || '/images/default_icon.webp';
      mobileProfileAvatar.innerHTML = `<img src="${iconUrl}" alt="avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
    }
    if (mobileFollowerCount) mobileFollowerCount.textContent = user.follower_count?.toString() || '0';
    if (mobileFollowingCount) mobileFollowingCount.textContent = user.following_count?.toString() || '0';

    // フォローボタン（モバイル）
    const mobileFollowBtn = document.getElementById('mobileFollowBtn');
    if (mobileFollowBtn && user.is_following !== undefined) {
      mobileFollowBtn.textContent = user.is_following ? 'フォロー中' : 'フォローする';
      mobileFollowBtn.className = user.is_following ? 'btn-secondary' : 'btn-primary';
      mobileFollowBtn.onclick = () => this.onFollowClick(user.user_id, user.is_following || false);
    }

    // デスクトップビュー
    const desktopProfileName = document.getElementById('desktopProfileName');
    const desktopProfileId = document.getElementById('desktopProfileId');
    const desktopProfileBio = document.getElementById('desktopProfileBio');
    const desktopProfileAvatar = document.getElementById('desktopProfileAvatar');
    const desktopFollowerCount = document.getElementById('desktopFollowerCount');
    const desktopFollowingCount = document.getElementById('desktopFollowingCount');
    const desktopUserPosts = document.getElementById('desktopUserPosts');

    if (desktopProfileName) desktopProfileName.textContent = user.username;
    if (desktopProfileId) desktopProfileId.textContent = `@${user.user_id}`;
    if (desktopProfileBio) desktopProfileBio.textContent = user.bio || '自己紹介文はまだ登録されていません';
    if (desktopProfileAvatar) {
      const iconUrl = user.icon_path || '/images/default_icon.webp';
      desktopProfileAvatar.innerHTML = `<img src="${iconUrl}" alt="avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
    }
    if (desktopFollowerCount) desktopFollowerCount.textContent = user.follower_count?.toString() || '0';
    if (desktopFollowingCount) desktopFollowingCount.textContent = user.following_count?.toString() || '0';

    // フォローボタン（デスクトップ）
    const desktopFollowBtn = document.getElementById('desktopFollowBtn');
    if (desktopFollowBtn && user.is_following !== undefined) {
      desktopFollowBtn.textContent = user.is_following ? 'フォロー中' : 'フォローする';
      desktopFollowBtn.className = user.is_following ? 'btn-secondary' : 'btn-primary';
      desktopFollowBtn.onclick = () => this.onFollowClick(user.user_id, user.is_following || false);
    }

    // 投稿を表示
    if (mobileUserPosts) {
      mobileUserPosts.innerHTML = '';
      carrots.forEach((carrot) => {
        mobileUserPosts.appendChild(this.createPostElement(carrot));
      });
    }
    if (desktopUserPosts) {
      desktopUserPosts.innerHTML = '';
      carrots.forEach((carrot) => {
        desktopUserPosts.appendChild(this.createPostElement(carrot));
      });
    }
  }

  /**
   * サイドバーを初期化
   */
  async initializeSidebar(): Promise<void> {
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
        desktopAvatar.innerHTML = `<img src="${user.icon_path}" alt="avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
      }

      // デスクトップの自分情報クリックで自分のページへ
      if (desktopAvatar) {
        (desktopAvatar as HTMLElement).style.cursor = 'pointer';
        desktopAvatar.addEventListener('click', () => {
          window.location.href = `/user/${user.user_id}`;
        });
      }
      if (desktopUserName) {
        (desktopUserName as HTMLElement).style.cursor = 'pointer';
        desktopUserName.addEventListener('click', () => {
          window.location.href = `/user/${user.user_id}`;
        });
      }
      if (desktopUserId) {
        (desktopUserId as HTMLElement).style.cursor = 'pointer';
        desktopUserId.addEventListener('click', () => {
          window.location.href = `/user/${user.user_id}`;
        });
      }

      // モバイルビューのアバター
      const mobileAvatar = document.getElementById('mobileUserAvatar');
      if (mobileAvatar && user.icon_path) {
        mobileAvatar.innerHTML = `<img src="${user.icon_path}" alt="avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
      }

      // モバイル左上の自分アイコンを押下で自分ページへ
      if (mobileAvatar) {
        (mobileAvatar as HTMLElement).style.cursor = 'pointer';
        mobileAvatar.addEventListener('click', () => {
          window.location.href = `/user/${user.user_id}`;
        });
      }
    } catch (error) {
      console.error('Failed to initialize sidebar:', error);
    }
  }

  /**
   * 通知パネルを開く
   */
  async openNotificationPanel(): Promise<void> {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;

    panel.style.display = 'flex';
    await this.loadNotifications();
  }

  /**
   * 通知パネルを閉じる
   */
  closeNotificationPanel(): void {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  /**
   * 通知を読み込む
   */
  private async loadNotifications(): Promise<void> {
    const content = document.getElementById('notificationContent');
    if (!content) return;

    try {
      const response = await api.getNotifications(20);

      if (response.notifications.length === 0) {
        content.innerHTML = '<p style="color: var(--color-gray-medium); text-align: center; padding: 24px;">通知はありません</p>';
        return;
      }

      content.innerHTML = '';
      response.notifications.forEach(notification => {
        const item = document.createElement('div');
        item.className = 'notification-item' + (notification.is_read ? '' : ' unread');

        let message = '';
        if (notification.type === 'like') {
          message = `${notification.actor_name}さんがあなたの投稿にいいねしました`;
        } else if (notification.type === 'reply') {
          message = `${notification.actor_name}さんがあなたの投稿に返信しました`;
        } else if (notification.type === 'follow') {
          message = `${notification.actor_name}さんがあなたをフォローしました`;
        }

        const actorIcon = '/images/default_icon.webp'; // TODO: 通知に actor_icon_path を追加
        item.innerHTML = `
          <img src="${actorIcon}" class="notification-avatar" alt="avatar" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;" />
          <div class="notification-body">
            <div class="notification-text">${this.escapeHtml(message)}</div>
            <div class="notification-time">${new Date(notification.created_at).toLocaleString('ja-JP')}</div>
          </div>
        `;

        item.addEventListener('click', async () => {
          if (!notification.is_read) {
            await api.markNotificationAsRead(notification.id);
            item.classList.remove('unread');
            this.updateNotificationBadge();
          }
          if (notification.carrot_id) {
            window.location.href = `/carrot/${notification.carrot_id}`;
          }
        });

        content.appendChild(item);
      });

      // すべて既読にする
      this.updateNotificationBadge();
    } catch (error) {
      console.error('Failed to load notifications:', error);
      content.innerHTML = '<p style="color: var(--color-danger); text-align: center; padding: 24px;">通知の読み込みに失敗しました</p>';
    }
  }

  /**
   * 未読通知数を更新
   */
  async updateNotificationBadge(): Promise<void> {
    try {
      const response = await api.getUnreadNotificationCount();
      const badges = document.querySelectorAll('.notification-badge');

      badges.forEach(badge => {
        const badgeEl = badge as HTMLElement;
        if (response.unread_count > 0) {
          badgeEl.textContent = response.unread_count.toString();
          badgeEl.style.display = 'block';
        } else {
          badgeEl.style.display = 'none';
        }
      });
    } catch (error) {
      console.error('Failed to update notification badge:', error);
    }
  }

  /**
   * 通知のポーリングを開始
   */
  startNotificationPolling(): void {
    this.updateNotificationBadge();
    setInterval(() => {
      this.updateNotificationBadge();
    }, 30000); // 30秒ごと
  }

  /**
   * 検索パネルを開く（モバイル）
   */
  openSearchPanel(): void {
    const panel = document.getElementById('searchPanel');
    if (panel) {
      panel.style.display = 'flex';
      const input = document.getElementById('mobileSearchInput') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }
  }

  /**
   * 検索パネルを閉じる（モバイル）
   */
  closeSearchPanel(): void {
    const panel = document.getElementById('searchPanel');
    if (panel) {
      panel.style.display = 'none';
    }
  }

  /**
   * 検索を実行（デスクトップ）
   */
  async performSearch(query: string): Promise<void> {
    const resultsSection = document.getElementById('searchResults');
    const resultsContent = document.getElementById('searchResultsContent');
    const trendSection = document.getElementById('trendSection');

    if (!resultsSection || !resultsContent) return;

    try {
      const results = await api.search(query);

      resultsSection.style.display = 'block';
      if (trendSection) trendSection.style.display = 'none';

      let html = '';

      if (results.users.length > 0) {
        html += '<div class="search-result-section"><h3>ユーザー</h3>';
        results.users.forEach(user => {
          const iconUrl = user.icon_path || '/images/default_icon.webp';
          html += `
            <div class="search-user-item" onclick="window.location.href='/user/${user.user_id}'">
              <img src="${iconUrl}" class="search-user-avatar" alt="avatar" style="width: 48px; height: 48px; object-fit: cover; border-radius: 50%;">
              <div class="search-user-info">
                <div class="search-user-name">${this.escapeHtml(user.username)}</div>
                <div class="search-user-id">@${this.escapeHtml(user.user_id)}</div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      }

      if (results.carrots.length > 0) {
        html += '<div class="search-result-section"><h3>投稿</h3>';
        results.carrots.forEach(carrot => {
          html += `
            <div class="post-item" onclick="window.location.href='/carrot/${carrot.id}'" style="cursor: pointer; margin-bottom: 12px;">
              <div class="post-content">
                <div class="post-header">
                  <span class="post-username">${this.escapeHtml(carrot.username)}</span>
                  <span class="post-userid">@${this.escapeHtml(carrot.user_id)}</span>
                </div>
                <div class="post-text">${this.escapeHtml(carrot.content)}</div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      }

      if (results.users.length === 0 && results.carrots.length === 0) {
        html = '<p style="color: var(--color-gray-medium); text-align: center; padding: 24px;">検索結果が見つかりませんでした</p>';
      }

      resultsContent.innerHTML = html;
    } catch (error) {
      console.error('Failed to perform search:', error);
      resultsContent.innerHTML = '<p style="color: var(--color-danger); text-align: center; padding: 24px;">検索に失敗しました</p>';
    }
  }

  /**
   * 検索をクリア（デスクトップ）
   */
  clearSearchResults(): void {
    const resultsSection = document.getElementById('searchResults');
    const trendSection = document.getElementById('trendSection');

    if (resultsSection) resultsSection.style.display = 'none';
    if (trendSection) trendSection.style.display = 'block';
  }

  /**
   * 検索を実行（モバイル）
   */
  async performMobileSearch(query: string): Promise<void> {
    const resultsContent = document.getElementById('mobileSearchResults');
    if (!resultsContent) return;

    try {
      const results = await api.search(query);

      let html = '';

      if (results.users.length > 0) {
        html += '<div class="search-result-section"><h3>ユーザー</h3>';
        results.users.forEach(user => {
          const iconUrl = user.icon_path || '/images/default_icon.webp';
          html += `
            <div class="search-user-item" onclick="window.location.href='/user/${user.user_id}'">
              <img src="${iconUrl}" class="search-user-avatar" alt="avatar">
              <div class="search-user-info">
                <div class="search-user-name">${this.escapeHtml(user.username)}</div>
                <div class="search-user-id">@${this.escapeHtml(user.user_id)}</div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      }

      if (results.carrots.length > 0) {
        html += '<div class="search-result-section"><h3>投稿</h3>';
        results.carrots.forEach(carrot => {
          html += `
            <div class="post-item" onclick="window.location.href='/carrot/${carrot.id}'" style="cursor: pointer; margin-bottom: 12px;">
              <div class="post-content">
                <div class="post-header">
                  <span class="post-username">${this.escapeHtml(carrot.username)}</span>
                  <span class="post-userid">@${this.escapeHtml(carrot.user_id)}</span>
                </div>
                <div class="post-text">${this.escapeHtml(carrot.content)}</div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      }

      if (results.users.length === 0 && results.carrots.length === 0) {
        html = '<p style="color: var(--color-gray-medium); text-align: center; padding: 24px;">検索結果が見つかりませんでした</p>';
      }

      resultsContent.innerHTML = html;
    } catch (error) {
      console.error('Failed to perform search:', error);
      resultsContent.innerHTML = '<p style="color: var(--color-danger); text-align: center; padding: 24px;">検索に失敗しました</p>';
    }
  }

  /**
   * 検索をクリア（モバイル）
   */
  clearMobileSearchResults(): void {
    const resultsContent = document.getElementById('mobileSearchResults');
    if (resultsContent) {
      resultsContent.innerHTML = '<p style="color: var(--color-gray-medium); text-align: center; padding: 24px;">キーワードを入力して検索</p>';
    }
  }
}

export default UIManager;
