/**
 * Nijitter API Client
 * nijitter-serverとのAPI通信を管理するモジュール
 */

const API_BASE_URL = (() => {
  // サーバーのベースURLを取得
  // data-api-url属性がなければ相対パス /api を使用
  const url = document.body.getAttribute('data-api-url');
  if (url) {
    return url;
  }
  // ローカル開発時はサーバーのAPIベースURLに対して相対パスでアクセス
  return '/api';
})();

export interface TimelineCarrot {
  id: number;
  user_id_int: number;
  user_id: string;
  username: string;
  icon_path: string | null;
  content: string;
  reply_to: number | null;
  created_at: string;
  images?: string[];
  is_liked?: boolean;
}

export interface TimelineResponse {
  carrots: TimelineCarrot[];
  next_cursor: number | null;
}

export interface CarrotResponse {
  carrot: TimelineCarrot;
}

export interface UserData {
  username: string;
  user_id: string;
  icon_path: string | null;
  bio: string | null;
  status_message: string | null;
  created_at: string;
  follower_count?: number;
  following_count?: number;
  is_following?: boolean;
}

export interface UserProfileResponse {
  user: UserData;
  carrots: TimelineCarrot[];
  next_cursor: number | null;
}

export interface MeResponse {
  me: UserData;
}

export interface PostCarrotRequest {
  content: string;
  reply_to?: number | null;
  image_ids?: string[] | undefined;
}

export interface UpdateUserRequest {
  username?: string;
  icon_path?: string;
  bio?: string;
  status_message?: string;
}

export interface NotificationData {
  id: number;
  actor_id: number;
  actor_name: string;
  type: 'like' | 'reply' | 'follow';
  carrot_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: NotificationData[];
}

export interface UnreadNotificationCountResponse {
  unread_count: number;
}

export interface MarkNotificationAsReadResponse {
  status: string;
}

export interface SearchResult {
  users: UserData[];
  carrots: TimelineCarrot[];
}

export class NijitterAPI {
  private static instance: NijitterAPI;

  private constructor() { }

