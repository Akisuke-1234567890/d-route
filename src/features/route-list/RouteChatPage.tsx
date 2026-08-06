import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RouteWorkspacePage } from '../../shared/ui/RouteWorkspacePage';
import { useWorkspacePageReady } from '../../shared/ui/workspacePageReady';
import {
  formatChatTime,
  getCurrentUserId,
  getRouteChatMessages,
  getRouteChatReadStatuses,
  markRouteChatRead,
  sendRouteChatMessage,
  subscribeRouteChat,
  type RouteChatMessage,
  type RouteChatReadStatus,
  type RouteChatLocationAttachment,
} from './chat';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RouteChatPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [messages, setMessages] = useState<RouteChatMessage[]>([]);
  const [readStatuses, setReadStatuses] = useState<RouteChatReadStatus[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [initialLastReadAt, setInitialLastReadAt] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [important, setImportant] = useState(false);
  const [locationAttachment, setLocationAttachment] = useState<RouteChatLocationAttachment | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  useWorkspacePageReady(!loading);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const unreadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const didCaptureInitialRead = useRef(false);

  const load = async (captureInitial = false) => {
    if (!routeId) return;
    setError(null);
    try {
      const [nextMessages, userId, nextReadStatuses] = await Promise.all([
        getRouteChatMessages(routeId),
        getCurrentUserId(),
        getRouteChatReadStatuses(routeId),
      ]);
      setMessages(nextMessages);
      setCurrentUserId(userId);
      setReadStatuses(nextReadStatuses);

      if (captureInitial && !didCaptureInitialRead.current) {
        didCaptureInitialRead.current = true;
        const ownRead = nextReadStatuses.find((status) => status.userId === userId);
        setInitialLastReadAt(ownRead?.lastReadAt ?? null);
      }

      if (userId && nextMessages.length > 0) {
        const latestCreatedAt = nextMessages[nextMessages.length - 1].createdAt;
        const ownRead = nextReadStatuses.find((status) => status.userId === userId);
        if (!ownRead || new Date(ownRead.lastReadAt).getTime() < new Date(latestCreatedAt).getTime()) {
          const saved = await markRouteChatRead(routeId, latestCreatedAt);
          setReadStatuses((current) => [
            ...current.filter((status) => status.userId !== saved.userId),
            saved,
          ]);
        }
      }
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Chatを読み込めませんでした。'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    didCaptureInitialRead.current = false;
    setInitialLastReadAt(null);
    setLoading(true);
    void load(true);
  }, [routeId]);

  useEffect(() => {
    if (!routeId) return;
    return subscribeRouteChat(routeId, () => { void load(false); });
  }, [routeId]);

  const firstUnreadIndex = useMemo(() => {
    if (initialLastReadAt === null) {
      return messages.findIndex((message) => message.authorUserId !== currentUserId);
    }
    const lastReadTime = new Date(initialLastReadAt).getTime();
    return messages.findIndex(
      (message) => message.authorUserId !== currentUserId && new Date(message.createdAt).getTime() > lastReadTime
    );
  }, [currentUserId, initialLastReadAt, messages]);

  const unreadCount = useMemo(() => {
    if (firstUnreadIndex < 0) return 0;
    return messages.slice(firstUnreadIndex).filter((message) => message.authorUserId !== currentUserId).length;
  }, [currentUserId, firstUnreadIndex, messages]);

  useEffect(() => {
    if (loading) return;
    if (firstUnreadIndex >= 0) unreadRef.current?.scrollIntoView({ block: 'center' });
    else endRef.current?.scrollIntoView({ block: 'end' });
  }, [firstUnreadIndex, loading]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = 'auto';
    composer.style.height = `${Math.min(composer.scrollHeight, 120)}px`;
  }, [draft]);

  async function attachCurrentLocation() {
    if (locating) return;
    if (!navigator.geolocation) {
      setError('この端末では現在地を取得できません。');
      return;
    }

    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null;
        if (accuracy !== null && accuracy > 100) {
          const attach = window.confirm(`現在地の精度が約${accuracy}mです。\nおおよその位置として添付しますか？`);
          if (!attach) {
            setLocating(false);
            return;
          }
        }
        setLocationAttachment({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: accuracy,
          capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
        });
        setLocating(false);
      },
      (geoError) => {
        const message = geoError.code === geoError.PERMISSION_DENIED
          ? '位置情報の利用が許可されていません。端末の設定を確認してください。'
          : '現在地を取得できませんでした。文章だけならそのまま送信できます。';
        setError(message);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || !routeId) return;

    setSending(true);
    setError(null);
    try {
      const saved = await sendRouteChatMessage(routeId, body, important, locationAttachment);
      setMessages((current) => current.some((message) => message.id === saved.id) ? current : [...current, saved]);
      await markRouteChatRead(routeId, saved.createdAt);
      setDraft('');
      setImportant(false);
      setLocationAttachment(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'メッセージを送信できませんでした。'));
    } finally {
      setSending(false);
    }
  }

  return (
    <RouteWorkspacePage shellClassName="chat-page-shell" footerLabel="Route Workspace" backTo={`/routes/${routeId}`} backLabel="Routeへ戻る">

      <section className="chat-page" aria-labelledby="chat-title">
        <div className="chat-page-heading">
          <div>
            <p className="eyebrow">ROUTE CHAT</p>
            <h1 id="chat-title">連絡</h1>
          </div>
          {unreadCount > 0 ? <span className="chat-unread-badge">未読 {unreadCount}</span> : null}
        </div>

        <div className="chat-page-log" aria-live="polite">
          {loading ? <div className="chat-empty-state">Chatを読み込んでいます</div> : null}
          {!loading && messages.length === 0 ? <div className="chat-empty-state">まだ連絡はありません。</div> : null}
          {messages.map((message, index) => {
            const isSelf = message.authorUserId === currentUserId;
            const previous = messages[index - 1];
            const isContinuation = Boolean(
              previous &&
              previous.authorUserId === message.authorUserId &&
              !previous.isImportant &&
              !message.isImportant &&
              new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000
            );
            const initial = message.authorName.slice(0, 1).toUpperCase();
            const readCount = isSelf
              ? readStatuses.filter(
                  (status) => status.userId !== currentUserId && new Date(status.lastReadAt).getTime() >= new Date(message.createdAt).getTime()
                ).length
              : 0;

            return (
              <div key={message.id}>
                {index === firstUnreadIndex ? <div className="chat-unread-divider" ref={unreadRef}><span>ここから未読</span></div> : null}
                <section className={`chat-message-row${isSelf ? ' chat-message-self' : ''}${message.isImportant ? ' is-important' : ''}${isContinuation ? ' is-continuation' : ''}`}>
                  {!isSelf && !isContinuation ? <div className="chat-avatar" aria-hidden="true">{initial}</div> : !isSelf ? <div className="chat-avatar-spacer" aria-hidden="true" /> : null}
                  <div className="chat-message-copy">
                    {!isContinuation ? (
                      <div className="chat-message-meta">
                        {message.isImportant ? <span className="chat-important-mark">重要</span> : null}
                        <strong>{isSelf ? 'あなた' : message.authorName}</strong>
                        <time>{formatChatTime(message.createdAt)}</time>
                      </div>
                    ) : null}
                    <div className="chat-bubble">
                      <p>{message.body}</p>
                      {message.latitude !== null && message.longitude !== null ? (
                        <a
                          className="chat-location-card"
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${message.latitude},${message.longitude}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="送信時の位置を地図で開く"
                        >
                          <span className="chat-location-icon" aria-hidden="true">📍</span>
                          <span>
                            <strong>送信時の位置</strong>
                            <small>
                              {formatChatTime(message.locationCapturedAt ?? message.createdAt)}
                              {message.locationAccuracyMeters !== null ? ` · 精度 約${Math.round(message.locationAccuracyMeters)}m` : ''}
                            </small>
                          </span>
                          <b>地図で開く</b>
                        </a>
                      ) : null}
                    </div>
                    <div className="chat-message-footer">
                      {isContinuation ? <time className="chat-continuation-time">{formatChatTime(message.createdAt)}</time> : <span />}
                      {isSelf && readCount > 0 ? <span className="chat-read-count">既読 {readCount}</span> : null}
                    </div>
                  </div>
                </section>
              </div>
            );
          })}
          <div ref={endRef}/>
        </div>

        {error ? <p className="chat-page-error" role="alert">{error}</p> : null}

        {locationAttachment ? (
          <div className="chat-location-attachment" role="status">
            <span>📍 送信時の位置を添付中{locationAttachment.accuracyMeters !== null ? `（精度 約${locationAttachment.accuracyMeters}m）` : ''}</span>
            <button type="button" onClick={() => setLocationAttachment(null)} aria-label="位置情報の添付を外す">×</button>
          </div>
        ) : null}

        <form className="chat-page-composer" onSubmit={submit}>
          <button
            className={`chat-location-button${locationAttachment ? ' is-attached' : ''}`}
            type="button"
            onClick={() => void attachCurrentLocation()}
            disabled={locating || sending}
            aria-label={locationAttachment ? '添付する現在地を更新' : '現在地を添付'}
            title={locationAttachment ? '現在地を更新' : '現在地を添付'}
          >
            {locating ? <span className="chat-location-spinner" aria-hidden="true" /> : '📍'}
          </button>
          <textarea
            ref={composerRef}
            value={draft}
            maxLength={50}
            rows={1}
            placeholder="Routeに必要な連絡を入力"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button className="chat-send-button" type="submit" disabled={!draft.trim() || sending}>
            {sending ? '送信中' : '送信'}
          </button>
        </form>
        <div className="chat-composer-meta">
          <label className="chat-important-toggle">
            <input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} />
            <span>重要として送信</span>
          </label>
          <span>{draft.length}/50</span>
        </div>
      </section>

    </RouteWorkspacePage>
  );
}
