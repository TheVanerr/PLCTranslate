/* Spreadsheet app with selection, copy/cut/paste, delete */
const fileInput = document.getElementById('file-input');
const dropArea = document.getElementById('drop-area');
const tableContainer = document.getElementById('table-container');
const btnCopy = document.getElementById('btn-copy');
const btnCut = document.getElementById('btn-cut');
const btnPaste = document.getElementById('btn-paste');
const btnDelete = document.getElementById('btn-delete');
const btnSelectAll = document.getElementById('btn-select-all');
// language comboboxes (language1..language8)
const langBoxes = Array.from(document.querySelectorAll('.langbox'));
const selectedLangs = new Array(8).fill(null).map((_,i)=>{
  const el = langBoxes[i];
  return el ? el.value : null;
});

langBoxes.forEach((el, idx)=>{
  el.addEventListener('change', ()=>{ selectedLangs[idx] = el.value; });
});
const btnTranslate = document.getElementById('btn-translate');

const TRANSLATE_ENDPOINT = '/.netlify/functions/translate'; // Netlify Functions endpoint

async function translateText(text, source, target){
  if(!text) return '';
  try{
    const res = await fetch(TRANSLATE_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ text, source: source || 'auto', target })
    });
    if(!res.ok) return text;
    const j = await res.json();
    return j.translated || j.translatedText || j.translatedText || text;
  }catch(err){
    return text;
  }
}

function findNameRows(){
  const rows = [];
  for(let r=0;r<numRows;r++){
    const a = document.querySelector(`.cell[data-r='${r}'][data-c='0']`);
    if(!a) continue;
    const v = (a.innerText||'').trim();
    if(v.startsWith('Name:')) rows.push(r);
  }
  return rows;
}

if(btnTranslate){
  btnTranslate.addEventListener('click', async ()=>{
    btnTranslate.disabled = true;
    btnTranslate.textContent = 'Çeviriliyor...';
    const nameRows = findNameRows();
    for(const r of nameRows){
      const bcell = document.querySelector(`.cell[data-r='${r}'][data-c='1']`);
      const checkCell = document.querySelector(`.cell[data-r='${r+3}'][data-c='1']`);
      const bval = bcell ? (bcell.innerText||'').trim() : '';
      const checkVal = checkCell ? (checkCell.innerText||'').trim() : '';
      if(bval === '') continue;
      if(checkVal !== '0') continue;
      // translate into language2..language8 -> columns 2..8
      for(let langNum=2; langNum<=8; langNum++){
        const targetLang = selectedLangs[langNum-1] || 'en';
        const translated = await translateText(bval, selectedLangs[0] || 'auto', targetLang);
        const targetCell = document.querySelector(`.cell[data-r='${r}'][data-c='${langNum}']`);
        if(targetCell) targetCell.innerText = translated;
      }
    }
    btnTranslate.disabled = false;
    btnTranslate.textContent = 'Çevir';
    alert('Çeviri tamamlandı.');
  });
}

let sheetData = []; // 2D array
let numRows = 0, numCols = 0;
let selecting = false;
let anchor = null; // {r,c}
let focusCell = {r:0,c:0};
let lastCopy = null; // TSV string for visual copy

function showError(msg){
  tableContainer.innerHTML = `<div class="error">${msg}</div>`;
}

function toColLetter(n){
  let s='';
  while(n>=0){
    s = String.fromCharCode((n%26)+65) + s;
    n = Math.floor(n/26)-1;
  }
  return s;
}

function buildFromSheetArray(arr){
  sheetData = [];
  const rows = arr.length;
  const cols = arr.reduce((m,r)=>Math.max(m, r? r.length:0), 0);
  numRows = Math.max(rows, 50);
  numCols = Math.max(cols, 15);
  for(let r=0;r<numRows;r++){
    sheetData[r]=[];
    for(let c=0;c<numCols;c++){
      sheetData[r][c] = (arr[r] && arr[r][c] != null) ? String(arr[r][c]) : '';
    }
  }
  renderSheet();
}

