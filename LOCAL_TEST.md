# Lokal Test Rehberi

## Hızlı Test (Python HTTP Sunucusu)

1. Terminal'de proje klasöründe şu komutu çalıştır:
```powershell
python -m http.server 8000
```

2. Tarayıcıda şu adresi aç:
```
http://localhost:8000
```

3. Excel dosyasını yükle ve test et.

**NOT:** Çeviri fonksiyonu lokal testte çalışmaz (Netlify Functions gerektirir). 
Sadece Excel yükleme, hücre düzenleme, kopyala/yapıştır, Ctrl+Z, Shift seçim gibi özellikleri test edebilirsin.

## Tam Test (Netlify CLI ile - Çeviri dahil)

1. Node.js'i yükle (https://nodejs.org/)
2. Terminal'de:
```powershell
npm install -g netlify-cli
netlify dev
```

3. Tarayıcıda gösterilen adresi aç (genellikle http://localhost:8888)

Bu yöntemle Netlify Functions da lokal olarak çalışır ve çeviri özelliğini test edebilirsin.

## Test Edilecek Özellikler

- ✅ Excel dosyası yükleme (drag & drop)
- ✅ Hücre düzenleme
- ✅ Ctrl+C, Ctrl+X, Ctrl+V (kopyala/kes/yapıştır)
- ✅ Delete tuşu ile silme
- ✅ Ctrl+Z (geri al)
- ✅ Ctrl+Y (yinele)
- ✅ Shift ile aralık seçimi
- ✅ Ok tuşları ile navigasyon
- ⚠️ Çeviri (sadece Netlify CLI ile test edilebilir)
