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
const btnExport = document.getElementById('btn-export');

const TRANSLATE_ENDPOINT = '/.netlify/functions/translate'; // Netlify Functions endpoint

// Endüstriyel yıkama makinesi terim sözlüğü
const glossary = {
  'tr-en': {
    'yıkama': 'washing',
    'durulama': 'rinsing',
    'sıkma': 'spinning',
    'kurutma': 'drying',
    'tank': 'tank',
    'piston': 'piston',
    'valf': 'valve',
    'pompa': 'pump',
    'motor': 'motor',
    'kapak': 'door',
    'kilit': 'lock',
    'seviye': 'level',
    'sıcaklık': 'temperature',
    'basınç': 'pressure',
    'tahliye': 'drain',
    'su girişi': 'water inlet',
    'kapanamadı': 'cannot be closed',
    'açılamadı': 'cannot be opened',
    'hata': 'error',
    'alarm': 'alarm',
    'uyarı': 'warning',
    'arıza': 'failure',
    'sensör': 'sensor',
    'aktüatör': 'actuator',
    'program': 'program',
    'döngü': 'cycle',
    'yükleme': 'loading',
    'boşaltma': 'unloading'
  }
};

// Terimi önce sözlükten kontrol et, yoksa API'ye gönder
async function translateText(text, source, target){
  if(!text) return '';
  
  // Sözlük kontrolü
  const glossaryKey = `${source}-${target}`;
  if(glossary[glossaryKey]){
    const lowerText = text.toLowerCase().trim();
    if(glossary[glossaryKey][lowerText]){
      // Büyük/küçük harf korunarak döndür
      const translated = glossary[glossaryKey][lowerText];
      return text[0] === text[0].toUpperCase() 
        ? translated.charAt(0).toUpperCase() + translated.slice(1)
        : translated;
    }
  }
  
  // API'ye gönder (context olmadan - çeviride sorun yaratıyor)
  try{
    const res = await fetch(TRANSLATE_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ text: text, source: source || 'auto', target })
    });
    if(!res.ok) {
      console.error(`Translation API error: ${res.status} ${res.statusText}`);
      const errorText = await res.text();
      console.error('Error details:', errorText);
      return text;
    }
    const j = await res.json();
    let result = j.translated || j.translatedText || text;
    return result;
  }catch(err){
    console.error('Translation fetch error:', err);
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
    
    console.log('Name rows found:', nameRows);
    console.log('Selected languages:', selectedLangs);
    
    // Kaynak dil (language1 = column B/1)
    const sourceLang = selectedLangs[0] || 'auto';
    
    let translationCount = 0;
    
    for(const r of nameRows){
      // Name: satırındaki B sütunu (column 1)
      const bcell = document.querySelector(`.cell[data-r='${r}'][data-c='1']`);
      const bval = bcell ? (bcell.innerText||'').trim() : '';
      
      console.log(`Row ${r}: bval="${bval}"`);
      
      if(bval === '') {
        console.log(`Row ${r}: Skipping - empty bval`);
        continue;
      }
      
      // Bir alt satırda "Status:" var, onun B sütunundaki (column 1) sayıyı al
      const statusRowA = document.querySelector(`.cell[data-r='${r + 1}'][data-c='0']`);
      const statusRowAValue = statusRowA ? (statusRowA.innerText||'').trim() : '';
      
      let statusNum = 0;
      
      // Eğer bir alt satırda "Status:" varsa, B sütunundaki sayıyı al
      if(statusRowAValue.toLowerCase().includes('status')){
        const statusCell = document.querySelector(`.cell[data-r='${r + 1}'][data-c='1']`);
        const statusValue = statusCell ? (statusCell.innerText||'').trim() : '';
        statusNum = parseInt(statusValue) || 0;
        console.log(`Row ${r}: Found Status row at ${r+1}, value = "${statusValue}", parsed as ${statusNum}`);
      } else {
        // Eski mantık: A sütununda doğrudan sayı varsa
        statusNum = parseInt(statusRowAValue) || 0;
        console.log(`Row ${r}: No Status label, checking A column value = "${statusRowAValue}", parsed as ${statusNum}`);
      }
      
      if(statusNum === 0) {
        console.log(`Row ${r}: Status is 0, skipping translation`);
        continue;
      }
      
      // Hedef satırları belirle: Name:'in 3 satır altından başlayarak statusNum kadar satır
      // Name: r=2, Status=3 -> Satır 5,6,7 (r+3, r+4, r+5) için işlem yap
      // Bu satırlarda A sütununda 0, 1, 2 yazıyor olacak
      const targetRows = [];
      for(let i = 0; i < statusNum; i++){
        targetRows.push(r + 3 + i);
      }
      
      console.log(`Row ${r}: Target rows for translation:`, targetRows);
      
      // Her hedef satır için çeviri yap
      for(const targetRow of targetRows) {
        // B sütununa (column 1) çeviriyi yaz
        const targetCellB = document.querySelector(`.cell[data-r='${targetRow}'][data-c='1']`);
        if(!targetCellB) {
          console.log(`Row ${targetRow}, Col 1 (B): Cell not found`);
          continue;
        }
        
        // B sütunu boşsa çevir
        const existingValueB = (targetCellB.innerText || '').trim();
        if(existingValueB !== '') {
          console.log(`Row ${targetRow}, Col 1 (B): Already has value "${existingValueB}", skipping`);
        } else {
          // Kaynak dilden hedef dile çevir (Language1 = sourceLang)
          console.log(`Row ${targetRow}, Col 1 (B): Translating "${bval}" from ${sourceLang} to ${sourceLang}`);
          // B sütunu kaynak dil ile aynı, direkt kopyala
          targetCellB.innerText = bval;
          translationCount++;
          console.log(`Updated cell [${targetRow}][1] with "${bval}"`);
        }
        
        // Language2-8 için C-I sütunları (columns 2-8)
        for(let colIndex=2; colIndex<=8; colIndex++){
          // selectedLangs[1] = Language2 (column C)
          // selectedLangs[2] = Language3 (column D)
          // ...
          // selectedLangs[7] = Language8 (column I)
          const langIndex = colIndex - 1;
          const targetLang = selectedLangs[langIndex] || 'en';
          
          // Eğer hedef dil kaynak dil ile aynıysa veya 'auto' ise, çevirme
          if(targetLang === 'auto' || targetLang === sourceLang){
            console.log(`Row ${targetRow}, Col ${colIndex}: Skipping - same language or auto`);
            continue;
          }
          
          const targetCell = document.querySelector(`.cell[data-r='${targetRow}'][data-c='${colIndex}']`);
          if(!targetCell) {
            console.log(`Row ${targetRow}, Col ${colIndex}: Cell not found`);
            continue;
          }
          
          // Sadece boş hücreleri çevir
          const existingValue = (targetCell.innerText || '').trim();
          if(existingValue !== '') {
            console.log(`Row ${targetRow}, Col ${colIndex}: Already has value "${existingValue}", skipping`);
            continue;
          }
          
          console.log(`Row ${targetRow}, Col ${colIndex}: Translating "${bval}" from ${sourceLang} to ${targetLang}`);
          
          const translated = await translateText(bval, sourceLang, targetLang);
          console.log(`Translated result: "${translated}"`);
          
          targetCell.innerText = translated;
          translationCount++;
          console.log(`Updated cell [${targetRow}][${colIndex}]`);
          
          // Rate limiting: 250ms bekleme
          await new Promise(resolve => setTimeout(resolve, 250));
        }
      }
    }
    
    btnTranslate.disabled = false;
    btnTranslate.textContent = 'Çevir';
    console.log(`Translation completed. ${translationCount} cells updated.`);
    alert(`Çeviri tamamlandı. ${translationCount} hücre güncellendi.`);
  });
}

