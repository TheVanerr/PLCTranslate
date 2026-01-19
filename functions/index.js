const functions = require('firebase-functions');

// Use global fetch available in Node 18+ on Cloud Functions.
// Read Hugging Face token from environment variable `HF_TOKEN` (set in Cloud Console).

async function callHfModel(model, text, options = {}){
  const token = process.env.HF_TOKEN;
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(Object.assign({ inputs: text }, options))
  });
  const j = await res.json();
  if(Array.isArray(j) && j[0]) return j[0].translation_text || j[0].generated_text || (typeof j[0] === 'string' ? j[0] : null);
  if(j && j.translatedText) return j.translatedText;
  if(typeof j === 'string') return j;
  return null;
}

exports.translate = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try{
    const { text, source, target } = req.body;
    if(!text || !target) return res.status(400).json({ error: 'Missing text or target' });

    // Try language-pair specific Helsinki model when source is provided (not auto)
    if(source && source !== 'auto'){
      const model = `Helsinki-NLP/opus-mt-${source}-${target}`;
      try{
        const t1 = await callHfModel(model, text);
        if(t1) return res.json({ translated: t1 });
      }catch(e){
        console.warn('Helsinki model failed', e.message || e);
      }
    }

    // Fallback: try a many-to-many model
    try{
      const model2 = 'facebook/mbart-large-50-many-to-many-mmt';
      const params = {};
      const t2 = await callHfModel(model2, text, params);
      if(t2) return res.json({ translated: t2 });
    }catch(e){
      console.warn('mbart fallback failed', e.message || e);
    }

    // As last resort, return original text
    return res.json({ translated: text });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});
