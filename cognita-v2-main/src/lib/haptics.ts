// Web Vibration API — Android destekler, iOS Safari desteklemez (graceful degradation)

function vib(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(pattern) } catch {}
  }
}

function isEnabled() {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem('cognita_haptic') !== 'false'
}

export const haptics = {
  /** Hafif: navigasyon, filtre, genel tap */
  light:        () => { if (isEnabled()) vib(8) },
  /** Orta: beğeni, yer imi, swipe */
  medium:       () => { if (isEnabled()) vib(25) },
  /** Güçlü: silme, hata */
  heavy:        () => { if (isEnabled()) vib(55) },
  /** Başarı: kitap ekleme, takip, kaydetme */
  success:      () => { if (isEnabled()) vib([8, 40, 15]) },
  /** Hata */
  error:        () => { if (isEnabled()) vib([50, 30, 50]) },
  /** Level up / başarım */
  achievement:  () => { if (isEnabled()) vib([15, 30, 15, 30, 60]) },
  /** Bildirim */
  notification: () => { if (isEnabled()) vib([10, 20, 10]) },
}
