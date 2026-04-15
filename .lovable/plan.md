
# 計画 — Keikaku Planlama Arayüzü

## Tasarım Felsefesi
Japon minimalizmi (Washi kağıdı tarzı): Açık, sıcak tonlar (`#f7f5f0` arka plan), ince çizgiler, geniş boşluklar, hafif tipografi. Stone renk paleti. Tracking-wide başlıklar.

## Kimlik Doğrulama
- E-posta + şifre ile giriş/kayıt sayfası (Lovable Cloud Auth)
- Profil tablosu yok, sadece `auth.users` kullanılacak
- Korumalı rotalar — giriş yapmadan erişim yok

## Veritabanı (Supabase)
**Projeler tablosu** (`projects`): id, user_id, name, created_at  
**Görevler tablosu** (`tasks`): id, project_id, user_id, title, description, status (todo/in_progress/done), start_date, end_date, created_at  
**Notlar tablosu** (`notes`): id, project_id, user_id, content, created_at, updated_at  

Tüm tablolarda RLS: kullanıcı sadece kendi verilerini görebilir.

## 4 Ana Görünüm (Sekmeler)

### 1. Notlar (ノート)
- Minimal metin editörü — markdown destekli basit not alma
- Proje bazlı notlar listesi
- Oluştur, düzenle, sil

### 2. Tablo (表)
- Görevlerin tablo görünümü: Başlık, Durum, Başlangıç, Bitiş
- Satır içi düzenleme
- Durum filtresi (Yapılacak / Devam ediyor / Tamamlandı)

### 3. Gantt (ガント)
- Basit yatay çubuk grafik — görevlerin tarih aralıklarını gösterir
- Haftalık/aylık zaman çizelgesi
- Sade, çizgisel tasarım

### 4. Takvim (暦)
- Aylık takvim görünümü
- Görevlerin başlangıç/bitiş tarihlerini gösterir
- Gün üzerine tıklayarak görev ekleme

## Sayfa Yapısı
- **Sol kenar çubuğu**: Proje listesi + yeni proje oluşturma
- **Üst kısım**: Proje adı + 4 sekme (Notlar, Tablo, Gantt, Takvim)
- **Ana alan**: Seçili sekmenin içeriği

## Genel UX
- Geçişlerde yumuşak animasyonlar
- Boş durum mesajları Japonca ve Türkçe karışık
- Sıfır gereksiz renk — sadece stone paleti ve ince vurgular
