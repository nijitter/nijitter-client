/**
 * User Profile App
 * user.htmlの初期化スクリプト
 */

import api from './api.js';
import UIManager from './ui.js';
import TimelineManager from './timeline.js';

// 初期化関数
async function initializeUserProfile() {
  try {
    // URLからユーザーIDを取得
    const pathSegments = window.location.pathname.split('/');
    const userId = pathSegments[pathSegments.length - 1];

    if (!userId) {
      console.error('User ID not found in URL');
      window.location.href = '/';
      return;
    }

    // UIマネージャーを初期化（タイムラインマネージャーは使用しない）
    const timelineManager = new TimelineManager('latest');
    const uiManager = new UIManager(timelineManager);

    // サイドバーを初期化
    await uiManager.initializeSidebar();

    // ユーザープロフィールを表示
    await uiManager.displayUserProfile(userId);

    // 本人ページ判定のため自分情報と対象ユーザー情報を取得
    const meResp = await api.getMe();
    const me = meResp.me;
    const profileResp = await api.getUser(userId);
    const profileUser = profileResp.user;

    // 本人ページなら編集セクションを表示・初期値設定・イベント登録
    if (me.user_id === profileUser.user_id) {
      // フォローボタンは自分のページでは非表示
      const mobileFollowBtn = document.getElementById('mobileFollowBtn');
      if (mobileFollowBtn) (mobileFollowBtn as HTMLElement).style.display = 'none';
      const desktopFollowBtn = document.getElementById('desktopFollowBtn');
      if (desktopFollowBtn) (desktopFollowBtn as HTMLElement).style.display = 'none';

      // 編集ボタンを表示（HTMLに存在しない場合は作成）
      let mobileEditOpen = document.getElementById('mobileEditOpen');
      if (!mobileEditOpen) {
        console.log('mobileEditOpen not found, creating element');
        mobileEditOpen = document.createElement('button');
        mobileEditOpen.id = 'mobileEditOpen';
        mobileEditOpen.className = 'btn btn-secondary';
        mobileEditOpen.textContent = 'プロフィールを編集';
        mobileEditOpen.style.marginTop = '8px';
        const mobileProfileInfo = document.querySelector('.mobile-view .profile-info');
        if (mobileProfileInfo) {
          mobileProfileInfo.appendChild(mobileEditOpen);
        }
      }
      if (mobileEditOpen) {
        (mobileEditOpen as HTMLElement).style.display = 'inline-block';
      }

      let desktopEditOpen = document.getElementById('desktopEditOpen');
      if (!desktopEditOpen) {
        desktopEditOpen = document.createElement('button');
        desktopEditOpen.id = 'desktopEditOpen';
        desktopEditOpen.className = 'btn btn-secondary';
        desktopEditOpen.textContent = 'プロフィールを編集';
        desktopEditOpen.style.marginTop = '8px';
        const desktopProfileInfo = document.querySelector('.desktop-view .profile-info');
        if (desktopProfileInfo) {
          desktopProfileInfo.appendChild(desktopEditOpen);
        }
      }
      if (desktopEditOpen) {
        (desktopEditOpen as HTMLElement).style.display = 'inline-block';
      }

      // モーダル参照（存在しない場合は作成）
      let editModal = document.getElementById('editProfileModal');
      if (!editModal) {
        editModal = document.createElement('div');
        editModal.id = 'editProfileModal';
        editModal.className = 'modal';
        editModal.style.display = 'none';
        editModal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h2>プロフィールを編集</h2>
              <button class="modal-close" id="editModalClose">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group" style="margin-bottom: 8px;">
                <label>ユーザー名</label>
                <input type="text" id="editUsername" class="form-input" placeholder="ユーザー名">
              </div>
              <div class="form-group" style="margin-bottom: 8px;">
                <label>自己紹介</label>
                <textarea id="editBio" class="form-input" rows="3" placeholder="自己紹介"></textarea>
              </div>
              <div class="form-group" style="margin-bottom: 8px;">
                <label>ステータスメッセージ</label>
                <input type="text" id="editStatus" class="form-input" placeholder="ステータスメッセージ">
              </div>
              <div class="form-group" style="margin-bottom: 8px;">
                <label>アイコン画像</label>
                <input type="file" id="editIcon" accept="image/*">
              </div>
              <div id="editFormError" class="error-message"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="editModalCancel">キャンセル</button>
              <button type="button" class="btn btn-primary" id="editModalSave">保存</button>
            </div>
          </div>
        `;
        document.body.appendChild(editModal);
      }
      const editUsername = document.getElementById('editUsername') as HTMLInputElement | null;
      const editBio = document.getElementById('editBio') as HTMLTextAreaElement | null;
      const editStatus = document.getElementById('editStatus') as HTMLInputElement | null;
      const editIcon = document.getElementById('editIcon') as HTMLInputElement | null;
      const editSave = document.getElementById('editModalSave') as HTMLButtonElement | null;
      const editCancel = document.getElementById('editModalCancel') as HTMLButtonElement | null;
      const editClose = document.getElementById('editModalClose') as HTMLButtonElement | null;

      const openEditModal = () => {
        if (editUsername) editUsername.value = profileUser.username || '';
        if (editBio) editBio.value = profileUser.bio || '';
        if (editStatus) editStatus.value = profileUser.status_message || '';
        if (editIcon) editIcon.value = '';
        if (editModal) (editModal as HTMLElement).style.display = 'block';
      };
      const closeEditModal = () => {
        if (editModal) (editModal as HTMLElement).style.display = 'none';
      };

      if (mobileEditOpen) mobileEditOpen.addEventListener('click', openEditModal);
      if (desktopEditOpen) desktopEditOpen.addEventListener('click', openEditModal);
      if (editClose) editClose.addEventListener('click', closeEditModal);
      if (editCancel) editCancel.addEventListener('click', closeEditModal);

      if (editSave) editSave.addEventListener('click', async () => {
        try {
          editSave.disabled = true;
          editSave.textContent = '保存中...';

          const username = editUsername?.value?.trim() || '';
          const bio = editBio?.value?.trim() || '';
          const status_message = editStatus?.value?.trim() || '';

          // アイコンアップロード（選択されている場合）
          const iconFile = editIcon?.files && editIcon.files.length > 0 ? editIcon.files[0] : null;
          if (iconFile) {
            await api.uploadUserIcon(userId, iconFile);
          }

          // プロフィール更新
          await api.updateUser(userId, { username, bio, status_message });

          // 再表示して更新を反映
          await uiManager.displayUserProfile(userId);

          editSave.disabled = false;
          editSave.textContent = '保存';
          closeEditModal();
          alert('プロフィールを更新しました');
        } catch (e) {
          alert('プロフィールの更新に失敗しました');
          editSave.disabled = false;
          editSave.textContent = '保存';
        }
      });
    }

    // ===== 通知・検索UIのイベント接続 =====
    // 通知バッジのポーリング開始
    uiManager.startNotificationPolling();

    // モバイル: 検索パネルを開く/閉じる
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    if (mobileSearchBtn) mobileSearchBtn.addEventListener('click', () => uiManager.openSearchPanel());
    const searchBackBtn = document.getElementById('searchBackBtn');
    if (searchBackBtn) searchBackBtn.addEventListener('click', () => uiManager.closeSearchPanel());

    // モバイル検索入力（デバウンス）
    const mobileSearchInput = document.getElementById('mobileSearchInput') as HTMLInputElement | null;
    if (mobileSearchInput) {
      let timer: number | undefined;
      mobileSearchInput.addEventListener('input', () => {
        const q = mobileSearchInput.value.trim();
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (q.length > 0) {
            uiManager.performMobileSearch(q);
          } else {
            uiManager.clearMobileSearchResults();
          }
        }, 250);
      });
    }

    // デスクトップ検索入力（右パネル）
    const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
    if (searchInput) {
      let timer: number | undefined;
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim();
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (q.length > 0) {
            uiManager.performSearch(q);
          } else {
            uiManager.clearSearchResults();
          }
        }, 250);
      });
    }

    // 通知パネルを開く/閉じる
    const mobileNotificationBtn = document.getElementById('mobileNotificationBtn');
    if (mobileNotificationBtn) mobileNotificationBtn.addEventListener('click', () => uiManager.openNotificationPanel());
    const desktopNotificationBtn = document.getElementById('desktopNotificationBtn');
    if (desktopNotificationBtn) desktopNotificationBtn.addEventListener('click', () => uiManager.openNotificationPanel());
    const notificationClose = document.getElementById('notificationClose');
    if (notificationClose) notificationClose.addEventListener('click', () => uiManager.closeNotificationPanel());

    // ホームへ遷移（モバイル/デスクトップ）
    const mobileHomeBtn = document.getElementById('mobileHomeBtn');
    if (mobileHomeBtn) mobileHomeBtn.addEventListener('click', () => { window.location.href = '/'; });
    const desktopHomeBtn = document.getElementById('desktopHomeBtn');
    if (desktopHomeBtn) desktopHomeBtn.addEventListener('click', () => { window.location.href = '/'; });
  } catch (error) {
    console.error('Failed to initialize user profile:', error);
    // ユーザーをホームページにリダイレクト
    if (error instanceof Error && error.message.includes('not found')) {
      window.location.href = '/';
    }
  }
}

// DOMContentLoaded または既に読込済み の場合すぐに初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUserProfile);
} else {
  initializeUserProfile();
}
