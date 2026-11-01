// WebKit needs Blob, object URL and anchor to belong to the top-level document
// for downloads from our retained app frames. Only the explicitly trusted hub
// may provide that realm; an arbitrary embedding page is never used.
export function backupDownloadRealm(currentWindow=window){
 if(currentWindow.self===currentWindow.top)return currentWindow;
 try{
  const parent=currentWindow.parent;
  if(currentWindow.unserZuhauseFrame===true&&parent===currentWindow.top&&parent.location.origin===currentWindow.location.origin&&['/abnehmen/zuhause/','/abnehmen/zuhause/index.html'].includes(parent.location.pathname)&&parent.document.documentElement.dataset.appShell==='unser-zuhause-v1')return parent;
 }catch{}
 throw new Error('Die Sicherung kann nur in der App oder ihrer freigegebenen gemeinsamen Oberfläche heruntergeladen werden.');
}
export function downloadEncryptedBytes(bytes,filename,{isActive=()=>true,currentWindow=window}={}){
 const check=()=>{if(!isActive())throw new DOMException('Der Sicherungsvorgang wurde abgebrochen.','AbortError');};
 check();if(!(bytes instanceof Uint8Array)||bytes.byteLength<64)throw new Error('Die verschlüsselte Sicherungsdatei ist unvollständig.');
 const realm=backupDownloadRealm(currentWindow),name=String(filename).replace(/[\/\\\u0000-\u001f\u007f]/g,'_').slice(0,180);
 if(!name)throw new Error('Der Dateiname der Sicherung fehlt.');
 const blob=new realm.Blob([bytes],{type:'application/octet-stream'}),url=realm.URL.createObjectURL(blob),link=realm.document.createElement('a');
 link.href=url;link.download=name;link.hidden=true;
 try{check();realm.document.body.append(link);check();link.click();return{filename:name,bytes:blob.size};}
 finally{link.remove();realm.setTimeout(()=>realm.URL.revokeObjectURL(url),30000);}
}
