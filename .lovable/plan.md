## Alışkanlıklar Modülü

Tabloların altındaki alışkanlıklar bölümünü kaldırıp, sidebar'da "Günlük" altında yer alan bağımsız bir "Alışkanlıklar" (習慣) modülü oluşturacağız. Modül kendi içinde 4 alt görünüm barındıracak: **Bugün**, **Master**, **İstatistik** ve alışkanlığa tıklayınca açılan **Detay** dialog'u.

### 1. Veri Modeli (Migration)

`habits` tablosunu yeni alanlarla genişleteceğiz (mevcut veriler korunur):

- `frequency_type` text — `daily` | `weekdays` | `weekly` | `monthly` (default: `daily`)
- `frequency_days` int[] — haftanın günleri (0=Paz..6=Cmt) ya da ayın günleri
- `time_of_day` text — `morning` | `afternoon` | `evening` | `night` | `any` (default: `any`)
- `icon` text — Lucide ikon adı (default: `circle`)
- `description` text — opsiyonel açıklama
- `project_id` nullable yapılacak (artık projeye bağlı değil; mevcut kayıtlar varsayılan projede kalır ama UI proje bağı göstermeyecek)

Günün dilimi sınırları kodda sabit:
- Sabah: 04:00–12:00
- Öğleden Sonra: 12:01–18:00
- Akşam: 18:01–22:00
- Gece: 22:01–04:00

### 2. Sidebar Entegrasyonu

`AppSidebar.tsx` ve `Section` tipi: `"habits"` eklenecek. "Günlük" satırının hemen altına **Alışkanlıklar** (習慣) menü ögesi gelecek. `usePageState` ve `Index.tsx` route'lanacak.

### 3. Yeni Sayfa: `HabitsView` (`src/components/HabitsView.tsx`)

Üst kısımda 3 sekme: **Bugün** · **Master** · **İstatistik**.

#### a) Bugün sekmesi (varsayılan)
- Günün dilimi filtreleri: **Tümü · Sabah · Öğleden Sonra · Akşam · Gece** (şu anki dilim varsayılan seçili).
- Liste sade tablo: ikon · isim · son 7 günün durumu (boş daire ○ / dolu daire ●, en sağda bugün) · bugün için tıklama checkbox'ı.
- Yalnızca o günün sıklığına uygun alışkanlıklar gösterilir (haftanın günü/ay günü filtresi).
- Satıra tıklama → Detay dialog'u.

#### b) Master sekmesi (planlama)
- Heybe tarzı tablo: İkon · Ad · Sıklık · Günün Dilimi · işlemler (sil).
- "+ Yeni alışkanlık" satırı; inline düzenleme (ad, sıklık dropdown, dilim dropdown, ikon picker).

#### c) İstatistik sekmesi
- Üstte zaman aralığı seçici: **Hafta · Ay · Yıl**.
- Her alışkanlık için: tamamlanma oranı %, en uzun seri, toplam tamamlama, basit heatmap/bar.
- `habit_completions`'tan client-side aggregate.

### 4. Detay/Düzenleme Dialog'u

Hem Bugün hem Master sekmesinden açılır. Düzenlenebilir alanlar: ad, ikon, sıklık (tip + günler), günün dilimi, açıklama. "Kaydet" / "İptal" butonları (auto-save değil).

### 5. İkon Arşivi (`src/lib/habitIcons.ts`)

Lucide'den ~60 anlamlı ikondan oluşan, tematik gruplanmış (Sağlık, Spor, Çalışma, Kişisel, Yemek, Uyku, Sosyal, Yaratıcılık, Evrensel) zengin liste. Picker grid + grup başlıkları + arama. Tüm ikonlar `text-muted-foreground` ile gri tonlamalı render edilecek.

### 6. Mevcut Yerden Kaldırma

`TableView.tsx` içindeki `HabitsSection` render'ı kaldırılacak. `HabitsSection.tsx` dosyası silinecek (yerini `HabitsView` alıyor). `Index.tsx`'te `showHabits` prop'u kalkacak.

### 7. Hook

`useHabits.tsx` projeye bağlılıktan ayrılacak: `useHabits()` artık kullanıcının tüm alışkanlıklarını çeker. Yeni alanlar (`frequency_type`, `frequency_days`, `time_of_day`, `icon`, `description`) CRUD'a dahil edilecek. `getCompletionsRange(start, end)` yardımcısı eklenecek (son 7 gün ve istatistik için).

### Teknik Detaylar

- Günün dilimini hesaplama: `Date().getHours()` ile `morning/afternoon/evening/night` map'i.
- Sıklık match'i (bir alışkanlık X gününde gösterilir mi?): `daily` → her zaman; `weekdays` → `frequency_days` içinde gün varsa; `weekly` → haftanın o günü `frequency_days`'te; `monthly` → ayın günü `frequency_days`'te.
- Son 7 gün serisi: tek sorguda `habit_completions` `completion_date >= today-6` çekilip `Map<habit_id, Set<date>>` ile render edilecek.

### Etkilenen / Yeni Dosyalar

- **Migration**: `habits` tablosuna alanlar, `project_id` nullable.
- **Yeni**: `src/components/HabitsView.tsx`, `src/components/HabitsBoard.tsx` (Master tablosu), `src/components/HabitsToday.tsx`, `src/components/HabitsStats.tsx`, `src/components/HabitDetailDialog.tsx`, `src/components/HabitIconPicker.tsx`, `src/lib/habitIcons.ts`, `src/lib/timeOfDay.ts`.
- **Düzenlenecek**: `src/hooks/useHabits.tsx`, `src/hooks/usePageState.tsx`, `src/components/AppSidebar.tsx`, `src/pages/Index.tsx`, `src/components/TableView.tsx`.
- **Silinecek**: `src/components/HabitsSection.tsx`.
