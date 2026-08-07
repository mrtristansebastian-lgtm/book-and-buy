import { useCallback, useEffect, useRef, useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { uploadChatAttachment } from '../../../shared/firebase/integrations';
import { formatFileSize } from '../utils/supportFormat';
import { VoiceRecorder } from './VoiceRecorder';

const MAX_ATTACHMENTS = 4;

export function ChatComposer({
  threadId,
  prefill = '',
  onPrefillConsumed,
  onSend,
  disabled = false
}) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [voiceState, setVoiceState] = useState({ recording: false, elapsed: 0, error: '' });
  const fileRef = useRef(null);
  const areaRef = useRef(null);

  useEffect(() => {
    if (!prefill) return;
    setDraft(prefill);
    onPrefillConsumed?.();
    requestAnimationFrame(() => {
      if (areaRef.current) {
        areaRef.current.style.height = 'auto';
        areaRef.current.style.height = `${Math.min(areaRef.current.scrollHeight, 120)}px`;
        areaRef.current.focus();
      }
    });
  }, [prefill, onPrefillConsumed]);

  const onRecordingChange = useCallback((next) => {
    setVoiceState(next);
    if (next.error) setNote(next.error);
  }, []);

  const resize = () => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setNote('');
    const room = MAX_ATTACHMENTS - pending.length;
    if (room <= 0) {
      setNote('Max 4 attachments per message.');
      return;
    }
    setBusy(true);
    try {
      const next = [];
      for (const file of files.slice(0, room)) {
        const result = await uploadChatAttachment(file, {
          threadId,
          messageId: `draft-${Date.now()}`
        });
        if (result.ok) {
          next.push({
            ...result.attachment,
            localPreview: result.attachment.kind === 'image' ? result.attachment.url : ''
          });
        }
      }
      setPending((prev) => [...prev, ...next]);
    } catch (error) {
      setNote(error?.message || 'Could not attach file.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body && !pending.length) return;
    setBusy(true);
    try {
      await onSend?.({
        body,
        type:
          pending[0]?.kind === 'voice' && !body && pending.length === 1 ? 'voice' : undefined,
        attachments: pending.map(({ localPreview: _preview, ...att }) => att)
      });
      setDraft('');
      setPending([]);
      if (areaRef.current) areaRef.current.style.height = 'auto';
    } finally {
      setBusy(false);
    }
  };

  const onVoice = async ({ file, durationMs }) => {
    setBusy(true);
    setNote('');
    try {
      const result = await uploadChatAttachment(file, {
        threadId,
        messageId: `voice-${Date.now()}`
      });
      if (!result.ok) return;
      await onSend?.({
        body: '',
        type: 'voice',
        attachments: [{ ...result.attachment, durationMs }]
      });
    } catch (error) {
      setNote(error?.message || 'Could not send voice note.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bb-support-composer-wrap">
      {voiceState.recording ? (
        <div className="bb-support-recording-bar">
          <span>Recording… speak now</span>
          <span>{Math.round(voiceState.elapsed / 1000)}s</span>
        </div>
      ) : null}
      {pending.length ? (
        <div className="bb-support-attach-chips">
          {pending.map((att) => (
            <span key={att.id} className="bb-support-chip">
              {att.localPreview ? (
                <img
                  src={att.localPreview}
                  alt=""
                  className="w-6 h-6 rounded object-cover"
                />
              ) : null}
              <span className="truncate max-w-[9rem]">
                {att.name}
                {att.size ? ` · ${formatFileSize(att.size)}` : ''}
              </span>
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={() => setPending((prev) => prev.filter((row) => row.id !== att.id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {note ? <p className="bb-muted m-0 text-xs">{note}</p> : null}
      <div className="bb-support-composer">
        <button
          type="button"
          className="bb-support-composer-icon"
          disabled={disabled || busy || pending.length >= MAX_ATTACHMENTS}
          aria-label="Attach file"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          multiple
          onChange={(event) => addFiles(event.target.files)}
        />
        <textarea
          ref={areaRef}
          rows={1}
          placeholder="Write a message…"
          value={draft}
          disabled={disabled || busy}
          onChange={(event) => {
            setDraft(event.target.value);
            resize();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <VoiceRecorder
          disabled={disabled || busy}
          onRecorded={onVoice}
          onRecordingChange={onRecordingChange}
        />
        <button
          type="button"
          className="bb-primary-btn"
          disabled={disabled || busy || (!draft.trim() && !pending.length)}
          onClick={send}
        >
          <Send size={14} />
          Send
        </button>
      </div>
    </div>
  );
}
