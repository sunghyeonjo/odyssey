import { Ionicons } from '@expo/vector-icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { qk } from '@/api/keys'
import { addComment, getComments } from '@/api/dayed'
import Avatar from '@/components/ui/Avatar'
import { timeAgo } from '@/lib/date'
import { colors, radius, space, text } from '@/theme'

const MAX_COMMENT = 200

interface Props {
  itemId: string
  /** 댓글 수가 바뀌면 목록도 갱신해야 한다 */
  onChanged: () => void
}

/** 게시물 바로 아래에 이어 붙는 댓글 — 별도 시트로 띄우지 않고 피드 흐름 안에 둔다 */
export default function PostComments({ itemId, onChanged }: Props) {
  const queryClient = useQueryClient()
  const [text, setText] = useState('')

  const commentsQ = useQuery({ queryKey: qk.comments(itemId), queryFn: () => getComments(itemId) })

  const send = useMutation({
    mutationFn: () => addComment(itemId, text.trim()),
    onSuccess: async () => {
      setText('')
      await queryClient.invalidateQueries({ queryKey: qk.comments(itemId) })
      onChanged()
    },
  })

  const canSend = text.trim() !== '' && !send.isPending

  return (
    <View style={styles.wrap}>
      {commentsQ.isPending ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : (
        (commentsQ.data ?? []).map((c) => (
          <View key={c.id} style={styles.row}>
            <Avatar name={c.author.name} uri={c.author.avatar} color={c.author.color} size={26} />
            <View style={{ flex: 1 }}>
              <View style={styles.meta}>
                <Text style={styles.who}>{c.author.name}</Text>
                <Text style={styles.when}>{timeAgo(c.createdAt)}</Text>
              </View>
              <Text style={styles.body}>{c.text}</Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(t) => setText(t.slice(0, MAX_COMMENT))}
          placeholder="댓글"
          placeholderTextColor={colors.faint}
          multiline
        />
        <Pressable
          style={[styles.send, !canSend && styles.sendOff]}
          onPress={() => canSend && send.mutate()}
          disabled={!canSend}
        >
          <Ionicons name="arrow-up" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // 위 여백은 부르는 쪽의 앞줄(반응 줄)이 진다 — 양쪽이 다 주면 그만큼 두 배로 벌어진다
  wrap: { paddingLeft: 2, borderLeftWidth: 2, borderLeftColor: colors.line, gap: space.xs },
  loading: { alignSelf: 'flex-start', marginLeft: 12, marginVertical: space.md },

  row: { flexDirection: 'row', gap: space.sm, paddingVertical: space.sm, paddingLeft: space.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 2 },
  who: { fontSize: text.small, fontWeight: '700', color: colors.ink },
  when: { fontSize: text.micro, color: colors.faint },
  body: { fontSize: text.body, lineHeight: 19, color: colors.ink },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, paddingLeft: space.md, paddingTop: space.sm },
  input: { flex: 1, maxHeight: 88, fontSize: text.body, lineHeight: 19, color: colors.ink, backgroundColor: colors.accentSoft, borderRadius: radius.card, paddingHorizontal: 13, paddingVertical: space.sm },
  send: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.3 },
})
