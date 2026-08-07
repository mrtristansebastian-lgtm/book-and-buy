import { FileText, Mic } from 'lucide-react';
import {
  formatDayLabel,
  formatDuration,
  formatFileSize,
  formatMessageTime
} from '../utils/supportFormat';

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

        return (
          <div key={message.id}>
            {showDay ? <div className="bb-support-day">{day}</div> : null}
            <div
              className={`bb-support-bubble-row ${isBusiness ? 'is-business' : 'is-client'}`}
            >
              <div className={`bb-support-bubble ${isBusiness ? 'is-business' : 'is-client'}`}>
                {message.body ? <div>{message.body}</div> : null}
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
                      <div key={att.id} className="bb-support-voice">
                        {att.url ? (
                          <audio controls preload="metadata" src={att.url} />
                        ) : (
                          <>
                            <Mic size={16} />
                            <span className="bb-support-voice-fallback">
                              Voice note · {formatDuration(att.durationMs)}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div key={att.id} className="bb-support-attach-file">
                      <FileText size={16} />
                      <span className="min-w-0 truncate">
                        {att.name || 'File'}
                        {att.size ? ` · ${formatFileSize(att.size)}` : ''}
                      </span>
                      {att.url ? (
                        <a
                          className="underline font-semibold"
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      ) : null}
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
