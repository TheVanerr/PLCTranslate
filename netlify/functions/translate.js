// Netlify Function: translate
// Expects POST JSON { text, source, target }
// Uses DeepL API (requires API key in environment variable DEEPL_API_KEY)

exports.handler = async function(event) {
  try{
    if(event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const body = JSON.parse(event.body || '{}');
    const { text, source, target } = body;
    if(!text || !target) return { statusCode: 400, body: JSON.stringify({ error: 'Missing text or target' }) };

    const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
    if(!DEEPL_API_KEY){
      console.error('DEEPL_API_KEY not set');
      return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured', translated: text }) };
    }

    // DeepL API endpoint (free tier)
    const apiUrl = 'https://api-free.deepl.com/v2/translate';
    
    // DeepL dil kodları (büyük harf)
    const targetLang = target.toUpperCase();
    const sourceLang = source && source !== 'auto' ? source.toUpperCase() : undefined;
    
    const params = new URLSearchParams({
      auth_key: DEEPL_API_KEY,
      text: text,
      target_lang: targetLang
    });
    
    if(sourceLang) params.append('source_lang', sourceLang);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    
    const data = await response.json();
    
    if(data && data.translations && data.translations[0]){
      const translated = data.translations[0].text;
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
