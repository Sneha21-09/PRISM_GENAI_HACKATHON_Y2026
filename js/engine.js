// ENGINE: retrieval, situation extraction, claim building and verification.
// No DOM access here, so it can be tested in Node (see tests/engine.test.js).
const STOP=new Set('i a an the to for my is it its of in on and or be was yes no want days day before trip than any per made are this can me how what about'.split(' '));
const tok=s=>s.toLowerCase().replace(/[^a-z0-9₹\s]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w)).map(w=>w.replace(/s$/,''));
let bags=[];
const idf=t=>Math.log(1+CL.length/(1+bags.filter(b=>b.has(t)).length));
const LBL={APPLIES:'APPLIES',NOT:'NOT APPLICABLE',UNKNOWN:'UNKNOWN',NR:'not retrieved'};
const cite=id=>`[${id}]`;let S;
const reset=()=>{S={facts:Object.fromEntries(D.facts.map(k=>[k,null])),status:{},ret:{},scores:{},text:'',pending:null,prev:{},busy:false,log:0}};
function retrieve(q){const qt=new Set(tok(q));return CL.map((c,i)=>{let s=0;qt.forEach(t=>{if(bags[i].has(t))s+=idf(t)});
 if(s>0)s+=0.3*c.deps.filter(d=>S.facts[d]!=null).length;return{id:c.id,s}})}
function verify(cs){return cs.map(c=>{const miss=c.ids.filter(i=>!CL.some(x=>x.id===i));let r;
 if(miss.length)r=['ID ✗','Entail ✗','no clause '+miss.join(',')+' in index'];
 else if(!c.ids.every(i=>S.status[i]===c.req[i])||(c.chk&&!c.chk()))r=['ID ✓','Entail ✗','not entailed by clause'];
 else r=['ID ✓','Entail ✓',''];return{...c,ok:!r[0].includes('✗')&&!r[1].includes('✗'),r}})}

// Domain plumbing: the engine is domain-agnostic; each domain supplies clauses, ext() and claims().
const ext=(m,p)=>D.ext(m,p),claims=()=>D.claims();
function setDomain(k){D=DOM[k];CL=D.CL;bags=CL.map(c=>new Set(tok(c.text+' '+c.kw)))}
setDomain('travel');
