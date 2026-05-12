## Genel Bakış

Görev yönetim akışında tutarsızlıkları gideren büyük bir güncelleme. Yedi farklı iyileştirme bir arada uygulanacak: tablodan tıklanan görev için düzenleme ekranı, kategori sistemi, saat aralıkları, otomatik çalışma geçmişi, heybeye geri gönderme, gelişmiş tablo görünümü, alt görevler ve yeni "İnziva" modülü.

---

## 1. Görev Düzenleme Ekranı (Yeni `TaskEditDialog`)

`src/components/TaskEditDialog.tsx` adında merkezi bir dialog oluşturulacak. Hem Kanban hem Tablo görünümünden açılabilecek.

İçeriği:
- **Başlık + açıklama** (mevcut alanlar)
- **Kategori seçici** — Pomodoro'daki `pomodoro_categories` sistemi yeniden kullanılacak. Görev tablosuna `category_id` kolonu eklenecek.
- **Başlangıç & bitiş tarihi** (zaten var)
- **Başlangıç & bitiş saati** (zaten var, UI'a düzgün ekleneceğiz)
- **Renk seçici** (mevcut)
- **"Heybeye geri gönder"** — küçük ikincil aksiyon. Görevi siler ve `backlog_tasks` içine taşır.
- **"Sil"** aksiyonu

Tablo satırına tıklanınca bu dialog açılacak (input'a tıklamayı düzenleme moduna ayırırız; satıra tıklayınca dialog).

---

## 2. Otomatik Çalışma Geçmişi

Aynı gün başlayıp biten ve hem `start_time` hem `end_time` set edilmiş görevler için, görev "done" olarak işaretlenince otomatik bir `pomodoro_sessions` kaydı oluşturulacak (kind: 'work', süre = end-start, kategori = görev kategorisi, note = görev başlığı).

Bu mantık `useTasks.updateTask` içine eklenecek (status: 'todo' → 'done' geçişinde).

---

## 3. Tablo Görünümü Geliştirmeleri

`TableView.tsx` üzerine:
- Yeni görev input'unun yanına **filtre dropdown'u**: Durum (Hepsi / Aktif / Tamamlanan) ve Kategori (Hepsi / her kategori).
- Filtreler client-side uygulanacak.
- Satıra tıklayınca düzenleme dialog'u (madde 1).

---

## 4. Alt Görevler

`tasks` tablosunda `parent_block_id` zaten var — bunu `parent_task_id` semantiği için yeniden kullanacağız (zaten timebox altındaki görevler için kullanılıyor; aynı alan alt görev için de iş görür).

UI:
- Tablo satırının solunda küçük bir genişlet/daralt oku (alt görevler varsa).
- Düzenleme dialog'unda "+ Alt görev ekle" butonu ile yeni alt görevler eklenebilir.
- Alt görevler tabloda parent altında girintili gösterilir.

---

## 5. Sidebar Yeni Modül: "İnziva"

`src/pages/Inziva.tsx` (veya `Index.tsx` içinde yeni view) — modül key: `retreat`, varsayılan etiket "İnziva", japonca aksent "隠".

Davranış:
- Tek `<textarea>` (sade, geniş, premium görünüm).
- Yazı **yalnızca React state**'te; localStorage/server'a hiç yazılmaz.
- Boş satır (paragraf sonu = `\n\n`) tespit edildiğinde, 10 saniye sonra o paragraf otomatik silinir.
- Sayfa kapatılınca / değiştirilince tüm içerik kaybolur.
- Üstte küçük açıklama: "Bu alanda yazdıklarınız hiçbir yere kaydedilmez."

`AppSidebar.tsx` ve `useModuleLabels.ts` içine yeni modül anahtarı eklenir.

---

## 6. Database Değişiklikleri

Tek migration:
- `tasks` tablosuna `category_id UUID NULL` kolonu (pomodoro_categories'e mantıksal referans).
- Index: `idx_tasks_parent_block_id`, `idx_tasks_category_id`.

---

## Teknik Detaylar (özet)

**Yeni dosyalar:**
- `src/components/TaskEditDialog.tsx`
- `src/components/InzivaView.tsx` (Index.tsx içinden render)
- migration dosyası

**Düzenlenecek dosyalar:**
- `src/components/TableView.tsx` — tıklama, filtre, alt görev satırları
- `src/components/KanbanView.tsx` — TaskEditDialog kullanımı
- `src/hooks/useTasks.tsx` — category_id desteği, otomatik pomodoro session, alt görev helper'ları, heybeye geri gönderme
- `src/hooks/useBacklog.tsx` — görev → heybe taşıma fonksiyonu
- `src/hooks/useModuleLabels.ts` — yeni "retreat" anahtarı
- `src/components/AppSidebar.tsx` — sidebar item
- `src/pages/Index.tsx` — yeni view rendering
- `src/integrations/supabase/types.ts` — otomatik

---

## Tasarım Tutarlılığı

Tüm yeni UI Washi tema tokenları, Noto Sans/Serif JP, tracking-wide, ince border'lar ve mevcut sade etkileşim hissi ile uyumlu olacak. İnziva için japonca aksent "隠 — İnziva" kullanılacak.