let sheetData = []; // 2D array
let numRows = 0, numCols = 0;
let selecting = false;
let anchor = null; // {r,c}
let focusCell = {r:0,c:0};
let lastCopy = null; // TSV string for visual copy

// --- Undo/Redo history ---
let history = [];
let redoStack = [];
const MAX_HISTORY = 200;

function recordAction(act) {
  if (!act) return;
  history.push(act);
  if (history.length > MAX_HISTORY) history.shift();
  redoStack = [];
}

function applyAction(act, reverse) {
  if (!act || act.type !== 'set' || !Array.isArray(act.changes)) return;
  for (const ch of act.changes) {
    const r = ch.r, c = ch.c;
    const val = reverse ? ch.oldValue : ch.newValue;
    const el = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
    if (el) el.innerText = val;
  }
}

function performUndo() {
  if (history.length === 0) return false;
  const act = history.pop();
  applyAction(act, true);
  redoStack.push(act);
  return true;
}

function performRedo() {
  if (redoStack.length === 0) return false;
  const act = redoStack.pop();
  applyAction(act, false);
  history.push(act);
  return true;
}

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
      td.addEventListener('blur', cellBlur);
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
  if (e.shiftKey && anchor) {
    // Shift ile aralık seçimi
    applySelection(anchor, {r, c});
  } else {
    focusCell = {r, c};
    anchor = {r, c};
    applySelection(anchor, anchor);
  }
}

