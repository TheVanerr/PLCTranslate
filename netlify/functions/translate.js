// Netlify Function: translate
// Expects POST JSON { text, source, target }
// Uses MyMemory Translation API (free, no API key needed, 10000 words/day)

exports.handler = async function(event) {
  try{
    if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const body = JSON.parse(event.body || '{}');
    const { text, source, target } = body;
    if(!text || !target) return { statusCode: 400, body: JSON.stringify({ error: 'Missing text or target' }) };

    // MyMemory Translation API - Free, no auth required
    const sourceLang = source && source !== 'auto' ? source : 'auto';
    const langPair = sourceLang === 'auto' ? target : `${sourceLang}|${target}`;
    
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if(data && data.responseData && data.responseData.translatedText){
      const translated = data.responseData.translatedText;
      return { 
        statusCode: 200, 
        body: JSON.stringify({ translated: translated }) 
      };
    }

    // Fallback: return original text if translation fails
    return { 
      statusCode: 200, 
      body: JSON.stringify({ translated: text }) 
    };
    
  }catch(err){
    console.error('Translation error:', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: String(err), translated: text }) 
    };
  }
};
