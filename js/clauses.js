// CLAUSE INDEXES: one knowledge base per domain (travel policy, Samsung Care warranty).
// Each clause = id, text, keywords (for retrieval), deps (situation facts it needs),
// and ev(facts) -> APPLIES | NOT | UNKNOWN (deterministic condition check).
// Add or edit clauses here to adapt ClauseStream to another policy.
const TRAVEL_CL=[
{id:'C1',grp:'limit',name:'standard',limit:5000,text:'Standard hotel limit is ₹5,000 per night for domestic trips.',kw:'hotel limit standard domestic night',deps:['trip_type'],ev:f=>f.trip_type==null?'UNKNOWN':f.trip_type==='DOMESTIC'?'APPLIES':'NOT'},
{id:'C2',grp:'limit',name:'international',limit:8000,text:'International hotel limit is ₹8,000 per night for trips abroad.',kw:'hotel limit international abroad night',deps:['trip_type'],ev:f=>f.trip_type==null?'UNKNOWN':f.trip_type==='INTERNATIONAL'?'APPLIES':'NOT'},
{id:'C3',grp:'appr',text:'Hotel bookings made less than 3 days before travel need director approval.',kw:'booking approval director late',deps:['lead_days'],ev:f=>f.lead_days==null?'UNKNOWN':f.lead_days<3?'APPLIES':'NOT'},
{id:'C4',grp:'air',text:'Flights must be economy class for journeys under 6 hours.',kw:'flight economy class air',deps:[],ev:()=>'UNKNOWN'},
{id:'C5',grp:'rcpt',text:'Receipts are required for any hotel claim above ₹2,000.',kw:'receipt claim hotel',deps:['amount'],ev:f=>f.amount==null?'UNKNOWN':f.amount>2000?'APPLIES':'NOT'}];

// ---------- Domain 1: company travel policy ----------
function travelExt(m,pend){const f={};let x;
 if((x=m.match(/(?:₹|rs\.?|inr)\s*([\d,]+)/i))||(x=m.match(/([\d,]{3,})\s*(?:rupees|rs)/i)))f.amount=+x[1].replace(/,/g,'');
 else if(pend==='amount'&&(x=m.match(/\d[\d,]*/)))f.amount=+x[0].replace(/,/g,'');
 if(/not (an? )?international|domestic|within india|delhi|mumbai|bangalore|chennai|goa|pune|hyderabad/i.test(m))f.trip_type='DOMESTIC';
 else if(/international|abroad|overseas|singapore|london|dubai|tokyo|paris|usa|foreign/i.test(m))f.trip_type='INTERNATIONAL';
 else if(pend==='trip_type'){if(/^\s*(no|nope|nah)\b/i.test(m))f.trip_type='DOMESTIC';else if(/^\s*(yes|yeah|yep|yup)\b/i.test(m))f.trip_type='INTERNATIONAL'}
 if(x=m.match(/(\d+)\s*days?\s*(?:before|prior|ahead|in advance)/i))f.lead_days=+x[1];
 else if(/\b(a|one)\s+week\s+(before|prior|ahead)/i.test(m))f.lead_days=7;
 else if(pend==='lead_days'&&(x=m.match(/^\D*(\d+)/)))f.lead_days=+x[1];
 return f}
function travelClaims(){const F=S.facts,st=S.status,cs=[],intro=[];
 const lim=CL.find(c=>c.grp==='limit'&&st[c.id]==='APPLIES');let q=null;S.pending=null;
 if(F.amount==null){q='What is the hotel amount per night you want to claim?';S.pending='amount'}
 else if(!lim){intro.push(`I found two limits that could apply: ${cite('C1')} ₹5,000 for domestic and ${cite('C2')} ₹8,000 for international trips. Which one applies depends on the trip type, so I won't guess.`);q='Is this hotel for an international trip?';S.pending='trip_type'}
 else{const ok=F.amount<=lim.limit;cs.push({key:'limit',t:`${inr(F.amount)} is ${ok?'within':'above'} the ${lim.name} limit of ${inr(lim.limit)}/night ${cite(lim.id)}.`,ids:[lim.id],req:{[lim.id]:'APPLIES'},deps:['amount','trip_type'],chk:()=>ok===(F.amount<=lim.limit)});
  if(F.lead_days!=null){const late=F.lead_days<3;cs.push({key:'appr',t:late?`Director approval is required because you booked ${F.lead_days} day${F.lead_days==1?'':'s'} before travel ${cite('C3')}.`:`No director approval is needed since you booked ${F.lead_days} days ahead ${cite('C3')}.`,ids:['C3'],req:{C3:late?'APPLIES':'NOT'},deps:['lead_days'],chk:()=>late===(F.lead_days<3)})}
  else{q='One more fact could change this: how many days before travel did you book?';S.pending='lead_days'}}
 if(st.C5==='APPLIES')cs.push({key:'rcpt',t:`Keep your receipts, because claims above ₹2,000 need them ${cite('C5')}.`,ids:['C5'],req:{C5:'APPLIES'},deps:['amount'],chk:()=>F.amount>2000});
 return{cs,intro,q}}

