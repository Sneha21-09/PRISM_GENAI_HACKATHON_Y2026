// UI + pipeline orchestration: renders panels and runs the 6-step flow per message.
function rSit(ch=[]){$('#sit').innerHTML=Object.entries(S.facts).map(([k,v])=>`<tr><td class="k">${k}</td><td class="${ch.includes(k)?'f':''}"><b>${v==null?'<span style="color:var(--un)">UNKNOWN</span>':k==='amount'?inr(v):v}</b></td></tr>`).join('')}
function rCl(re=[]){$('#cls').innerHTML=CL.map(c=>{const s=S.ret[c.id]?S.status[c.id]:'NR',sc=S.scores[c.id]||0;
 return`<div class="cl ${re.includes(c.id)?'flash':''}"><span class="st ${s}">${LBL[s]}</span><b>${c.id}</b> ${c.text}<div class="need">${c.deps.length?'needs: '+c.deps.join(', '):'no situation facts needed'}${sc?' · retrieval score '+sc.toFixed(2):''}</div>${sc?`<div class="bar"><i style="width:${Math.min(100,sc*28)}%"></i></div>`:''}</div>`}).join('')}
function rLed(vs){$('#led').innerHTML=vs.length?vs.map(v=>`<div class="led ${v.ok?'':'bad'}">${v.tag?`<span class="tag">${v.tag}</span>`:''}<span class="vb ${v.r[0].includes('✓')?'good':'badc'}">${v.r[0]}</span><span class="vb ${v.r[1].includes('✓')?'good':'badc'}">${v.r[1]}</span>${v.ok?'':'<span class="vb badc">BLOCKED</span>'}<div>${v.t.replace(/\[(C\d+)\]/g,'<b class="cite">$1</b>')}</div><div class="need" style="font-size:11px;color:var(--mut)">${v.deps?'depends on: '+v.deps.join(', '):''}${v.r[2]?' · '+v.r[2]:''}</div></div>`).join(''):'No claims yet.'}
function rCtx(vs){const g=s=>CL.filter(c=>S.ret[c.id]&&S.status[c.id]===s).map(c=>c.id);
 $('#ctx').textContent=JSON.stringify({situation:S.facts,applies:g('APPLIES'),not_applicable:g('NOT'),unknown:g('UNKNOWN'),ask_user:S.pending,verified_claims:vs.filter(v=>v.ok).map(v=>({ids:v.ids,deps:v.deps}))},null,1);
 const ids=CL.filter(c=>S.ret[c.id]).map(c=>c.id),chip=(a,c)=>a.map(i=>`<span class="st ${c}" style="float:none;margin-right:3px">${i}</span>`).join('')||'–';
 $('#cmp').innerHTML=`<div><b>Standard RAG</b><br>Hands the LLM all “relevant” chunks:<br>${chip(ids,'UNKNOWN')}<br><i>No decision on which applies.</i></div><div><b>ClauseStream</b><br>Applies: ${chip(g('APPLIES'),'APPLIES')}<br>Excluded: ${chip(g('NOT'),'NOT')}<br>Unknown: ${chip(g('UNKNOWN'),'UNKNOWN')}</div>`}
const PIPE=['Track situation','Retrieve clauses','Resolve applicability','Conflict check','Clarify','Verify'];
const rPipe=(n=-1)=>$('#pipe').innerHTML=PIPE.map((p,i)=>`<span class="${i<n?'done':i==n?'on':''}">${i+1}. ${p}</span>`).join('');
const msgs=$('#msgs');
function add(cls,t){const d=document.createElement('div');d.className='m '+cls;if(t)d.textContent=t;msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;return d}
async function stream(box,t,cls){const p=document.createElement('p');if(cls)p.className=cls;box.appendChild(p);let h='';
 for(const w of t.split(' ')){h+=w.replace(/\[(C\d+)\]/g,'<b class="cite">$1</b>')+' ';p.innerHTML=h;msgs.scrollTop=msgs.scrollHeight;await sleep(26)}}
