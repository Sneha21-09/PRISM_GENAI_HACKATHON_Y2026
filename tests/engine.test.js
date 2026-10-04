// Run: node tests/engine.test.js   (no dependencies)
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=['utils','clauses','engine'].map(f=>fs.readFileSync(__dirname+'/../js/'+f+'.js','utf8')).join('\n')
 +'\n;this.api={get CL(){return CL},ext,retrieve,claims,verify,reset,setDomain,get S(){return S}};';
const ctx={};vm.createContext(ctx);vm.runInContext(code,ctx);const {ext,retrieve,claims,verify,reset}=ctx.api;
const S=()=>ctx.api.S;let n=0;const t=(name,fn)=>{fn();n++;console.log('ok -',name)};
const evalAll=()=>ctx.api.CL.forEach(c=>{if(S().ret[c.id])S().status[c.id]=c.ev(S().facts)});
t('extracts amount, trip type, lead days',()=>{
 assert.equal(ext('Can I claim ₹7,000 for my hotel?',null).amount,7000);
 assert.equal(ext('Yes, it is for Singapore',null).trip_type,'INTERNATIONAL');
 assert.equal(ext('I booked it 2 days before the trip',null).lead_days,2);
 assert.equal(ext('no',"trip_type").trip_type,'DOMESTIC')});
t('retrieval skips unrelated clauses (flight rule C4)',()=>{
 reset();S().facts.amount=7000;const r=retrieve('claim 7000 hotel');
 assert.ok(r.find(x=>x.id==='C1').s>0.5);assert.ok(r.find(x=>x.id==='C4').s===0)});
t('unknown trip type -> asks instead of guessing',()=>{
 reset();S().facts.amount=7000;retrieve('claim hotel').forEach(r=>{if(r.s>0.5)S().ret[r.id]=1});evalAll();
 const R=claims();assert.equal(S().pending,'trip_type');assert.ok(/international/i.test(R.q));
 assert.equal(S().status.C1,'UNKNOWN')});
t('international + 2 days -> within limit and director approval',()=>{
 S().facts.trip_type='INTERNATIONAL';S().facts.lead_days=2;evalAll();const R=claims();
 assert.ok(R.cs.some(c=>/within the international limit/.test(c.t)));
 assert.ok(R.cs.some(c=>/Director approval is required/.test(c.t)));
 assert.ok(verify(R.cs).every(v=>v.ok))});
t('verifier blocks claim citing a clause that does not exist',()=>{
 const v=verify([{key:'x',t:'x [C9]',ids:['C9'],req:{},deps:[]}])[0];assert.equal(v.ok,false)});
t('Samsung Care domain: cracked screen -> asks about Care+, then revises on new fact (Hinglish too)',()=>{
 ctx.api.setDomain('care');reset();const F=()=>S().facts;
 Object.assign(F(),ext('mera phone ka screen toot gaya, kya covered hai?',null));assert.equal(F().issue,'ACCIDENTAL');assert.ok(S().hi);
 retrieve('screen cracked covered').forEach(r=>{if(r.s>0.5)S().ret[r.id]=1});assert.ok(!S().ret.W4);evalAll();
 let R=claims();assert.equal(S().pending,'care_plus');assert.ok(/Care\+/.test(R.q));
 Object.assign(F(),ext("No, I don't have Care+",'care_plus'));evalAll();R=claims();assert.ok(R.cs.some(c=>/chargeable|Covered nahi/.test(c.t)));
 Object.assign(F(),ext('I just activated Care+ yesterday',null));evalAll();R=claims();assert.ok(R.cs.some(c=>/Care\+ plan/.test(c.t)));assert.ok(verify(R.cs).every(v=>v.ok))});
console.log(`\n${n} tests passed`);
