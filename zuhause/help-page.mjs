// Public help works without JavaScript. Enhance table-of-contents navigation
// by opening the chosen native section before the browser scrolls to it.
function revealTopic(){
 if(!/^#hilfe-\d+$/.test(location.hash))return;
 const topic=document.getElementById(location.hash.slice(1));
 if(topic?.matches('details.help-topic')){topic.open=true;topic.scrollIntoView({block:'start',behavior:'auto'});}
}
window.addEventListener('hashchange',revealTopic);
document.addEventListener('click',event=>{
 const anchor=event.target.closest?.('a[href^="#hilfe-"]');
 if(!anchor)return;const topic=document.getElementById(anchor.hash.slice(1));if(topic?.matches('details.help-topic'))topic.open=true;
});
revealTopic();
