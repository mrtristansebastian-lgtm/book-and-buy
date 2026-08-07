import { Download, FileText, FileImage, File } from 'lucide-react';
import {
  formatDayLabel,
  formatFileSize,
  formatMessageTime
} from '../utils/supportFormat';
import { VoiceNotePlayer } from './VoiceNotePlayer';

function FileIcon({ mime = '', kind = 'file' }) {
  if (kind === 'image' || String(mime).startsWith('image/')) return <FileImage size={16} />;
  if (String(mime).includes('pdf')) return <FileText size={16} />;
  return <File size={16} />;
}

export function MessageTimeline({ messages = [], onOpenImage }) {
  let lastDay = '';
  return (
    <div className="bb-support-timeline">
      {messages.map((message) => {
        const day = formatDayLabel(message.at);
        const showDay = day && day !== lastDay;
        if (showDay) lastDay = day;

        if (message.type === 'system') {
          return (
            <div key={message.id}>
              {showDay ? <div className="bb-support-day">{day}</div> : null}
              <div className="bb-support-system">{message.body}</div>
            </div>
          );
        }

        const isBusiness = message.from === 'business';
        const attachments = message.attachments || [];
        const tone = isBusiness ? 'business' : 'client';

        return (
          <div key={message.id}>
            {showDay ? <div className="bb-support-day">{day}</div> : null}
            <div
              className={`bb-support-bubble-row ${isBusiness ? 'is-business' : 'is-client'}`}
            >
              <div className={`bb-support-bubble ${isBusiness ? 'is-business' : 'is-client'}`}>
                {message.body ? <div className="bb-support-bubble-text">{message.body}</div> : null}
                {attachments.map((att) => {
                  if (att.kind === 'image' && att.url) {
                    return (
                      <button
                        key={att.id}
                        type="button"
                        className="bb-support-attach-image border-0 p-0 bg-transparent"
                        onClick={() => onOpenImage?.(att.url)}
                      >
                        <img src={att.url} alt={att.name || 'Attachment'} />
                      </button>
                    );
                  }
                  if (att.kind === 'voice') {
                    return (
                      <VoiceNotePlayer
                        key={att.id}
                        url={att.url}
                        durationMs={att.durationMs}
                        tone={tone}
                        demoTone={Boolean(att.demoTone) || !att.url}
                      />
                    );
                  }
                  return (
                    <div key={att.id} className="bb-support-attach-file">
                      <span className="bb-support-attach-file-icon">
                        <FileIcon mime={att.mime} kind={att.kind} />
                      </span>
                      <span className="bb-support-attach-file-copy min-w-0">
                        <strong className="truncate block">{att.name || 'File'}</strong>
                        <span className="bb-support-attach-file-meta">
                          {att.size ? formatFileSize(att.size) : 'Attachment'}
                        </span>
                      </span>
                      {att.url ? (
                        <a
                          className="bb-support-attach-file-dl"
                          href={att.url}
                          download={att.name || 'attachment'}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Download ${att.name || 'file'}`}
                        >
                          <Download size={14} />
                        </a>
                      ) : (
                        <span className="bb-support-attach-file-meta">Demo</span>
                      )}
                    </div>
                  );
                })}
                <span className="bb-support-bubble-time">{formatMessageTime(message.at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
