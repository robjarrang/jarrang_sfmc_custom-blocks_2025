const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');
const make=source=>({source,fields:C.infer(source).fields});

test('unchanged output preserves source bytes including Outlook, whitespace and AMPscript',()=>{
  const html='%%[ SET @x = "<keep>" ]%%\n<table role="presentation"><tr><td>\n<h1>A &amp; B</h1><!--[if mso]><v:rect fillcolor="#123456"></v:rect><![endif]--><p>%%=v(@x)=%%</p>\n</td></tr></table>';
  const m=make(html);assert.equal(C.render(m),html);assert.equal(m.fields.length,1);
});
test('changing text edits only its range and escapes HTML, with line breaks',()=>{
  const m=make('<table><tr><td><h1>Original</h1></td></tr></table>');
  assert.equal(C.render(m,{field1:'A & B\n<new>'}),'<table><tr><td><h1>A &amp; B<br>&lt;new&gt;</h1></td></tr></table>');
});
test('one destination updates its matching Outlook fallback, preserving separate visible links',()=>{
  const html='<a href="https://example.com/">One</a><!--[if mso]><v:roundrect href="https://example.com/">One</v:roundrect><![endif]--><a href="https://example.com/">Two</a>';
  const m=make(html),links=m.fields.filter(f=>f.type==='url');assert.equal(links.length,2);assert.equal(links[0].targets.length,2);assert.equal(links[1].targets.length,1);
  const out=C.render(m,{[links[0].id]:'https://example.com/new?a=1&b=2'});
  assert.equal((out.match(/new\?a=1&amp;b=2/g)||[]).length,2);assert.ok(out.endsWith('<a href="https://example.com/">Two</a>'));
});
test('attribute parsing preserves quoted > characters and protects dynamic URL expressions',()=>{
  const m=make('<img src="https://example.com/a.png" alt="A > B"><a href="%%=RedirectTo(Concat(\"https://example.com/\",@x))=%%">Open</a>');
  assert.equal(m.fields.filter(f=>f.type==='url').length,0);const alt=m.fields.find(f=>f.label==='Image description');
  const out=C.render(m,{[alt.id]:'"Example" & more'});assert.ok(out.includes('alt="&quot;Example&quot; &amp; more"'));assert.ok(out.includes('%%=RedirectTo'));
});
test('unquoted attributes become safely quoted when edited',()=>{
  const m=make('<img src=https://example.com/a.png alt=Photo>');const f=m.fields.find(f=>f.label==='Image description');assert.ok(C.render(m,{[f.id]:'Two words'}).includes('alt="Two words"'));
});
test('invalid URL changes fail without changing source; disabled fields stay fixed',()=>{
  const m=make('<a href="https://example.com/">Open</a>'),f=m.fields.find(f=>f.type==='url');
  assert.throws(()=>C.render(m,{[f.id]:'javascript:alert(1)'}));f.enabled=false;assert.equal(C.render(m,{[f.id]:'https://other.example/'}),m.source);
});
test('overlapping mappings and invalid project ranges are rejected',()=>{
  const m=make('<p>Original</p>');m.fields.push({...m.fields[0],id:'other'});assert.throws(()=>C.render(m,{field1:'New',other:'Other'}),/overlap/);
  const project={format:'jarrang-block-studio',version:1,modules:[{...m,id:'m',name:'Test',slug:'test'}]};assert.throws(()=>C.assertProject(project),/overlapping/);
});
test('required, maximum length and URL scheme rules',()=>{
  assert.ok(C.validate({type:'text',label:'Title',required:true},''));assert.ok(C.validate({type:'text',label:'Title',maxLength:2},'Long'));
  assert.equal(C.validUrl('mailto:hello@example.com','url'),true);assert.equal(C.validUrl('tel:+441234567890','url'),true);assert.equal(C.validUrl('data:text/html,x','image'),false);
});
test('manual source selection creates a content field',()=>{
  const html='<table><tr><td><p>Manual copy</p></td></tr></table>',start=html.indexOf('Manual copy'),end=start+'Manual copy'.length;
  const field=C.manualField(html,start,end,[]);assert.equal(field.type,'text');assert.equal(field.defaultValue,'Manual copy');assert.equal(field.targets[0].kind,'content');
  const m={source:html,fields:[{id:'field1',...field}]};assert.equal(C.render(m,{field1:'Changed & safe'}),'<table><tr><td><p>Changed &amp; safe</p></td></tr></table>');
});
test('manual source selection creates an attribute field and rejects partial attributes',()=>{
  const html='<a href="https://example.com/path">Open</a>',start=html.indexOf('https://'),end=start+'https://example.com/path'.length;
  const field=C.manualField(html,start,end,[]);assert.equal(field.type,'url');assert.equal(field.targets[0].kind,'attribute');
  const m={source:html,fields:[{id:'field1',...field}]};assert.equal(C.render(m,{field1:'https://example.com/new?a=1&b=2'}),'<a href="https://example.com/new?a=1&amp;b=2">Open</a>');
  assert.throws(()=>C.manualField(html,start,end-5,[]),/whole attribute value/);
});
test('manual whole-element selection creates a show/hide toggle that removes the section',()=>{
  const html='<table><tr><td>Keep</td></tr><tr><td><a href="https://example.com/">Button</a></td></tr></table>',start=html.indexOf('<tr><td><a'),end=html.indexOf('</tr></table>')+'</tr>'.length;
  const field=C.manualField(html,start,end,[]);assert.equal(field.type,'toggle');assert.equal(field.defaultValue,'shown');assert.equal(field.targets[0].kind,'element');
  const m={source:html,fields:[{id:'field1',...field}]};
  assert.equal(C.render(m),html);
  assert.equal(C.render(m,{field1:'hidden'}),'<table><tr><td>Keep</td></tr></table>');
});

test('project import rejects duplicate module identities before selecting or deleting modules',()=>{
 const module={id:'same',name:'One',slug:'one',source:'<p>A</p>',fields:[]};
 assert.throws(()=>C.assertProject({format:'jarrang-block-studio',version:1,modules:[module,{...module,name:'Two',slug:'two'}]}),/duplicate module/i);
});
test('list validation rejects malformed rows instead of silently substituting defaults',()=>{
 const field={type:'list',label:'Items',minItems:0,maxItems:5,itemFields:[{type:'text',key:'text',label:'Text',defaultValue:'Default'}]};
 for(const row of [null,'text',42,[]])assert.match(C.validate(field,[row]),/item 1.*object/i);
});

test('project import rejects malformed repeater defaults before replacing the open project',()=>{
 const m={id:'one',name:'One',slug:'one',source:'',fields:[]};
 const f=C.templateField(m,'list','Items');f.defaultValue=[null];m.fields.push(f);
 assert.throws(()=>C.assertProject({format:'jarrang-block-studio',version:1,modules:[m]}),/Item 1 must be an object/);
});
