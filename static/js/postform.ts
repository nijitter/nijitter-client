/**
 * Post Form Manager
 * 投稿フォームの管理と送信
 */

import api, { type PostCarrotRequest } from './api.js';

export class PostFormManager {
  private contentInput: HTMLTextAreaElement | null;
  private form: HTMLFormElement | null;
  private imageInput: HTMLInputElement | null;
  private modal: HTMLElement | null;
  private replyTo: number | null = null;
  private selectedImages: File[] = [];

  constructor() {
    this.form = document.querySelector('#postForm');
    this.contentInput = document.querySelector('#postText');
    this.imageInput = document.querySelector('#imageInput');
    this.modal = document.querySelector('#postModal');
    this.setupEventListeners();
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.onSubmit(e));
    }

    // テキストエリアのキャラクターカウント
    if (this.contentInput) {
      this.contentInput.addEventListener('input', (e) => this.onContentChange(e));
    }

    // 画像アップロードボタン
    const imageUploadBtn = document.querySelector('#imageUploadBtn');
    if (imageUploadBtn) {
      imageUploadBtn.addEventListener('click', () => this.imageInput?.click());
    }

    // 画像選択
    if (this.imageInput) {
      this.imageInput.addEventListener('change', (e) => this.onImageSelect(e));
    }

    // モーダル閉じるボタン
    const closeBtn = document.querySelector('#modalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }

    // キャンセルボタン
    const cancelBtn = document.querySelector('#modalCancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    // 投稿ボタン
    const submitBtn = document.querySelector('#postSubmit');
    if (submitBtn) {
      submitBtn.addEventListener('click', (e) => this.onSubmit(e));
    }

    // モーダル外側クリックで閉じる
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    // リプライ対象があればセット
    const carrotIdData = document.body.getAttribute('data-carrot-id');
    if (carrotIdData) {
      this.replyTo = parseInt(carrotIdData, 10);
    }
  }

  /**
   * テキスト変更イベント
   */
  private onContentChange(e: Event): void {
    const textarea = e.target as HTMLTextAreaElement;
    const charCount = document.querySelector('#charCounter');
    const count = textarea.value.length;

    if (charCount) {
      charCount.textContent = `${count} / 280`;

      // 文字数による色の変更
      charCount.classList.remove('warning', 'error');
      if (count > 250) {
        charCount.classList.add('warning');
      }
      if (count > 280) {
        charCount.classList.add('error');
        textarea.value = textarea.value.substring(0, 280);
      }
    }
  }

  /**
   * フォーム送信
   */
  private async onSubmit(e: Event): Promise<void> {
    e.preventDefault();

    if (!this.contentInput || !this.contentInput.value.trim()) {
      this.showError('内容を入力してください');
      return;
    }

    try {
      let imageIds: string[] = [];

      // 画像があればアップロード
      if (this.selectedImages.length > 0) {
        const uploadResponse = await api.uploadImages(this.selectedImages);
        imageIds = uploadResponse.image_ids;
      }

      const request: PostCarrotRequest = {
        content: this.contentInput.value,
        image_ids: imageIds.length > 0 ? imageIds : undefined,
      };

      if (this.replyTo) {
        request.reply_to = this.replyTo;
      }

      await api.postCarrot(request);

      this.showSuccess('投稿しました！');
      this.resetForm();
      setTimeout(() => {
        this.closeModal();
        // ページをリロードしてタイムラインを更新
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error('Failed to post:', error);
      this.showError(
        error instanceof Error ? error.message : '投稿に失敗しました'
      );
    }
  }

  /**
   * 画像選択
   */
  private onImageSelect(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = input.files;

    if (files) {
      if (files.length > 4) {
        this.showError('最大4枚までアップロードできます');
        return;
      }

      this.selectedImages = Array.from(files);
      this.updateImagePreview();
    }
  }

  /**
   * 画像プレビューを更新
   */
  private updateImagePreview(): void {
    const previewContainer = document.querySelector('#imagePreview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    this.selectedImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const container = document.createElement('div');
        container.className = 'image-preview-item';

        const img = document.createElement('img');
        img.src = e.target?.result as string;
        img.alt = `Preview ${index + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'image-preview-remove';
        removeBtn.textContent = '✕';
        removeBtn.onclick = (e) => {
          e.preventDefault();
          this.selectedImages.splice(index, 1);
          this.updateImagePreview();
        };

        container.appendChild(img);
        container.appendChild(removeBtn);
        previewContainer?.appendChild(container);
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * フォームをリセット
   */
  private resetForm(): void {
    if (this.contentInput) {
      this.contentInput.value = '';
    }
    const charCount = document.querySelector('#charCounter');
    if (charCount) {
      charCount.textContent = '0 / 280';
    }
    this.selectedImages = [];
    const preview = document.querySelector('#imagePreview');
    if (preview) {
      preview.innerHTML = '';
    }
    if (this.imageInput) {
      this.imageInput.value = '';
    }
  }

  /**
   * モーダルを開く
   */
  openModal(): void {
    if (this.modal) {
      this.modal.classList.add('show');
      this.contentInput?.focus();
      // スクロール防止
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * モーダルを閉じる
   */
  closeModal(): void {
    if (this.modal) {
      this.modal.classList.remove('show');
      this.resetForm();
      // スクロール有効化
      document.body.style.overflow = '';
    }
  }

  /**
   * エラーメッセージを表示
   */
  private showError(message: string): void {
    const errorMsg = document.querySelector('#formError') as HTMLElement;
    if (errorMsg) {
      errorMsg.textContent = message;
      errorMsg.style.display = 'block';
      errorMsg.style.color = '#f44336';
      setTimeout(() => {
        errorMsg.style.display = 'none';
      }, 4000);
    }
  }

  /**
   * 成功メッセージを表示
   */
  private showSuccess(message: string): void {
    const errorMsg = document.querySelector('#formError') as HTMLElement;
    if (errorMsg) {
      errorMsg.textContent = message;
      errorMsg.style.display = 'block';
      errorMsg.style.color = '#4CAF50';
      setTimeout(() => {
        errorMsg.style.display = 'none';
      }, 4000);
    }
  }
}

export default PostFormManager;
