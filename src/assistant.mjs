import {readAssistantContent} from '../supabase/functions/abnehmen-ai/domain.mjs';
const $ = id => document.getElementById(id);
const text = (tag, content, className) => { const item = document.createElement(tag); item.textContent = content; if (className) item.className = className; return item; };
const evidenceDate=value=>value?new Date(value+'T12:00:00').toLocaleDateString('de-DE'):'kein Eintrag';
export function evidencePanel(basis){
  const details=text('details','', 'hint ai-evidence');
  details.append(text('summary',basis?'Datenbasis dieser Empfehlung':'Datenbasis eines älteren Tipps'));
  if(!basis){details.append(text('p','Für diesen älteren Text wurde noch keine genaue Datenbasis gespeichert. Ein neuer Tipp erhält sie automatisch.'));return details;}
  details.append(text('p','Erstellt am '+new Date(basis.at).toLocaleString('de-DE')+' · berücksichtigt Einträge bis '+evidenceDate(basis.asOf)+'.'));
  const list=text('ul','');
  for(const[label,index]of[['Gewichtseinträge',0],['Messtage mit Körpermaßen',1],['Trainingseinheiten',2],['freiwillige Zykluseinträge',3]]){
    const[count,last]=basis.sources[index];list.append(text('li',`${count} ${label} · letzter Eintrag: ${evidenceDate(last)}.`));
  }
  list.append(text('li',basis.height===null?'Eine bestätigte Körpergröße fehlt. Es wurde kein BMI berechnet.':`Bestätigte Körpergröße: ${Number(basis.height).toLocaleString('de-DE')} cm.`));
  if(basis.bmi!==null&&Number.isFinite(basis.bmi))list.append(text('li',`BMI: ${basis.bmi.toLocaleString('de-DE',{maximumFractionDigits:1})} aus dem Gewicht vom ${evidenceDate(basis.weightDate)} und der bestätigten Größe (kg ÷ m²).`));
  details.append(list,text('p','Zahlen und Datenbasis berechnet die App. Den Tipp formuliert die KI. Fotos und Foto-Links werden ihr nicht übermittelt. Andere ChatGPT-Chats sind nicht verbunden.'));
  details.append(text('p','Fehlende Einträge bleiben unbekannt. Körperfett, tatsächliche Essensmengen und Krankheiten lassen sich daraus nicht zuverlässig bestimmen. Zyklusangaben verändern die BMI-Formel nicht.'));
  return details;
}
export class Assistant {
  constructor({ client, active, error, onDataSaved }) {
    this.client = client; this.active = active; this.error = error; this.onDataSaved = onDataSaved; this.revision = 0; this.configured = false; this.pending = false; this.retry = null; this.queuedTip = false;
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
        if (result.error) throw new Error('Der Schlüssel konnte nicht gespeichert werden. Bitte Anmeldung und Schlüsselformat prüfen.');
        if (revision !== this.revision || !this.active()) return;
        await this.load(); this.setError('Schlüssel verschlüsselt gespeichert.'); this.schedule();
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
    ++this.revision; clearTimeout(this.timer); this.pending = false; this.configured = false; this.retry = null; this.queuedTip = false; this.historySignature = null;
    if ($('ai-dialog').open) $('ai-dialog').close();
    $('ai-companion').hidden = true; $('ai-history').replaceChildren();
    $('ai-tip-evidence')?.remove();
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
    const currentTip=readAssistantContent(tip.data?.content);
    const hint = currentTip.text || (this.configured ? 'Ein neuer Tipp wird aus deinen Einträgen erstellt.' : 'Für persönliche KI-Tipps und Chat zuerst den OpenAI-Schlüssel in den Einstellungen hinterlegen.');
    $('ai-tip-preview').textContent = hint;
    $('ai-tip-preview').title=currentTip.evidence?'Tipp vom '+new Date(currentTip.evidence.at).toLocaleString('de-DE')+' · Datenbasis im Chat öffnen':'Datenbasis im Chat öffnen';
    $('ai-current-tip').textContent = currentTip.text;
    $('ai-tip-evidence')?.remove();
    if(currentTip.text){const panel=evidencePanel(currentTip.evidence);panel.id='ai-tip-evidence';$('ai-current-tip').after(panel);}
    $('ai-companion').hidden = false;
    const signature = JSON.stringify(messages.data);
    if (signature !== this.historySignature) {
      const history = $('ai-history'), scroll = history.scrollTop, atBottom = history.scrollHeight - scroll - history.clientHeight < 80;
      history.replaceChildren();
      for (const item of [...messages.data].reverse()) {
        const bubble = text('article', '', `chat-bubble ${item.role}`);
        const value=item.role==='assistant'?readAssistantContent(item.content):{text:item.content,evidence:null};
        bubble.append(text('small', item.role === 'user' ? 'Ihr' : 'ChatGPT'), text('p', value.text));
        if(item.role==='assistant')bubble.append(evidencePanel(value.evidence));history.append(bubble);
      }
      history.scrollTop = atBottom ? history.scrollHeight : scroll; this.historySignature = signature;
    }
    if (generate && this.configured) this.schedule();
  }
  schedule() {
    if (!this.configured || !this.active()) return;
    if (this.pending) { this.queuedTip = true; return; }
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { if(this.pending){this.queuedTip=true;return;} this.run('tips').catch(error => this.setError(error.message)); }, 1400);
  }
  async run(action, message, extra = {}) {
    if (!this.active()) throw new Error('Bitte melde dich erneut an.');
    if (this.pending) throw new Error('Bitte die laufende Antwort abwarten.');
    if (/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{16,}\b|\bAIza[A-Za-z0-9_-]{25,}\b/.test(message || '')) throw new Error('Bitte API-Schlüssel nur im geschützten Schlüsselfeld hinterlegen.');
    // Explicit entries can be saved without a provider key; the server validates them first.
    if (!this.configured && action === 'tips') { $('ai-settings').open = true; throw new Error('Bitte zuerst den OpenAI-Schlüssel in den Einstellungen hinterlegen.'); }
    const revision = this.revision, signature = JSON.stringify({ action, message, extra });
    if (!this.retry || this.retry.signature !== signature) this.retry = { signature, operationId: crypto.randomUUID() };
    const operationId = this.retry.operationId;
    this.pending = true; clearTimeout(this.timer); this.setError(action === 'clear' ? 'Verlauf wird gelöscht …' : 'Deine Angaben werden geprüft …');
    for (const button of $('ai-form').querySelectorAll('button')) button.disabled = true;
    try {
      const result = await this.client.functions.invoke('abnehmen-ai', { body: { action, message, operationId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, ...extra } });
      if (revision !== this.revision || !this.active()) return;
      if (result.error) {
        let detail; try { detail = await result.error.context?.json(); } catch {}
        throw new Error(detail?.error || 'Der Begleiter konnte nicht antworten. Bitte später erneut versuchen.');
      }
      if (result.data?.error) throw new Error(result.data.error);
      this.retry = null;
      if (result.data?.saved?.saved) await this.onDataSaved?.(result.data.saved);
      else if(result.data?.cached&&action==='chat')await this.onDataSaved?.({recorded_on:null});
      if (revision !== this.revision || !this.active()) return;
      await this.load();
      if (revision !== this.revision || !this.active()) return;
      let status = action === 'clear' ? 'Gemeinsamer Chat und KI-Merkliste gelöscht.' : '';
      if (result.data?.saved?.saved) {
        const saved = result.data.saved, date = new Date(saved.recorded_on + 'T12:00:00').toLocaleDateString('de-DE');
        status = 'Bestätigt gespeichert für den ' + date + (saved.saved_at ? ' · ' + new Date(saved.saved_at).toLocaleString('de-DE') : '') + '.';
      }
      if (result.data?.warning) status += ' ' + result.data.warning;
      // Keep the verified result visible even if the response arrived after a failed chat-history write.
      if (result.data?.reply && ![...$('ai-history').querySelectorAll('p')].some(p => p.textContent === result.data.reply)) {
        const bubble = text('article', '', 'chat-bubble assistant'); bubble.append(text('small', 'ChatGPT'), text('p', result.data.reply),evidencePanel(result.data.evidence)); $('ai-history').append(bubble);
      }
      this.setError(status.trim()); $('ai-history').scrollTop = $('ai-history').scrollHeight;
      return result.data;
    } finally {
      if (revision === this.revision) {
        this.pending = false; for (const button of $('ai-form').querySelectorAll('button')) button.disabled = false;
        if (this.queuedTip) { this.queuedTip = false; this.schedule(); }
      }
    }
  }
}
