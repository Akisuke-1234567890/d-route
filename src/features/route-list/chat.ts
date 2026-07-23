export type ChatPhase = 'planning' | 'moving' | 'meeting' | 'finished';

export const phaseLabels: Record<ChatPhase, string> = {
  planning: 'Planning', moving: 'Moving', meeting: 'Meeting', finished: 'Finished',
};

export type ChatMessage =
  | { id: string; type: 'message'; author: string; initials: string; body: string; time: string; isSelf?: boolean }
  | { id: string; type: 'system'; body: string; time?: string };

export type ChatState = { phase: ChatPhase; messages: ChatMessage[] };

const initialState: ChatState = {
  phase: 'moving',
  messages: [
    { id: 'system-start', type: 'system', body: 'Routeを開始しました', time: '08:30' },
    { id: 'chat-a', type: 'message', author: 'メンバーA', initials: 'A', body: '海老名SAに到着しました。入口近くで待っています。', time: '08:24' },
    { id: 'chat-self', type: 'message', author: 'あなた', initials: 'YOU', body: 'あと5分ほどで到着します。先に休憩していてください。', time: '08:25', isSelf: true },
    { id: 'system-join', type: 'system', body: 'メンバーBが参加しました', time: '08:27' },
    { id: 'chat-b', type: 'message', author: 'メンバーB', initials: 'B', body: '少し遅れます。大観山駐車場で合流します。', time: '08:28' },
  ],
};

function storageKey(routeId: string) { return `d-route-chat:${routeId}`; }
export function loadChatState(routeId: string): ChatState {
  try { const raw = localStorage.getItem(storageKey(routeId)); return raw ? JSON.parse(raw) as ChatState : initialState; }
  catch { return initialState; }
}
export function saveChatState(routeId: string, state: ChatState) {
  localStorage.setItem(storageKey(routeId), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('d-route-chat-updated', { detail: { routeId } }));
}
export function formatChatTime(date: Date) {
  return new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}
