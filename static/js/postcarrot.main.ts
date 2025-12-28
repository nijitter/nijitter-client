/**
 * Post Carrot Modal App
 * postcarrot.htmlの初期化スクリプト
 */

import PostFormManager from './postform.js';

// DOMContentLoaded待機
document.addEventListener('DOMContentLoaded', () => {
  try {
    // 投稿フォームマネージャーを初期化
    const postFormManager = new PostFormManager();

    // URLパラメータで自動開く場合の処理
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('open')) {
      postFormManager.openModal();
    }
  } catch (error) {
    console.error('Failed to initialize post form:', error);
  }
});

