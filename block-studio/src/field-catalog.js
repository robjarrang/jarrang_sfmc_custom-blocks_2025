/* Human-readable source locations for guided field creation. Source offsets stay authoritative. */
(function(root){
  'use strict';
  const C=root.BlockCore;
  const types=[
    {id:'text',name:'Text',icon:'Aa',help:'Headings, button labels and copy.'},
    {id:'richtext',name:'Formatted text',icon:'B',help:'Copy with bold, italic and links.'},
    {id:'image',name:'Image',icon:'▧',help:'Let the client change an image URL.'},
    {id:'url',name:'Link',icon:'↗',help:'Choose where a button or link goes.'},
    {id:'colour',name:'Colour',icon:'●',help:'Pick a colour or enter a hex value.'},
    {id:'select',name:'Dropdown',icon:'⌄',help:'Offer a list of approved choices.'},
    {id:'toggle',name:'Optional section',icon:'◐',help:'Show or hide a title, button or section.'},
    {id:'list',name:'Repeating items',icon:'≡',help:'Add, remove and reorder bullets or cards.'},
    {id:'number',name:'Number',icon:'12',help:'Edit a numeric value in the module.'}
  ];
  const text=value=>C.decode(String(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
  function describe(module,target){
    const node=C.parse(module.source).nodes.find(n=>n.id===target.nodeId);
    const names={h1:'Heading',h2:'Heading',h3:'Heading',p:'Paragraph',a:'Button or link',li:'List item',ul:'Bulleted list',ol:'Numbered list',table:'Table section',tr:'Table row',td:'Content cell',img:'Image',div:'Section',span:'Text',style:'Stylesheet'};
    const context=node?text(module.source.slice(node.innerStart,node.innerEnd)).slice(0,75):'';
    let property=target.name||'';
    if(target.kind==='css')property=module.source.slice(Math.max(0,target.start-100),target.start).match(/([\w-]+)\s*:\s*$/)?.[1]||'Style';
    const properties={'background-color':'Background colour',color:'Text colour','text-align':'Text alignment','vertical-align':'Vertical alignment',bgcolor:'Background colour',href:'Link destination',src:'Image source',alt:'Image description'};
    const title=properties[property]||(target.kind==='element'?names[node?.tag]||'Section':target.kind==='content'?names[node?.tag]||'Text':property||'Content');
    return {title,context:context||node?.attrs.find(a=>a.name==='alt')?.value||'Module content',line:module.source.slice(0,target.start).split('\n').length,hidden:!!node?.hidden};
  }
  function locations(module,type){
    const found=[],seen=new Set(),source=module.source,{nodes}=C.parse(source);
    const push=(target,value,label)=>{
      const identity=target.start+':'+target.end;if(seen.has(identity)||C.dynamic(value))return;seen.add(identity);
      const existing=module.fields.find(f=>f.targets?.some(t=>t.start===target.start&&t.end===target.end));
      const overlaps=module.fields.some(f=>f.enabled&&f.id!==existing?.id&&f.targets.some(t=>t.start<target.end&&t.end>target.start&&t.kind!=='element'&&target.kind!=='element'));
      if(overlaps)return;
      found.push({target,value,existing,description:{...describe(module,target),...(label?{title:label}:{})}});
    };
    if(['toggle','list'].includes(type)){
      for(const n of nodes){
        if(n.hidden||!['h1','h2','h3','p','a','li','ul','ol','div','table','tr','td'].includes(n.tag)||n.end<=n.startEnd)continue;
        if(type==='list'&&!module.fields.some(f=>f.enabled&&f.type!=='toggle'&&f.targets.length&&f.targets.every(t=>t.start>=n.innerStart&&t.end<=n.innerEnd)))continue;
        push({start:n.start,end:n.end,nodeId:n.id,kind:'element'},text(source.slice(n.innerStart,n.innerEnd))||'Image or layout');
      }
      return found.sort((a,b)=>(a.target.end-a.target.start)-(b.target.end-b.target.start));
    }
    for(const f of C.infer(source).fields){
      if(type==='image'&&f.type!=='image'||type==='url'&&f.type!=='url'||['text','richtext'].includes(type)&&!['text','richtext'].includes(f.type)||['colour','number'].includes(type))continue;
      for(const t of f.targets){if(type==='richtext'&&t.kind!=='content')continue;push(t,C.sourceValue(source,t,type));}
    }
    for(const n of nodes){
      for(const a of n.attrs){
        if(a.name==='style'){
          for(const m of a.value.matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]+)/g)){
            const raw=m[2].trim(),start=a.start+m.index+m[0].lastIndexOf(m[2])+m[2].indexOf(raw);
            if(type==='colour'&&!/^#[a-f0-9]{6}$/i.test(raw)||type==='number'&&!/^-?\d+(?:\.\d+)?$/.test(raw)||!['colour','number','select'].includes(type))continue;
            try{const t=C.mappingTarget(source,start,start+raw.length);if(!C.validate({type,targets:[t],options:[{value:raw}]},raw))push(t,raw);}catch{}
          }
        }else if(type==='colour'&&['bgcolor','color','fill','stroke'].includes(a.name)&&/^#[a-f0-9]{6}$/i.test(a.value)||type==='number'&&['width','height','cellpadding','cellspacing','border'].includes(a.name)&&/^\d+$/.test(a.value)){
          push({...a,nodeId:n.id,kind:'attribute'},a.value);
        }
      }
      if(n.tag==='style'&&['colour','number','select'].includes(type)){
        const css=source.slice(n.innerStart,n.innerEnd);
        for(const m of css.matchAll(/(?:^|[;{])\s*[\w-]+\s*:\s*([^;{}]+)/g)){
          const raw=m[1].trim(),start=n.innerStart+m.index+m[0].lastIndexOf(m[1])+m[1].indexOf(raw);
          if(type==='colour'&&!/^#[a-f0-9]{6}$/i.test(raw)||type==='number'&&!/^-?\d+(?:\.\d+)?$/.test(raw))continue;
          try{const t=C.mappingTarget(source,start,start+raw.length);if(!C.validate({type,targets:[t],options:[{value:raw}]},raw))push(t,raw);}catch{}
        }
      }
    }
    return found;
  }
  root.BlockFieldCatalog={types,locations,describe};
})(window);
