import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BrandMark } from '../../shared/ui/BrandMark';
import { VersionBadge } from '../../shared/ui/VersionBadge';
import { formatChatTime, loadChatState, phaseLabels, saveChatState, type ChatPhase, type ChatState } from './chat';

export function RouteChatPage() {
  const { routeId = '' } = useParams<{ routeId: string }>();
  const [state, setState] = useState<ChatState>(() => loadChatState(routeId));
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { saveChatState(routeId, state); endRef.current?.scrollIntoView({ block: 'end' }); }, [routeId, state]);

  function sendMessage() {
    const body = draft.trim(); if (!body) return;
    setState((current) => ({ ...current, messages: [...current.messages, { id: `chat-${Date.now()}`, type: 'message', author: 'あなた', initials: 'YOU', body, time: formatChatTime(new Date()), isSelf: true }] }));
    setDraft('');
  }

  function changePhase(next: ChatPhase) {
    if (next === state.phase) return;
    const previous = phaseLabels[state.phase];
    setState((current) => ({ phase: next, messages: [...current.messages, { id: `phase-${Date.now()}`, type: 'system', body: `フェーズを${previous}から${phaseLabels[next]}へ変更しました`, time: formatChatTime(new Date()) }] }));
  }

  return <main className="app-shell chat-page-shell">
    <header className="global-header"><div className="header-brand"><BrandMark size={34} /><strong>D Route</strong></div><Link className="icon-button header-link" to={`/routes/${routeId}`}>Routeへ戻る</Link></header>
    <section className="chat-page" aria-labelledby="chat-title">
      <div className="chat-page-heading"><div><p className="eyebrow">ROUTE CHAT</p><h1 id="chat-title">移動中の連絡</h1></div><label className="phase-select-label">フェーズ<select value={state.phase} onChange={(e) => changePhase(e.target.value as ChatPhase)}>{Object.entries(phaseLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <div className="chat-page-log" aria-live="polite">
        {state.messages.map((message) => message.type === 'system' ? <div className="chat-system-row" key={message.id}><span/><p>{message.body}{message.time ? <time>{message.time}</time> : null}</p><span/></div> : <section className={`chat-message-row${message.isSelf ? ' chat-message-self' : ''}`} key={message.id}>{!message.isSelf ? <div className="chat-avatar" aria-hidden="true">{message.initials}</div> : null}<div className="chat-message-copy"><div className="chat-message-meta"><strong>{message.author}</strong><time>{message.time}</time></div><p className="chat-bubble">{message.body}</p></div></section>)}
        <div ref={endRef}/>
      </div>
      <form className="chat-page-composer" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}><textarea value={draft} maxLength={120} rows={1} placeholder="Routeに必要な連絡を入力" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}/><button className="chat-send-button" type="submit" disabled={!draft.trim()}>送信</button></form>
      <div className="chat-composer-meta"><span>端末内の画面表示のみです</span><span>{draft.length}/120</span></div>
    </section>
    <footer className="app-footer"><VersionBadge/><span>Independent Route Chat</span></footer>
  </main>;
}
