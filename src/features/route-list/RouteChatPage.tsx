import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { RefreshButton } from '../../shared/ui/RefreshButton';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { RouteBottomNav } from './RouteBottomNav';
import {
  formatChatTime,
  getCurrentUserId,
  getRouteChatMessages,
  sendRouteChatMessage,
  type RouteChatMessage,
} from './chat';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RouteChatPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [messages, setMessages] = useState<RouteChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [important, setImportant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    if (!routeId) return;
    setError(null);
    try {
      const [nextMessages, userId] = await Promise.all([
        getRouteChatMessages(routeId),
        getCurrentUserId(),
      ]);
      setMessages(nextMessages);
      setCurrentUserId(userId);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'Chatを読み込めませんでした。'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [routeId]);

  useEffect(() => {
    if (!loading) endRef.current?.scrollIntoView({ block: 'end' });
  }, [loading, messages.length]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = 'auto';
    composer.style.height = `${Math.min(composer.scrollHeight, 120)}px`;
  }, [draft]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || !routeId) return;

    setSending(true);
    setError(null);
    try {
      const saved = await sendRouteChatMessage(routeId, body, important);
      setMessages((current) => [...current, saved]);
      setDraft('');
      setImportant(false);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'メッセージを送信できませんでした。'));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="app-shell chat-page-shell">
      <header className="global-header">
        <div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div>
        <div className="header-actions">
          <Link className="icon-button header-link" to={`/routes/${routeId}`}>Routeへ戻る</Link>
          <RefreshButton placement="header" />
        </div>
      </header>

      <section className="chat-page" aria-labelledby="chat-title">
        <div className="chat-page-heading">
          <div><p className="eyebrow">ROUTE CHAT</p><h1 id="chat-title">連絡</h1></div>
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

            return (
              <section className={`chat-message-row${isSelf ? ' chat-message-self' : ''}${message.isImportant ? ' is-important' : ''}${isContinuation ? ' is-continuation' : ''}`} key={message.id}>
                {!isSelf && !isContinuation ? <div className="chat-avatar" aria-hidden="true">{initial}</div> : !isSelf ? <div className="chat-avatar-spacer" aria-hidden="true" /> : null}
                <div className="chat-message-copy">
                  {!isContinuation ? (
                    <div className="chat-message-meta">
                      <strong>{isSelf ? 'あなた' : message.authorName}</strong>
                      {message.isImportant ? <span className="chat-important-mark">重要</span> : null}
                      <time>{formatChatTime(message.createdAt)}</time>
                    </div>
                  ) : null}
                  <p className="chat-bubble">{message.body}</p>
                  {isContinuation ? <time className="chat-continuation-time">{formatChatTime(message.createdAt)}</time> : null}
                </div>
              </section>
            );
          })}
          <div ref={endRef}/>
        </div>

        {error ? <p className="chat-page-error" role="alert">{error}</p> : null}

        <form className="chat-page-composer" onSubmit={submit}>
          <textarea
            ref={composerRef}
            value={draft}
            maxLength={500}
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
          <span>{draft.length}/500</span>
        </div>
      </section>

      <footer className="app-footer"><VersionBadge/><span>Route Workspace</span></footer>
      <RouteBottomNav routeId={routeId}/>
    </main>
  );
}
