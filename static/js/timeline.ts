/**
 * Timeline Manager
 * タイムラインの表示と管理を行うモジュール
 */

import api, { type TimelineCarrot, type TimelineResponse } from './api.js';

export interface TimelineState {
  carrots: TimelineCarrot[];
  nextCursor: number | null;
  isLoading: boolean;
  hasMore: boolean;
}

export class TimelineManager {
  private state: TimelineState = {
    carrots: [],
    nextCursor: null,
    isLoading: false,
    hasMore: true,
  };

  private listeners: Set<(state: TimelineState) => void> = new Set();
  private timelineType: 'latest' | 'following' = 'latest';

  constructor(timelineType: 'latest' | 'following' = 'latest') {
    this.timelineType = timelineType;
  }

  /**
   * 状態の変更をリッスン
   */
  subscribe(listener: (state: TimelineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 全リスナーに状態を通知
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * 現在の状態を取得
   */
  getState(): TimelineState {
    return { ...this.state };
  }

  /**
   * タイムラインを読み込む
   */
  async loadTimeline(): Promise<void> {
    if (this.state.isLoading) return;

    this.state.isLoading = true;
    this.notifyListeners();

    try {
      let response: TimelineResponse;
      if (this.timelineType === 'latest') {
        response = await api.getTimeline();
      } else {
        response = await api.getFollowingTimeline();
      }

      this.state.carrots = response.carrots;
      this.state.nextCursor = response.next_cursor;
      this.state.hasMore = response.next_cursor !== null;
    } catch (error) {
      console.error('Failed to load timeline:', error);
      throw error;
    } finally {
      this.state.isLoading = false;
      this.notifyListeners();
    }
  }

  /**
   * さらにタイムラインを読み込む（無限スクロール）
   */
  async loadMore(): Promise<void> {
    if (this.state.isLoading || !this.state.hasMore || !this.state.nextCursor) {
      return;
    }

    this.state.isLoading = true;
    this.notifyListeners();

    try {
      let response: TimelineResponse;
      if (this.timelineType === 'latest') {
        response = await api.getTimeline(this.state.nextCursor);
      } else {
        response = await api.getFollowingTimeline(this.state.nextCursor);
      }

      this.state.carrots.push(...response.carrots);
      this.state.nextCursor = response.next_cursor;
      this.state.hasMore = response.next_cursor !== null;
    } catch (error) {
      console.error('Failed to load more:', error);
      throw error;
    } finally {
      this.state.isLoading = false;
      this.notifyListeners();
    }
  }

  /**
   * 投稿を追加
   */
  addCarrot(carrot: TimelineCarrot): void {
    this.state.carrots.unshift(carrot);
    this.notifyListeners();
  }

  /**
   * 投稿を削除
   */
  removeCarrot(carrotId: number): void {
    this.state.carrots = this.state.carrots.filter((c) => c.id !== carrotId);
    this.notifyListeners();
  }

  /**
   * 投稿を更新
   */
  updateCarrot(carrotId: number, updates: Partial<TimelineCarrot>): void {
    const carrot = this.state.carrots.find((c) => c.id === carrotId);
    if (carrot) {
      Object.assign(carrot, updates);
      this.notifyListeners();
    }
  }

  /**
   * タイムラインタイプを変更
   */
  setTimelineType(type: 'latest' | 'following'): void {
    this.timelineType = type;
    this.state.carrots = [];
    this.state.nextCursor = null;
    this.state.hasMore = true;
  }
}

export default TimelineManager;
