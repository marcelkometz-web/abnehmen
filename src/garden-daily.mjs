import { DailyRecipes } from './daily-recipes.mjs';
let widget, client;
globalThis.rgDailyRecipes = ({ client: current, active, view }) => {
  if (!active || view!=='overview') { widget?.clear();document.getElementById('garden-daily-recipes')?.remove();return; }
  const host=document.querySelector('#main-content .overview-content');if(!host)return;
  let box=document.getElementById('garden-daily-recipes');
  if(!box){box=document.createElement('section');box.id='garden-daily-recipes';box.className='daily-suggestions';const hero=host.querySelector('.hero');if(hero)hero.after(box);else host.append(box);}
  if(!widget||client!==current){widget?.clear();client=current;widget=new DailyRecipes({client,container:box});}else widget.container=box;
  widget.load();
};
