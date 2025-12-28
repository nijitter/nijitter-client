/**
 * Main Timeline App
 * timeline.htmlの初期化スクリプト
 */

import TimelineManager from './timeline.js';
import UIManager from './ui.js';

// DOMContentLoaded待機
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // タイムラインマネージャーを初期化
    const timelineManager = new TimelineManager('latest');

    // UIマネージャーを初期化
    const uiManager = new UIManager(timelineManager);

    // サイドバーを初期化
    await uiManager.initializeSidebar();

    // 初期タイムラインを読み込む
    await timelineManager.loadTimeline();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // ユーザーをログインページにリダイレクト
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      window.location.href = '/login';
    }
  }
});
