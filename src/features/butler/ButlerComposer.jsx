import { useEffect, useRef } from 'react';
import { Lightbulb, Brain, SlidersHorizontal, Paperclip, ArrowUp, Square, CalendarDays, Package, ShoppingBag, MessageCircle, BarChart3, ListChecks, AudioLines } from 'lucide-react';

const TASKS = [
  { label: 'Today’s priorities', description: 'What needs your attention', icon: ListChecks, prompt: 'Review my bookings and orders. What needs my attention today? Be clear about information you cannot access.' },
  { label: 'Bookings & availability', description: 'Schedules and open times', icon: CalendarDays, prompt: 'Help me review upcoming bookings and availability. Ask which service and date to check if needed.' },
  { label: 'Stock check', description: 'Low stock and next steps', icon: Package, prompt: 'Review my product inventory and highlight low stock. Suggest next steps without changing stock.' },
  { label: 'Improve my catalog', description: 'Products and services', icon: ShoppingBag, prompt: 'Review my products and services and suggest improvements. Show proposed changes for my review before making any.' },
  { label: 'Orders & payments', description: 'Progress and saved payment status', icon: Package, prompt: 'Review my orders and saved payment status. Which need attention? Do not move money or claim payment verification you cannot perform.' },
  { label: 'Inbox assistance', description: 'Conversations and reply ideas', icon: MessageCircle, prompt: 'Review my business inbox and help me draft a reply. Ask which conversation I want to work on, and never send without approval.' },
  { label: 'Business snapshot', description: 'Booking and order totals', icon: BarChart3, prompt: 'Give me a clear snapshot of my available booking and order totals. Explain any missing data and suggest a useful next step.' }
];

export function ButlerComposer({ input, onInput, fieldRef, mode, onMode, working, canSend, onSubmit, onStop, menu, onMenu, aiSettings, onReports }) {
  const controlsRef = useRef(null);
  useEffect(() => {
    if (!menu) return undefined;
    const close = event => { if (!controlsRef.current?.contains(event.target)) onMenu(''); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu, onMenu]);
  const toggle = value => onMenu(menu === value ? '' : value);
  const chooseTask = prompt => { onMenu(''); onInput(prompt); requestAnimationFrame(() => fieldRef.current?.focus()); };
  return <form className="bb-butler-composer" onSubmit={onSubmit}>
    <textarea ref={fieldRef} className="native-control-nest" aria-label="Message Butler" placeholder={mode === 'plan' ? 'What should we plan together?' : 'Ask your Butler anything…'} value={input} onChange={e => onInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !working && canSend && input.trim()) { e.preventDefault(); e.currentTarget.form.requestSubmit(); } }} rows="1" maxLength={6000}/>
    <div className="bb-butler-composer-bottom" ref={controlsRef} onKeyDown={e => { if (e.key === 'Escape' && menu) { e.preventDefault(); e.stopPropagation(); onMenu(''); controlsRef.current?.querySelector(`[data-menu="${menu}"]`)?.focus(); } }}>
      <div className="bb-butler-composer-tools">
        <button type="button" className="bb-butler-tool-button bb-butler-plan-toggle" aria-label="Plan mode" title={mode === 'plan' ? 'Plan mode on · think it through without changes' : 'Plan mode · think it through first'} aria-pressed={mode === 'plan'} disabled={working} onClick={() => { onMenu(''); onMode(mode === 'plan' ? 'butler' : 'plan'); }}><Lightbulb size={18}/></button>
        <button type="button" data-menu="ai" className="bb-butler-tool-button" aria-label="AI model and thinking level" title="AI model and thinking level" aria-expanded={menu === 'ai'} aria-controls="butler-ai-menu" onClick={() => toggle('ai')}><Brain size={18}/></button>
        <button type="button" data-menu="tools" className="bb-butler-tool-button" aria-label="Butler tools" title="Butler tools" aria-expanded={menu === 'tools'} aria-controls="butler-tools-menu" disabled={working} onClick={() => toggle('tools')}><SlidersHorizontal size={18}/></button>
        <button type="button" className="bb-butler-tool-button" disabled aria-label="Attachments unavailable" title="File attachments aren’t supported yet"><Paperclip size={18}/></button>
      </div>
      {menu === 'ai' && <section id="butler-ai-menu" className="bb-butler-composer-popover is-ai" aria-label="AI model and thinking level">{aiSettings}</section>}
      {menu === 'tools' && <section id="butler-tools-menu" className="bb-butler-composer-popover" aria-label="Butler tools"><header>A little help with your business<small>Choose a task to prepare your message.</small></header>{TASKS.map(({ label, description, icon: Icon, prompt }) => <button type="button" key={label} className="bb-butler-menu-option" onClick={() => chooseTask(prompt)}><Icon size={18}/><span><strong>{label}</strong><small>{description}</small></span></button>)}<button type="button" className="bb-butler-menu-option" onClick={() => { onMenu(''); onReports(); }}><BarChart3 size={18}/><span><strong>Analytics reports</strong><small>Open your business reports</small></span></button></section>}
      <button className="bb-butler-send" type={working ? 'button' : 'submit'} aria-label={working ? 'Stop Butler' : 'Send message to Butler'} disabled={!working && (!canSend || !input.trim())} onClick={working ? onStop : undefined}>{working ? <Square size={14} fill="currentColor"/> : <ArrowUp size={18}/>}</button>
      <button type="button" data-menu="voice" className="bb-butler-voice" aria-label="Butler voice mode" title="Butler voice mode" aria-expanded={menu === 'voice'} aria-controls="butler-voice-menu" onClick={() => toggle('voice')}><AudioLines size={18} aria-hidden="true"/></button>
      {menu === 'voice' && <section id="butler-voice-menu" className="bb-butler-composer-popover" aria-label="Butler voice mode"><header>Talk with your Butler<small>Voice conversations aren’t available yet. You can keep chatting here by text.</small></header></section>}
    </div>
  </form>;
}
