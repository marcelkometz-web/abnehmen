export const THEMES=[
  {id:'rose-bloom',name:'Rosé Bloom',description:'Rosé, Cremeweiß und zarte Blüten',color:'#fff4f8',symbol:'✿'},
  {id:'lavender-dream',name:'Lavendeltraum',description:'Flieder, sanftes Violett und kleine Sterne',color:'#f4efff',symbol:'✧'},
  {id:'cherry-night',name:'Cherry Night',description:'Dunkle Beere, Roségold und ein wenig Glamour',color:'#211426',symbol:'✦'}
];
export function setupThemes(){
  const dialog=document.getElementById('theme-dialog'),choices=document.getElementById('theme-choices');
  let selected='rose-bloom';
  try{const saved=localStorage.getItem('ramonas-progress-theme');if(THEMES.some(theme=>theme.id===saved))selected=saved;}catch{}
  const apply=id=>{
    const theme=THEMES.find(item=>item.id===id)||THEMES[0];selected=theme.id;
    document.documentElement.dataset.theme=theme.id;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content',theme.color);
    document.getElementById('theme-name').textContent=theme.name;
    for(const button of choices.querySelectorAll('[data-design]'))button.setAttribute('aria-pressed',String(button.dataset.design===theme.id));
    const ambient=document.getElementById('theme-ambient');ambient.replaceChildren();
    for(let i=0;i<5;i++){const span=document.createElement('span');span.textContent=i%2?theme.symbol:'✧';ambient.append(span);}
    try{localStorage.setItem('ramonas-progress-theme',theme.id);}catch{}
  };
  for(const theme of THEMES){
    const button=document.createElement('button');button.type='button';button.dataset.design=theme.id;button.className='theme-choice '+theme.id;
    const preview=document.createElement('span');preview.className='theme-preview';preview.textContent=theme.symbol+'  ✧';
    const title=document.createElement('strong');title.textContent=theme.name;
    const description=document.createElement('small');description.textContent=theme.description;
    button.append(preview,title,description);button.addEventListener('click',()=>apply(theme.id));choices.append(button);
  }
  document.getElementById('open-themes').addEventListener('click',()=>dialog.showModal());
  document.getElementById('close-themes').addEventListener('click',()=>dialog.close());
  apply(selected);
}
