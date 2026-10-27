// supabase-js wraps its SVG QR in a data URL. Normalize both SDK and raw SVG
// responses, encoding the SVG payload exactly once (including # in SVG colors).
export function qrImageSource(value){
  if(typeof value!=='string'||value.length>500000)throw Error('Der QR-Code konnte nicht geladen werden. Bitte die Einrichtung neu starten.');
  let svg=value.trim();
  if(/^data:image\/svg\+xml[^,]*,/i.test(svg)){
    const comma=svg.indexOf(','),header=svg.slice(0,comma),payload=svg.slice(comma+1);
    if(/;base64/i.test(header)){
      if(!/^[A-Za-z0-9+/=\s]+$/.test(payload))throw Error('Ungültiger QR-Code.');
      return svg;
    }
    try{svg=decodeURIComponent(payload);}catch{throw Error('Der QR-Code konnte nicht geöffnet werden. Bitte neu einrichten.');}
  }
  if(!/^<svg[\s>]/i.test(svg))throw Error('Der QR-Code konnte nicht geöffnet werden. Bitte neu einrichten.');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
