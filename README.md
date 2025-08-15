# Monad Synapse

AI güçlendirilmiş paralel tahmin/simülasyon ağı. Monad testnet üzerinde, gerçek on-chain (Chainlink testnet oracles) ve off-chain (Hugging Face) verileri birleştirerek araştırmacılar ve trader'lar için tahmin, senaryo ve simülasyon deneyimi sunar. Amaç: Monad'ın paralel yürütme (parallel execution) kapasitesini gerçek kullanım senaryolarıyla sergilemek ve sürdürülebilir bir topluluk uygulaması geliştirmek.

> Bütçe: 0 (yalnızca ücretsiz katmanlar ve açık kaynak). Mock yok; tüm testler gerçek testnet işlemleri ve gerçek oracle beslemeleriyle yapılır.

## Özellikler

- Gerçek veri: Chainlink testnet price feeds, Monad testnet işlemleri
- AI simülasyon: Hugging Face ücretsiz modelleriyle sequence forecasting ve senaryo üretimi
- On-chain bağ: Prediction/simulation kaydı ve sonuç doğrulamaya uygun sözleşmeler
- Cüzdan entegrasyonu: MetaMask/wallet connect (wagmi + RainbowKit)
- Görselleştirme: Gerçek zamanlı fiyat, tahmin ve hata payı izleme (frontend dashboard)
- Depolama: IPFS (Pinata free gateway) üzerinden çıktı ve konfigürasyon arşivi
- Ölçeklenebilirlik: Monad paralel yürütmeden yararlanan tasarım, websocket güncellemeleri

## Mimari Özet

- Akış: Chainlink -> Oracle Gateway (Node.js) -> AI Servisi (HF Inference) -> Frontend (Next.js) -> Smart Contracts (Solidity/Foundry)
- Kontratlar: `PredictionMarket`, `DataRegistry`, (opsiyonel) `Governance`/`Points`
- Servisler: `oracle-gw` (websocket + REST), `ai` (HF Inference proxy), `web` (Next.js)

## Hızlı Başlangıç

Önkoşullar

- Node.js >= 20 (LTS)
- Git, Foundry (forge, cast), Python 3.11 (opsiyonel; veri araçları)
- Testnet RPC (Monad), Chainlink testnet feed adresleri

Kurulum (iskelet, geliştirme fazında doldurulacaktır)

```bash
# klonla
git clone <repo_url>
cd monad-synapse

# env dosyaları
cp .env.example .env

# (ilerleyen commmit'lerde) monorepo bağımlılıkları
# npm install
```

Ortam Değişkenleri (taslak)

```
MONAD_RPC_URL=
HF_API_TOKEN=
PINATA_JWT=
WALLETCONNECT_PROJECT_ID=
CHAINLINK_FEED_ETHUSD=
CHAINLINK_FEED_BTCUSD=
```

Dizin Yapısı (plan)

```
/monad-synapse
  /apps
    /web              # Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, wagmi
  /services
    /oracle-gw        # Fastify/Node.js 20, websocket & REST; Chainlink subs
    /ai               # HF Inference proxy ve basit feature engineering
  /contracts          # Foundry projesi; OZ, Chainlink interface'leri
  /docs               # PRD, MDC, TECH_STACK ve talep edilen diğer dokümanlar
  /scripts            # deploy, verify, maintenance script'leri
```

## Yol Haritası (Özet)

- Faz 1 (1-3 hf): Ekosistem analizi, veri doğrulama, pipeline taslağı
- Faz 2 (3-5 hf): Mimari, UI/UX, güvenlik planı
- Faz 3 (5-14 hf): Backend, kontratlar, frontend, AI entegrasyonu
- Faz 4 (14-19 hf): Test, optimizasyon, güvenlik kontrolleri
- Faz 5 (19-24 hf): Testnet launch, organik büyüme ve izleme

## Lisans

MIT — Açık kaynak katkıları teşvik edilir.
