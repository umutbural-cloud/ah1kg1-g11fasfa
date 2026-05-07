import {
  Circle, Activity, Heart, Dumbbell, Bike, Footprints, PersonStanding,
  Brain, BookOpen, Book, Pencil, PenTool, GraduationCap, Languages, Calculator,
  Briefcase, Laptop, Code, Mail, Phone, Calendar, Clock, Target, Trophy, Flag,
  Coffee, Apple, Utensils, GlassWater, Soup, Pizza, Salad, Carrot, Egg,
  Bed, Moon, Sunrise, Sun, Sunset, Cloud,
  Music, Headphones, Camera, Palette, Brush, Film, Mic, Guitar,
  Smile, MessageCircle, Users, Home, Flower, Leaf, TreePine, Bird, Cat, Dog, Fish,
  Wallet, PiggyBank, ShoppingBag, Gift, Sparkles, Star, Zap, Wind, Mountain, Waves,
  Pill, Stethoscope, Bath, Shirt, Scissors, Wrench, Hammer, Recycle, Bike as BikeIcon,
  type LucideIcon,
} from "lucide-react";

export type HabitIconDef = { name: string; label: string; icon: LucideIcon };
export type HabitIconGroup = { label: string; icons: HabitIconDef[] };

export const HABIT_ICON_GROUPS: HabitIconGroup[] = [
  {
    label: "Sağlık & Spor",
    icons: [
      { name: "heart", label: "Kalp", icon: Heart },
      { name: "activity", label: "Aktivite", icon: Activity },
      { name: "dumbbell", label: "Ağırlık", icon: Dumbbell },
      { name: "bike", label: "Bisiklet", icon: Bike },
      { name: "footprints", label: "Yürüyüş", icon: Footprints },
      { name: "person-standing", label: "Esneme", icon: PersonStanding },
      { name: "pill", label: "İlaç", icon: Pill },
      { name: "stethoscope", label: "Sağlık", icon: Stethoscope },
      { name: "bath", label: "Banyo", icon: Bath },
    ],
  },
  {
    label: "Zihin & Çalışma",
    icons: [
      { name: "brain", label: "Beyin", icon: Brain },
      { name: "book-open", label: "Okuma", icon: BookOpen },
      { name: "book", label: "Kitap", icon: Book },
      { name: "pencil", label: "Yazma", icon: Pencil },
      { name: "pen-tool", label: "Kalem", icon: PenTool },
      { name: "graduation-cap", label: "Eğitim", icon: GraduationCap },
      { name: "languages", label: "Dil", icon: Languages },
      { name: "calculator", label: "Hesap", icon: Calculator },
      { name: "briefcase", label: "İş", icon: Briefcase },
      { name: "laptop", label: "Laptop", icon: Laptop },
      { name: "code", label: "Kod", icon: Code },
    ],
  },
  {
    label: "Yemek & İçecek",
    icons: [
      { name: "coffee", label: "Kahve", icon: Coffee },
      { name: "glass-water", label: "Su", icon: GlassWater },
      { name: "apple", label: "Meyve", icon: Apple },
      { name: "carrot", label: "Sebze", icon: Carrot },
      { name: "salad", label: "Salata", icon: Salad },
      { name: "soup", label: "Çorba", icon: Soup },
      { name: "egg", label: "Yumurta", icon: Egg },
      { name: "utensils", label: "Yemek", icon: Utensils },
      { name: "pizza", label: "Pizza", icon: Pizza },
    ],
  },
  {
    label: "Uyku & Doğa",
    icons: [
      { name: "bed", label: "Yatak", icon: Bed },
      { name: "moon", label: "Ay", icon: Moon },
      { name: "sun", label: "Güneş", icon: Sun },
      { name: "sunrise", label: "Şafak", icon: Sunrise },
      { name: "sunset", label: "Gün Batımı", icon: Sunset },
      { name: "cloud", label: "Bulut", icon: Cloud },
      { name: "leaf", label: "Yaprak", icon: Leaf },
      { name: "flower", label: "Çiçek", icon: Flower },
      { name: "tree-pine", label: "Ağaç", icon: TreePine },
      { name: "mountain", label: "Dağ", icon: Mountain },
      { name: "waves", label: "Dalga", icon: Waves },
      { name: "wind", label: "Rüzgar", icon: Wind },
    ],
  },
  {
    label: "Yaratıcılık & Sosyal",
    icons: [
      { name: "music", label: "Müzik", icon: Music },
      { name: "headphones", label: "Kulaklık", icon: Headphones },
      { name: "guitar", label: "Gitar", icon: Guitar },
      { name: "mic", label: "Mikrofon", icon: Mic },
      { name: "camera", label: "Kamera", icon: Camera },
      { name: "film", label: "Film", icon: Film },
      { name: "palette", label: "Palet", icon: Palette },
      { name: "brush", label: "Fırça", icon: Brush },
      { name: "smile", label: "Gülümse", icon: Smile },
      { name: "message-circle", label: "Sohbet", icon: MessageCircle },
      { name: "users", label: "Topluluk", icon: Users },
      { name: "phone", label: "Telefon", icon: Phone },
      { name: "mail", label: "Mail", icon: Mail },
    ],
  },
  {
    label: "Ev & Diğer",
    icons: [
      { name: "home", label: "Ev", icon: Home },
      { name: "shirt", label: "Giyim", icon: Shirt },
      { name: "scissors", label: "Makas", icon: Scissors },
      { name: "wrench", label: "Tamir", icon: Wrench },
      { name: "hammer", label: "Çekiç", icon: Hammer },
      { name: "recycle", label: "Geri Dönüşüm", icon: Recycle },
      { name: "wallet", label: "Cüzdan", icon: Wallet },
      { name: "piggy-bank", label: "Birikim", icon: PiggyBank },
      { name: "shopping-bag", label: "Alışveriş", icon: ShoppingBag },
      { name: "gift", label: "Hediye", icon: Gift },
      { name: "target", label: "Hedef", icon: Target },
      { name: "trophy", label: "Ödül", icon: Trophy },
      { name: "flag", label: "Bayrak", icon: Flag },
      { name: "star", label: "Yıldız", icon: Star },
      { name: "sparkles", label: "Parıltı", icon: Sparkles },
      { name: "zap", label: "Enerji", icon: Zap },
      { name: "calendar", label: "Takvim", icon: Calendar },
      { name: "clock", label: "Saat", icon: Clock },
      { name: "cat", label: "Kedi", icon: Cat },
      { name: "dog", label: "Köpek", icon: Dog },
      { name: "bird", label: "Kuş", icon: Bird },
      { name: "fish", label: "Balık", icon: Fish },
      { name: "circle", label: "Daire", icon: Circle },
    ],
  },
];

const FLAT: Record<string, LucideIcon> = HABIT_ICON_GROUPS.reduce((acc, g) => {
  g.icons.forEach((i) => { acc[i.name] = i.icon; });
  return acc;
}, {} as Record<string, LucideIcon>);

export const getHabitIcon = (name?: string | null): LucideIcon => FLAT[name || "circle"] || Circle;
