/**
 * Merkezi etkileşim sistemi — ses + titreşim
 *
 * Kullanım (herhangi bir bileşenden):
 *   import { interaction } from '@/lib/interaction'
 *   <button onClick={() => interaction.tap()}>...
 *
 * Yeni özellik eklendiğinde otomatik çalışır — sadece ilgili
 * interaction.*() çağrısını eklemek yeterli.
 */
import { sounds } from './sounds'
import { haptics } from './haptics'

export const interaction = {
  /** Genel buton tıklaması (navigasyon, filtre vb.) */
  tap() { sounds.tap(); haptics.light() },

  /** Başarılı işlem: kitap ekleme, kaydetme, tamamlama */
  success() { sounds.success(); haptics.success() },

  /** Hata: geçersiz işlem */
  error() { sounds.error(); haptics.error() },

  /** Beğeni toggle */
  like() { sounds.like(); haptics.medium() },

  /** Yer imi toggle */
  bookmark() { sounds.bookmark(); haptics.medium() },

  /** Takip et / bırak */
  follow() { sounds.follow(); haptics.success() },

  /** Silme işlemi */
  remove() { sounds.remove(); haptics.heavy() },

  /** Swipe / sayfa geçişi */
  swipe() { sounds.swipe(); haptics.light() },

  /** Bildirim geldi */
  notification() { sounds.notification(); haptics.notification() },

  /** Level up */
  levelUp() { sounds.levelUp(); haptics.achievement() },

  /** Rozet / başarım kazanıldı */
  achievement() { sounds.achievement(); haptics.achievement() },

  /** Okuma seansı tamamlandı */
  sessionComplete() { sounds.sessionComplete(); haptics.achievement() },
}
