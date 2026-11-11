'use strict';
// Zelfde spelregels en dagelijkse lettervolgorde als spellingbee_nl.cc.
// puzzels.txt is vooraf berekend met C++ mt19937 + std::shuffle,
// zodat de puzzels exact overeenkomen met het originele programma.
const START = '2026-10-27';
const RANKS = ['Beginner','Goede start','Redelijk','Prima','Goed','Lekker','Super','Geweldig','Briljant','De spelkoning(in)'];
const PERCENTAGES = [0,2,5,8,15,25,40,50,70,100];
const $ = id => document.getElementById(id);
let puzzleRows = [], dictionary = [], validWords = new Map(), found = [], letters = [], score = 0, maxScore = 0;
let selectedDate = '', input = '', foundVisible = true, ready = false, feedbackTimer;
const msDay = 86400000;
function dateNumber(d){const [y,m,day] = d.split('-').map(Number);return Date.UTC(y,m-1,day);}
function dutchToday(){
  const items = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const p=Object.fromEntries(items.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;
}
function shiftDay(d,n){return new Date(dateNumber(d)+n*msDay).toISOString().slice(0,10);}
function dateLabel(d){return new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(dateNumber(d)));}
function status(message,kind=''){$('feedback').textContent=message;$('feedback').className=`feedback ${kind}`;}
function points(word){return (word.length===4?1:word.length) + (new Set(word).size===7?7:0);}
function clampDate(d){let today=dutchToday();return d<START?START:d>today?today:d;}
function save(){try{localStorage.setItem(`spellingbee:nl:${selectedDate}`,JSON.stringify(found));}catch(e){status('Voortgang kon niet worden opgeslagen','bad');}}
function loadSaved(){try{const data=JSON.parse(localStorage.getItem(`spellingbee:nl:${selectedDate}`)||'[]');return Array.isArray(data)?[...new Set(data.filter(x=>typeof x==='string'&&validWords.has(x)))]:[];}catch(e){return [];}}
function updateScore(){
 score=found.reduce((s,w)=>s+(validWords.get(w)?.score||0),0);
 const limits=PERCENTAGES.map(p=>Math.floor((p*maxScore+50)/100));
 let i=0;while(i+1<limits.length&&limits[i+1]<=score)i++;
 $('score').textContent=score.toLocaleString('nl-NL');$('rank').textContent=RANKS[i];
 $('progress-fill').style.width=(maxScore?Math.min(100,score*100/maxScore):0)+'%';
 $('progress-text').textContent=`${Math.round(maxScore?score*100/maxScore:0)}% van alle punten`;
 $('max-score').textContent=`Maximale score: ${maxScore.toLocaleString('nl-NL')}`;
 $('found-count').textContent=found.length;
}
function drawFound(){
 const box=$('found-words');box.replaceChildren();box.hidden=!foundVisible;
 $('toggle-found').textContent=foundVisible?'Verbergen':'Tonen';$('toggle-found').setAttribute('aria-expanded',String(foundVisible));
 if(!foundVisible)return;
 if(!found.length){const p=document.createElement('p');p.className='empty';p.textContent='Nog geen woorden gevonden. Succes!';box.append(p);return;}
 for(const word of [...found].sort((a,b)=>a.localeCompare(b,'nl'))){const data=validWords.get(word);const el=document.createElement('div');el.className='found-item'+(data.pangram?' pangram':'');
 const text=document.createElement('span');text.textContent=word+(data.pangram?' ★':'');const pts=document.createElement('span');pts.className='points';pts.textContent=`+${data.score}`;el.append(text,pts);box.append(el);}
}
function drawInput(){const el=$('typed-word');el.textContent=input||'Jouw woord…';el.className=input?'':'placeholder';}
function addLetter(c){if(!ready||input.length>=60)return;input+=c;drawInput();}
function drawLetters(){
 const box=$('honeycomb');box.replaceChildren();letters.forEach((letter,i)=>{const b=document.createElement('button');b.className='hex'+(i===0?' center':'');b.dataset.index=String(i);b.type='button';b.textContent=letter.toUpperCase();b.setAttribute('aria-label',i===0?`Verplichte letter ${letter}`:`Letter ${letter}`);b.addEventListener('click',()=>addLetter(letter));box.append(b);});
}
function shuffleLetters(){if(!ready)return;const rest=letters.slice(1);for(let i=rest.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]];}letters=[letters[0],...rest];drawLetters();}
function enterWord(){
 if(!ready)return;
 const w=input.toLowerCase().trim();input='';drawInput();
 if(!w)return;
 if(found.includes(w))return status('Al gevonden','bad');
 const badLetter=[...w].find(c=>!letters.includes(c));
 if(badLetter)return status(`${badLetter.toUpperCase()} is geen geldige letter`,'bad');
 if(!w.includes(letters[0]))return status(`Woord moet een ${letters[0].toUpperCase()} bevatten`,'bad');
 if(w.length<4)return status('Woord is te kort','bad');
 const data=validWords.get(w);
 if(!data)return status('Ongeldig woord','bad');
 found.push(w);save();updateScore();drawFound();status(`Correct! +${data.score} punten${data.pangram?' — PANGRAM!':''}`,'good');
}
function changeDate(d){
 if(!ready)return;
 d=clampDate(d);const index=Math.round((dateNumber(d)-dateNumber(START))/msDay);
 const row=puzzleRows[index];if(!row||row.length!==7){status('Geen puzzel voor deze datum beschikbaar','bad');return;}
 selectedDate=d;letters=row.split('');input='';$('date-title').textContent=dateLabel(d);$('date-picker').value=d;
 $('previous').disabled=d<=START;$('next').disabled=d>=dutchToday();
 const allowed=new Set(letters);validWords=new Map();maxScore=0;
 for(const word of dictionary){if(!word.includes(letters[0]))continue;if([...word].some(c=>!allowed.has(c)))continue;
 const score=points(word);validWords.set(word,{score,pangram:new Set(word).size===7});maxScore+=score;}
 found=loadSaved();drawLetters();drawInput();updateScore();drawFound();status('Maak een woord!');
}
function installHandlers(){
 $('erase').addEventListener('click',()=>{input=input.slice(0,-1);drawInput();});
 $('shuffle').addEventListener('click',shuffleLetters);$('submit').addEventListener('click',enterWord);
 $('previous').addEventListener('click',()=>changeDate(shiftDay(selectedDate,-1)));
 $('next').addEventListener('click',()=>changeDate(shiftDay(selectedDate,1)));
 $('date-picker').addEventListener('change',e=>{if(e.target.value)changeDate(e.target.value);});
 $('toggle-found').addEventListener('click',()=>{foundVisible=!foundVisible;drawFound();});
 window.addEventListener('keydown',e=>{
  if(e.metaKey||e.ctrlKey||e.altKey||e.target instanceof HTMLInputElement)return;
  if(e.key==='Enter'){e.preventDefault();enterWord();}
  else if(e.key==='Backspace'){e.preventDefault();input=input.slice(0,-1);drawInput();}
  else if(/^[a-zA-Z]$/.test(e.key)){e.preventDefault();addLetter(e.key.toLowerCase());}
 });
 // Op iPad kan de speler desgewenst het softwaretoetsenbord gebruiken.
 $('word-entry').addEventListener('click',()=>$('keyboard-input').focus());
 $('keyboard-input').addEventListener('input',e=>{const entered=e.target.value.toLowerCase().replace(/[^a-z]/g,'');for(const c of entered)addLetter(c);e.target.value='';});
 $('keyboard-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();enterWord();}else if(e.key==='Backspace'){e.preventDefault();input=input.slice(0,-1);drawInput();}});
}
async function start(){
 installHandlers();const today=dutchToday();$('date-picker').max=today;
 try{
  const [p,w]=await Promise.all([fetch('puzzels.txt'),fetch('woorden.txt')]);
  if(!p.ok||!w.ok)throw new Error('Spelbestanden niet gevonden');
  puzzleRows=(await p.text()).trim().split(/\r?\n/);
  dictionary=(await w.text()).trim().split(/\r?\n/);
  ready=true;
  changeDate(today);
  if ($('loading-info')) {
    $('loading-info').textContent =
      `${dictionary.length.toLocaleString('nl-NL')} woorden beschikbaar.`;
  } }catch(e){status('Laden mislukt. Open de website via GitHub Pages, niet als los bestand.','bad');console.error(e);}
}
start();
