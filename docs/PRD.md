# PRD - MonCas (Monad Casino)

Ürün Gereksinimleri Dokümanı (Product Requirements Document)

## 1. Özet ve Vizyon

MonCas, Monad testnet üzerinde çalışan, MON token ile oyun oynanabilen hızlı ve etkileyici bir kripto casino web uygulamasıdır. Hedef kitle: kripto‑oyun meraklıları.

Hedefler

- Monad paralel yürütmeyi sergileyen, yüksek etkileşimli bir oyun deneyimi
- Tamamen ücretsiz araçlarla (bütçe 0) geliştirilebilir ve sürdürülebilir
- Mock olmadan gerçek testnet cüzdan etkileşimi (oyun içi bet/payout akışı)

Başarı Kriterleri (KPI)

- 1K+ testnet kullanıcı, 5K+ etkileşim (Faz 5 sonunda)
- Günde 100+ tahmin/simülasyon çalıştırma
- %90+ uptime, kritik hatalarda MTTR < 1 gün

## 2. Kapsam

Kapsam İçi

- Cüzdan bağlama (MetaMask), testnet'le etkileşim
- Oyunlar: Dice, Crash, Mines, Plinko, Wheel
- Cüzdan bağlama (MetaMask, RainbowKit), MON bakiyesi
- Bet limitleri, hız limiti, oturum/işlem güvenliği, bot tespiti
- (Gelecek) On-chain event/payout muhasebesi

Kapsam Dışı (v1)

- Mainnet deploy, ücretli altyapılar
- Tam ölçekli prediction market (lisans/regülasyon karmaşıklıkları)
- Gelişmiş ZK proof üretimi; sadece entegrasyon tasarısı

## 3. Kullanıcı Profilleri ve Hikâyeler

- Oyuncu: "Cüzdanımı bağlarım, MON ile bet atarım, oyunu oynar ve kazanırsam payout alırım."

Örnek Hikâyeler

- Kullanıcı cüzdanını bağlar, Dice oyununda 0.5 MON bet atar; sonuç animasyonla gösterilir, kazanırsa payout çağrısı yapılır.

## 4. İşlevsel Gereksinimler

Kimlik ve Cüzdan

- Kullanıcı cüzdanını bağlayabilmeli, testnet ağına geçiş yönlendirmesi almalı

 Veri/İçerik
 - Oyun sonuçları UI’da gerçek zamanlı gösterilmeli
 - (Gelecek) On-chain event’lerle senkronizasyon

 Oyun
 - Bet aralığı 0.1–5.0 MON
 - Oyun bazlı risk/multiplier mantığı
 - Payout akışı (env’deki havuz cüzdanı ile – geliştirme aşaması)

 Yönetim ve Güvenlik

- Erişim kontrolü: yalnızca yetkili roller parametreleri değiştirebilir (ör. minimum staking eşiği)
- Reentrancy ve front-running (gelecekte kontrat entegrasyonu ile)

## 5. Performans ve Ölçeklenebilirlik

- UI etkileşimleri akıcı olmalı (60fps animasyon hedefi)
- Build boyutu optimizasyonu, kod bölme

## 6. Uyumluluk ve Riskler

- Regülasyon: Ürün eğitim/simülasyon amaçlı; tahminler finansal tavsiye değildir
- Güvenlik: Self-audit + community review; bug bounty (topluluk) planı
- Kumar/regülasyon: Uygulama eğitim/deneyim amaçlı; finansal tavsiye değildir (uyarı metinleri)

## 7. Metrikler ve Analitik

- DAU/WAU, oyun sayısı, ortalama latency, hata oranı
- Frontend event’leri (anonim): sayfa görüntüleme, oyun başlatma, payout denemesi

## 8. Kabul Kriterleri (MVP)

- Cüzdan bağlama ve feed seçimi çalışıyor
- Cüzdan bağlama çalışıyor; bet/payout UI akışı sorunsuz
- Oyunlar çalışıyor; bet limitleri ve güvenlik kontrolleri aktif

## 9. Yerelleştirme

- UI varsayılan dil: İngilizce; TR ikinci dil olarak sunulur

## 10. Yol Haritası ve Bağımlılıklar

- Fazlara göre plan (README ile uyumlu)
- Bağımlılıklar: Monad testnet erişimi, RainbowKit/wagmi
