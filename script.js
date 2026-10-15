const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let values = [], sortBusy = false, sortComparisons = 0, sortSwaps = 0;
const bars = $('bars');

function makeArray() {
  if (sortBusy) return;
  const size = Number($('arraySize').value);
  values = Array.from({length:size}, () => Math.floor(12 + Math.random() * 88));
  $('sizeValue').textContent = size;
  renderBars();
  $('sortStatus').textContent = 'A fresh collection is ready.';
  $('sortStats').textContent = 'Comparisons: 0 · Swaps: 0';
}
function renderBars(highlight = [], sorted = []) {
  bars.innerHTML = '';
  values.forEach((v, i) => {
    const bar = document.createElement('div');
    bar.className = 'bar' + (highlight.includes(i) ? ' compare' : '') + (sorted.includes(i) ? ' sorted' : '');
    bar.style.height = `${v}%`;
    bar.title = String(v);
    bars.appendChild(bar);
  });
}
function updateStats() { $('sortStats').textContent = `Comparisons: ${sortComparisons} · Swaps: ${sortSwaps}`; }
function delayForSpeed() { return [190, 105, 55, 22, 5][Number($('sortSpeed').value)-1]; }
$('sortSpeed').addEventListener('input', () => $('speedValue').textContent = ['Very slow','Slow','Medium','Fast','Very fast'][Number($('sortSpeed').value)-1]);
$('arraySize').addEventListener('input', () => $('sizeValue').textContent = $('arraySize').value);
$('newArray').addEventListener('click', makeArray);

async function animateCompare(i, j, doSwap=false) {
  sortComparisons++;
  renderBars([i,j]);
  updateStats();
  await sleep(delayForSpeed());
  if (doSwap) { [values[i], values[j]] = [values[j], values[i]]; sortSwaps++; }
}
async function bubbleSort() {
  for(let end=values.length-1; end>0; end--){
    let moved=false;
    for(let j=0;j<end;j++){
      await animateCompare(j,j+1,values[j]>values[j+1]);
      if(values[j]>values[j+1]) moved=true;
    }
    renderBars([], Array.from({length:values.length-end},(_,k)=>end+k));
    if(!moved) break;
  }
}
async function selectionSort() {
  for(let i=0;i<values.length;i++){
    let min=i;
    for(let j=i+1;j<values.length;j++){ sortComparisons++; renderBars([min,j]); updateStats(); await sleep(delayForSpeed()); if(values[j]<values[min])min=j; }
    if(min!==i){[values[i],values[min]]=[values[min],values[i]];sortSwaps++;}
    renderBars([],Array.from({length:i+1},(_,k)=>k));
  }
}
async function insertionSort() {
  for(let i=1;i<values.length;i++){
    let key=values[i],j=i-1;
    while(j>=0 && values[j]>key){
      sortComparisons++; renderBars([j,j+1]); updateStats(); await sleep(delayForSpeed());
      values[j+1]=values[j]; sortSwaps++; j--;
    }
    if(j>=0){sortComparisons++; updateStats();}
    values[j+1]=key; renderBars([],Array.from({length:i+1},(_,k)=>k)); await sleep(delayForSpeed());
  }
}
async function mergeSort() {
  async function merge(lo,mid,hi){
    const left=values.slice(lo,mid+1),right=values.slice(mid+1,hi+1);let i=0,j=0,k=lo;
    while(i<left.length&&j<right.length){
      sortComparisons++; renderBars([k]);updateStats();await sleep(delayForSpeed());
      values[k++]=left[i]<=right[j]?left[i++]:right[j++];
    }
    while(i<left.length)values[k++]=left[i++];
    while(j<right.length)values[k++]=right[j++];
    renderBars();
  }
  async function split(lo,hi){if(lo>=hi)return;const mid=Math.floor((lo+hi)/2);await split(lo,mid);await split(mid+1,hi);await merge(lo,mid,hi);}
  await split(0,values.length-1);
}
async function quickSort() {
  async function partition(lo,hi){
    const pivot=values[hi];let i=lo;
    for(let j=lo;j<hi;j++){sortComparisons++;renderBars([j,hi]);updateStats();await sleep(delayForSpeed());if(values[j]<pivot){if(i!==j){[values[i],values[j]]=[values[j],values[i]];sortSwaps++;}i++;}}
    if(i!==hi){[values[i],values[hi]]=[values[hi],values[i]];sortSwaps++;}
    renderBars([i]);await sleep(delayForSpeed());return i;
  }
  async function run(lo,hi){if(lo<hi){const p=await partition(lo,hi);await run(lo,p-1);await run(p+1,hi);}}
  await run(0,values.length-1);
}
$('sortButton').addEventListener('click', async () => {
  if(sortBusy)return;
  sortBusy=true;sortComparisons=0;sortSwaps=0;
  $('sortButton').disabled=true;$('newArray').disabled=true;$('sortStatus').textContent='Working through the algorithm…';
  try {
    const algorithm=$('sortAlgorithm').value;
    if(algorithm==='bubble')await bubbleSort();
    if(algorithm==='selection')await selectionSort();
    if(algorithm==='insertion')await insertionSort();
    if(algorithm==='merge')await mergeSort();
    if(algorithm==='quick')await quickSort();
    renderBars([],values.map((_,i)=>i));$('sortStatus').textContent='Sorted! The spell is complete.';updateStats();
  } catch(err) {$('sortStatus').textContent='Something went wrong. Please try again.';console.error(err);}
  finally {sortBusy=false;$('sortButton').disabled=false;$('newArray').disabled=false;}
});

