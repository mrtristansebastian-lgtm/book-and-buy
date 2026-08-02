import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Mic, Paperclip, RefreshCw, SendHorizontal, Square, Trash2, X } from 'lucide-react';

import * as FirebaseSDK from '../../../services/firebase';
import { isFirebaseConfigured, storage } from '../../../services/firebase';
import {
  CHAT_ATTACHMENT_MAX_COUNT,
  CHAT_VOICE_MAX_MS,
  createChatAttachmentId,
  createStoredChatAttachment,
  formatChatFileSize,
  formatVoiceDuration,
  getBaseMimeType,
  getMessagePreviewText,
  sanitizeChatFileName,
  validateChatAttachmentFile
} from '../chatAttachments';

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif';
const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain';

const createMessageId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getVoiceMimeType = () => {
  if (!globalThis.MediaRecorder) return '';
  if (MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported?.('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported?.('audio/mp4')) return 'audio/mp4';
  return '';
};

const uploadChatAttachment = ({ workspaceAppId, threadId, messageId, pendingAttachment, onProgress }) => (
  new Promise((resolve, reject) => {
    if (!isFirebaseConfigured || !storage || !FirebaseSDK.uploadBytesResumable) {
      reject(new Error('Uploads need Firebase Storage to be available.'));
      return;
    }
    const safeName = sanitizeChatFileName(pendingAttachment.file?.name || pendingAttachment.name || 'attachment');
    const fileId = pendingAttachment.id || createChatAttachmentId();
    const path = `artifacts/${workspaceAppId}/clientThreads/${threadId}/attachments/${messageId}/${fileId}-${safeName}`;
    const uploadRef = FirebaseSDK.ref(storage, path);
    const task = FirebaseSDK.uploadBytesResumable(uploadRef, pendingAttachment.file, {
      contentType: getBaseMimeType(pendingAttachment.mimeType || pendingAttachment.file?.type) || undefined,
      customMetadata: {
        threadId,
        messageId,
        attachmentId: fileId
      }
    });
    task.on('state_changed', (snapshot) => {
      const progress = snapshot.totalBytes ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100) : 0;
      onProgress?.(progress);
    }, reject, async () => {
      const url = await FirebaseSDK.getDownloadURL(task.snapshot.ref);
      resolve({ url, path });
    });
  })
);

const attachmentIconLabel = (attachment = {}) => {
  if (attachment.type === 'image') return 'Photo';
  if (attachment.type === 'voice') return 'Voice note';
  return 'Document';
};

export function ChatMessageAttachments({ attachments = [], mine = false }) {
  const safeAttachments = Array.isArray(attachments) ? attachments.filter(item => item?.url) : [];
  if (!safeAttachments.length) return null;

  return (
    <div className="chat-attachments-stack" aria-label="Message attachments">
      {safeAttachments.map((attachment) => {
        const key = attachment.id || attachment.url;
        if (attachment.type === 'image') {
          return (
            <a key={key} className="chat-attachment-image-card" href={attachment.url} target="_blank" rel="noopener noreferrer" aria-label={`Open photo ${attachment.name || ''}`.trim()}>
              <img src={attachment.url} alt={attachment.name || 'Chat photo'} loading="lazy" decoding="async" />
            </a>
          );
        }
        if (attachment.type === 'voice') {
          return (
            <div key={key} className={`chat-attachment-voice-card ${mine ? 'is-mine' : ''}`}>
              <span className="chat-attachment-voice-icon" aria-hidden="true"><Mic size={15} /></span>
              <audio src={attachment.url} controls preload="metadata" aria-label={`Voice note ${formatVoiceDuration(attachment.durationMs)}`} />
              <span className="chat-attachment-voice-duration">{formatVoiceDuration(attachment.durationMs)}</span>
            </div>
          );
        }
        return (
          <a key={key} className={`chat-attachment-document-card ${mine ? 'is-mine' : ''}`} href={attachment.url} target="_blank" rel="noopener noreferrer" aria-label={`Open document ${attachment.name || ''}`.trim()}>
            <span className="chat-attachment-document-icon" aria-hidden="true"><FileText size={16} /></span>
            <span className="chat-attachment-document-copy">
              <strong>{attachment.name || 'Document'}</strong>
              <small>{formatChatFileSize(attachment.size)} · {attachment.mimeType || 'File'}</small>
            </span>
            <Download size={15} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

export function ChatAttachmentComposer({
  draft,
  setDraft,
  sending = false,
  onSend,
  placeholder = 'Write a message...',
  ariaLabel = 'Write a message',
  readOnly = false,
  readOnlyMessage = 'This example chat is read-only.',
  showToast,
  workspaceAppId,
  threadId
}) {
  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const recorderRef = useRef(null);
  const textareaRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceStreamRef = useRef(null);
  const voiceTimerRef = useRef(null);
  const discardVoiceRef = useRef(false);
  const pendingAttachmentsRef = useRef([]);
  const [trayOpen, setTrayOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [composerBusy, setComposerBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);

  const uploadBlocked = readOnly || !workspaceAppId || !threadId;
  const hasSendableContent = Boolean(String(draft || '').trim()) || pendingAttachments.length > 0;
  const canSend = hasSendableContent && !composerBusy && !sending && !recording;
  const uploadProgressLabel = useMemo(() => {
    const uploading = pendingAttachments.find(item => item.status === 'uploading');
    return uploading ? `Uploading ${uploading.progress || 0}%` : '';
  }, [pendingAttachments]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => () => {
    pendingAttachmentsRef.current.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    window.clearInterval(voiceTimerRef.current);
    voiceStreamRef.current?.getTracks?.().forEach(track => track.stop());
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const styles = globalThis.getComputedStyle?.(textarea);
    const maxHeight = Number.parseFloat(styles?.maxHeight || '') || 112;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [draft]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (recording) {
        cancelVoiceRecording();
        return;
      }
      if (trayOpen) setTrayOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  const updateAttachment = (id, patch) => {
    setPendingAttachments(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const removeAttachment = (id) => {
    setPendingAttachments(prev => {
      const target = prev.find(item => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(item => item.id !== id);
    });
  };

  const guardUploadAction = () => {
    if (!readOnly) return false;
    showToast?.(readOnlyMessage);
    return true;
  };

  const addFiles = (files, preferredType = '') => {
    if (guardUploadAction()) return;
    const slotsLeft = CHAT_ATTACHMENT_MAX_COUNT - pendingAttachments.length;
    if (slotsLeft <= 0) {
      showToast?.(`Send up to ${CHAT_ATTACHMENT_MAX_COUNT} attachments at a time.`);
      return;
    }
    const nextFiles = Array.from(files || []).filter(Boolean).slice(0, slotsLeft);
    const nextAttachments = [];
    nextFiles.forEach((file) => {
      const validation = validateChatAttachmentFile(file, { type: preferredType });
      if (!validation.ok) {
        showToast?.(validation.error);
        return;
      }
      const id = createChatAttachmentId();
      nextAttachments.push({
        id,
        file,
        type: validation.type,
        name: validation.name,
        mimeType: getBaseMimeType(file.type),
        size: file.size || 0,
        status: 'selected',
        progress: 0,
        previewUrl: validation.type === 'image' ? URL.createObjectURL(file) : ''
      });
    });
    if (nextAttachments.length) setPendingAttachments(prev => [...prev, ...nextAttachments]);
    setTrayOpen(false);
  };

  const startVoiceRecording = async () => {
    if (guardUploadAction()) return;
    if (!globalThis.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      showToast?.('Voice notes are not supported in this browser yet.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getVoiceMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];
      discardVoiceRef.current = false;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data?.size) voiceChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        window.clearInterval(voiceTimerRef.current);
        const durationMs = recordingMs || Date.now() - Number(recorder.startTime || Date.now());
        stream.getTracks().forEach(track => track.stop());
        voiceStreamRef.current = null;
        setRecording(false);
        setRecordingMs(0);
        if (discardVoiceRef.current) return;
        const blobType = getBaseMimeType(recorder.mimeType || 'audio/webm') || 'audio/webm';
        const blob = new Blob(voiceChunksRef.current, { type: blobType });
        const extension = blobType.includes('mp4') ? 'm4a' : blobType.includes('mpeg') ? 'mp3' : blobType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `voice-note-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`, { type: blobType });
        const validation = validateChatAttachmentFile(file, { type: 'voice', durationMs });
        if (!validation.ok) {
          showToast?.(validation.error);
          return;
        }
        setPendingAttachments(prev => [...prev, {
          id: createChatAttachmentId(),
          file,
          type: 'voice',
          name: validation.name,
          mimeType: blobType,
          size: file.size || 0,
          durationMs,
          status: 'selected',
          progress: 0
        }].slice(0, CHAT_ATTACHMENT_MAX_COUNT));
      };
      recorder.startTime = Date.now();
      recorder.start();
      setRecording(true);
      setRecordingMs(0);
      voiceTimerRef.current = window.setInterval(() => {
        const nextMs = Date.now() - Number(recorder.startTime || Date.now());
        setRecordingMs(nextMs);
        if (nextMs >= CHAT_VOICE_MAX_MS && recorder.state === 'recording') {
          recorder.stop();
        }
      }, 250);
    } catch (error) {
      console.error('Voice recording failed', error);
      showToast?.('Microphone permission is needed to record a voice note.');
    }
  };

  const stopVoiceRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const cancelVoiceRecording = () => {
    discardVoiceRef.current = true;
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    } else {
      voiceStreamRef.current?.getTracks?.().forEach(track => track.stop());
      setRecording(false);
      setRecordingMs(0);
    }
  };

  const send = async () => {
    if (!hasSendableContent || composerBusy || sending) return;
    if (readOnly) {
      showToast?.(readOnlyMessage);
      return;
    }
    if (!workspaceAppId || !threadId) {
      showToast?.('Open a chat before sending attachments.');
      return;
    }
    setComposerBusy(true);
    const messageId = createMessageId();
    try {
      const storedAttachments = [];
      for (const pendingAttachment of pendingAttachments) {
        if (pendingAttachment.status === 'uploaded' && pendingAttachment.storedAttachment) {
          storedAttachments.push(pendingAttachment.storedAttachment);
          continue;
        }
        updateAttachment(pendingAttachment.id, { status: 'uploading', progress: 1, error: '' });
        const uploadResult = await uploadChatAttachment({
          workspaceAppId,
          threadId,
          messageId,
          pendingAttachment,
          onProgress: (progress) => updateAttachment(pendingAttachment.id, { progress })
        });
        const storedAttachment = createStoredChatAttachment(pendingAttachment, uploadResult);
        storedAttachments.push(storedAttachment);
        updateAttachment(pendingAttachment.id, { status: 'uploaded', progress: 100, storedAttachment });
      }
      const cleanText = String(draft || '').trim();
      const previewText = getMessagePreviewText({ text: cleanText, attachments: storedAttachments });
      await onSend?.({ text: cleanText, attachments: storedAttachments, messageId, previewText });
      pendingAttachments.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setPendingAttachments([]);
      setTrayOpen(false);
    } catch (error) {
      console.error('Chat send failed', error);
      setPendingAttachments(prev => prev.map(item => item.status === 'uploading' ? {
        ...item,
        status: 'failed',
        error: 'Upload failed. Try again.'
      } : item));
      showToast?.('Could not send that message. Check the file and try again.');
    } finally {
      setComposerBusy(false);
    }
  };

  return (
    <div className="chat-attachment-composer" aria-busy={composerBusy || sending}>
      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files, 'image');
          event.target.value = '';
        }}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files, 'document');
          event.target.value = '';
        }}
      />

      {(pendingAttachments.length > 0 || recording) && (
        <div className="chat-pending-attachments" aria-live="polite">
          {recording && (
            <div className="chat-recording-strip">
              <span className="chat-recording-pulse" aria-hidden="true" />
              <span className="chat-recording-copy">Recording {formatVoiceDuration(recordingMs)}</span>
              <button type="button" onClick={cancelVoiceRecording} aria-label="Cancel voice recording"><X size={15} /></button>
              <button type="button" onClick={stopVoiceRecording} aria-label="Stop voice recording"><Square size={13} /></button>
            </div>
          )}
          {pendingAttachments.map(attachment => (
            <div key={attachment.id} className={`chat-pending-attachment is-${attachment.type} is-${attachment.status}`}>
              {attachment.previewUrl ? (
                <img src={attachment.previewUrl} alt="" />
              ) : (
                <span className="chat-pending-icon" aria-hidden="true">
                  {attachment.type === 'voice' ? <Mic size={15} /> : <FileText size={15} />}
                </span>
              )}
              <span className="chat-pending-copy">
                <strong>{attachmentIconLabel(attachment)}</strong>
                <small>{attachment.type === 'voice' ? formatVoiceDuration(attachment.durationMs) : `${attachment.name} · ${formatChatFileSize(attachment.size)}`}</small>
                {attachment.status === 'uploading' && <em>{attachment.progress || 0}%</em>}
                {attachment.status === 'failed' && <em>{attachment.error || 'Failed'}</em>}
              </span>
              <button type="button" onClick={() => removeAttachment(attachment.id)} aria-label={`Remove ${attachment.name || attachment.type}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {trayOpen && (
        <div className="chat-attachment-tray" role="menu" aria-label="Attach to chat">
          <button type="button" role="menuitem" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon size={16} />
            <span>Photo</span>
          </button>
          <button type="button" role="menuitem" onClick={() => documentInputRef.current?.click()}>
            <FileText size={16} />
            <span>Document</span>
          </button>
        </div>
      )}

      <div className="chat-attachment-composer-row">
        <button
          type="button"
          className={`chat-composer-tool ${trayOpen ? 'is-active' : ''}`}
          onClick={() => uploadBlocked ? showToast?.(readOnly ? readOnlyMessage : 'Open a chat before attaching files.') : setTrayOpen(prev => !prev)}
          aria-label="Attach a photo or document"
          aria-expanded={trayOpen}
        >
          <Paperclip size={17} />
        </button>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          rows={1}
          disabled={composerBusy || sending}
        />
        <button
          type="button"
          className={`chat-composer-tool ${recording ? 'is-recording' : ''}`}
          onClick={recording ? stopVoiceRecording : startVoiceRecording}
          disabled={composerBusy || sending}
          aria-label={recording ? 'Stop voice recording' : 'Record voice note'}
        >
          {recording ? <Square size={14} /> : <Mic size={17} />}
        </button>
        <button
          type="button"
          className="chat-composer-send"
          onClick={send}
          disabled={!canSend}
          aria-label={uploadProgressLabel || 'Send message'}
        >
          {composerBusy ? <RefreshCw size={17} className="chat-spin" /> : <SendHorizontal size={18} />}
        </button>
      </div>
    </div>
  );
}
