(function(){
  'use strict';
  const C=window.BlockCore,Catalog=window.BlockFieldCatalog,copy=v=>JSON.parse(JSON.stringify(v));
  const types=Catalog.types.map(t=>[t.id,t.name]);
  let serial=0;
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function button(text,run,cls='button secondary'){const b=el('button',text,cls);b.type='button';b.onclick=run;return b;}
  function disclosure(parent,title,help){const d=el('details',undefined,'field-disclosure');d.append(el('summary',title));if(help)d.append(el('p',help,'help'));parent.append(d);return d;}
  function input(parent,label,value,change,type='text',help){const wrap=el('div',undefined,'setting'),l=el('label',label),n=el(type==='textarea'?'textarea':'input');n.id='setting-'+(++serial);l.htmlFor=n.id;if(n.tagName==='INPUT')n.type=type;else n.rows=2;n.value=value??'';n.oninput=()=>change(n.value);wrap.append(l,n);if(help){const h=el('p',help,'help');h.id=n.id+'-help';n.setAttribute('aria-describedby',h.id);wrap.append(h);}parent.append(wrap);return n;}
  function select(parent,label,choices,value,change){const wrap=el('div',undefined,'setting'),l=el('label',label),n=el('select');n.id='setting-'+(++serial);l.htmlFor=n.id;choices.forEach(([v,t])=>{const o=el('option',t);o.value=v;n.append(o);});n.value=value;n.onchange=()=>change(n.value);wrap.append(l,n);parent.append(wrap);return n;}
  function setType(f,type){
    const old=f.type;f.type=type;
    if(type==='list'){f.itemFields||=[{id:'text',key:'text',label:'Text',type:'text',binding:'template',targets:[],defaultValue:'New item',required:false,maxLength:0}];if(!Array.isArray(f.defaultValue))f.defaultValue=[];f.minItems??=0;f.maxItems??=20;}
    else if(old==='list')f.defaultValue='';
    if(type==='toggle'&&!['shown','hidden'].includes(f.defaultValue))f.defaultValue='shown';
    if(type==='select'&&!f.options?.length)f.options=[{label:String(f.defaultValue)||'First choice',value:String(f.defaultValue)}];
    if(type==='richtext'&&old==='text')f.defaultValue=C.escape(f.defaultValue).replace(/\n/g,'<br>');
    if(old==='richtext'&&type==='text')f.defaultValue=C.decode(f.defaultValue.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,''));
  }
  function compatible(f){
    if(f.targets.some(t=>t.kind==='element'))return types.filter(t=>t[0]==='toggle');
    if(f.targets.some(t=>t.kind==='css'))return types.filter(t=>['colour','select','number'].includes(t[0]));
    if(f.targets.some(t=>['href','src','background'].includes(t.name)))return types.filter(t=>['url','image','select'].includes(t[0]));
    return f.targets.length?types.filter(t=>!['list','toggle'].includes(t[0])&&(t[0]!=='richtext'||f.targets.every(t=>t.kind==='content'))):types;
  }
  function hasReference(module,field){const key=field.key||field.id;return [...module.source.matchAll(/{[%{]([\s\S]*?)[%}]}/g)].some(m=>m[1].match(/[a-zA-Z_]\w*(?:\.\w+)*/g)?.some(v=>v===key||v.startsWith(key+'.')));}
  function connectionText(module,field){
    if(field.targets.length){const d=Catalog.describe(module,field.targets[0]);return d.title+' · '+field.targets.length+' location'+(field.targets.length===1?'':'s');}
    return hasReference(module,field)?'Used in the template':'Not connected yet';
  }
  function open(module,original,onSave,initialType){
    const field=copy(original);C.preserveOriginal(field);field.key||=C.uniqueKey(module,field.label);if(initialType)setType(field,initialType);if(field.targets.length)field.allowLinks=C.richLinksAllowed(module.source,field.targets);
    const isNew=!module.fields.some(f=>f.id===field.id),dialog=el('dialog',undefined,'field-dialog ux-field-dialog');dialog.setAttribute('aria-labelledby','field-editor-title');
    const header=el('header',undefined,'field-dialog-header'),heading=el('h2',isNew?'Add a field':'Edit field');heading.id='field-editor-title';
    header.append(el('div','CLIENT CONTROLS','eyebrow'),heading,el('p','Choose what your client can edit. Try the control as you set it up.','help'));dialog.append(header);
    const grid=el('div',undefined,'field-workspace'),left=el('div',undefined,'field-settings-column'),right=el('aside',undefined,'field-live-preview');grid.append(left,right);dialog.append(grid);
    const nav=el('div',undefined,'field-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Field editor');left.append(nav);
    const panels={},tabs={};let active='setup';
    function showTab(id){active=id;for(const key of Object.keys(panels)){panels[key].hidden=key!==id;tabs[key].setAttribute('aria-selected',String(key===id));tabs[key].tabIndex=key===id?0:-1;}if(id==='connections')drawConnections();if(id==='advanced')drawAdvanced();}
    for(const [id,label] of [['setup','Set up'],['connections','Where it applies'],['advanced','Advanced']]){
      const tab=button(label,()=>showTab(id),'field-tab');tab.id='field-tab-'+id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','field-panel-'+id);nav.append(tab);tabs[id]=tab;
      const panel=el('section',undefined,'field-tab-panel');panel.id='field-panel-'+id;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',tab.id);left.append(panel);panels[id]=panel;
      tab.onkeydown=e=>{const ids=Object.keys(panels),i=ids.indexOf(id);let next;if(e.key==='ArrowRight')next=ids[(i+1)%ids.length];if(e.key==='ArrowLeft')next=ids[(i+ids.length-1)%ids.length];if(e.key==='Home')next=ids[0];if(e.key==='End')next=ids.at(-1);if(next){e.preventDefault();showTab(next);tabs[next].focus();}};
    }
    const previewHead=el('div',undefined,'live-preview-heading');previewHead.append(el('span','CLIENT PREVIEW','eyebrow'),el('span','Interactive','preview-badge'));right.append(previewHead,el('h3','What your client sees'),el('p','Try it here. These test values will not change your starting content.','help'));
    const preview=el('div',undefined,'live-control-card'),previewStatus=el('p',undefined,'preview-value-status');previewStatus.setAttribute('aria-live','polite');right.append(preview,previewStatus,button('Reset preview',()=>refreshPreview(),'button quiet'));
    const connection=el('div',undefined,'connection-summary');right.append(connection);
    const footer=el('footer',undefined,'field-dialog-footer'),footerText=el('span',undefined,'field-save-note'),actions=el('div',undefined,'row'),cancel=button('Cancel',()=>dialog.close()),save=button('Save field',saveField,'button primary');actions.append(cancel,save);footer.append(footerText,actions);dialog.append(footer);
    const errors=el('div',undefined,'field-editor-errors');errors.setAttribute('role','alert');errors.tabIndex=-1;left.insertBefore(errors,nav.nextSibling);
    let nameInput,defaultInput;
    function fail(messages){errors.replaceChildren(el('strong','Check this before saving'));const ul=el('ul');messages.forEach(m=>ul.append(el('li',m)));errors.append(ul);errors.focus();}
    function refreshPreview(){
      const values={[field.id]:copy(field.defaultValue)};
      try{window.BlockControls.mount(preview,[{...field,label:field.label||'Your field'}],values,(_,v)=>{previewStatus.textContent=C.validate(field,v)||'Preview updated. Starting content is unchanged.';},{prefix:'field-preview-'});previewStatus.textContent='';}catch{preview.replaceChildren(el('p','Finish the field settings to try this control.','help'));}
      connection.replaceChildren(el('strong',field.targets.length||hasReference(module,field)?'Connected to your module':'Connection needed'),el('p',connectionText(module,field),'help'),button('Review connection',()=>{showTab('connections');tabs.connections.focus();},'button quiet'));
      const connected=field.targets.length||hasReference(module,field);connection.classList.toggle('unconnected',!connected);footerText.textContent=connected?'Changes are applied when you save.':'Save this control, then connect it in Template code.';
    }
    function changed(){errors.replaceChildren();left.querySelectorAll('[aria-invalid=true]').forEach(n=>n.removeAttribute('aria-invalid'));refreshPreview();}
    dialog.addEventListener('richchange',e=>{if(left.contains(e.target))changed();});
    dialog.addEventListener('input',e=>{if(left.contains(e.target))changed();});dialog.addEventListener('change',e=>{if(left.contains(e.target)&&e.target.matches('select,input[type=checkbox],input[type=radio]'))changed();});
    function optionsEditor(parent,f){
      parent.append(el('h3','Choices for your client'),el('p','Give each choice a clear label. The inserted value is what the email code needs. Select the starting choice.','help'));
      const box=el('div',undefined,'choice-table');parent.append(box);
      function draw(focusLast=false){
        box.replaceChildren();const headings=el('div',undefined,'choice-headings');['Start','Client sees','Inserted value',''].forEach(t=>headings.append(el('span',t)));box.append(headings);
        (f.options||[]).forEach((o,i)=>{
          const row=el('div',undefined,'choice-row'),radio=el('input'),label=el('input'),value=el('input');radio.type='radio';radio.name='default-'+f.id;radio.checked=f.defaultValue===o.value;radio.setAttribute('aria-label','Start with option '+(i+1));radio.onchange=()=>{f.defaultValue=o.value;changed();};
          label.type='text';value.type='text';label.value=o.label;label.placeholder='e.g. Centred';label.setAttribute('aria-label','Option '+(i+1)+' label');label.oninput=()=>{o.label=label.value;};
          value.value=o.value;value.placeholder='e.g. center';value.setAttribute('aria-label','Option '+(i+1)+' value');value.oninput=()=>{if(radio.checked)f.defaultValue=value.value;o.value=value.value;};
          const remove=button('×',()=>{const wasDefault=f.defaultValue===o.value;f.options.splice(i,1);if(wasDefault)f.defaultValue=f.options[0]?.value||'';draw();changed();},'choice-remove');remove.setAttribute('aria-label','Remove option '+(i+1));remove.disabled=f.options.length===1;row.append(radio,label,value,remove);box.append(row);
        });
        const add=button('+ Add choice',()=>{let n=f.options.length+1;while(f.options.some(o=>o.value==='choice_'+n))n++;f.options.push({label:'Choice '+n,value:'choice_'+n});draw(true);changed();},'button secondary');box.append(add);if(focusLast)box.querySelectorAll('.choice-row input[type=text]').item((f.options.length-1)*2)?.focus();
      }
      draw();
    }
    function defaults(parent,f,label='Starting content'){
      if(f.type==='list')return;
      if(f.type==='richtext'){
        f.linkStyle||=C.linkStyle(f);
        const box=el('div',undefined,'starting-richtext');parent.append(box);
        const mountStarting=()=>window.BlockControls.mount(box,[{...f,toolbar:{},label,help:'',required:false}],{[f.id]:f.defaultValue},(_,value)=>f.defaultValue=value,{prefix:'starting-rich-'+f.id+'-'});
        mountStarting();
        const toolbarSettings=disclosure(parent,'Client toolbar controls','Choose which formatting controls your client can use. Starting content keeps its existing formatting.');
        const choices=el('div',undefined,'toolbar-options');toolbarSettings.append(choices);
        window.BlockRichText.tools.forEach(([key,label])=>{
          const row=el('label',undefined,'toolbar-option'),check=el('input');check.type='checkbox';
          check.checked=f.toolbar?.[key]!==false;
          if(['link','unlink'].includes(key)&&f.allowLinks===false){check.checked=false;check.disabled=true;}
          check.onchange=()=>{f.toolbar={...(f.toolbar||{}),[key]:check.checked};changed();};
          row.append(check,el('span',label));choices.append(row);
        });
        if(f.allowLinks===false){parent.append(el('p','This text is already inside a link. Its destination and appearance belong to the surrounding button or link.','help'));return;}
        const styles=disclosure(parent,'Link appearance · locked for clients','These styles apply to every link in this field, including starting content. Clients can change the text and destination, but not these styles.');styles.classList.add('link-style-settings');
        const custom=el('div');
        select(styles,'Link colour',[['inherit','Match surrounding text'],['custom','Use a specific colour']],f.linkStyle.colour==='inherit'?'inherit':'custom',v=>{f.linkStyle.colour=v==='inherit'?'inherit':'#000000';drawColour();update();});styles.append(custom);
        function drawColour(){custom.replaceChildren();if(f.linkStyle.colour==='inherit')return;const hex=input(custom,'Link hex colour',f.linkStyle.colour,v=>{f.linkStyle.colour=v;update();});const picker=el('input');picker.type='color';picker.value=C.normaliseColour(f.linkStyle.colour)||'#000000';picker.setAttribute('aria-label','Choose link colour');picker.oninput=()=>{f.linkStyle.colour=picker.value;hex.value=picker.value;update();};hex.addEventListener('input',()=>{const colour=C.normaliseColour(hex.value);if(colour)picker.value=colour;});hex.parentNode.classList.add('starting-colour');hex.before(picker);}
        select(styles,'Link underline',[['underline','Underlined'],['none','No underline']],f.linkStyle.decoration,v=>{f.linkStyle.decoration=v;update();});
        select(styles,'Link weight',[['inherit','Match surrounding text'],['normal','Normal'],['bold','Bold']],f.linkStyle.weight,v=>{f.linkStyle.weight=v;update();});
        const sample=el('div',undefined,'link-style-sample');styles.append(sample);
        function update(){sample.replaceChildren();const a=el('a','Example link');a.setAttribute('style',C.linkStyleCSS(f));sample.append(a);mountStarting();changed();}
        drawColour();const sampleLink=el('a','Example link');sampleLink.setAttribute('style',C.linkStyleCSS(f));sample.append(sampleLink);return;
      }
      if(f.type==='select'){optionsEditor(parent,f);return;}
      if(f.type==='toggle'){select(parent,'Start with this section',[['shown','Visible'],['hidden','Hidden']],f.defaultValue,v=>f.defaultValue=v);parent.append(el('p','Hidden sections are removed from the email. Content inside can still have its own editable fields.','help'));return;}
      const control=input(parent,f.type==='colour'?'Starting colour':f.type==='image'?'Starting image URL':f.type==='url'?'Starting destination':label,f.defaultValue,v=>f.defaultValue=v,f.type==='text'||f.type==='richtext'?'textarea':f.type==='number'?'number':'text');
      if(f===field)defaultInput=control;
      if(f.type==='colour'){const picker=el('input');picker.type='color';picker.setAttribute('aria-label','Choose starting colour');picker.value=/^#[0-9a-f]{6}$/i.test(f.defaultValue)?f.defaultValue:'#ffffff';picker.oninput=()=>{f.defaultValue=picker.value;control.value=picker.value;};control.addEventListener('input',()=>{if(/^#[0-9a-f]{6}$/i.test(control.value))picker.value=control.value;});control.parentNode.classList.add('starting-colour');control.before(picker);}
      if(f.type==='image')parent.append(el('p','Use an existing hosted image. The client will also enter an image URL.','help'));
      if(f.type==='richtext')parent.append(el('p','Starting content can include inline formatting. The client gets a formatting toolbar, shown in the preview.','help'));
    }
    function itemSchema(parent){
      parent.append(el('h3','What can change in each item?'),el('p','For bullets, one text field is enough. A card might need an image, a title and a link.','help'));
      field.itemFields.forEach((child,i)=>{
        const card=disclosure(parent,child.label+' · '+(Catalog.types.find(t=>t.id===child.type)?.name||child.type));card.classList.add('item-field-card');
        const title=card.querySelector('summary');
        const referenced=[...module.source.matchAll(/{[%{]([\s\S]*?)[%}]}/g)].some(m=>m[1].match(/[a-zA-Z_]\w*(?:\.\w+)*/g)?.some(v=>v.split('.').slice(1).includes(child.key)));
        if(!referenced)card.append(el('p','Not used in the item layout yet. Add this field’s reference in Template code to include it in the email.','help'));
        input(card,'Item field name',child.label,v=>{child.label=v;title.textContent=v;});
        select(card,'Item field type',types.filter(t=>t[0]!=='list'),child.type,v=>{setType(child,v);drawSetup();changed();});defaults(card,child,'Content for a new item');
        const advanced=disclosure(card,'Code reference','Changing this reference also requires updating the item expression in Template code.');
        const key=input(advanced,'Item template key',child.key,()=>{});key.onchange=()=>{const v=key.value.trim();if(!/^[a-zA-Z_]\w*$/.test(v)||['constructor','prototype','__proto__'].includes(v)||field.itemFields.some(c=>c!==child&&c.key===v)){key.setCustomValidity('Use a unique key made of letters, numbers and underscores.');key.reportValidity();key.value=child.key;key.setCustomValidity('');return;}field.defaultValue.forEach(row=>{if(Object.hasOwn(row,child.key)){row[v]=row[child.key];delete row[child.key];}});child.id=v;child.key=v;};
        card.append(button('Remove item field',()=>{field.itemFields.splice(i,1);drawSetup();changed();},'button quiet danger'));
      });
      parent.append(button('+ Add an item field',()=>{let n=field.itemFields.length+1;while(field.itemFields.some(f=>f.key==='field_'+n))n++;field.itemFields.push({id:'field_'+n,key:'field_'+n,label:'Item text '+n,type:'text',defaultValue:'',binding:'template',targets:[],required:false,maxLength:0});drawSetup();const last=panels.setup.querySelectorAll('.item-field-card');last.item(last.length-1).open=true;last.item(last.length-1).querySelector('input').focus();changed();},'button secondary'));
      const limits=el('div',undefined,'setting-pair');input(limits,'Minimum items',field.minItems,v=>{field.minItems=Number(v);drawStarting();},'number');input(limits,'Maximum items',field.maxItems,v=>{field.maxItems=Number(v);drawStarting();},'number');parent.append(limits,el('h3','Starting items'),el('p','These are included when a client first adds the block. Changes here are saved with the field.','help'));
      const starting=el('div',undefined,'starting-items');parent.append(starting);function drawStarting(){window.BlockControls.mount(starting,[{...field,label:'Items'}],{[field.id]:copy(field.defaultValue)},(_,v)=>{field.defaultValue=v;changed();},{prefix:'starting-'});}drawStarting();
    }
    function drawSetup(){
      const parent=panels.setup;parent.replaceChildren();nameInput=input(parent,'Field name',field.label,v=>field.label=v,'text','Use a name your client will recognise, such as “Button colour”.');nameInput.required=true;
      const choices=compatible(field);if(choices.length>1)select(parent,'Control type',choices,field.type,v=>{setType(field,v);drawSetup();changed();});else parent.append(el('p','Control: '+(choices[0]?.[1]||field.type),'field-type-summary'));
      parent.append(el('p',Catalog.types.find(t=>t.id===field.type)?.help||'','help'));
      if(field.type==='list')itemSchema(parent);else defaults(parent,field);
      const optional=disclosure(parent,'Guidance and limits','Optional settings to help your client enter the right content.');
      input(optional,'Help for your client',field.help,v=>field.help=v,'textarea');
      if(!['list','toggle'].includes(field.type)){input(optional,'Character limit',field.maxLength||'',v=>field.maxLength=v===''?0:Math.max(0,Number(v)||0),'number','Leave empty for no limit.');const l=el('label',undefined,'check-label'),n=el('input');n.type='checkbox';n.checked=field.required;n.onchange=()=>field.required=n.checked;l.append(n,document.createTextNode('Require a value'));optional.append(l);}
    }
    function drawConnections(){
      const parent=panels.connections;parent.replaceChildren();parent.append(el('h3','Where does this field apply?'));
      if(field.binding==='template'){
        parent.append(el('p',hasReference(module,field)?'This control is referenced in your template. Its value is used wherever that reference appears.':'This is a template control. Add its reference to Template code after saving to connect it to the module.','help'));
        const example=field.type==='list'?'{% for item in '+field.key+' %}\n  <li>{{ item.'+(field.itemFields?.[0]?.key||'text')+' }}</li>\n{% endfor %}':field.type==='toggle'?'{% if '+field.key+' %}\n  <!-- Your optional section -->\n{% endif %}':'{{ '+field.key+(field.type==='richtext'?' | richtext':'')+' }}';
        parent.append(el('pre',example,'template-snippet'));return;
      }
      parent.append(el('p','One control can update several places. Link matching locations when they should always change together.','help'));
      const connected=el('div',undefined,'connected-locations');parent.append(connected);
      field.targets.forEach((target,i)=>{
        const d=Catalog.describe(module,target),card=el('div',undefined,'connection-card'),body=el('div');body.append(el('strong',d.title),el('p',d.context,'help'),el('span',(d.hidden?'Outlook fallback · ':'')+'Line '+d.line,'location-meta'));card.append(body);
        if(field.targets.length>1)card.append(button('Unlink',()=>{field.targets.splice(i,1);drawConnections();changed();},'button quiet'));connected.append(card);
      });
      const candidates=Catalog.locations(module,field.type).filter(c=>!field.targets.some(t=>t.start===c.target.start&&t.end===c.target.end)&&!c.existing&&String(c.value)===String(field.originalValue??field.defaultValue));
      if(candidates.length){parent.append(el('h3','Matching values elsewhere'),el('p','The same value can have a different purpose. Link only the locations this control should change.','help'));for(const c of candidates){const row=el('div',undefined,'connection-card'),info=el('div');info.append(el('strong',c.description.title),el('p',c.description.context,'help'),el('span','Line '+c.description.line+' · '+c.value,'location-meta'));row.append(info,button('Link',()=>{field.targets.push({...c.target,originalValue:C.sourceValue(module.source,c.target,field.type)});drawConnections();changed();},'button secondary'));parent.append(row);}}
      const precise=disclosure(parent,'Select a location in the code','For a value not listed above, select the exact text or attribute value. For a section, select its complete element.');const source=el('textarea');source.className='code-editor mapping-selector';source.value=module.source;source.readOnly=true;source.setAttribute('aria-label','Source location selector');precise.append(source,button('Link selected location',()=>{
        try{const start=C.sourceOffset(module.source,source.selectionStart),end=C.sourceOffset(module.source,source.selectionEnd);let target;
          if(field.type==='toggle'){const f=C.manualField(module.source,start,end,module.fields.filter(f=>f.id!==field.id));if(f.type!=='toggle')throw Error('Select a complete element for an optional section.');target=f.targets[0];}
          else target=C.mappingTarget(module.source,start,end);
          if(field.targets.some(t=>t.start===target.start&&t.end===target.end))throw Error('This location is already connected.');
          const next=copy(module),candidate={...field,targets:[...field.targets,target]};next.fields=next.fields.filter(f=>f.id!==field.id).concat(candidate);C.assertProject({format:'jarrang-block-studio',version:1,modules:[next]});
          const issue=C.validate(candidate,field.defaultValue);if(issue)throw Error(issue);target.originalValue=C.sourceValue(module.source,target,field.type);field.targets.push(target);drawConnections();changed();
        }catch(e){fail([e.message]);}
      }));
    }
    function drawAdvanced(){
      const parent=panels.advanced;parent.replaceChildren();parent.append(el('h3','Code settings'),el('p','These are only needed when writing template rules. You can rename the client-facing field without changing its code reference.','help'));
      input(parent,'Template key',field.key,v=>field.key=v,'text','Changing an existing key requires updating its references in Template code.');
      if(field.type==='toggle')select(parent,'Toggle appearance',[['checkbox','Checkbox'],['switch','Switch']],field.style||'checkbox',v=>field.style=v);
    }
    function saveField(){
      const issues=C.fieldProblems(field);if(!/^[a-zA-Z_]\w*$/.test(field.key))issues.push('Use a template key made of letters, numbers and underscores.');
      if(module.fields.some(f=>f.id!==field.id&&(f.key||f.id)===field.key))issues.push('That template key is already in use.');
      if(['block_id','forloop','item','constructor','prototype','__proto__'].includes(field.key))issues.push('Choose a different template key.');
      const next=copy(module);next.fields=next.fields.filter(f=>f.id!==field.id).concat(field);try{C.assertProject({format:'jarrang-block-studio',version:1,modules:[next]});}catch(e){issues.push(e.message);}
      if(issues.length){showTab(issues.some(i=>/template key/.test(i))?'advanced':'setup');if(!field.label.trim())nameInput.setAttribute('aria-invalid','true');if(defaultInput&&C.validate(field,field.defaultValue))defaultInput.setAttribute('aria-invalid','true');fail([...new Set(issues)]);return;}
      onSave(field);dialog.close();
    }
    dialog.onclose=()=>dialog.remove();document.body.append(dialog);drawSetup();drawAdvanced();showTab('setup');refreshPreview();dialog.showModal();nameInput.focus();
  }
  function choose(module,onPick,onCode){
    const dialog=el('dialog',undefined,'field-picker');dialog.setAttribute('aria-labelledby','field-picker-title');const head=el('div',undefined,'picker-header'),title=el('h2','What should your client change?');title.id='field-picker-title';head.append(el('span','ADD FIELD','eyebrow'),title);dialog.append(head);
    const content=el('div',undefined,'picker-content'),footer=el('div',undefined,'picker-footer');dialog.append(content,footer);document.body.append(dialog);dialog.onclose=()=>dialog.remove();
    let chosen;
    function typeScreen(){
      title.textContent='What should your client change?';content.replaceChildren(el('p','Choose a control, then choose where it belongs in your module.','help'));const grid=el('div',undefined,'field-type-grid');content.append(grid);
      for(const type of Catalog.types){const card=button('',()=>{chosen=type;locationScreen();},'field-type-card');const icon=el('span',type.icon,'type-icon');icon.setAttribute('aria-hidden','true');const words=el('span');words.append(el('strong',type.name),el('span',type.help));card.append(icon,words);grid.append(card);}
      footer.replaceChildren(el('span','Already found a field? Select it in the field list.','help'),button('Cancel',()=>dialog.close()));
    }
    function locationScreen(){
      title.textContent=chosen.id==='toggle'?'Which section should be optional?':chosen.id==='list'?'Which item should repeat?':'Where should this field apply?';content.replaceChildren();
      content.append(el('p',chosen.id==='list'?'Choose one existing item. Its editable fields become the fields inside each repeated item. Other sibling items stay unchanged.':'Choose a location from your module. Locations already connected to a field open that field for editing.','help'));
      const search=input(content,'Find a location','',()=>draw(),'search'),results=el('div',undefined,'location-results'),all=Catalog.locations(module,chosen.id),error=el('p',undefined,'field-editor-errors');error.setAttribute('role','alert');content.append(results,error);
      function draw(){
        results.replaceChildren();const q=search.value.toLowerCase(),filtered=all.filter(c=>(c.description.title+' '+c.description.context+' '+c.value).toLowerCase().includes(q));
        if(!filtered.length)results.append(el('p','No matching locations. You can select an exact value in the HTML using the advanced options below.','empty-fields'));
        for(const c of filtered){const row=button('',()=>pick(c),'location-choice'),main=el('span'),sub=c.description.context===String(c.value)?'':c.description.context;
          main.append(el('strong',c.description.title),el('span',String(c.value).slice(0,110),'location-value'));if(sub)main.append(el('span',sub,'location-context'));const meta=el('span',undefined,'location-choice-meta');meta.append(el('span',c.existing?'Edit existing':'Use this location','location-action'),el('span',(c.description.hidden?'Outlook · ':'')+'Line '+c.description.line));row.append(main,meta);results.append(row);
        }
      }
      function pick(c){
        try{
          if(c.existing&&chosen.id!=='list'){dialog.close();onPick(c.existing,null,chosen.id);return;}
          if(chosen.id==='list'){const draft=copy(module),field=C.repeatSelection(draft,c.target.start,c.target.end);dialog.close();onPick(field,draft);return;}
          const f=C.manualField(module.source,c.target.start,c.target.end,module.fields);f.id='control_'+crypto.randomUUID();f.label=chosen.id==='toggle'?'Show '+c.description.title.toLowerCase():c.description.title;f.key=C.uniqueKey(module,f.label);setType(f,chosen.id);dialog.close();onPick(f);
        }catch(e){error.textContent=e.message;}
      }
      const advanced=disclosure(content,'Advanced options');advanced.append(button('Select exact code',()=>{dialog.close();onCode();},'button quiet'),button('Create a template control',()=>{const field=C.templateField(module,chosen.id,chosen.name);dialog.close();onPick(field);},'button quiet'),el('p','Template controls need a reference in Template code before they affect the email.','help'));
      footer.replaceChildren(button('Back',typeScreen,'button quiet'),button('Cancel',()=>dialog.close()));draw();search.focus();
    }
    typeScreen();dialog.showModal();
  }
  window.BlockFieldEditor={open,choose,connectionText};
})();