// Pathfinding grid
const ROWS=15,COLS=25,gridEl=$('grid');
let cells=[],start=COLS*7+3,end=COLS*7+21,drawing=false,pathBusy=false;
function initGrid(){
  gridEl.style.gridTemplateColumns=`repeat(${COLS},minmax(0,1fr))`;
  gridEl.innerHTML='';cells=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const index=r*COLS+c,el=document.createElement('div');el.className='cell';el.dataset.index=index;
    el.addEventListener('pointerdown',e=>{if(pathBusy)return;e.preventDefault();drawing=true;toggleWall(index);});
    el.addEventListener('pointerenter',()=>{if(drawing&&!pathBusy)toggleWall(index);});
    gridEl.appendChild(el);cells.push({el,wall:false});
  }
  paintSpecial();
}
window.addEventListener('pointerup',()=>drawing=false);
function paintSpecial(){cells.forEach((cell,i)=>{cell.el.className='cell'+(cell.wall?' wall':'')+(i===start?' start':'')+(i===end?' end':'');});}
function toggleWall(i){if(i===start||i===end)return;cells[i].wall=!cells[i].wall;cells[i].el.className='cell'+(cells[i].wall?' wall':'');}
function resetPathPaint(){cells.forEach((c,i)=>c.el.className='cell'+(c.wall?' wall':'')+(i===start?' start':'')+(i===end?' end':''));$('pathStats').textContent='Visited: 0 · Path length: 0';}
$('clearWalls').addEventListener('click',()=>{if(pathBusy)return;cells.forEach(c=>c.wall=false);resetPathPaint();$('pathStatus').textContent='Walls cleared.';});
$('clearPath').addEventListener('click',()=>{if(pathBusy)return;resetPathPaint();$('pathStatus').textContent='Path display cleared.';});
function neighbors(i){const r=Math.floor(i/COLS),c=i%COLS,out=[];if(r>0)out.push(i-COLS);if(c<COLS-1)out.push(i+1);if(r<ROWS-1)out.push(i+COLS);if(c>0)out.push(i-1);return out.filter(n=>!cells[n].wall);}
async function findRoute(){
  if(pathBusy)return;pathBusy=true;$('findPath').disabled=true;resetPathPaint();$('pathStatus').textContent='Exploring the grid…';
  const mode=$('pathAlgorithm').value,visited=[],prev=Array(ROWS*COLS).fill(-1),seen=new Set([start]);let found=false;
  if(mode==='dijkstra'){
    const dist=Array(ROWS*COLS).fill(Infinity);dist[start]=0;const queue=new Set(Array.from({length:ROWS*COLS},(_,i)=>i).filter(i=>!cells[i].wall));
    while(queue.size){let cur=-1,best=Infinity;for(const n of queue){if(dist[n]<best){best=dist[n];cur=n;}}if(cur<0||best===Infinity)break;queue.delete(cur);if(cur===end){found=true;break;}visited.push(cur);for(const n of neighbors(cur)){if(!queue.has(n))continue;const nd=dist[cur]+1;if(nd<dist[n]){dist[n]=nd;prev[n]=cur;}}}
  } else {
    const queue=[start];let head=0;
    while(mode==='bfs'?head<queue.length:queue.length){
      const cur=mode==='bfs'?queue[head++]:queue.pop();
      if(cur===end){found=true;break;}
      visited.push(cur);
      for(const n of neighbors(cur)){if(seen.has(n))continue;seen.add(n);prev[n]=cur;queue.push(n);}
    }
  }
  for(let i=0;i<visited.length;i++){const n=visited[i];if(n!==start&&n!==end)cells[n].el.classList.add('visited');if(i%4===0)await sleep(5);}
  const route=[];if(found){let cur=end;while(cur!==-1){route.push(cur);if(cur===start)break;cur=prev[cur];}route.reverse();route.forEach((n,i)=>{if(n!==start&&n!==end)cells[n].el.classList.add('path');});$('pathStatus').textContent='Route found! Destination reached.';}
  else $('pathStatus').textContent='No route found. Try removing some walls.';
  $('pathStats').textContent=`Visited: ${visited.length} · Path length: ${found?Math.max(0,route.length-1):0}`;
  pathBusy=false;$('findPath').disabled=false;
}
$('findPath').addEventListener('click',findRoute);
initGrid();makeArray();