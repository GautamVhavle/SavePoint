import { chromium } from 'playwright';

const html = `<!doctype html><html><body style="margin:0">
<div style="width:1200px;height:630px;display:flex;color:#F5F7FB;background:linear-gradient(120deg,#080A0F,#101628 55%,#1A1233);padding:64px;position:relative;font-family:Arial,Helvetica,sans-serif;overflow:hidden;box-sizing:border-box">
 <div style="position:absolute;top:-160px;right:-120px;width:480px;height:480px;border-radius:999px;background:radial-gradient(circle,rgba(88,232,255,.22),transparent 65%)"></div>
 <div style="position:absolute;bottom:-180px;left:140px;width:520px;height:520px;border-radius:999px;background:radial-gradient(circle,rgba(167,139,250,.20),transparent 65%)"></div>
 <div style="display:flex;flex-direction:column;justify-content:space-between;flex:1;position:relative">
  <div style="display:flex;align-items:center;gap:18px">
   <div style="width:56px;height:56px;border-radius:18px;background:rgba(88,232,255,.14);border:2px solid rgba(88,232,255,.45);display:flex;align-items:center;justify-content:center;font-size:30px">&#9654;</div>
   <div>
    <div style="font-size:26px;letter-spacing:8px;color:#58E8FF;font-weight:700">SAVEPOINT</div>
    <div style="font-size:22px;color:#8B93A7;margin-top:6px">Your gaming legacy, archived</div>
   </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:18px">
   <div style="font-size:72px;font-weight:800;line-height:1.05">Every save<br/>tells a story.</div>
   <div style="display:flex;gap:16px">
    <div style="display:flex;align-items:center;gap:12px;padding:12px 24px;border-radius:16px;border:2px solid rgba(255,255,255,.14);background:rgba(17,21,31,.72)"><span style="font-size:36px;font-weight:700">RIG</span><span style="font-size:19px;letter-spacing:4px;color:#7F899A">HALL OF FAME</span></div>
    <div style="display:flex;align-items:center;gap:12px;padding:12px 24px;border-radius:16px;border:2px solid rgba(255,255,255,.14);background:rgba(17,21,31,.72)"><span style="font-size:36px;font-weight:700">AI</span><span style="font-size:19px;letter-spacing:4px;color:#7F899A">GUIDE</span></div>
   </div>
  </div>
 </div>
</div>
</body></html>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(html);
await p.screenshot({ path: 'apps/web/public/og-card.png' });
await b.close();
console.log('og-card.png rendered');
