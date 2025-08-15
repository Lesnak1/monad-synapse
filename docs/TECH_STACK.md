# TECH STACK - MonCas (Monad Casino)

Bu belge, bütçe 0 ve gerçek veri zorunluluğu ilkelerine uygun olarak seçilen teknoloji yığınını ve gerekçelerini detaylandırır.

## İlkeler

- Ücretsiz/Açık Kaynak: Lisans ücretine tabi olmayan, community-destekli çözümler
- Gerçek etkileşim: Monad testnet cüzdan işlemleri; mock yasak
- Basit ama ölçeklenebilir: Monolitik başla, modülerleşmeye hazır tasarım
- Güvenlik-önce: OZ, Slither, Foundry invariants; reentrancy ve erişim kontrolü

## Genel Monorepo

- Paket yönetimi: npm (basit, ek maliyetsiz). İleride pnpm + Turborepo opsiyonel
- Tip sistemi: TypeScript strict
- CI: GitHub Actions (ücretsiz kota dahilinde), format+lint+test

## Frontend (apps/web)

- Framework: Next.js 14 (App Router) + React 18, TypeScript
- UI: Tailwind CSS + shadcn/ui (ücretsiz, bileşen seti)
- Cüzdan: wagmi v2 + viem + RainbowKit (testnet desteği)
- Grafikler: Recharts veya Visx (MIT), real-time için lightweight websocket client
- Uluslararasılaşma: Varsayılan İngilizce, i18n altyapısı ile TR ikinci dil
- Deploy: Vercel Free tier (statik + edge uygunsa); env ile togglable self-host

Neden: Next 14, dosya tabanlı yönlendirme ve sunucu bileşenleriyle performanslı; wagmi/viem ekosistemde standard.

## Backend

- Bu sürümde ayrı bir backend servis yoktur (gateway/ai kaldırıldı). Gerektiğinde edge fonksiyonları veya minimal API route’ları eklenir.

## Smart Contracts (contracts)

- Dil/Sürüm: Solidity ^0.8.24
- Araçlar: Foundry (forge/cast) - hızlı test, fuzz, gas snapshot
- Kütüphaneler: OpenZeppelin Contracts (AccessControl, ReentrancyGuard), Chainlink interfaces
- Kalıplar: Commit-reveal (front-running azaltma), oracle-tabanlı doğrulama, min süre pencereleri
- Güvenlik: Slither (statik), Foundry invariant/fuzz, (opsiyonel) Echidna

Neden: Foundry modern, hızlı ve ücretsiz. OZ güvenilir standartlar sunar.

## Depolama ve Dosyalar

- IPFS: (Gelecek) Oyun kayıtları/kanıtları için event snapshot’ları

## Gözlemlenebilirlik

- Loglama: Pino (JSON), request-id korelasyonu
- Metrikler: Basit custom Prometheus endpoint (opsiyonel), ya da CSV/JSON export
- İzleme: Manual dashboards (Grafana Cloud free opsiyonel, kota sınırlarıyla)

## Test ve Kalite

- Frontend: Vitest/Jest + Testing Library
- Contracts: Foundry unit/integration, invariant ve fuzz testler
- Lint/Format: ESLint + Prettier, Solhint + prettier-plugin-solidity

## Sürümleme ve Ortamlar

- Env'ler: local, testnet
- Sürümleme: SemVer, GitHub Releases; Changelog otomasyonu opsiyonel

## Bağımlılık Versiyonları (önerilen)

- Node 20.x, TypeScript 5.x
- Next.js 14.x, React 18.x, Tailwind 3.x, shadcn/ui son
- wagmi 2.x, viem 2.x, ethers 6.x (yalnızca gerekiyorsa)
- Fastify 4.x, Pino 9.x
- Foundry son stable, OZ 5.x, solc ^0.8.24

## Alternatifler (Değerlendirildi)

- Hardhat (yerine Foundry): Daha geniş plugin ekosistemi; performans açısından Foundry seçildi
- Socket.IO (yerine raw ws): Oda yönetimi/ayırt edici özellikler gerekirse değerlendirilebilir
- Pinata yerine web3.storage: Kota ve SLA kıyasına göre ileride geçiş mümkün

## Lisans ve Uygunluk

- MIT lisanslı kod
- Prediction/regülasyon riskleri için: Eğitim/simülasyon amacı; governance/DAO mekanizmalarıyla yönetişim ileride
