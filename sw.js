// Service worker di Site Manager: l'app si apre anche senza connessione (dati salvati nel dispositivo).
// Pagina: prima la rete (così gli aggiornamenti arrivano subito), con ripiego sulla copia salvata.
const V='sm-v4';
const SHELL=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./logo.png','./jspdf.umd.min.js','./favicon-32.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Pagina dell'app
  if(req.mode==='navigate'&&url.origin===location.origin){
    e.respondWith((async()=>{
      const cache=await caches.open(V);
      const net=fetch(req).then(r=>{if(r&&r.ok)cache.put('./index.html',r.clone());return r;});
      const timeout=new Promise(res=>setTimeout(()=>res(null),4000));
      try{
        const r=await Promise.race([net,timeout.then(async()=>(await cache.match('./index.html'))||net)]);
        return r||net;
      }catch(err){
        return (await cache.match('./index.html'))||Response.error();
      }
    })());
    return;
  }
  // Libreria PDF dal CDN e file dell'app: dalla copia salvata, aggiornata in secondo piano
  if(url.hostname==='cdnjs.cloudflare.com'||url.origin===location.origin){
    e.respondWith((async()=>{
      const cache=await caches.open(V);
      const hit=await cache.match(req,{ignoreSearch:url.origin===location.origin});
      const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))cache.put(req,r.clone());return r;}).catch(()=>null);
      return hit||(await net)||Response.error();
    })());
  }
  // Tutto il resto (Google, Drive) passa direttamente dalla rete
});
