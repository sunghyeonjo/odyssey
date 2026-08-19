import { Ionicons } from '@expo/vector-icons'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { UserCard } from '@/api/types'
import Avatar from '@/components/ui/Avatar'
import { PHOTO_RATIO } from '@/config'
import { NOTE_FONT, paperOf } from '@/lib/paper'
import { colors, radius, space, text } from '@/theme'

interface Props {
  friends: UserCard[]
  onOpenUser: (userId: number) => void
}

/**
 * 친구 탭 맨 위 — **오늘 누가 남겼나 하나만** 말한다. 이름 목록은 이 아래에 있다.
 *
 * **남긴 사람만** 나온다. 안 남긴 사람은 아래 `내 친구` 목록이 이미 말하고 있고
 * 거기엔 이름도 있고 콕 찌르기 단추도 붙는다 — 얼굴만 늘어놓은 줄은
 * 누구인지도 모르고 할 수 있는 것도 없었다.
 *
 * 한때 이름이 늘어선 목록 하나였는데, 그러면 누가 남겼는지 알려고
 * 줄마다 빨간 점을 찾아야 했다. 그래서 오늘 것만 사진으로 앞에 세운다.
 */
export default function FriendToday({ friends, onOpenUser }: Props) {
  const posted = friends.filter((f) => f.postedToday)

  return (
    <View>
      {friends.length > 0 && (
        <View style={styles.head}>
          <Text style={styles.title}>오늘</Text>
          <Text style={styles.count}>{posted.length}/{friends.length}</Text>
        </View>
      )}

      {friends.length === 0 ? (
        /*
          **친구가 없으면 이 앱은 반쪽이다.** 그리고 심사자는 새 계정으로 들어온다 —
          여기가 비어 있으면 달력과 설정만 보고 "기능이 없다" 로 읽는다
        */
        <View style={styles.invite}>
          <Ionicons name="people-outline" size={26} color={colors.accent} />
          <Text style={styles.inviteTitle}>친구를 더하면 시작돼요</Text>
          <Text style={styles.inviteText}>
            서로 수락한 친구끼리만 하루 한 장을 나눠요.{'\n'}이름이나 아이디로 찾아보세요
          </Text>
        </View>
      ) : (
        <>
          {posted.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cards}
            >
              {posted.map((u) => (
                <Pressable key={u.id} style={styles.card} onPress={() => onOpenUser(u.id)}>
                  {/*
                    세 갈래 — 앱의 다른 자리(달력 칸 · 상세)와 **같은 규칙**이다.
                    사진 / 종이에 쓴 글 / 잠긴 날. 글만 쓴 날을 빈 칸으로 두면
                    "안 남긴 것" 처럼 보여서 오늘 상태를 잘못 읽는다
                  */}
                  {u.today?.thumb ? (
                    <Image source={{ uri: u.today.thumb }} style={styles.shot} resizeMode="cover" />
                  ) : u.today ? (
                    <View style={[styles.shot, styles.paper, { backgroundColor: paperOf(u.today.paper).bg }]}>
                      <Text
                        style={[styles.paperText, { color: paperOf(u.today.paper).ink }]}
                        numberOfLines={6}
                      >
                        {u.today.note}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.shot, styles.vault]}>
                      <Ionicons name="lock-closed" size={17} color={colors.sub} />
                    </View>
                  )}
                  <View style={styles.who}>
                    <Avatar name={u.name} uri={u.avatar} color={u.color} size={20} />
                    <Text style={styles.whoName} numberOfLines={1}>{u.name}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {posted.length === 0 && (
            <Text style={styles.quiet}>오늘은 아직 아무도 안 남겼어요</Text>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  // 아래 `받은 요청` · `내 친구` 와 같은 짜임의 구역 제목
  head: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingTop: 12, paddingBottom: 10,
  },
  title: { fontSize: text.small, fontWeight: '700', color: colors.sub },
  count: { fontSize: text.small, fontWeight: '600', color: colors.faint },

  // 가로 스크롤이라 마지막 카드가 화면 끝에 붙지 않게 오른쪽에 여백을 준다
  cards: { gap: 10, paddingRight: 6 },
  card: { width: 132 },
  shot: { width: '100%', aspectRatio: PHOTO_RATIO, borderRadius: radius.photo, backgroundColor: colors.tile },
  // 사진 없는 날 — 그날 고른 종이 색으로. 글은 왼쪽 위부터, 상세와 같은 자리
  paper: { padding: 12 },
  paperText: { ...NOTE_FONT, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  // 남겼지만 나에게 안 열린 날. 물건이 아니라 닫힌 면이다
  vault: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.line },
  who: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 7 },
  whoName: { flexShrink: 1, fontSize: text.caption, fontWeight: '700', color: colors.ink },

  quiet: { fontSize: text.small, color: colors.faint, marginTop: 4 },

  invite: {
    alignItems: 'center', gap: space.sm, marginTop: 12,
    paddingVertical: 32, paddingHorizontal: 24,
    borderRadius: radius.card, backgroundColor: colors.surface,
  },
  inviteTitle: { fontSize: text.lead, fontWeight: '700', color: colors.ink, marginTop: space.xs },
  inviteText: { fontSize: text.small, lineHeight: 20, color: colors.sub, textAlign: 'center' },
})
