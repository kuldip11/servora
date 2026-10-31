import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(new URL("../../apps/website/package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const server = spawn(process.execPath,["apps/web/node_modules/vite/bin/vite.js","--config","website-redesign/product-capture/vite.config.mjs","--host","127.0.0.1","--port","4178"],{stdio:"inherit"});
let browser;
try {
  for(let i=0;i<90;i++){try{const r=await fetch("http://127.0.0.1:4178");if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
  browser=await chromium.launch();
  const page=await browser.newPage();
  page.on("pageerror",e=>{throw e;});
  const out="website-redesign/research/product-captures";await mkdir(out,{recursive:true});
  for(const [view,width] of [["pos",1160],["kitchen",1160],["waiter",440],["customer",440],["billing",580]]){
    await page.setViewportSize({width,height:view==="pos"?720:600});
    await page.goto(`http://127.0.0.1:4178/?view=${view}`,{waitUntil:"networkidle"});
    await page.locator(`[data-capture="${view}"]`).waitFor();
    await page.screenshot({path:`${out}/${view}.png`,fullPage:true});
  }
  await writeFile(`${out}/PROVENANCE.md`,"These are actual imported Servora application components rendered with illustrative fixtures, not authenticated production screenshots. See product-capture/main.tsx for component imports and fixture values. No API requests, real restaurant data or payments are used.\n");
} finally {await browser?.close();server.kill();}
