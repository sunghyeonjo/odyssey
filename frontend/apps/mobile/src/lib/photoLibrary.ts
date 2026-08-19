/**
 * 사진첩에 그날 한 장 남기기 — 앱이 사라지든 서버가 죽든 사진첩은 남는다.
 *
 * **누를 때만** 저장한다. 담을 때마다 자동으로 넣으면 남의 사진첩이 내 앱 때문에 불어난다.
 * **추가 전용 권한만** 받는다. 앨범으로 묶으려면 읽기까지 받아야 하는데,
 * 저장 하나 때문에 남의 사진 전체를 볼 권한을 받는 건 과하다.
 */
import * as MediaLibrary from 'expo-media-library'

/** 권한이 막힌 것과 저장이 실패한 것은 **할 일이 다르다** → 갈라서 돌려준다 */
export type SaveResult = 'ok' | 'denied' | 'fail'

export async function saveToLibrary(uri: string): Promise<SaveResult> {
  try {
    // writeOnly = true : iOS 에서 '사진 추가만' 으로 물어본다
    const { granted } = await MediaLibrary.requestPermissionsAsync(true)
    if (!granted) return 'denied'
    await MediaLibrary.saveToLibraryAsync(uri)
    return 'ok'
  } catch {
    return 'fail'
  }
}
