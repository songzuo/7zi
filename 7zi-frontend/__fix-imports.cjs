const fs=require('fs');
const path=require('path');
const ts=require('typescript');
const r=require('/tmp/eslint-base.json');
const cwd=process.cwd();

// group eslint unused-var messages per file with positions
const byFile={};
for(const f of r){
  const msgs=f.messages.filter(m=>m.severity!==2 && m.ruleId==='@typescript-eslint/no-unused-vars');
  if(!msgs.length) continue;
  byFile[f.filePath]=msgs.map(m=>({line:m.line,col:m.column,name:(m.message.match(/'([^']*)'/)||[])[1]}));
}

const report={removedImports:0,removedSpec:0,files:0,skipped:[]};

function posOf(sf,offset){const {line,character}=sf.getLineAndCharacterOfPosition(offset);return {line:line+1,col:character+1};}

for(const [file,msgs] of Object.entries(byFile)){
  let src=fs.readFileSync(file,'utf8');
  const sf=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true, file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  // collect edits
  const edits=[]; // {start,end,newText}
  const declaredLocals=new Map(); // name -> positions of import specifier
  const imports=[];
  sf.statements.forEach(st=>{
    if(ts.isImportDeclaration(st) && st.importClause && st.importClause.namedBindings && ts.isNamedImports(st.importClause.namedBindings)){
      const nb=st.importClause.namedBindings;
      for(const el of nb.elements){
        const s=el.getStart(sf), e=el.getEnd(sf);
        const p1=posOf(sf,s), p2=posOf(sf,e);
        const hit=msgs.find(m=>m.name===el.name.text && m.line>=p1.line && m.line<=p2.line && (m.line>p1.line||m.col>=p1.col));
        imports.push({st,el,unused:!!hit});
      }
    }
  });
  // group by declaration
  const byDecl=new Map();
  for(const it of imports){ if(!byDecl.has(it.st))byDecl.set(it.st,[]); byDecl.get(it.st).push(it); }
  for(const [st,items] of byDecl){
    const unusedItems=items.filter(i=>i.unused);
    if(!unusedItems.length) continue;
    const kept=items.filter(i=>!i.unused);
    const ic=st.importClause;
    const hasDefault=!!ic.name;
    const modText=src.slice(st.moduleSpecifier.getStart(sf),st.moduleSpecifier.getEnd(sf));
    const defaultText=hasDefault?src.slice(ic.name.getStart(sf),ic.name.getEnd(sf)):'';
    if(kept.length===0 && !hasDefault){
      // remove whole import statement incl trailing newline
      let end=st.getEnd(sf);
      let s=st.getStart(sf);
      // include leading comments? no.
      while(end<src.length && (src[end]==='\n')){ end++; break; }
      edits.push({start:s,end,newText:'',type:'stmt'});
      report.removedImports++;
    } else {
      const parts=[];
      if(hasDefault) parts.push(defaultText);
      if(kept.length) parts.push('{ '+kept.map(i=>src.slice(i.el.getStart(sf),i.el.getEnd(sf))).join(', ')+' }');
      const typeOnly=ic.isTypeOnly?'type ':'';
      let text=`import ${typeOnly}${parts.join(', ')} from ${modText}`;
      if(ic.isTypeOnly&&kept.length) text=`import type ${parts.join(', ')} from ${modText}`;
      const s=st.getStart(sf), e=st.getEnd(sf);
      edits.push({start:s,end:e,newText:text,type:'decl'});
      report.removedImports++;
    }
  }
  if(!edits.length) continue;
  edits.sort((a,b)=>b.start-a.start);
  let out=src;
  for(const ed of edits){ out=out.slice(0,ed.start)+ed.newText+out.slice(ed.end); }
  fs.writeFileSync(file,out);
  report.files++;
}
console.log(JSON.stringify(report,null,1));