async function send(m){m=m.trim();if(!m||S.busy)return;S.busy=true;$('#send').disabled=true;$('#inp').value='';add('u',m);
 const f=ext(m,S.pending),ch=[];for(const k in f)if(S.facts[k]!==f[k]){S.facts[k]=f[k];ch.push(k)}S.text+=' '+m;
 rPipe(0);await sleep(320);rSit(ch);
 rPipe(1);await sleep(320);const rs=retrieve(S.text);rs.forEach(r=>{S.scores[r.id]=r.s;if(r.s>0.5)S.ret[r.id]=1});
 rPipe(2);await sleep(320);const re=[],reuse=[];
 CL.filter(c=>S.ret[c.id]).forEach(c=>{if(!(c.id in S.status)||c.deps.some(d=>ch.includes(d))){S.status[c.id]=c.ev(S.facts);re.push(c.id)}else reuse.push(c.id)});
 const tot=re.length+reuse.length,tr=$('#trace');if(!S.log++)tr.innerHTML='';
 tr.insertAdjacentHTML('afterbegin',`<div><b>Turn ${S.log}</b> · new facts: ${ch.join(', ')||'none'}<br>Δ re-evaluated <b>${re.length}/${tot}</b>: ${re.join(', ')||'–'} · reused: ${reuse.join(', ')||'–'}${reuse.length?` <span style="color:var(--ok)">(saved ${reuse.length} re-checks)</span>`:''}</div>`);
 rCl(re);
 rPipe(3);await sleep(320);const lc=CL.filter(c=>c.grp==='limit'&&S.status[c.id]==='APPLIES').length;
 rPipe(4);await sleep(320);const R=claims();
 rPipe(5);await sleep(320);const vs=verify(R.cs).map(v=>{const p=S.prev[v.key];v.tag=p==null?'NEW':p!==v.t?'REVISED':'';return v});vs.forEach(v=>S.prev[v.key]=v.t);S.vs=vs;
 rLed(vs);rCtx(vs);rPipe(6);
 const a=add('a');if(lc>1)add('sys','Conflict: two limit clauses apply. International takes precedence.');
 for(const t of R.intro)await stream(a,t);
 for(const v of vs.filter(v=>v.ok))await stream(a,v.t);
 if(R.q)await stream(a,R.q,'q');if(!R.intro.length&&!vs.length&&!R.q)await stream(a,D.fb);
 S.busy=false;$('#send').disabled=false;$('#inp').focus()}
function bad(){if(!S.vs)return;const b={key:'bad',t:'Meals are reimbursed up to ₹2,000 per day [C9].',ids:['C9'],req:{},deps:[],tag:'HOST LLM'};
 S.vs=[...S.vs.filter(v=>v.key!=='bad'),...verify([b])];rLed(S.vs);rCtx(S.vs);add('sys','Verifier blocked 1 unsupported claim: clause C9 does not exist in the index.')}
async function demo(){$('#demo').disabled=true;rst();for(const m of D.demo){await send(m);await sleep(1600)}$('#demo').disabled=false}
function rst(){reset();msgs.innerHTML='';$('#trace').innerHTML='<span style="color:var(--mut)">Waiting for the first message…</span>';rPipe();rSit();rCl();rLed([]);rCtx([]);$('#send').disabled=false;
 $('#inp').placeholder=D.ph;$('#chips').innerHTML=D.demo.concat(D.chips).map(m=>`<button>${m}</button>`).join('');add('a',D.greet)}
$('#chips').onclick=e=>{if(e.target.tagName==='BUTTON')send(e.target.textContent)};
$('#send').onclick=()=>send($('#inp').value);$('#inp').onkeydown=e=>{if(e.key==='Enter')send($('#inp').value)};
$('#dom').onchange=e=>{setDomain(e.target.value);rst()};$('#demo').onclick=demo;$('#bad').onclick=bad;$('#rst').onclick=rst;rst();