function renderSheet(){
  const table = document.createElement('table');
  table.className='sheet';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  // top-left corner
  const corner = document.createElement('th');
  corner.className='col-header';
  corner.textContent='';
  headRow.appendChild(corner);
  for(let c=0;c<numCols;c++){
    const th = document.createElement('th');
    th.className='col-header';
    th.textContent = toColLetter(c);
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for(let r=0;r<numRows;r++){
    const tr = document.createElement('tr');
    const rh = document.createElement('th');
    rh.className='row-header';
    rh.textContent = String(r+1);
    tr.appendChild(rh);
    for(let c=0;c<numCols;c++){
      const td = document.createElement('td');
      td.className='cell';
      td.contentEditable = true;
      td.dataset.r = r;
      td.dataset.c = c;
      td.innerText = sheetData[r][c] || '';
      td.addEventListener('mousedown', cellMouseDown);
      td.addEventListener('mouseenter', cellMouseEnter);
      td.addEventListener('click', cellClick);
      td.addEventListener('focus', cellFocus);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  tableContainer.innerHTML='';
  tableContainer.appendChild(table);
}

function normalizeSel(a,b){
  const r1=Math.min(a.r,b.r), r2=Math.max(a.r,b.r);
  const c1=Math.min(a.c,b.c), c2=Math.max(a.c,b.c);
  return {r1,r2,c1,c2};
}

function clearSelectionClasses(){
  document.querySelectorAll('.cell.selected, .cell.copied').forEach(el=>{
    el.classList.remove('selected','copied');
  });
}

function applySelection(a,b){
  clearSelectionClasses();
  const s = normalizeSel(a,b);
  for(let r=s.r1;r<=s.r2;r++){
    for(let c=s.c1;c<=s.c2;c++){
      const el = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
      if(el) el.classList.add('selected');
    }
  }
}

function cellMouseDown(e){
  e.preventDefault();
  const r = Number(this.dataset.r), c = Number(this.dataset.c);
  selecting = true;
  anchor = {r,c};
  focusCell = {r,c};
  applySelection(anchor, anchor);
  // focus editable
  this.focus();
}

function cellMouseEnter(e){
  if(!selecting) return;
  const r = Number(this.dataset.r), c = Number(this.dataset.c);
  applySelection(anchor, {r,c});
}

function cellClick(e){
  const r = Number(this.dataset.r), c = Number(this.dataset.c);
  focusCell = {r,c};
}

function cellFocus(e){
  const r = Number(this.dataset.r), c = Number(this.dataset.c);
  focusCell = {r,c};
}

document.addEventListener('mouseup', ()=>{ selecting=false; });

function getSelectionRange(){
  const first = document.querySelector('.cell.selected');
  if(!first) return {r1:focusCell.r,r2:focusCell.r,c1:focusCell.c,c2:focusCell.c};
  const sels = Array.from(document.querySelectorAll('.cell.selected')).map(el=>({r:Number(el.dataset.r),c:Number(el.dataset.c)}));
  const rs = sels.map(s=>s.r), cs = sels.map(s=>s.c);
  return {r1:Math.min(...rs), r2:Math.max(...rs), c1:Math.min(...cs), c2:Math.max(...cs)};
}

function focusAt(r,c){
  r = Math.max(0, Math.min(numRows-1, r));
  c = Math.max(0, Math.min(numCols-1, c));
  const el = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
  if(el){
    el.focus();
    focusCell = {r,c};
    clearSelectionClasses();
    const a = anchor || {r,c};
    applySelection(a, {r,c});
    el.scrollIntoView({behavior:'auto', block:'nearest', inline:'nearest'});
  }
}

async function copySelection(){
  const s = getSelectionRange();
  const rows = [];
  for(let r=s.r1;r<=s.r2;r++){
    const cols=[];
    for(let c=s.c1;c<=s.c2;c++){
      const el = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
      cols.push(el ? el.innerText.replace(/\r/g,'') : '');
    }
    rows.push(cols.join('\t'));
  }
  const t = rows.join('\n');
  lastCopy = t;
  try{
    await navigator.clipboard.writeText(t);
  }catch(e){
    // fallback
    const ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  // visual cue
  clearSelectionClasses();
  const s2 = normalizeSel({r:s.r1,c:s.c1},{r:s.r2,c:s.c2});
  for(let r=s2.r1;r<=s2.r2;r++) for(let c=s2.c1;c<=s2.c2;c++){
    const el = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
    if(el) el.classList.add('copied');
  }
}

async function cutSelection(){
  await copySelection();
  const s = getSelectionRange();
  for(let r=s.r1;r<=s.r2;r++) for(let c=s.c1;c<=s.c2;c++){
    const el = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
    if(el){ el.innerText=''; }
  }
}

async function pasteClipboard(){
  let text='';
  try{ text = await navigator.clipboard.readText(); }catch(e){
    const ta = document.createElement('textarea'); document.body.appendChild(ta); ta.focus(); document.execCommand('paste'); text = ta.value; ta.remove();
  }
  if(!text) return;
  const rows = text.replace(/\r/g,'').split('\n').map(r=>r.split('\t'));
  const s = getSelectionRange();
  const startR = s.r1, startC = s.c1;
  for(let r=0;r<rows.length;r++){
    for(let c=0;c<rows[r].length;c++){
      const rr = startR + r, cc = startC + c;
      const el = document.querySelector(`.cell[data-r='${rr}'][data-c='${cc}']`);
      if(el) el.innerText = rows[r][c];
    }
  }
}

function deleteSelection(){
  const s = getSelectionRange();
  for(let r=s.r1;r<=s.r2;r++) for(let c=s.c1;c<=s.c2;c++){
    const el = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
    if(el) el.innerText='';
  }
}

// Buttons (only attach if elements exist)
if(btnCopy) btnCopy.addEventListener('click', (e)=> copySelection());
if(btnCut) btnCut.addEventListener('click', (e)=> cutSelection());
if(btnPaste) btnPaste.addEventListener('click', (e)=> pasteClipboard());
if(btnDelete) btnDelete.addEventListener('click', (e)=> deleteSelection());
if(btnSelectAll) btnSelectAll.addEventListener('click', (e)=>{
  anchor = {r:0,c:0};
  applySelection({r:0,c:0},{r:numRows-1,c:numCols-1});
});

// Keyboard shortcuts
document.addEventListener('keydown', async (e)=>{
  if(e.ctrlKey && e.key.toLowerCase()==='c'){ e.preventDefault(); await copySelection(); }
  if(e.ctrlKey && e.key.toLowerCase()==='x'){ e.preventDefault(); await cutSelection(); }
  if(e.ctrlKey && e.key.toLowerCase()==='v'){ e.preventDefault(); await pasteClipboard(); }
  if(e.key==='Delete' || e.key==='Backspace'){ e.preventDefault(); deleteSelection(); }
  if(e.ctrlKey && e.key.toLowerCase()==='a'){ e.preventDefault(); anchor={r:0,c:0}; applySelection({r:0,c:0},{r:numRows-1,c:numCols-1}); }
  // Arrow navigation and scrolling
  const arrows = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
  if(arrows.includes(e.key)){
    e.preventDefault();
    let {r,c} = focusCell;
    if(!e.shiftKey) anchor = {r,c};
    switch(e.key){
      case 'ArrowLeft': c = Math.max(0, c-1); break;
      case 'ArrowRight': c = Math.min(numCols-1, c+1); break;
      case 'ArrowUp': r = Math.max(0, r-1); break;
      case 'ArrowDown': r = Math.min(numRows-1, r+1); break;
    }
    if(e.shiftKey){ applySelection(anchor, {r,c}); }
    else{ applySelection({r,c},{r,c}); }
    focusAt(r,c);
    return;
  }

  // PageUp / PageDown / Home / End for faster movement
  if(e.key==='PageDown' || e.key==='PageUp' || e.key==='Home' || e.key==='End'){
    e.preventDefault();
    let {r,c} = focusCell;
    const step = 10;
    if(e.key==='PageDown') r = Math.min(numRows-1, r+step);
    if(e.key==='PageUp') r = Math.max(0, r-step);
    if(e.key==='Home') c = 0;
    if(e.key==='End') c = numCols-1;
    anchor = {r,c};
    focusAt(r,c);
    return;
  }
});

/* File handling & initial parse */
function handleFile(file){
  if(!file) return showError('Dosya seçilmedi.');
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type:'array'});
      const first = workbook.SheetNames[0];
      const sheet = workbook.Sheets[first];
      const arr = XLSX.utils.sheet_to_json(sheet, {header:1, raw:false});
      buildFromSheetArray(arr);
    }catch(err){
      showError('Excel okunurken hata oluştu.');
      console.error(err);
    }
  };
  reader.onerror = ()=> showError('Dosya okunamadı.');
  reader.readAsArrayBuffer(file);
}

fileInput.addEventListener('change', (e)=>{
  if(e.target.files.length) handleFile(e.target.files[0]);
});

['dragenter','dragover'].forEach(ev=>{
  dropArea.addEventListener(ev, (e)=>{
    e.preventDefault();
    dropArea.classList.add('dragover');
  });
});
['dragleave','drop'].forEach(ev=>{
  dropArea.addEventListener(ev, (e)=>{
    e.preventDefault();
    dropArea.classList.remove('dragover');
  });
});

dropArea.addEventListener('drop', (e)=>{
  if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

dropArea.addEventListener('click', ()=> fileInput.click());

