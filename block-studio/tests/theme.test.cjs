const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={window:{BlockCore:{escape:s=>String(s).replace(/</g,'&lt;')}}};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../src/exporter.js','utf8'),context);
const E=context.window.BlockExport;
const moduleData={id:'sample',name:'Sample',source:'<p>Hello</p>',fields:[]};
test('legacy modules retain existing theme and email source',()=>{assert.equal(E.themeCSS(moduleData),'');assert.equal(E.definition(moduleData).source,moduleData.source);});
test('module theme is included in exported HTML and project definition, not email source',()=>{
 const m={...moduleData,editorTheme:{accent:'#b50018',background:'#ffffff',text:'#111111',field:'#eeeeee'}};
 const html=E.moduleHtml(m);assert.ok(html.includes('<style>'+E.themeCSS(m)+'</style>'));assert.ok(html.includes('background:#b50018;color:#ffffff'));assert.equal(E.definition(m).editorTheme.accent,'#b50018');assert.equal(E.definition(m).source,m.source);assert.equal(E.themeProblems(m).length,0);
 assert.ok(E.themeCSS(m,'#trial-fields').startsWith('#trial-fields{'));
});
test('invalid imported theme values cannot inject CSS or HTML',()=>{
 const m={...moduleData,editorTheme:{accent:'</style><script>alert(1)</script>',text:'red;display:none'}};
 assert.equal(E.editorTheme(m).accent,'#080043');assert.ok(!E.themeCSS(m).includes('<script>'));assert.ok(!E.themeCSS(m).includes('display:none'));
});
test('contrast validation checks both text surfaces and accent text switches for light colours',()=>{
 const m={...moduleData,editorTheme:{accent:'#ffff00',background:'#ffffff',text:'#ffffff',field:'#eeeeee'}};
 assert.equal(E.themeProblems(m).length,2);assert.ok(E.themeCSS(m).includes('background:#ffff00;color:#000000'));
});
