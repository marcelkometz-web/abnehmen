const $ = id => document.getElementById(id);
const text = (tag, content, className) => { const item = document.createElement(tag); item.textContent = content; if (className) item.className = className; return item; };
export class Assistant {
  constructor({ client, active, error }) {
    this.client = client; this.active = active; this.error = error; this.revision = 0; this.configured = false; this.pending = false;
    $('open-ai').addEventListener('click', () => { $('ai-dialog').showModal(); this.load().catch(() => this.setError('Der Begleiter konnte nicht geladen werden.')); });
    $('close-ai').addEventListener('click', () => $('ai-dialog').close());
    $('ai-form').addEventListener('submit', event => {
      event.preventDefault(); const message = String(new FormData(event.target).get('message')).trim();
      this.run('chat', message).then(() => { if (this.active()) event.target.reset(); }).catch(error => this.setError(error.message));
    });
    $('refresh-tip').addEventListener('click', () => this.run('tips').catch(error => this.setError(error.message)));
    $('clear-ai').addEventListener('click', () => {
      if (confirm('Den gemeinsamen App-Chat, die KI-Merkliste und den gespeicherten Tipp für euch beide löschen?')) this.run('clear').catch(error => this.setError(error.message));
    });
    $('ai-key-form').addEventListener('submit', async event => {
      event.preventDefault(); const form = event.target, key = String(new FormData(form).get('api_key')).trim();
      const revision = this.revision, button = form.querySelector('button'); button.disabled = true;
      try {
        const result = await this.client.rpc('ab_ai_config', { action: 'set', new_key: key });
        if (result.error) throw new Error('Der Schlüssel konnte nicht gespeichert werden. Bitte Anmeldung, Authenticator und Schlüsselformat prüfen.');
        if (revision !== this.revision || !this.active()) return;
        this.setError('Schlüssel verschlüsselt gespeichert.');
        await this.load(); this.schedule();
      } catch (error) { if (revision === this.revision) this.setError(error.message); }
      finally { form.reset(); button.disabled = false; }
    });
    $('remove-ai-key').addEventListener('click', async () => {
      if (!confirm('Den gespeicherten OpenAI-Schlüssel entfernen und KI-Anfragen deaktivieren?')) return;
      const revision = this.revision;
      const result = await this.client.rpc('ab_ai_config', { action: 'remove' });
      if (revision !== this.revision) return;
      if (result.error) this.setError('Der Schlüssel konnte nicht entfernt werden.');
      else { this.configured = false; clearTimeout(this.timer); await this.load().catch(() => {}); this.setError('KI deaktiviert und Schlüssel entfernt.'); }
    });
  }
  setError(message) { $('ai-error').textContent = message; }
  clear() {
    ++this.revision; clearTimeout(this.timer); this.pending = false; this.configured = false;
    if ($('ai-dialog').open) $('ai-dialog').close();
    $('ai-companion').hidden = true; $('ai-history').replaceChildren();
    for (const id of ['ai-tip-preview','ai-current-tip','ai-error','ai-key-status']) $(id).textContent = '';
    $('ai-key-form').reset(); $('ai-form').reset();
  }
  async load({ generate = false } = {}) {
    if (!this.active()) return;
    const revision = this.revision;
    const [config, messages, tip] = await Promise.all([
      this.client.rpc('ab_ai_config', { action: 'status' }),
      this.client.from('ab_ai_messages').select('role,content,created_at').order('created_at', { ascending: false }).order('sequence', { ascending: false }).limit(60),
      this.client.from('ab_ai_tips').select('content,created_at').maybeSingle()
    ]);
    if (revision !== this.revision || !this.active()) return;
    if (config.error || messages.error || tip.error) throw new Error('Der Begleiter konnte nicht geladen werden.');
    this.configured = Boolean(config.data.configured);
    $('ai-key-status').textContent = this.configured ? `Schlüssel hinterlegt · ${config.data.model}` : 'Noch kein OpenAI-Schlüssel hinterlegt.';
    $('remove-ai-key').hidden = !this.configured;
    const hint = tip.data?.content || (this.configured ? 'Ein neuer Tipp wird aus deinen Einträgen erstellt.' : 'Für persönliche KI-Tipps und Chat zuerst den OpenAI-Schlüssel in den Einstellungen hinterlegen.');
    $('ai-tip-preview').textContent = hint;
    $('ai-current-tip').textContent = tip.data?.content || '';
    $('ai-companion').hidden = false;
    const history = $('ai-history'); history.replaceChildren();
    for (const item of [...messages.data].reverse()) {
      const bubble = text('article', '', `chat-bubble ${item.role}`);
      bubble.append(text('small', item.role === 'user' ? 'Ihr' : 'ChatGPT'), text('p', item.content));
      history.append(bubble);
    }
    if (generate && this.configured) this.schedule();
  }
  schedule() {
    if (!this.configured || !this.active()) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.run('tips').catch(error => this.setError(error.message)), 1400);
  }
  async run(action, message) {
    if (!this.active()) throw new Error('Bitte melde dich erneut an.');
    if (this.pending) throw new Error('Bitte die laufende Antwort abwarten.');
    if (!this.configured && action !== 'clear') { $('ai-settings').open = true; throw new Error('Bitte zuerst den OpenAI-Schlüssel in den Einstellungen hinterlegen.'); }
    const revision = this.revision; this.pending = true; this.setError(action === 'clear' ? 'Verlauf wird gelöscht …' : 'Dein Begleiter denkt nach …');
    for (const button of $('ai-form').querySelectorAll('button')) button.disabled = true;
    try {
      const result = await this.client.functions.invoke('abnehmen-ai', { body: { action, message } });
      if (revision !== this.revision || !this.active()) return;
      if (result.error) {
        let detail; try { detail = await result.error.context?.json(); } catch {}
        throw new Error(detail?.error || 'Der Begleiter konnte nicht antworten. Bitte später erneut versuchen.');
      }
      if (result.data?.error) throw new Error(result.data.error);
      await this.load();
      if (revision !== this.revision) return;
      this.setError(action === 'clear' ? 'Gemeinsamer Chat und KI-Merkliste gelöscht.' : '');
      $('ai-history').scrollTop = $('ai-history').scrollHeight;
    } finally {
      if (revision === this.revision) {
        this.pending = false;
        for (const button of $('ai-form').querySelectorAll('button')) button.disabled = false;
      }
    }
  }
}
