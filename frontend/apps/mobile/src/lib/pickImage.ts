import * as ImagePicker from 'expo-image-picker'

export interface PickedImage {
  uri: string
  width: number
  height: number
}

/**
 * 사진첩에서 한 장 고르기. 취소하면 null.
 *
 * 자르기는 여기서 안 한다 — `allowsEditing` 은 플랫폼마다 다르게 동작한다.
 * 원본을 그대로 받아 `ImageCropper` 에서 두 플랫폼 똑같이 자른다.
 *
 * 원본 크기를 같이 돌려주는 이유 — 잘라낼 사각형을 **원본 픽셀 기준**으로 계산해야 한다.
 */
export async function pickImage(): Promise<PickedImage | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
  })
  if (res.canceled) return null
  const a = res.assets[0]
  if (!a?.uri || !a.width || !a.height) return null
  return { uri: a.uri, width: a.width, height: a.height }
}
