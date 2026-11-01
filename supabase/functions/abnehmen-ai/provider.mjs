// Server-only transports. Credentials stay in request headers, never in URLs,
// returned errors, diary content or logs. Exactly one chosen provider is called.
export const MODELS=Object.freeze({openai:'gpt-6-luna',gemini:'gemini-3.1-flash-lite'});
const schema={type:'object',properties:{reply:{type:'string'},tip:{type:'string'},memory:{type:'string'}},required:['reply','tip','memory'],additionalProperties:false};
export async function requestAdvice({provider='openai',key,system,input,fetchImpl=fetch}){
 if(!Object.hasOwn(MODELS,provider)||typeof key!=='string'||!key)throw Error('provider');
 const openai=provider==='openai',model=MODELS[provider];
 const payload=openai?{model,store:false,reasoning:{effort:'none'},max_output_tokens:2600,input:[{role:'system',content:system},{role:'user',content:JSON.stringify(input)}],text:{format:{type:'json_schema',name:'diary_companion',strict:true,schema}}}:{systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:JSON.stringify(input)}]}],generationConfig:{temperature:.3,maxOutputTokens:2600,responseMimeType:'application/json',responseJsonSchema:schema}};
 const response=await fetchImpl(openai?'https://api.openai.com/v1/responses':`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json',...(openai?{Authorization:`Bearer ${key}`}:{'x-goog-api-key':key})},signal:AbortSignal.timeout(45000),body:JSON.stringify(payload)});
 if(!response.ok)return{ok:false,status:response.status};
 const data=await response.json();
 const text=openai?(data.output||[]).flatMap(i=>i.content||[]).filter(i=>i.type==='output_text').map(i=>i.text).join(''):(data.candidates?.[0]?.content?.parts||[]).filter(i=>typeof i.text==='string'&&!i.thought).map(i=>i.text).join('');
 return{ok:true,answer:JSON.parse(text)};
}
