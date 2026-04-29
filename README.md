# 🐝 ApiColony – Arı Koloni Takip Sistemi

## Teknoloji Stack
- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth)
- **Routing:** React Router v6

---

## 🚀 KURULUM (Sırayla Yap)

### 1. Supabase Projesi Oluştur
1. [supabase.com](https://supabase.com) → New Project
2. Proje adı: `apicolony`
3. Şifre belirle (kaydet!)
4. Region: **Frankfurt (eu-central-1)** — Türkiye'ye en yakın

### 2. Veritabanı Şemasını Kur
1. Supabase dashboard → **SQL Editor**
2. `supabase/migrations/001_initial_schema.sql` dosyasının tamamını yapıştır
3. **Run** butonuna bas
4. Tüm tablolar oluşacak ✅

### 3. Supabase Bilgilerini Al
1. Supabase → **Settings** → **API**
2. Şunları kopyala:
   - `Project URL` → VITE_SUPABASE_URL
   - `anon public key` → VITE_SUPABASE_ANON_KEY

### 4. .env Dosyası Oluştur
Proje klasöründe `.env` dosyası oluştur (`.env.example`'ı kopyala):
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 5. Projeyi Çalıştır
```bash
npm install
npm run dev
```
Tarayıcıda: **http://localhost:3000**

---

## 📁 Proje Yapısı
```
apicolony/
├── src/
│   ├── components/
│   │   ├── forms/       # Tab form bileşenleri
│   │   ├── hive/        # HiveCard (kovan görseli)
│   │   ├── layout/      # Navbar
│   │   └── ui/          # HexLogo vs.
│   ├── hooks/
│   │   └── useAuth.jsx  # Auth context
│   ├── lib/
│   │   └── supabase.js  # Supabase client
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── PanelPage.jsx    # Ana kovan grid
│   │   └── HiveFormPage.jsx # Kovan detay formu
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── .env  ← sen oluşturacaksın
```

---

## 📊 Veritabanı Tabloları
| Tablo | Açıklama |
|-------|----------|
| `profiles` | Kullanıcı profilleri |
| `apiaries` | Arılık lokasyonları |
| `hives` | Kovanlar (ana tablo) |
| `queens` | Ana arı kayıtları |
| `supers` | Ballık kayıtları |
| `disease_records` | Hastalık mücadele kayıtları |
| `maintenance_records` | Mevsimlik bakım kayıtları |
| `honey_harvests` | Bal hasat kayıtları |

---

## 🔜 Sonraki Adımlar
- [ ] Dashboard (istatistik, grafikler)
- [ ] Hasat kayıtları sayfası
- [ ] Arılık lokasyon yönetimi
- [ ] Barkod okuma (kamera entegrasyonu)
- [ ] Push bildirimler (bakım hatırlatmaları)
- [ ] PWA (mobil uygulama gibi)
- [ ] Vercel'e deploy
