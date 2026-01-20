// Netlify Function: selection
// POST { "anchor": {r,c}, "target": {r,c} }
// Returns normalized range and list of cells in the range
exports.handler = async function(event) {
  try{
    const body = event.body ? JSON.parse(event.body) : {};
    const a = body.anchor;
    const b = body.target;
    if(!a || !b || typeof a.r !== 'number' || typeof a.c !== 'number' || typeof b.r !== 'number' || typeof b.c !== 'number'){
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid payload. Expect {anchor:{r,c}, target:{r,c}}' }) };
    }
    const r1 = Math.min(a.r, b.r);
    const r2 = Math.max(a.r, b.r);
    const c1 = Math.min(a.c, b.c);
    const c2 = Math.max(a.c, b.c);
    const cells = [];
    for(let r=r1;r<=r2;r++){
      for(let c=c1;c<=c2;c++){
        cells.push({ r, c });
      }
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ range: { r1, r2, c1, c2 }, cells })
    };
  }catch(err){
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
