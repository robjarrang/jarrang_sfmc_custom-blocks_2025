(function(){
  'use strict';
  const C=window.BlockCore,E=window.BlockExport,$=id=>document.getElementById(id),key='jarrang-block-studio-v1';
  const sample=`<!-- Product story: paste one email module, including its own styles. -->
<style>
@media screen and (max-width: 620px) {
  .story-shell { width: 100% !important; }
  .story-pad { padding: 32px 24px !important; }
  .story-title { font-size: 32px !important; }
}
</style>
<table role="presentation" class="story-shell" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;background-color:#203e33;">
  <tr>
    <td class="story-pad" style="padding:48px 42px;">
      <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;letter-spacing:2px;color:#d2ef8c;">THE NEXT CHAPTER</p>
      <h1 class="story-title" style="margin:0 0 24px;font-family:Georgia,serif;font-weight:normal;font-size:42px;line-height:1.15;color:#ffffff;">Good things start<br>with a fresh perspective.</h1>
      <p style="margin:0 0 30px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#dbe6de;">Discover a collection designed to bring a little more possibility to your everyday.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr><td bgcolor="#d2ef8c" style="padding:15px 24px;">
          <a href="https://example.com/collection" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;line-height:20px;color:#203e33;text-decoration:none;">Explore the collection</a>
        </td></tr>
      </table>
    </td>
  </tr>
</table>`;
  const newModule=(name='Untitled module',source='')=>({id:crypto.randomUUID?.()||'m'+Date.now(),name,slug:C.slug(name),release:'1.0.0',source:'',draftSource:source,contextCss:'',width:600,fields:[],analysed:false,reviewed:false,acknowledged:false,iconColour:'#080043'});
  let project={format:'jarrang-block-studio',version:1,modules:[newModule('Product story',sample)],settings:{name:'',baseUrl:'',location:'root'}};
  let storageWarning='';
  try{const saved=localStorage.getItem(key);if(saved)project=C.assertProject(JSON.parse(saved));}catch{storageWarning='Your previous browser draft could not be loaded. Open a saved project file to recover it.';}
  let currentId=project.modules[0]?.id,step=0,selectedField=null,viewport='desktop',trialValues={},currentHtml='',noticeTimer;
  if(!project.modules.length){project.modules.push(newModule());currentId=project.modules[0].id;}
  project.settings||={};
  const current=()=>project.modules.find(m=>m.id===currentId);
  function tell(message,error=false){clearTimeout(noticeTimer);$('notice').hidden=false;$('notice').textContent=message;$('notice').className='notice'+(error?' error':'');noticeTimer=setTimeout(()=>$('notice').hidden=true,10000);}
  function persist(){
    try{localStorage.setItem(key,JSON.stringify(project));$('save-state').textContent='Saved in this browser';}
    catch{$('save-state').textContent='Save a project file to keep your work';}
  }
  function confirmAction(title,message,action){$('dialog-title').textContent=title;$('dialog-message').textContent=message;$('dialog-confirm').onclick=()=>{$('confirm-dialog').close();action();};$('confirm-dialog').showModal();}
  $('dialog-cancel').onclick=()=>$('confirm-dialog').close();
  function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function projectFileSlug(){return project.settings?.name?.trim()?C.slug(project.settings.name):'block-studio';}
  function renderSidebar(){
    $('project-name').value=project.settings?.name||'';
    document.title=(project.settings?.name?project.settings.name+' · ':'')+'Block Studio · Jarrang';
    $('module-list').replaceChildren();
    project.modules.forEach(m=>{const b=document.createElement('button');b.className='module-button'+(m.id===currentId?' active':'');b.innerHTML='<span class="module-icon" aria-hidden="true">▤</span><span><span class="name"></span><span class="meta"></span></span>';b.querySelector('.name').textContent=m.name;b.querySelector('.meta').textContent=m.reviewed?m.fields.filter(f=>f.enabled).length+' editable fields':'Draft module';b.onclick=()=>{currentId=m.id;step=m.analysed?1:0;selectedField=null;trialValues={};render();};$('module-list').append(b);});
  }
  function setStep(next){
    const m=current();if(next>0&&(!m.analysed||m.draftSource!==m.source)){tell('Find editable content first so the mappings match your current HTML.',true);return;}
    step=next;render();
  }
  function render(){
    const m=current();renderSidebar();$('module-title').textContent=m.name;$('module-status').textContent=m.reviewed?'Fields reviewed':'Draft';$('module-status').className='pill'+(m.reviewed?' good':'');
    document.querySelectorAll('.step').forEach(b=>{const n=Number(b.dataset.step);b.classList.toggle('active',n===step);b.classList.toggle('done',n<step);b.setAttribute('aria-current',n===step?'step':'false');});
    ['import','map','try','export'].forEach((id,i)=>$('step-'+id).hidden=i!==step);
    if(step===0){$('module-name').value=m.name;$('source-html').value=m.draftSource;$('context-css').value=m.contextCss||'';$('email-width').value=m.width||600;$('source-size').textContent=m.draftSource.length.toLocaleString('en-GB')+' characters';}
    if(step===1){renderFields();renderMapping();}
    if(step===2){renderTrial();}
    if(step===3){renderExport();}
  }
  function analyse(){
    const m=current(),source=$('source-html').value;
    if(!source.trim()){tell('Paste your email module or choose an HTML file.',true);return;}
    if(source.length>2000000){tell('Choose a module smaller than 2 MB.',true);return;}
    const run=()=>{const result=C.infer(source),controls=m.fields.filter(f=>f.binding==='template');m.source=source;m.draftSource=source;m.fields=[...result.fields,...controls];m.analysed=true;m.reviewed=false;m.acknowledged=false;selectedField=m.fields[0]?.id;trialValues={};persist();step=1;render();tell(result.fields.length+' suggested fields. Review what should be editable.');};
    if(m.analysed&&m.source!==source)confirmAction('Replace the existing mappings?','The HTML has changed. Re-analysing replaces this module’s field names, rules and mappings. Save a project copy first if you need to keep them.',run);else if(m.analysed){step=1;render();}else run();
  }
  function moveField(id,target){
    const m=current(),from=m.fields.findIndex(f=>f.id===id);
    if(from<0||target<0||target>=m.fields.length||from===target)return;
    const [field]=m.fields.splice(from,1);m.fields.splice(target,0,field);selectedField=id;
    fieldChanged();renderFields();renderMapping();
    $('field-list').querySelectorAll('.field-drag-handle')[target]?.focus();
    tell(field.label+' moved to position '+(target+1)+' of '+m.fields.length+'.');
  }
  function renderFields(){
    const m=current();if(!m.fields.some(f=>f.id===selectedField))selectedField=m.fields[0]?.id||null;$('field-count').textContent=m.fields.length+(m.fields.length===1?' field':' fields');$('field-list').replaceChildren();
    if(!m.fields.length)$('field-list').innerHTML='<div class="empty-fields"><strong>No simple editable fields found.</strong>The source may contain only layout or personalisation. You can export it as a fixed block, or import a simpler module.</div>';
    let draggedId=null;
    const clearDrop=()=>$('field-list').querySelectorAll('.field-row').forEach(r=>r.classList.remove('drop-before','drop-after','dragging'));
    m.fields.forEach((f,index)=>{
      const row=document.createElement('div');row.className='field-row'+(f.id===selectedField?' active':'');
      const button=document.createElement('button');button.className='field-select';const title=document.createElement('strong'),sub=document.createElement('span');title.textContent=f.label;sub.textContent=f.type==='list'?'Repeatable list · '+f.defaultValue.length+' starting items':f.type==='toggle'?'Show/hide section':f.type==='richtext'?C.decode(f.defaultValue.replace(/<[^>]*>/g,'')):f.defaultValue||'Empty value';button.append(title,sub);button.onclick=()=>{selectedField=f.id;renderFields();renderMapping();};
      const remove=document.createElement('button');remove.className='field-edit-shortcut';remove.setAttribute('aria-label','Edit '+f.label);remove.textContent='Edit';remove.onclick=e=>{e.stopPropagation();selectedField=f.id;editField(f);};
      const handle=document.createElement('button');handle.type='button';handle.className='field-drag-handle';handle.draggable=true;
      handle.setAttribute('aria-label','Reorder '+f.label);handle.title='Drag to reorder. Or focus and use Up / Down arrow keys.';
      handle.innerHTML='<svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="5" r="1.4"/><circle cx="11" cy="5" r="1.4"/><circle cx="5" cy="10" r="1.4"/><circle cx="11" cy="10" r="1.4"/><circle cx="5" cy="15" r="1.4"/><circle cx="11" cy="15" r="1.4"/></svg>';
      handle.disabled=m.fields.length<2;
      handle.onkeydown=e=>{if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();moveField(f.id,e.key==='Home'?0:e.key==='End'?m.fields.length-1:index+(e.key==='ArrowUp'?-1:1));}};
      handle.ondragstart=e=>{draggedId=f.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',f.id);row.classList.add('dragging');};
      handle.ondragend=()=>{draggedId=null;clearDrop();};
      row.ondragover=e=>{if(!draggedId||draggedId===f.id)return;e.preventDefault();e.dataTransfer.dropEffect='move';const after=e.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;clearDrop();row.classList.add(after?'drop-after':'drop-before');};
      row.ondragleave=e=>{if(!row.contains(e.relatedTarget))row.classList.remove('drop-before','drop-after');};
      row.ondrop=e=>{if(!draggedId)return;e.preventDefault();const id=draggedId,from=m.fields.findIndex(x=>x.id===id),after=e.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;draggedId=null;clearDrop();if(id===f.id)return;const insertion=index+(after?1:0);moveField(id,insertion-(from<insertion?1:0));};
      button.setAttribute('aria-expanded',String(f.id===selectedField));
      row.append(handle,button,remove);
      if(f.id===selectedField){
        const details=document.createElement('div');details.className='field-row-details';
        const info=document.createElement('div');info.className='field-row-info';
        const type=document.createElement('span');type.className='field-kind';type.textContent=window.BlockFieldCatalog.types.find(t=>t.id===f.type)?.name||f.type;
        const connection=document.createElement('span');connection.className='field-location';connection.textContent=window.BlockFieldEditor.connectionText(m,f);
        info.append(type,connection);
        const discard=document.createElement('button');discard.type='button';discard.className='field-remove';discard.textContent='Remove';discard.setAttribute('aria-label','Remove '+f.label);discard.title='Remove this editable field';discard.onclick=()=>deleteField(f.id);
        details.append(info,discard);row.append(details);
      }
      $('field-list').append(row);
    });
  }
  function deleteField(id){
    const m=current(),f=m.fields.find(x=>x.id===id);if(!f)return;
    confirmAction('Delete '+f.label+'?',f.binding==='template'?'This removes the control. Update any references to '+f.key+' in Template code before exporting.':'This removes the field and its mapping. The source HTML remains in place and this control is no longer editable.',()=>{
      m.fields=m.fields.filter(x=>x.id!==id);m.reviewed=false;m.acknowledged=false;
      if(selectedField===id)selectedField=m.fields[0]?.id||null;
      persist();renderFields();renderMapping();tell('Field deleted.');
    });
  }
  function fieldChanged(){current().reviewed=false;current().acknowledged=false;trialValues={};persist();renderSidebar();$('module-status').textContent='Draft';$('module-status').className='pill';}
  function editField(field,initialType,draftModule){
    const target=current();
    window.BlockFieldEditor.open(draftModule||target,field,saved=>{
      if(draftModule)Object.assign(target,draftModule);
      const index=target.fields.findIndex(f=>f.id===saved.id);if(index<0)target.fields.push(saved);else target.fields[index]=saved;
      if(saved.binding==='template')target.templateMode=true;selectedField=saved.id;fieldChanged();renderFields();renderMapping();tell('Field saved. Try the editor to check it in your module.');
    },initialType);
  }
  function chooseField(){
    window.BlockFieldEditor.choose(current(),(field,draft,type)=>editField(field,type,draft),()=>{
      setPreviewMode('html');document.querySelector('.advanced-tools').open=true;
      tell('Select the exact value or complete element in the HTML, then choose Add field from code selection.');
    });
  }
  function previewDocument(source,interactive=false){
    let html=source;const m=current();
    if(interactive){
      const nodes=C.parse(source).nodes.filter(n=>!n.hidden),edits=[];
      const aliases=new Map();
      for(const match of source.matchAll(/{%\s*for\s+(\w+)\s+in\s+([\w.]+)\s*%}/g))aliases.set(match[1],match[2].split('.')[0]);
      for(const n of nodes){
        if(['html','head','body','script','style','meta','link','title'].includes(n.tag))continue;
        const fragment=source.slice(n.start,n.end),refs=[];
        if(m.templateMode)for(const token of fragment.matchAll(/{{([\s\S]*?)}}|{%([\s\S]*?)%}/g)){
          const expression=(token[1]||token[2]).replace(/"[^"\n]*"|'[^'\n]*'/g,'');
          for(const word of expression.matchAll(/\b[a-zA-Z_]\w*(?:\.\w+)*/g)){const key=word[0].split('.')[0];refs.push(aliases.get(key)||key);}
        }
        const ids=m.fields.filter(f=>f.enabled&&(f.targets.some(t=>t.nodeId===n.id)||(m.templateMode&&refs.includes(f.key||f.id)))).map(f=>f.id);
        if(!ids.length)continue;
        const at=n.startEnd-(/\/\s*>$/.test(source.slice(n.start,n.startEnd))?2:1);
        edits.push({start:at,end:at,value:' data-studio-fields="'+C.escape(JSON.stringify(ids))+'" data-studio-editable=""'+(ids.includes(selectedField)?' data-studio-selected=""':'')});
      }
      if(m.templateMode){const draft=JSON.parse(JSON.stringify(m));C.rebase(draft,edits);html=C.render(draft);}
      else for(const edit of edits.sort((a,b)=>b.start-a.start))html=html.slice(0,edit.start)+edit.value+html.slice(edit.end);
    }
    const doc=new DOMParser().parseFromString(html,'text/html');
    doc.querySelectorAll('script,iframe,object,embed,base,meta,link,form').forEach(n=>{if(n.tagName==='FORM')n.replaceWith(...n.childNodes);else n.remove();});
    doc.querySelectorAll('*').forEach(n=>{[...n.attributes].forEach(a=>{if(/^on/i.test(a.name)||a.name==='srcdoc'||a.name==='nonce'||(a.name==='href'&&/^javascript:/i.test(a.value)))n.removeAttribute(a.name);});});
    const style=doc.createElement('style');style.textContent='html,body{margin:0;padding:0;min-height:100%;}body{overflow-wrap:break-word;}'+(m.contextCss||'');doc.head.append(style);
    const shell=doc.createElement('div');shell.style.cssText='width:'+(Number(m.width)||600)+'px;max-width:100%;margin:0 auto;';shell.append(...doc.body.childNodes);doc.body.append(shell);
    const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; script-src "+(interactive?"'nonce-studio-preview'":"'none'")+";";doc.head.prepend(csp);
    if(interactive){
      const highlights=doc.createElement('style');highlights.textContent='[data-studio-editable]{outline:1px dashed #59dbca;outline-offset:4px;cursor:pointer}[data-studio-editable]:hover,[data-studio-selected]{outline:2px solid #080043!important;outline-offset:5px!important}';doc.head.append(highlights);
      const script=doc.createElement('script');script.setAttribute('nonce','studio-preview');script.textContent="document.addEventListener('click',function(e){e.preventDefault();var target=e.target.nodeType===1?e.target:e.target.parentElement;var n=target&&target.closest('[data-studio-fields]');if(n)parent.postMessage({studioFields:JSON.parse(n.dataset.studioFields)},'*')});function size(){parent.postMessage({studioHeight:document.documentElement.scrollHeight},'*')}window.addEventListener('load',size);new ResizeObserver(size).observe(document.body);";doc.body.append(script);
    }
    return '<!doctype html>'+doc.documentElement.outerHTML;
  }
  function frameWidth(){return viewport==='desktop'?Math.max(800,(Number(current().width)||600)+160):375;}
  function setFrame(id,html){
    // browsers can leave a sandboxed iframe blank when it's reused after being hidden; force a fresh load
    const frame=$(id);frame.removeAttribute('srcdoc');frame.srcdoc=html;
  }
  function sourceFieldRanges(module){
    const ranges=[],source=module.source,fields=module.fields.filter(f=>f.enabled);
    const add=(start,end,id)=>{if(Number.isInteger(start)&&Number.isInteger(end)&&start>=0&&end>start&&end<=source.length)ranges.push({start,end,id});};
    fields.forEach(f=>(f.targets||[]).forEach(t=>add(t.start,t.end,f.id)));
    if(module.templateMode){
      const scopes=[];
      for(const token of source.matchAll(/{{[\s\S]*?}}|{%[\s\S]*?%}/g)){
        const expression=token[0].slice(2,-2).replace(/"[^"\n]*"|'[^'\n]*'/g,'');
        if(/^\s*endfor\b/.test(expression)){scopes.pop();continue;}
        const loop=expression.match(/^\s*for\s+(\w+)\s+in\s+([\w.]+)/);
        const resolve=name=>{for(let i=scopes.length-1;i>=0;i--)if(scopes[i].alias===name)return scopes[i].root;return name;};
        const names=loop?[loop[2]]:(expression.match(/[A-Za-z_]\w*(?:\.\w+)*/g)||[]);
        const roots=new Set(names.map(name=>resolve(name.split('.')[0])));
        fields.filter(f=>roots.has(f.key||f.id)).forEach(f=>add(token.index,token.index+token[0].length,f.id));
        if(loop)scopes.push({alias:loop[1],root:resolve(loop[2].split('.')[0])});
      }
    }
    return ranges;
  }
  function sourceLoopRanges(module){
    if(!module.templateMode)return [];
    const stack=[],loops=[];
    for(const token of module.source.matchAll(/{%\s*(for\s+(\w+)\s+in\s+([\w.]+)[\s\S]*?|endfor)\s*%}/g)){
      if(token[1]==='endfor'){
        const loop=stack.pop();if(loop){loop.end=token.index+token[0].length;loops.push(loop);}
      }else{
        const root=token[3].split('.')[0],parent=[...stack].reverse().find(l=>l.alias===root);
        const key=parent?parent.key:root,field=module.fields.find(f=>f.enabled&&(f.key||f.id)===key);
        stack.push({start:token.index,alias:token[2],key,label:field?.label||token[3]});
      }
    }
    return loops.sort((a,b)=>a.start-b.start);
  }
  function renderSourceMapping(){
    const pre=$('mapping-source'),module=current(),ranges=sourceFieldRanges(module),loops=sourceLoopRanges(module);
    const boundaries=[...new Set([0,module.source.length,...ranges.flatMap(r=>[r.start,r.end]),...loops.flatMap(r=>[r.start,r.end])])].sort((a,b)=>a-b);
    const fragment=document.createDocumentFragment(),containers=[{element:fragment,end:module.source.length+1}];
    for(let i=0;i<boundaries.length-1;i++){
      const start=boundaries[i],end=boundaries[i+1],text=module.source.slice(start,end);
      while(containers.length>1&&containers[containers.length-1].end<=start)containers.pop();
      for(const loop of loops.filter(l=>l.start===start)){
        const wrapper=document.createElement('span');wrapper.className='source-loop';
        wrapper.dataset.loopLabel='Repeat: '+loop.label+' · one item per pass';
        wrapper.dataset.loopEnd='End repeat: '+loop.label;
        wrapper.setAttribute('role','group');wrapper.setAttribute('aria-label','Repeating section: '+loop.label);
        containers[containers.length-1].element.append(wrapper);containers.push({element:wrapper,end:loop.end});
      }
      const container=containers[containers.length-1].element;
      const ids=[...new Set(ranges.filter(r=>r.start<=start&&r.end>=end).sort((a,b)=>(a.end-a.start)-(b.end-b.start)).map(r=>r.id))];
      if(!ids.length){container.append(document.createTextNode(text));continue;}
      const span=document.createElement('span');span.textContent=text;span.className='source-field';span.dataset.fields=JSON.stringify(ids);
      const label=ids.map(id=>module.fields.find(f=>f.id===id).label).join(', ');
      span.title='Select field: '+label;span.setAttribute('aria-label','Select field: '+label);span.setAttribute('role','button');span.tabIndex=0;
      span.classList.toggle('selected',ids.includes(selectedField));span.setAttribute('aria-pressed',String(ids.includes(selectedField)));container.append(span);
    }
    pre.replaceChildren(fragment);
  }
  function selectSourceField(event){
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    if(event.type==='click'&&!window.getSelection()?.isCollapsed)return;
    const span=event.target.closest('.source-field');if(!span)return;
    event.preventDefault();
    const ids=JSON.parse(span.dataset.fields),index=ids.indexOf(selectedField);
    selectedField=ids[(index+1)%ids.length];
    // Keep the code DOM intact so keyboard focus and scroll position are retained.
    renderFields();
    $('mapping-source').querySelectorAll('.source-field').forEach(node=>{
      const active=JSON.parse(node.dataset.fields).includes(selectedField);
      node.classList.toggle('selected',active);node.setAttribute('aria-pressed',String(active));
    });
    setFrame('mapping-preview',previewDocument(current().source,true));
    tell('Selected '+current().fields.find(f=>f.id===selectedField).label+'. Choose Edit to change its settings.');
  }
  function renderMapping(){
    $('mapping-preview').style.width=frameWidth()+'px';try{setFrame('mapping-preview',previewDocument(current().source,true));}catch(e){setFrame('mapping-preview','');tell(e.message,true);}renderSourceMapping();
    const warnings=C.inspect(current());$('mapping-warnings').hidden=!warnings.length;$('mapping-warnings').replaceChildren();
    if(warnings.length){const strong=document.createElement('strong');strong.textContent='Review these dependencies';const ul=document.createElement('ul');warnings.forEach(w=>{const li=document.createElement('li');li.textContent=w;ul.append(li);});$('mapping-warnings').append(strong,ul);}
  }
  function sourceOffset(pre,node,offset){
    if(node!==pre&&!pre.contains(node))return null;
    const range=document.createRange();range.selectNodeContents(pre);
    try{range.setEnd(node,offset);return range.toString().length;}catch{return null;}
  }
  function selectedSourceRange(){
    const pre=$('mapping-source'),selection=window.getSelection();
    if(!selection||selection.rangeCount===0||selection.isCollapsed)return null;
    const range=selection.getRangeAt(0);
    const start=sourceOffset(pre,range.startContainer,range.startOffset),end=sourceOffset(pre,range.endContainer,range.endOffset);
    if(start===null||end===null)return null;
    return start<end?{start,end}:{start:end,end:start};
  }
  function addManualField(){
    const m=current();
    if($('mapping-source').hidden){setPreviewMode('html');tell('Select the exact HTML text, an attribute value, or a whole element (its opening to closing tag) to add a show/hide toggle, then choose Add field from code selection again.');return;}
    const range=selectedSourceRange();
    if(!range){tell('Select text in the HTML view first. For attributes, select only the value inside the quotes. To add a show/hide toggle, select a complete element from its opening to closing tag.',true);return;}
    try{
      const manual=C.manualField(m.source,range.start,range.end,m.fields),nextNumber=m.fields.reduce((max,f)=>{const match=String(f.id).match(/^field(\d+)$/);return match?Math.max(max,Number(match[1])):max;},0)+1;
      manual.id='field'+nextNumber;editField(manual);
    }catch(error){tell(error.message,true);}
  }
  window.addEventListener('message',e=>{
    if(e.source!==$('mapping-preview').contentWindow)return;
    if(e.data?.studioHeight)$('mapping-preview').style.height=Math.min(3000,Math.max(360,Number(e.data.studioHeight)))+'px';
    if(Array.isArray(e.data?.studioFields)){const fields=current().fields.filter(f=>f.enabled&&e.data.studioFields.includes(f.id));if(fields.length){const next=fields.find(f=>f.id!==selectedField)||fields[0];selectedField=next.id;renderFields();renderMapping();tell('Selected '+next.label+'. Choose Edit to change its settings.');}else tell('This region is fixed layout or protected content. Select one of the highlighted editable regions.');}
  });
  function updateThemePreview(){
    $('editor-theme-preview').textContent=window.BlockExport.themeCSS(current(),'#trial-fields');
    $('theme-feedback').textContent=window.BlockExport.themeProblems(current()).join(' ');
  }
  function renderThemeSettings(){
    const m=current(),enabled=!!m.editorTheme,values=window.BlockExport.editorTheme(m);
    $('theme-enabled').checked=enabled;$('theme-options').hidden=!enabled;$('theme-options').replaceChildren();
    for(const [key,title] of Object.entries({accent:'Accent and buttons',background:'Form background',text:'Text and borders',field:'Field background'})){
      const row=document.createElement('div');row.className='theme-colour-row';
      const label=document.createElement('label');label.textContent=title;label.htmlFor='theme-'+key;
      const picker=document.createElement('input');picker.type='color';picker.id='theme-'+key;picker.value=values[key];
      const hex=document.createElement('input');hex.type='text';hex.value=values[key];hex.maxLength=7;hex.setAttribute('aria-label',title+' hex value');hex.spellcheck=false;
      const save=value=>{m.editorTheme={...window.BlockExport.editorTheme(m),[key]:value};persist();updateThemePreview();};
      picker.oninput=()=>{hex.value=picker.value;hex.setCustomValidity('');hex.removeAttribute('aria-invalid');save(picker.value);};
      hex.oninput=()=>{const valid=/^#[a-f0-9]{6}$/i.test(hex.value);hex.setCustomValidity(valid?'':'Enter a six-digit hex colour, for example #080043.');hex.setAttribute('aria-invalid',String(!valid));if(valid){picker.value=hex.value;save(hex.value);}};
      hex.onblur=()=>{if(!hex.checkValidity()){hex.value=window.BlockExport.editorTheme(m)[key];hex.setCustomValidity('');hex.removeAttribute('aria-invalid');tell('The colour was not saved. Enter # followed by six hexadecimal characters.',true);}};
      row.append(label,picker,hex);$('theme-options').append(row);
    }
    updateThemePreview();
  }
  function renderTrial(){
    const m=current();$('trial-title').textContent=m.name;renderThemeSettings();
    window.BlockControls.mount($('trial-fields'),m.fields.filter(f=>f.enabled),trialValues,(f,value)=>{trialValues[f.id]=value;renderTrialPreview();},{prefix:'trial-'});
    if(!m.fields.some(f=>f.enabled))$('trial-fields').innerHTML='<p class="empty-fields">This is a fixed block.</p>';
    renderTrialPreview();
  }
  function renderTrialPreview(){
    try{currentHtml=C.render(current(),trialValues);$('trial-source').textContent=currentHtml;$('trial-preview').style.width=frameWidth()+'px';$('trial-preview').style.height='530px';setFrame('trial-preview',previewDocument(currentHtml));}
    catch(e){tell(e.message,true);}
  }
  function renderExport(){
    const m=current();$('module-slug').value=m.slug;$('module-release').value=m.release;$('pages-url').value=project.settings?.baseUrl||'';$('export-location').value=project.settings?.location||'root';$('icon-colour').value=m.iconColour||'#080043';$('acknowledge-review').checked=!!m.acknowledged;updateExportChecks();
  }
  function updateExportChecks(){
    const m=current();$('endpoint-value').textContent=E.endpoint(m,project.settings?.baseUrl);$('export-checklist').replaceChildren();
    const warnings=C.inspect(m),errors=E.problems(m).filter(e=>!e.startsWith('Confirm that'));
    const items=[{good:m.reviewed,title:m.reviewed?'Editable fields reviewed':'Editable fields need review',detail:m.fields.filter(f=>f.enabled).length+' fields enabled. Other content remains fixed.'},{good:true,title:'Source structure retained',detail:'Only configured values, conditions and loops change the output.'},{good:!errors.length,title:errors.length?'Resolve export issues':'Static package can be generated',detail:errors.length?errors.join(' '):'Individual editor, icons and local SDK dependencies.'}];
    if(warnings.length)items.push({warn:true,title:'Source dependencies to review',detail:warnings.join(' ')});
    items.forEach(item=>{const div=document.createElement('div');div.className='export-checklist-item';const symbol=document.createElement('span');symbol.className='check-symbol'+(item.warn?' warn':item.good?'':' fail');symbol.textContent=item.warn?'!':item.good?'✓':'!';const copy=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p');title.textContent=item.title;detail.textContent=item.detail;copy.append(title,detail);div.append(symbol,copy);$('export-checklist').append(div);});
    $('checks-summary').textContent=errors.length?'NEEDS ATTENTION':'PACKAGE CHECKED';$('download-module').disabled=!!E.problems(m).length;
  }
  async function exportModules(all=false){
    const modules=all?project.modules:[current()],button=all?$('export-all'):$('download-module');
    const errors=modules.flatMap(m=>E.problems(m).map(e=>m.name+': '+e));
    if(errors.length){tell(errors[0],true);if(!all){step=3;render();}return;}
    button.disabled=true;const previous=button.textContent;button.textContent='Preparing ZIP…';
    try{const blob=await E.build(project,modules,project.settings||{});download(blob,all?projectFileSlug()+'-sfmc-modules.zip':current().slug+'-sfmc.zip');tell('Your export is ready. Publishing instructions are included in the ZIP.');}
    catch(e){tell(e.message,true);}finally{button.textContent=previous;button.disabled=false;}
  }
  function addModule(){const m=newModule();project.modules.push(m);currentId=m.id;step=0;selectedField=null;trialValues={};persist();render();$('module-name').focus();$('module-name').select();}
  function repeatSelected(){
    if($('mapping-source').hidden){$('show-map-source').click();tell('Select one complete list item, card or row, then choose Repeat code selection.');return;}
    const range=selectedSourceRange();if(!range){tell('Select a complete element in the HTML view.',true);return;}
    try{const draft=JSON.parse(JSON.stringify(current())),list=C.repeatSelection(draft,range.start,range.end);editField(list,undefined,draft);}catch(e){tell(e.message,true);}
  }
  function templateCode(){
    const m=current(),dialog=document.createElement('dialog');dialog.className='template-dialog';dialog.innerHTML='<h2>Template code</h2><p class="help">Logic runs in the editor. SFMC receives the rendered HTML. Existing source mappings are rebuilt when you apply code changes; named template controls are retained.</p><div class="template-code-grid"><div><label for="template-source">Email template</label><textarea id="template-source" class="code-editor" spellcheck="false"></textarea></div><aside><h3>Available values</h3><div id="template-keys"></div><h3>Supported syntax</h3><pre class="template-snippet">{% if show_cta %}\n  …\n{% else %}\n  …\n{% endif %}\n\n{% for item in items %}\n  {{ item.text }}\n{% endfor %}</pre><p class="help">Also supports elsif, comparisons, and/or/not, forloop.index and block_id. Use | richtext for sanitised formatting. This is a defined subset, not full Liquid.</p></aside></div><div id="template-error" class="field-editor-errors" role="alert"></div><div class="dialog-actions"><button id="template-cancel" class="button secondary">Cancel</button><button id="template-save" class="button primary">Apply template</button></div>';
    document.body.append(dialog);$('template-source').value=m.source;
    m.fields.forEach(f=>{const line=document.createElement('p');line.className='help';line.textContent=(f.key||f.id)+' · '+f.type+(f.type==='list'?' · item fields: '+f.itemFields.map(c=>c.key).join(', '):'');$('template-keys').append(line);});
    $('template-cancel').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();
    $('template-save').onclick=()=>{
      try{const source=$('template-source').value;window.BlockLogic.compile(source);
        if(source!==m.source){const controls=m.fields.filter(f=>f.binding==='template');
          // Retain mapped fields explicitly referenced by the new template as named controls.
          m.fields.filter(f=>f.binding!=='template').forEach(f=>{const key=f.key||f.id;if(new RegExp('(?:\\{[%{]\\s*[^}]*?)\\b'+key+'\\b').test(source))controls.push({...f,key,binding:'template',targets:[]});});
          const inferred=C.infer(source).fields;const used=new Set(controls.map(f=>f.id));inferred.forEach(f=>{while(used.has(f.id))f.id+='x';used.add(f.id);});m.source=source;m.draftSource=source;m.fields=[...inferred,...controls];}
        m.templateMode=true;fieldChanged();selectedField=m.fields[0]?.id;dialog.close();renderFields();renderMapping();tell('Template applied. Review its controls and test both conditional branches.');
      }catch(e){$('template-error').textContent=e.message;}
    };dialog.showModal();
  }
  function logicExample(){
    const m=newModule('Conditional list example');m.templateMode=true;m.analysed=true;
    m.source=`<table role="presentation" width="600" style="width:100%;max-width:600px;background-color:{{ background }};"><tr><td style="padding:32px;font-family:Arial,sans-serif;">
{% if show_title %}<h2>{{ title }}</h2>{% endif %}
{% if layout == "detailed" %}<p>Here are the highlights:</p>{% else %}<p>A quick look:</p>{% endif %}
<ul>{% for bullet in bullets %}<li>{{ bullet.text }}</li>{% else %}<li>More details coming soon.</li>{% endfor %}</ul>
{% if show_cta %}<p><a href="{{ cta_url }}">{{ cta_label }}</a></p>{% endif %}
</td></tr></table>`;m.draftSource=m.source;
    const add=(type,key,label,value)=>{const f=C.templateField(m,type,label);f.key=key;f.defaultValue=value;m.fields.push(f);return f;};
    add('colour','background','Background colour','#ffffff');add('toggle','show_title','Show title','shown');add('text','title','Title','Made for your next project');const layout=add('select','layout','Content style','detailed');layout.options=[{label:'Detailed',value:'detailed'},{label:'Compact',value:'compact'}];
    const list=add('list','bullets','Bullet points',[{text:'A flexible first benefit'},{text:'Another reason to get started'}]);list.maxItems=8;
    add('toggle','show_cta','Show button','shown');add('text','cta_label','Button text','Explore more');add('url','cta_url','Button destination','https://example.com/');
    project.modules.push(m);currentId=m.id;step=1;selectedField=m.fields[0].id;trialValues={};persist();render();tell('Example added: colour, dropdown, if/else, show/hide and a repeatable list.');
  }
  $('add-template-control').onclick=chooseField;
  $('repeat-selection').onclick=repeatSelected;$('template-code').onclick=templateCode;$('logic-example').onclick=logicExample;
  document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>setStep(Number(b.dataset.step)));
  function setPreviewMode(mode){
    const html=mode==='html';
    if(!html)viewport=mode;
    for(const [source,canvas,button] of [['mapping-source','mapping-canvas','show-map-source'],['trial-source','trial-canvas','show-output']]){
      $(source).hidden=!html;$(canvas).hidden=html;
      $(button).classList.toggle('active',html);$(button).setAttribute('aria-pressed',String(html));
    }
    document.querySelectorAll('.viewport').forEach(button=>{
      const active=!html&&button.dataset.width===viewport;
      button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    });
    if(!html){if(step===1)renderMapping();if(step===2)renderTrialPreview();}
  }
  document.querySelectorAll('.viewport').forEach(b=>b.onclick=()=>setPreviewMode(b.dataset.width));
  $('module-name').oninput=e=>{const m=current(),old=m.name;m.name=e.target.value||'Untitled module';if(m.slug===C.slug(old))m.slug=C.slug(m.name);$('module-title').textContent=m.name;persist();renderSidebar();};
  $('source-html').oninput=e=>{current().draftSource=e.target.value;current().acknowledged=false;$('source-size').textContent=e.target.value.length.toLocaleString('en-GB')+' characters';persist();};
  $('context-css').oninput=e=>{current().contextCss=e.target.value;current().acknowledged=false;persist();};
  $('email-width').onchange=e=>{current().width=Math.min(1200,Math.max(280,Number(e.target.value)||600));e.target.value=current().width;persist();};
  $('analyse').onclick=analyse;$('sample-button').onclick=()=>{const use=()=>{current().draftSource=sample;$('source-html').value=sample;persist();render();};if(current().draftSource&&current().draftSource!==sample)confirmAction('Replace the HTML?','This replaces the HTML in the import box with the example module.',use);else use();};
  $('upload-html').onclick=()=>$('html-file').click();$('html-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>2000000){tell('Choose an HTML module smaller than 2 MB.',true);return;}const text=await file.text();const use=()=>{const m=current();m.draftSource=text;if(m.name==='Untitled module'||(!m.analysed&&m.draftSource!==sample)){m.name=file.name.replace(/\.html?$/i,'').replace(/[-_]/g,' ');m.slug=C.slug(m.name);}persist();render();tell('HTML imported. Find editable content to continue.');};if(current().analysed)confirmAction('Replace this module’s HTML?','Existing mappings will be replaced when you analyse the new HTML.',use);else use();e.target.value='';};
  $('add-manual-field').onclick=addManualField;$('confirm-fields').onclick=()=>{current().reviewed=true;persist();setStep(2);};$('review-export').onclick=()=>setStep(3);$('reset-values').onclick=()=>{trialValues={};renderTrial();};
  $('mapping-source').addEventListener('click',selectSourceField);
  $('mapping-source').addEventListener('keydown',selectSourceField);
  $('theme-enabled').onchange=e=>{if(e.target.checked)current().editorTheme=window.BlockExport.editorTheme(current());else delete current().editorTheme;persist();renderThemeSettings();};
  $('theme-reset').onclick=()=>{delete current().editorTheme;persist();renderThemeSettings();};
  $('show-map-source').onclick=()=>setPreviewMode('html');$('show-output').onclick=()=>setPreviewMode('html');
  $('module-slug').oninput=e=>{current().slug=e.target.value;persist();updateExportChecks();};$('module-release').oninput=e=>{current().release=e.target.value;persist();updateExportChecks();};
  $('project-name').oninput=e=>{project.settings||={};project.settings.name=e.target.value;persist();document.title=(e.target.value?e.target.value+' · ':'')+'Block Studio · Jarrang';};
  $('pages-url').oninput=e=>{project.settings||={};project.settings.baseUrl=e.target.value.trim();persist();updateExportChecks();};$('export-location').onchange=e=>{project.settings||={};project.settings.location=e.target.value;persist();};$('icon-colour').oninput=e=>{current().iconColour=e.target.value;persist();};$('acknowledge-review').onchange=e=>{current().acknowledged=e.target.checked;persist();updateExportChecks();};
  $('download-module').onclick=()=>exportModules();$('export-all').onclick=()=>exportModules(true);$('add-module').onclick=addModule;$('new-module').onclick=addModule;
  $('duplicate-module').onclick=()=>{const m=JSON.parse(JSON.stringify(current()));m.id=crypto.randomUUID?.()||'m'+Date.now();m.name+=' copy';let s=C.slug(m.name),i=2;while(project.modules.some(x=>x.slug===s))s=C.slug(m.name)+'-'+i++;m.slug=s;m.acknowledged=false;project.modules.push(m);currentId=m.id;trialValues={};persist();render();tell('Module duplicated with a separate folder and identity.');};
  $('delete-module').onclick=()=>confirmAction('Delete '+current().name+'?','This removes the module from this project. Previously downloaded exports are unaffected.',()=>{project.modules=project.modules.filter(m=>m.id!==currentId);if(!project.modules.length)project.modules.push(newModule());currentId=project.modules[0].id;step=0;selectedField=null;trialValues={};persist();render();});
  $('save-project').onclick=()=>{download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),projectFileSlug()+'.jarrang.json');tell('Project saved, including the original HTML and field mappings.');};
  $('open-project').onclick=()=>$('project-file').click();$('project-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>20000000)throw Error('Choose a project smaller than 20 MB.');const loaded=C.assertProject(JSON.parse(await f.text()));confirmAction('Open this project?','This replaces your current browser draft. Save the current project first if you need to keep it.',()=>{project=loaded;project.settings||={baseUrl:'',location:'root'};if(!project.modules.length)project.modules.push(newModule());currentId=project.modules[0].id;step=0;selectedField=null;trialValues={};persist();render();tell('Project opened.');});}catch(err){tell(err.message,true);}e.target.value='';};
  // Small explicit API for export verification and future integrations.
  window.BlockStudio={getProject:()=>JSON.parse(JSON.stringify(project)),sample};
  render();if(storageWarning)tell(storageWarning,true);
})();
