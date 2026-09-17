/* Run with Playwright and JSZip installed, or set PLAYWRIGHT_MODULE and JSZIP_MODULE. */
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const JSZip=require(process.env.JSZIP_MODULE||'jszip');
const ROOT=path.resolve(__dirname,'..');
async function main(){
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'block-studio-qa-'));
  try{
    await page.goto(pathToFileURL(path.join(ROOT,'Open-Block-Studio.html')).href);
    await page.locator('#analyse').click();
    await page.locator('#step-map').waitFor({state:'visible'});
    const count=await page.locator('.field-row').count();assert.ok(count>=4,'Expected detected fields');
    await page.screenshot({path:path.join(scratch,'mapping.png'),fullPage:true});
    const heading=(await page.evaluate(()=>BlockStudio.getProject().modules[0])).fields.find(f=>f.label==='Heading');
    assert.ok(heading);
    const mapping=page.frameLocator('#mapping-preview');await mapping.locator('h1').click();
    assert.equal(await mapping.locator('h1').evaluate(e=>getComputedStyle(e).fontSize),'42px','Desktop must not activate the mobile breakpoint');
    await page.waitForFunction(()=>document.getElementById('selected-field-name').textContent==='Heading');
    await page.locator('#edit-field-details').click();
    await page.locator('.field-dialog').getByLabel('Field name',{exact:true}).fill('Headline');
    await page.locator('.field-dialog').getByText('Guidance and limits',{exact:true}).click();
    await page.locator('.field-dialog').getByLabel('Character limit',{exact:true}).fill('100');
    await page.locator('.field-dialog').getByRole('button',{name:'Save field',exact:true}).click();
    await page.locator('#confirm-fields').click();
    await page.locator('#trial-'+heading.id).fill('A fresh start & a new perspective');
    assert.ok((await page.locator('#trial-source').textContent()).includes('A fresh start &amp; a new perspective'));
    await page.locator('#step-try .viewport[data-width="375"]').click();
    assert.equal(await page.locator('#trial-preview').evaluate(e=>e.style.width),'375px');
    await page.waitForFunction(()=>Math.round(document.getElementById('trial-preview').getBoundingClientRect().width)===375);
    assert.equal(await page.frameLocator('#trial-preview').locator('h1').evaluate(e=>getComputedStyle(e).fontSize),'32px','Mobile must activate the responsive CSS');
    await page.locator('#review-export').click();await page.locator('#pages-url').fill('https://example.github.io/blocks/');
    await page.locator('#export-location').selectOption('docs');await page.locator('#acknowledge-review').check();
    assert.equal(await page.locator('#endpoint-value').textContent(),'https://example.github.io/blocks/product-story/');
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#download-module').click()]);
    const zipPath=path.join(scratch,'module.zip');await download.saveAs(zipPath);const zip=await JSZip.loadAsync(await fs.readFile(zipPath));
    for(const name of ['docs/.nojekyll','docs/product-story/index.html','docs/product-story/icon.png','docs/product-story/dragIcon.png','docs/shared-assets/block-studio-1.6.0/blocksdk.js','PUBLISHING.md','block-studio.jarrang.json'])assert.ok(zip.file(name),name);
    assert.ok(!Object.keys(zip.files).some(n=>n.includes('.github/workflows')));
    const definition=JSON.parse(await zip.file('block-studio.jarrang.json').async('string')).modules[0];
    assert.ok(definition.source.includes('Good things start'));assert.ok(!definition.source.includes('A fresh start'));
    const [projectDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#save-project').click()]);await projectDownload.saveAs(path.join(scratch,'project.json'));
    await page.reload();assert.equal((await page.evaluate(()=>BlockStudio.getProject().modules[0])).fields.find(f=>f.id===heading.id).label,'Headline');
    await page.locator('#duplicate-module').click();assert.equal(await page.locator('.module-button').count(),2);
    await page.locator('#project-file').setInputFiles(path.join(scratch,'project.json'));await page.locator('#dialog-confirm').click();assert.equal(await page.locator('.module-button').count(),1);
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Studio should fit narrow viewport');await page.screenshot({path:path.join(scratch,'mobile.png'),fullPage:true});
    console.log('PASS: import, visual selection, field editing, preview, branch ZIP, project save/reopen, narrow viewport');

    // Exercise the unmodified Salesforce SDK with a simulated Content Builder host.
    const host=await context.newPage();host.on('pageerror',e=>errors.push(e.message));
    const origin='https://mc.test.exacttarget.com',moduleOrigin='https://blocks.test';
    const hostHtml=`<!doctype html><html><body><script>
      window.metadata={unrelated:{keep:true}};window.content='';window.writes=[];window.closeAcknowledged=false;
      window.addEventListener('message',event=>{
        if(event.origin!=='${moduleOrigin}')return;const d=event.data;let payload;
        if(d.method==='handShake'){event.source.postMessage({method:'handShake',origin:location.origin},event.origin);return;}
        if(d.method==='getData')payload=window.metadata;
        if(d.method==='getContent')payload=window.content;
        if(d.method==='setContent'){window.content=d.payload;window.writes.push('content');payload=d.payload;}
        if(d.method==='setData'){window.metadata=d.payload;window.writes.push('data');payload=d.payload;}
        if(d.method==='blockReadyToClose'){window.closeAcknowledged=true;return;}
        setTimeout(()=>event.source.postMessage({id:d.id,payload},event.origin),35);
      });
      window.openEditor=function(version){document.querySelector('iframe')?.remove();const f=document.createElement('iframe');f.src='${moduleOrigin}/repository/product-story/'+(version?'?version=2':'');f.style='width:600px;height:950px';document.body.append(f);};
      openEditor();
    </script></body></html>`;
    await host.route(origin+'/**',route=>route.fulfill({contentType:'text/html',body:hostHtml}));
    await host.route(moduleOrigin+'/**',async route=>{
      const url=new URL(route.request().url());let name='docs/'+url.pathname.replace(/^\/repository\//,'');if(name.endsWith('/'))name+='index.html';
      const file=zip.file(name);if(!file)return route.fulfill({status:404,body:'Not found'});
      let body=await file.async('nodebuffer');if(url.searchParams.has('version'))body=Buffer.from(body.toString().replace('"release":"1.0.0"','"release":"2.0.0"'));
      await route.fulfill({body,contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.png')?'image/png':'text/html'});
    });
    await host.goto(origin+'/studio-test');
    await host.waitForFunction(()=>!!window.metadata.studio);
    const frame=host.frameLocator('iframe');await frame.locator('#'+heading.id).fill('Saved headline');
    const bodyField=definition.fields.find(f=>f.label==='Text');await frame.locator('#'+bodyField.id).fill('NEW EYEBROW');
    await host.waitForFunction(({h,b})=>window.metadata.studio.values[h]==='Saved headline'&&window.metadata.studio.values[b]==='NEW EYEBROW',{h:heading.id,b:bodyField.id});
    assert.equal(await host.evaluate(()=>metadata.unrelated.keep),true);
    await host.evaluate(()=>{window.writes=[];openEditor();});
    await frame.locator('#'+heading.id).waitFor();assert.equal(await frame.locator('#'+heading.id).inputValue(),'Saved headline');
    assert.equal(await host.evaluate(()=>writes.length),0,'Reopening must not regenerate content');
    await frame.locator('#'+heading.id).fill('Last edit before closing');
    await host.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({method:'closeBlock',origin:location.origin},'https://blocks.test'));
    await host.waitForFunction(()=>window.closeAcknowledged);assert.equal(await host.evaluate(id=>metadata.studio.values[id],heading.id),'Last edit before closing');
    await host.evaluate(()=>{window.writes=[];openEditor(true);});
    await frame.locator('#status').filter({hasText:'another module version'}).waitFor();assert.equal(await host.evaluate(()=>writes.length),0);
    console.log('PASS: actual SDK handshake, rapid edits, metadata preservation, reopen, close flush, version rejection');
    assert.deepEqual(errors,[]);console.log('QA files:',scratch);
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
