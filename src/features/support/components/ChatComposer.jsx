import { useEffect, useRef, useState } from 'react';
import { FileText, Paperclip, Send } from 'lucide-react';
import { uploadChatAttachment } from '../../../shared/firebase/integrations';
import { formatFileSize } from '../utils/supportFormat';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import {
  VoiceMicButton,
  VoicePreviewStrip,
  VoiceRecordingStrip
} from './VoiceRecorder';

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
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const inputRef = useRef(null);

  const sendVoice = async ({ file, durationMs }) => {
    setBusy(true);
    setNote('');
    try {
      const result = await uploadChatAttachment(file, {
        threadId,
        messageId: `voice-${Date.now()}`
      });
      if (!result.ok) {
        throw new Error(result.error || 'Could not upload voice note.');
      }
      await onSend?.({
        body: '',
        type: 'voice',
        attachments: [{ ...result.attachment, durationMs }]
      });
    } catch (error) {
      setNote(error?.message || 'Could not send voice note.');
      throw error;
    } finally {
      setBusy(false);
    }
  };

  const voice = useVoiceRecorder({ onConfirm: sendVoice });

  useEffect(() => {
    if (voice.error) setNote(voice.error);
  }, [voice.error]);

  useEffect(() => {
    if (!prefill) return;
    setDraft(prefill);
    onPrefillConsumed?.();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [prefill, onPrefillConsumed]);

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
      if (!next.length) {
        setNote('Could not attach that file type.');
      } else {
        setPending((prev) => [...prev, ...next]);
      }
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
      const kinds = new Set(pending.map((item) => item.kind));
      let type = 'text';
      if (!body && kinds.size === 1) {
        type = [...kinds][0];
      } else if (pending.length && !body) {
        type = pending[0].kind;
      }
      await onSend?.({
        body,
        type,
        attachments: pending.map(({ localPreview: _preview, ...att }) => att)
      });
      setDraft('');
      setPending([]);
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`bb-support-composer-wrap ${dragOver ? 'is-dragover' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        addFiles(event.dataTransfer?.files);
      }}
    >
      {pending.length ? (
        <div className="bb-support-attach-chips">
          {pending.map((att) => (
            <span key={att.id} className={`bb-support-chip is-${att.kind}`}>
              {att.localPreview ? (
                <img src={att.localPreview} alt="" className="bb-support-chip-thumb" />
              ) : (
                <FileText size={13} />
              )}
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

      {voice.recording ? (
        <VoiceRecordingStrip
          elapsed={voice.elapsed}
          levels={voice.levels}
          onDiscard={voice.discard}
          onStop={voice.stopToPreview}
        />
      ) : voice.previewing && voice.preview ? (
        <VoicePreviewStrip
          url={voice.preview.url}
          durationMs={voice.preview.durationMs}
          onDiscard={voice.discard}
          onConfirm={voice.confirm}
          confirming={busy}
        />
      ) : (
        <div className="bb-support-composer">
          <button
            type="button"
            className="bb-support-composer-icon"
            disabled={disabled || busy || pending.length >= MAX_ATTACHMENTS}
            aria-label="Attach file"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={15} strokeWidth={2} />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf"
            multiple
            onChange={(event) => addFiles(event.target.files)}
          />
          <input
            ref={inputRef}
            type="text"
            className="bb-support-composer-input"
            placeholder={pending.length ? 'Add a caption…' : 'Message…'}
            value={draft}
            disabled={disabled || busy}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                send();
              }
            }}
          />
          <VoiceMicButton disabled={disabled || busy} onStart={voice.start} />
          <button
            type="button"
            className="bb-support-composer-send"
            disabled={disabled || busy || (!draft.trim() && !pending.length)}
            onClick={send}
            aria-label="Send message"
          >
            <Send size={14} strokeWidth={2.25} />
          </button>
        </div>
      )}
    </div>
  );
}
