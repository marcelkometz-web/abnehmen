import { localDate } from './domain.mjs';
const endpoint = 'https://kzxzhpebugvzyqfjqedx.supabase.co/functions/v1/recipes-daily';
const key = 'sb_publishable_8-MkCdXRxN-GagE0g4GYrQ_TY3I6RmD';
const element = (tag, text, className) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(className)n.className=className; return n; };
export class DailyRecipes {
  constructor({ client, container }) { this.client=client;this.container=container;this.revision=0;this.day=null;this.data=null;this.pending=false; }
  clear() { ++this.revision;this.day=null;this.data=null;this.pending=false;this.container.replaceChildren();this.container.hidden=true; }
  async load() {
    const day=localDate(),revision=this.revision;
    if(this.day===day&&this.data){this.draw();return;}
    if(this.pending)return;
    this.pending=true;
    try {
      const {data:{session},error}=await this.client.auth.getSession();if(error||!session)throw new Error();
      const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({date:day}),cache:'no-store',signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error();const data=await response.json();
      if(revision!==this.revision)return;
      this.day=day;this.data=data.recipes;this.draw();
    } catch {
      if(revision!==this.revision)return;
      this.container.hidden=false;this.container.replaceChildren(element('h2','Wie wäre es heute mit …?'),element('p','Die Rezeptideen sind gerade nicht erreichbar.','hint'));
      const retry=element('button','Erneut laden','quiet');retry.type='button';retry.onclick=()=>this.load();this.container.append(retry);
    } finally { if(revision===this.revision)this.pending=false; }
  }
  draw() {
    this.container.hidden=false;
    this.container.replaceChildren(element('p','Aus eurer Rezeptsammlung','eyebrow'),element('h2','Wie wäre es heute mit …?'));
    const cards=element('div',undefined,'daily-recipe-grid');
    for(const recipe of this.data||[]){const link=element('a',undefined,'daily-recipe-card');link.href=`/rezepte/?recipe=${encodeURIComponent(recipe.id)}`;link.target='_blank';link.rel='noopener noreferrer';
      link.append(element('span',recipe.emoji||'🍲','daily-recipe-icon'),element('strong',recipe.title),element('small',recipe.kcal==null?'Rezept öffnen':`${Number(recipe.kcal).toLocaleString('de-DE')} kcal pro Portion · Rezept öffnen`));cards.append(link);}
    if(!(this.data||[]).length)cards.append(element('p','In eurer Rezeptsammlung sind noch keine Gerichte vorhanden.'));
    this.container.append(cards,element('p','Jeden Tag zwei neue Ideen. Eure gespeicherten Rezeptangaben bleiben unverändert.','hint'));
  }
}