function cellFocus(e){
  const r = Number(this.dataset.r), c = Number(this.dataset.c);
  focusCell = {r,c};
  // Düzenleme öncesi değeri sakla
  this.dataset._prev = this.innerText || '';
}

function cellBlur(e){
  const r = Number(this.dataset.r), c = Number(this.dataset.c);
  const prev = this.dataset._prev || '';
  const cur = this.innerText || '';
  if (prev !== cur) {
    const act = { type: 'set', changes: [{ r, c, oldValue: prev, newValue: cur }] };
    recordAction(act);
  }
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
  const changes = [];
  for(let r=s.r1;r<=s.r2;r++) for(let c=s.c1;c<=s.c2;c++){
    const el = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
    if(el){
      changes.push({ r, c, oldValue: el.innerText || '', newValue: '' });
      el.innerText = '';
    }
  }
  if (changes.length) recordAction({ type: 'set', changes });
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
  const changes = [];
  for(let r=0;r<rows.length;r++){
    for(let c=0;c<rows[r].length;c++){
      const rr = startR + r, cc = startC + c;
      const el = document.querySelector(`.cell[data-r='${rr}'][data-c='${cc}']`);
      if(el){
        const oldv = el.innerText || '';
        const newv = rows[r][c] || '';
        if(oldv !== newv){
          changes.push({ r: rr, c: cc, oldValue: oldv, newValue: newv });
          el.innerText = newv;
        }
      }
    }
  }
  if (changes.length) recordAction({ type: 'set', changes });
}

function deleteSelection(){
  const s = getSelectionRange();
  const changes = [];
  for(let r=s.r1;r<=s.r2;r++) for(let c=s.c1;c<=s.c2;c++){
    const el = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
    if(el) {
      changes.push({ r, c, oldValue: el.innerText || '', newValue: '' });
      el.innerText = '';
    }
  }
  if (changes.length) recordAction({ type: 'set', changes });
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
  if(e.ctrlKey && e.key.toLowerCase()==='z'){ e.preventDefault(); performUndo(); }
  if(e.ctrlKey && e.key.toLowerCase()==='y'){ e.preventDefault(); performRedo(); }
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
      // XLSX.js CSV'yi de okuyabilir
      const workbook = XLSX.read(data, {type:'array'});
      const first = workbook.SheetNames[0];
      const sheet = workbook.Sheets[first];
      const arr = XLSX.utils.sheet_to_json(sheet, {header:1, raw:false});
      buildFromSheetArray(arr);
    }catch(err){
      showError('Dosya okunurken hata oluştu.');
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

// Dışarı Aktar fonksiyonu
function exportData(format) {
  if (!sheetData || sheetData.length === 0) {
    alert('Dışa aktarılacak veri yok!');
    return;
  }
  
  // Mevcut hücre verilerini sheetData'ya kaydet
  for(let r=0; r<numRows; r++){
    for(let c=0; c<numCols; c++){
      const el = document.querySelector(`.cell[data-r='${r}'][data-c='${c}']`);
      if(el) sheetData[r][c] = el.innerText || '';
    }
  }
  
  if(format === 'csv'){
    // CSV olarak dışa aktar
    const csvContent = sheetData.map(row => 
      row.map(cell => {
        const str = String(cell || '');
        // Virgül veya tırnak içeriyorsa tırnakla çevrele
        if(str.includes(',') || str.includes('"') || str.includes('\n')){
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'export_' + new Date().getTime() + '.csv';
    link.click();
  } else if(format === 'xlsx'){
    // Excel olarak dışa aktar
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, 'export_' + new Date().getTime() + '.xlsx');
  }
}

// Dışarı Aktar butonu
if(btnExport){
  btnExport.addEventListener('click', ()=>{
    // Kullanıcıya format seçimi sun
    const formatChoice = prompt('Dışa aktarma formatını seçin:\n1 - Excel (.xlsx)\n2 - CSV\n\nSeçiminizi girin (1 veya 2):', '1');
    
    if(formatChoice === null) return; // İptal edildi
    
    const format = formatChoice === '2' ? 'csv' : 'xlsx';
    exportData(format);
  });
}