  static getInstance(): NijitterAPI {
    if (!NijitterAPI.instance) {
      NijitterAPI.instance = new NijitterAPI();
    }
    return NijitterAPI.instance;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // トークンがあれば自動的に追加
    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 403エラーの場合、利用時間が過ぎているメッセージを表示
    if (response.status === 403) {
      const error = await response.json().catch(() => ({}));
      if (error.error === 'night_time_restricted') {
        const retryAfter = error.retry_after || '利用可能時間';
        alert(`利用時間が過ぎています。${retryAfter}以降に利用可能です。`);
      }
      throw new Error('Forbidden: アクセス権限がありません');
    }

    // 401エラーの場合、トークンをクリアしてログインページにリダイレクト
    if (response.status === 401) {
      this.clearTokens();
      window.location.href = '/login';
      throw new Error('Unauthorized: ログインが必要です');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * タイムラインを取得
   * @param cursor ページネーションカーソル
   */
  async getTimeline(cursor?: number): Promise<TimelineResponse> {
    const params = new URLSearchParams();
    if (cursor) {
      params.append('cursor', cursor.toString());
    }
    const queryString = params.toString();
    const endpoint = `/carrot/timeline${queryString ? '?' + queryString : ''}`;
    return this.request<TimelineResponse>(endpoint);
  }

  /**
   * フォロー中のタイムラインを取得
   * @param cursor ページネーションカーソル
   */
  async getFollowingTimeline(cursor?: number): Promise<TimelineResponse> {
    const params = new URLSearchParams();
    if (cursor) {
      params.append('cursor', cursor.toString());
    }
    const queryString = params.toString();
    const endpoint = `/carrot/following${queryString ? '?' + queryString : ''}`;
    return this.request<TimelineResponse>(endpoint);
  }

  /**
   * 投稿を取得
   * @param carrotId 投稿ID
   */
  async getCarrot(carrotId: number): Promise<CarrotResponse> {
    return this.request<CarrotResponse>(`/carrot/carrot/${carrotId}`);
  }

  /**
   * リプライを取得
   * @param carrotId 返信対象の投稿ID
   * @param cursor ページネーションカーソル
   */
  async getReplies(carrotId: number, cursor?: number): Promise<TimelineResponse> {
    const params = new URLSearchParams();
    if (cursor) {
      params.append('cursor', cursor.toString());
    }
    const queryString = params.toString();
    const endpoint = `/carrot/carrot/${carrotId}/replies${queryString ? '?' + queryString : ''}`;
    return this.request<TimelineResponse>(endpoint);
  }

  /**
   * 投稿を作成
   * @param data 投稿データ
   */
  async postCarrot(data: PostCarrotRequest): Promise<TimelineCarrot> {
    return this.request<TimelineCarrot>('/carrot/carrot', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * 投稿を削除
   * @param carrotId 投稿ID
   */
  async deleteCarrot(carrotId: number): Promise<void> {
    await this.request<void>(`/carrot/carrot/${carrotId}`, {
      method: 'DELETE',
    });
  }

  /**
   * いいねを追加
   * @param carrotId 投稿ID
   */
  async postLike(carrotId: number): Promise<void> {
    await this.request<void>(`/carrot/like`, {
      method: 'POST',
      body: JSON.stringify({ carrot_id: carrotId }),
    });
  }

  /**
   * いいねを削除
   * @param carrotId 投稿ID
   */
  async deleteLike(carrotId: number): Promise<void> {
    await this.request<void>(`/carrot/like/${carrotId}`, {
      method: 'DELETE',
    });
  }

  /**
   * ユーザーをフォロー
   * @param userId ユーザーID
   */
  async postFollow(userId: string): Promise<void> {
    await this.request<void>(`/carrot/follow/${userId}`, {
      method: 'POST',
    });
  }

  /**
   * ユーザーのフォローを解除
   * @param userId ユーザーID
   */
  async deleteFollow(userId: string): Promise<void> {
    await this.request<void>(`/carrot/follow/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * ユーザープロフィールを取得
   * @param userId ユーザーID
   * @param cursor ページネーションカーソル
   */
  async getUser(userId: string, cursor?: number): Promise<UserProfileResponse> {
    const params = new URLSearchParams();
    if (cursor) {
      params.append('cursor', cursor.toString());
    }
    const queryString = params.toString();
    const endpoint = `/carrot/user/${userId}${queryString ? '?' + queryString : ''}`;
    return this.request<UserProfileResponse>(endpoint);
  }

  /**
   * 自分のプロフィールを取得
   */
  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>('/carrot/me');
  }

  /**
   * ユーザープロフィールを更新
   * @param userId ユーザーID
   * @param data 更新データ
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<UserData> {
    return this.request<UserData>(`/carrot/user/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * ユーザーアイコンをアップロード
   * @param userId ユーザーID
   * @param file 画像ファイル
   */
  async uploadUserIcon(userId: string, file: File): Promise<UserData> {
    const formData = new FormData();
    formData.append('icon', file);

    const url = `${API_BASE_URL}/carrot/user/${userId}/icon`;
    const token = this.getAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    });

    // 401エラーの場合、トークンをクリアしてログインページにリダイレクト
    if (response.status === 401) {
      this.clearTokens();
      window.location.href = '/login';
      throw new Error('Unauthorized: ログインが必要です');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * ユーザーアカウントを削除
   * @param userId ユーザーID
   */
  async deleteUser(userId: string): Promise<void> {
    await this.request<void>(`/carrot/user/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * 画像をアップロード
   * @param files アップロードする画像ファイルの配列
   */
  async uploadImages(files: File[]): Promise<{ image_ids: string[] }> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('images', file);
    });

    const url = `${API_BASE_URL}/carrot/image`;
    const token = this.getAccessToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    // 401エラーの場合、トークンをクリアしてログインページにリダイレクト
    if (response.status === 401) {
      this.clearTokens();
      window.location.href = '/login';
      throw new Error('Unauthorized: ログインが必要です');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * アクセストークンを取得
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * アクセストークンを設定
   */
  setAccessToken(token: string): void {
    localStorage.setItem('accessToken', token);
  }

  /**
   * リフレッシュトークンを取得（クッキーに保存）
   */
  getRefreshToken(): string | null {
    return this.getCookie('refresh_token');
  }

  /**
   * リフレッシュトークンを設定
   */
  setRefreshToken(token: string): void {
    // サーバーがクッキーに自動設定するため、通常は不要
    // ブラウザのクッキーに自動的に保存される
  }

  /**
   * トークンをクリア
   */
  clearTokens(): void {
    localStorage.removeItem('accessToken');
    // refresh_tokenはクッキーに保存されているため、ログアウトAPIで削除
  }

  /**
   * Cookie値を取得
   */
  private getCookie(name: string): string | null {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
    return null;
  }

  // ========== 通知API ==========

  /**
   * 通知一覧を取得
   */
  async getNotifications(limit?: number): Promise<NotificationsResponse> {
    const url = limit ? `${API_BASE_URL}/carrot/notifications?limit=${limit}` : `${API_BASE_URL}/carrot/notifications`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAccessToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to get notifications: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 通知を既読にする
   */
  async markNotificationAsRead(id: number): Promise<MarkNotificationAsReadResponse> {
    const response = await fetch(`${API_BASE_URL}/carrot/notifications/${id}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.getAccessToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to mark notification as read: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * 未読通知数を取得
   */
  async getUnreadNotificationCount(): Promise<UnreadNotificationCountResponse> {
    const response = await fetch(`${API_BASE_URL}/carrot/notifications/unread-count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAccessToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to get unread notification count: ${response.statusText}`);
    }
    return response.json();
  }

  // ========== 検索API ==========

  /**
   * ユーザーと投稿を検索
   */
  async search(query: string): Promise<SearchResult> {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAccessToken()}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to search: ${response.statusText}`);
    }
    return response.json();
  }
}

export default NijitterAPI.getInstance();
