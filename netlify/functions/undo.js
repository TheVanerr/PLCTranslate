// Netlify Function: undo
// POST { "history": [...], "steps": 1 }
// Stateless helper: pops up to `steps` items from history and returns them as undone actions.
// Client is expected to send the current history array. This function DOES NOT persist state.
exports.handler = async function(event){
  try{
    const body = event.body ? JSON.parse(event.body) : {};
    const history = Array.isArray(body.history) ? body.history.slice() : null;
    const steps = Math.max(1, Number(body.steps) || 1);
    if(!history) return { statusCode:400, body: JSON.stringify({ error: 'Invalid payload. Expect { history: [...], steps: number }' }) };
    const undone = [];
    for(let i=0;i<steps;i++){
      if(history.length===0) break;
      const act = history.pop();
      undone.push(act);
    }
    // Return undone actions in the order they were popped (most recent first)
    return { statusCode:200, body: JSON.stringify({ undone, history }) };
  }catch(err){
    return { statusCode:500, body: JSON.stringify({ error: String(err) }) };
  }
};