// ---------- Domain 2: Samsung Care warranty (English + Hinglish) ----------
const hi=m=>/\b(mera|meri|mere|hai|nahi|nahin|haan|toot|gir|mahine|saal|kya|kharab|gaya|karo)\b/i.test(m);
const L=(en,h)=>S.hi?h:en;
function careExt(m,pend){const f={};let x;if(hi(m))S.hi=true;
 if(/\b(defect|stopped working|not (turning|switching) on|green line|battery drain|flicker|faulty|kharab|dead)\b/i.test(m))f.issue='DEFECT';
 else if(/crack|drop|broke|water|liquid|spill|accident|damage|toot|\bgir\b/i.test(m))f.issue='ACCIDENTAL';
 if(x=m.match(/(\d+)\s*(?:months?|mo|mahine)/i))f.age_months=+x[1];
 else if(x=m.match(/(\d+)\s*(?:years?|yrs?|saal)/i))f.age_months=+x[1]*12;
 else if(pend==='age_months'&&(x=m.match(/\d+/)))f.age_months=+x[0];
 if(/\b(no|without|don'?t|do not|never|nahi|nahin)\b.{0,25}(care|plan)/i.test(m))f.care_plus='NO';
 else if(/care\+|activated|insured|protection plan/i.test(m))f.care_plus='YES';
 else if(pend==='care_plus'){if(/^\s*(no|nope|nah|nahi|nahin)\b/i.test(m))f.care_plus='NO';else if(/^\s*(yes|yeah|yep|haan)\b/i.test(m))f.care_plus='YES'}
 return f}
function careClaims(){const F=S.facts,st=S.status,cs=[];let q=null;S.pending=null;
 if(F.issue==null){q=L('What happened to the phone: was it dropped or cracked, or did it stop working on its own?','Phone ko kya hua: gir gaya ya toot gaya, ya khud kharab ho gaya?');S.pending='issue'}
 else if(F.issue==='DEFECT'&&F.age_months==null){q=L('How many months ago did you buy it?','Aapne ye phone kitne mahine pehle kharida?');S.pending='age_months'}
 else if(F.issue==='ACCIDENTAL'&&F.care_plus==null){q=L('Do you have an active Samsung Care+ plan?','Kya aapke paas active Samsung Care+ plan hai?');S.pending='care_plus'}
 const add=(key,id,t,deps)=>cs.push({key,t:t+' '+cite(id),ids:[id],req:{[id]:'APPLIES'},deps,chk:()=>st[id]==='APPLIES'});
 if(st.W1==='APPLIES')add('cov','W1',L('Free repair under the 12-month standard warranty.','12 mahine ki standard warranty mein repair free hai.'),['issue','age_months']);
 if(st.W2==='APPLIES')add('cov','W2',L('Covered by your Samsung Care+ plan, with a service fee per claim.','Aapke Samsung Care+ plan mein covered hai, per claim service fee ke saath.'),['issue','care_plus']);
 if(st.W3==='APPLIES')add('cov','W3',L('Not covered: this repair is chargeable at standard service rates.','Covered nahi hai: ye repair standard service rate par chargeable hogi.'),['issue','age_months','care_plus']);
 if(st.W5==='APPLIES')add('inv','W5',L('Bring your purchase invoice and phone IMEI to the service centre.','Service centre par purchase invoice aur phone ka IMEI le jaayein.'),[]);
 return{cs,intro:[],q}}
const CARE_KW='cracked screen covered repair damage broken phone warranty';
const CARE_CL=[
{id:'W1',text:'Manufacturing defects are repaired free within the 12-month standard warranty.',kw:CARE_KW+' defect free',deps:['issue','age_months'],ev:f=>f.issue==='ACCIDENTAL'||(f.age_months!=null&&f.age_months>12)?'NOT':f.issue==null||f.age_months==null?'UNKNOWN':'APPLIES'},
{id:'W2',text:'Accidental damage (drops, cracks, liquid) is covered only with an active Samsung Care+ plan, with a per-claim service fee.',kw:CARE_KW+' accidental care plan fee',deps:['issue','care_plus'],ev:f=>f.issue==='DEFECT'||f.care_plus==='NO'?'NOT':f.issue==null||f.care_plus==null?'UNKNOWN':'APPLIES'},
{id:'W3',text:'Repairs not covered by warranty or Care+ are chargeable at standard service rates.',kw:CARE_KW+' chargeable paid cost',deps:['issue','age_months','care_plus'],ev:f=>{const d=f.issue==='DEFECT',a=f.issue==='ACCIDENTAL';if((d&&f.age_months!=null&&f.age_months>12)||(a&&f.care_plus==='NO'))return'APPLIES';if((d&&f.age_months!=null)||(a&&f.care_plus==='YES'))return'NOT';return'UNKNOWN'}},
{id:'W4',text:'Trade-in credit is available when upgrading to a new Galaxy device.',kw:'trade upgrade credit new galaxy',deps:[],ev:()=>'UNKNOWN'},
{id:'W5',text:'Bring the purchase invoice and phone IMEI for any service request.',kw:CARE_KW+' invoice imei service',deps:[],ev:()=>'APPLIES'}];
const DOM={
travel:{label:'Company travel policy',CL:TRAVEL_CL,facts:['amount','trip_type','lead_days'],ext:travelExt,claims:travelClaims,greet:'Hi! I am your company assistant with the ClauseStream plug-in. Ask me about hotel reimbursement.',ph:'Ask about a hotel claim…',fb:'Tell me about your hotel claim.',demo:['Can I claim ₹7,000 for my hotel?','Yes, it is for Singapore','I booked it 2 days before the trip'],chips:['What about my flight?']},
care:{label:'Samsung Care warranty (English + Hinglish)',CL:CARE_CL,facts:['issue','age_months','care_plus'],ext:careExt,claims:careClaims,greet:'Hi! I am your Galaxy support assistant with the ClauseStream plug-in. Ask whether a repair is covered, in English or Hinglish.',ph:'Ask: is my cracked screen covered?',fb:'Tell me what happened to your phone.',demo:['My phone screen cracked, is it covered?',"No, I don't have Care+",'Sorry, I just activated Care+ yesterday'],chips:['mera phone ka screen toot gaya, kya covered hai?']}};
let D,CL;
