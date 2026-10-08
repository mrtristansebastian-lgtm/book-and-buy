(() => {
  const model = document.getElementById('builderAiModel');
  const status = document.getElementById('builderAiStatus');
  const connect = document.getElementById('builderAiConnect');
  const connection = window.BookBuyLocalAI;
  const provider = document.getElementById('builderAiProvider');
  provider.value = connection.provider;
  if (!['127.0.0.1', 'localhost'].includes(location.hostname)) provider.querySelector('[value="codex"]').remove();
  const settingsKey = 'bookbuy-builder-local-model';
  const effort = document.getElementById('builderAiEffort');
  const mode = document.getElementById('builderAiMode');
  const titleCase = value => ({ xhigh: 'Extra high', none: 'None', minimal: 'Minimal' })[value] || value.charAt(0).toUpperCase() + value.slice(1);
  let models = [];
  const pickers = [ ['builderModelTrigger', 'builderModelMenu'], ['builderToolsTrigger', 'builderToolsMenu'] ];
  function closePickers(focus = false) {
    for (const [triggerId, menuId] of pickers) {
      const trigger = document.getElementById(triggerId), menu = document.getElementById(menuId);
      if (focus && !menu.classList.contains('hidden')) trigger.focus();
      menu.classList.add('hidden'); trigger.setAttribute('aria-expanded', 'false');
    }
  }
  for (const [triggerId, menuId] of pickers) {
    const trigger = document.getElementById(triggerId), menu = document.getElementById(menuId);
    const open = () => {
      const wasOpen = !menu.classList.contains('hidden'); closeAllPopovers(); closePickers();
      if (wasOpen) return;
      menu.classList.remove('hidden'); trigger.setAttribute('aria-expanded', 'true');
      if (menuId === 'builderModelMenu') { document.getElementById('builderModelSearch').value = ''; renderModels(); }
      (menu.querySelector('input') || menu.querySelector('[aria-checked="true"]') || menu.querySelector('button'))?.focus();
    };
    trigger.addEventListener('click', open);
    trigger.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); open(); } });
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closePickers(true); return; }
      const options = [...menu.querySelectorAll('button:not(:disabled)')];
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && options.length) {
        event.preventDefault(); const index = options.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        options[next].focus();
      }
    });
  }
  document.addEventListener('click', event => { if (!event.target.closest('.builder-picker-anchor')) closePickers(); });
  function menuOption(label, description, selected, onClick) {
    const button = document.createElement('button'); button.type = 'button'; button.setAttribute('role', 'menuitemradio'); button.setAttribute('aria-checked', String(selected));
    const text = document.createElement('span'), strong = document.createElement('strong'), small = document.createElement('small'); strong.textContent = label; small.textContent = description; text.append(strong, small);
    const check = document.createElement('span'); check.className = 'builder-menu-check'; check.innerHTML = uiIconMarkup('check'); button.append(text, check); button.addEventListener('click', onClick); return button;
  }
  function renderEfforts() {
    const current = models.find(item => item.name === model.value);
    const values = current?.efforts || [];
    effort.replaceChildren(...values.map(item => new Option(titleCase(item.reasoningEffort), item.reasoningEffort)));
    effort.value = values.some(item => item.reasoningEffort === connection.effort) ? connection.effort : current?.defaultEffort || '';
    connection.effort = effort.value;
    const options = document.getElementById('builderEffortOptions'); options.replaceChildren();
    for (const item of values) options.append(menuOption(titleCase(item.reasoningEffort), item.description, item.reasoningEffort === effort.value, () => { effort.value = item.reasoningEffort; effort.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('builderModelTrigger').focus(); }));
    document.getElementById('builderEffortLabel').textContent = effort.value ? titleCase(effort.value) : 'Thinking';
    document.getElementById('builderEffortTrigger').disabled = !values.length;
  }
  function renderModels() {
    const list = document.getElementById('builderModelOptions'), filter = document.getElementById('builderModelSearch').value.toLowerCase(); list.replaceChildren();
    for (const item of models.filter(item => `${item.label} ${item.name}`.toLowerCase().includes(filter))) list.append(menuOption(item.label || item.name, item.description || 'Available with your account', item.name === model.value, () => { model.value = item.name; model.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('builderModelTrigger').focus(); }));
    if (!list.childElementCount) { const empty = document.createElement('p'); empty.className = 'builder-menu-note'; empty.textContent = models.length ? 'No models match your search.' : 'Connect your account to choose a model.'; list.append(empty); }
    const current = models.find(item => item.name === model.value); document.getElementById('builderModelLabel').textContent = current?.label || 'Choose model';
    document.getElementById('builderModelTrigger').title = current?.label || 'Choose model and connect your account';
  }
  document.getElementById('builderModelSearch').addEventListener('input', renderModels);
  document.getElementById('historyPopover').addEventListener('keydown', event => { if (event.key === 'Escape') document.getElementById('builderToolsTrigger').focus(); });
  document.getElementById('builderModeTrigger').addEventListener('click', () => {
    if (state.busy) return;
    closePickers(); mode.value = mode.value === 'plan' ? 'build' : 'plan';
    mode.dispatchEvent(new Event('change', { bubbles: true }));
  });
  function renderMode() {
    const planning = mode.value === 'plan'; connection.mode = planning ? 'plan' : 'build';
    const trigger = document.getElementById('builderModeTrigger');
    trigger.setAttribute('aria-pressed', String(planning));
    trigger.title = planning ? 'Plan mode on · think it through without changes' : 'Plan mode · think it through first';
    document.getElementById('promptInput').placeholder = planning ? 'What should we plan together?' : 'Ask for a change, or describe your next idea…';
  }
  document.getElementById('builderShowCanvas')?.addEventListener('click', () => document.getElementById('toggleChatBtn')?.click());
  document.querySelectorAll('.view-tab').forEach(button => button.addEventListener('click', () => {
    if (matchMedia('(max-width: 760px)').matches && !document.getElementById('appShell')?.classList.contains('chat-collapsed')) document.getElementById('toggleChatBtn')?.click();
  }));
  async function checkConnection() {
    if (!status || !connect || !model) return;
    connect.disabled = true;
    status.textContent = 'Connecting…';
    document.getElementById('builderPlanUsage').classList.add('hidden');
    try {
      let data;
      if (connection.provider === 'codex') {
        const response = await fetch('/api/builder/codex/health', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        data = await response.json();
        if (!response.ok) throw new Error(data.error);
      } else {
        const [account, discovery] = await Promise.all([window.BookBuyCommerce.hostRequest('ai.connections'), window.BookBuyCommerce.hostRequest('ai.models')]);
        const selected = discovery.providers.find(row => row.provider === connection.provider);
        const current = account.connections.find(row => row.provider === connection.provider);
        window.BookBuyServices.ai.selectConnectionRevision?.(current?.revision);
        data = { connected: Boolean(selected?.available), models: selected?.models || [], plan: current?.billing || 'provider', reason: selected?.reason || current?.reason };
        document.getElementById('builderProviderBilling').textContent = current?.billing === 'byok' ? 'API usage · your provider bill' : current?.billing === 'included' ? 'Book & Buy allowance' : current?.billing === 'chatgpt' ? 'Using ChatGPT plan' : 'Account connection';
        document.getElementById('builderPlanUsage').classList.toggle('hidden', current?.billing !== 'chatgpt' && selected?.error?.details?.recoveryUrl !== 'https://chatgpt.com/settings/usage');
      }
      if (!data.connected) {
        models = []; renderModels(); renderEfforts();
        connection.connected = false;
        status.textContent = data.reason || (connection.provider === 'codex' ? 'Connect your ChatGPT account' : 'Connect your AI provider');
        status.dataset.state = 'offline';
        connect.textContent = connection.provider === 'codex' ? 'Sign in with ChatGPT' : 'Connect';
        model.replaceChildren(new Option('Sign in to choose a model', ''));
        return;
      }
      model.replaceChildren();
      models = data.models || [];
      for (const item of data.models || []) { const option = document.createElement('option'); option.value = item.name; option.textContent = item.label || item.name; model.append(option); }
      if (!model.options.length) { const option = document.createElement('option'); option.value = ''; option.textContent = 'No models available'; model.append(option); throw new Error('No Codex models are available for this account.'); }
      model.value = [...model.options].some(option => option.value === connection.model) ? connection.model : data.models[0].name;
      connection.model = model.value;
      connection.connected = true;
      localStorage.setItem(settingsKey, connection.model);
      status.textContent = connection.provider === 'codex' ? `Connected · ChatGPT ${data.plan || 'account'}` : `Connected · ${({ anthropic: 'Claude', chatgpt: 'ChatGPT', openai: 'OpenAI' })[connection.provider] || 'AI'} · ${data.plan}`;
      status.dataset.state = 'connected';
      connect.textContent = connection.provider === 'codex' ? 'Reconnect' : 'Manage';
      renderModels(); renderEfforts();
      window.BookBuyServices.ai.restoreConversation?.();
    } catch (error) {
      connection.connected = false;
      model.replaceChildren(new Option('Codex offline', connection.model));
      status.textContent = connection.provider === 'codex' ? 'Codex unavailable · press Reconnect' : error.message;
      status.dataset.state = 'offline';
      const state = document.getElementById('modelState');
      if (state) state.textContent = 'Offline';
      models = []; renderModels(); renderEfforts();
    } finally { connect.disabled = false; }
  }
  const savedChats = document.getElementById('builderSavedChats'), savedList = document.getElementById('builderSavedChatsList');
  document.getElementById('builderSavedChatsClose').addEventListener('click', () => savedChats.classList.add('hidden'));
  async function renderSavedChats() {
    savedList.replaceChildren(); const message = document.createElement('p'); message.textContent = 'Loading your conversations…'; savedList.append(message);
    try {
      const result = await window.BookBuyCommerce.hostRequest('ai.conversations'); savedList.replaceChildren();
      const rows = result.conversations.filter(row => row.provider === connection.provider && row.connectionRevision === connection.revision && row.mode === (connection.mode === 'build' ? 'builder' : connection.mode));
      if (!rows.length) { message.textContent = connection.provider === 'codex' ? 'Saved hosted conversations appear when you use a business AI connection.' : 'No saved conversations for this connection and mode yet.'; savedList.append(message); }
      for (const row of rows) {
        const line = document.createElement('div'); line.className = 'builder-saved-chat-row';
        const select = document.createElement('button'); select.type = 'button'; select.textContent = row.title;
        select.addEventListener('click', async () => { if (document.getElementById('sendBtn').classList.contains('is-stop')) return; try { await window.BookBuyServices.ai.selectConversation(row); model.value = connection.model; renderModels(); renderEfforts(); savedChats.classList.add('hidden'); } catch (e) { status.textContent = e.message; } });
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Delete'; remove.setAttribute('aria-label', 'Delete ' + row.title);
        remove.addEventListener('click', async () => { remove.disabled = true; try { await window.BookBuyCommerce.hostRequest('ai.conversation.delete', { conversationId: row.conversationId }); window.BookBuyServices.ai.conversationDeleted(row.conversationId); await renderSavedChats(); } catch (e) { if (!String(e.code).includes('cancel') && e.message !== 'Action cancelled.') status.textContent = e.message; } finally { remove.disabled = false; } });
        line.append(select, remove); savedList.append(line);
      }
    } catch (e) { message.textContent = e.message; savedList.replaceChildren(message); }
  }
  document.getElementById('builderSavedChatsButton').addEventListener('click', () => { closePickers(); savedChats.classList.remove('hidden'); renderSavedChats(); });
  window.addEventListener('bookbuy-ai-recovery', () => document.getElementById('builderPlanUsage').classList.remove('hidden'));
  provider.addEventListener('change', () => { connection.provider = provider.value; localStorage.setItem('bookbuy-builder-provider', provider.value); window.BookBuyServices.ai.newConversation(); checkConnection(); });
  window.addEventListener('bookbuy-ai-connections-changed', checkConnection);
  model?.addEventListener('change', () => { connection.model = model.value; localStorage.setItem(settingsKey, model.value); window.BookBuyServices.ai.newConversation(); renderModels(); renderEfforts(); });
  mode?.addEventListener('change', () => { renderMode(); window.BookBuyServices.ai.newConversation(); });
  effort.addEventListener('change', () => { connection.effort = effort.value; localStorage.setItem('bookbuy-builder-thinking-level', effort.value); window.BookBuyServices.ai.newConversation(); renderEfforts(); });
  renderMode();
  window.addEventListener('bookbuy-builder-busy', event => { closePickers(); for (const [id] of pickers) document.getElementById(id).disabled = event.detail.busy || (id === 'builderEffortTrigger' && !effort.options.length); document.getElementById('builderNewChat').disabled = event.detail.busy; });
  document.getElementById('builderNewChat')?.addEventListener('click', () => {
    if (document.getElementById('sendBtn')?.classList.contains('is-stop')) { status.textContent = 'Stop the current request before starting a new chat.'; return; }
    window.BookBuyServices.ai.newConversation();
    document.getElementById('messages').replaceChildren();
    document.getElementById('chatEmpty')?.classList.remove('hidden');
    status.textContent = 'New conversation · your website is kept';
  });
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceInput = document.getElementById('builderVoiceInput');
  let recognition;
  if (!Recognition) { voiceInput.disabled = true; voiceInput.title = 'Voice input is unavailable in this browser. Use Chrome or Edge.'; }
  else voiceInput.addEventListener('click', () => {
    if (recognition) { recognition.stop(); return; }
    recognition = new Recognition(); recognition.lang = navigator.language || 'en-ZA'; recognition.interimResults = true;
    const input = document.getElementById('promptInput'), initial = input.value;
    recognition.onresult = event => { input.value = [initial, [...event.results].map(result => result[0].transcript).join(' ')].filter(Boolean).join(' '); input.dispatchEvent(new Event('input', { bubbles: true })); };
    recognition.onend = () => { recognition = null; voiceInput.classList.remove('is-listening'); voiceInput.setAttribute('aria-label', 'Dictate message'); };
    recognition.onerror = event => { status.textContent = event.error === 'not-allowed' ? 'Allow microphone access to use voice input.' : 'Voice input stopped. You can type your message instead.'; };
    try { recognition.start(); voiceInput.classList.add('is-listening'); voiceInput.setAttribute('aria-label', 'Stop dictation'); } catch { recognition = null; }
  });
  const voiceOutput = document.getElementById('builderVoiceOutput'); let speak = false;
  voiceOutput.disabled = !('speechSynthesis' in window);
  voiceOutput.addEventListener('click', () => { speak = !speak; voiceOutput.setAttribute('aria-pressed', String(speak)); if (!speak) speechSynthesis.cancel(); });
  window.addEventListener('bookbuy-ai-reply', event => { if (speak && event.detail.text) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(event.detail.text.slice(0, 2000))); } });
  window.addEventListener('pagehide', () => { recognition?.stop(); if ('speechSynthesis' in window) speechSynthesis.cancel(); });
  connect?.addEventListener('click', async () => {
    if (connection.provider !== 'codex') return window.BookBuyCommerce.hostRequest('ai.connect', { provider: connection.provider }).catch(error => { status.textContent = error.message; });
    if (connect.textContent !== 'Sign in with ChatGPT') return checkConnection();
    const popup = window.open('about:blank', '_blank');
    try {
      const response = await fetch('/api/builder/codex/login', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.authUrl || new URL(data.authUrl).protocol !== 'https:') throw new Error(data.error || 'Could not start sign-in.');
      if (popup) popup.location = data.authUrl;
      else { status.replaceChildren(Object.assign(document.createElement('a'), { href: data.authUrl, target: '_blank', rel: 'noopener', textContent: 'Open ChatGPT sign-in' })); }
      const poll = setInterval(async () => { await checkConnection(); if (connection.connected) clearInterval(poll); }, 4000);
      setTimeout(() => clearInterval(poll), 180000);
    } catch (error) { popup?.close(); status.textContent = error.message; }
  });
  window.addEventListener('bookbuy-local-save', event => {
    const help = document.getElementById('builderAiHelp');
    if (!help) return;
    help.textContent = ['error', 'local'].includes(event.detail.state) ? event.detail.message : event.detail.state === 'saving' ? 'Saving your draft…' : 'Draft saved securely · synced across devices';
    if (event.detail.conflict) { const restore = document.createElement('button'); restore.type = 'button'; restore.className = 'builder-cloud-restore'; restore.textContent = 'Review cloud draft'; restore.addEventListener('click', async () => { if (!confirm('Load the cloud version? Download your current files first if you want to keep this local draft.')) return; restore.disabled = true; try { const project = await window.BookBuyServices.projects.useCloudDraft(); window.dispatchEvent(new CustomEvent('bookbuy-cloud-draft-restore', { detail: { project } })); help.textContent = 'Cloud draft restored · synced across devices'; } catch (error) { help.textContent = error.message; } }); help.append(restore); }
  });
  checkConnection();
  document.getElementById('publishBtn')?.addEventListener('click', async () => {
    let panel = document.getElementById('builderPublishedVersions');
    if (!panel) { panel = document.createElement('div'); panel.id = 'builderPublishedVersions'; document.querySelector('#publishModal .modal-copy')?.after(panel); }
    panel.replaceChildren();
    try {
      const status = await window.BookBuyServices.publishing.getStatus();
      document.getElementById('slugInput').value = status.url || 'Assigned after your first publication';
      if (status.url) { const link = document.createElement('a'); link.href = status.url; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open published website'; panel.append(link); }
      const history = (status.revisions || []).filter(row => row.revision !== status.revision);
      if (history.length) {
        const select = document.createElement('select'); select.setAttribute('aria-label', 'Published website version');
        for (const row of history) select.append(new Option(new Date(row.publishedAt).toLocaleString(), row.revision));
        const restore = document.createElement('button'); restore.className = 'secondary-btn compact'; restore.textContent = 'Restore published version';
        restore.addEventListener('click', async () => { restore.disabled = true; try { await window.BookBuyServices.publishing.rollback({ revision: select.value, expectedRevision: status.revision }); panel.textContent = 'Published version restored.'; } catch (error) { panel.textContent = error.message; } });
        panel.append(select, restore);
      }
    } catch (error) { panel.textContent = error.message; }
  });
})();

