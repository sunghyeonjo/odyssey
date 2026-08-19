import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useQuery } from '@tanstack/react-query'
import { getStats } from '@/api/dayed'
import { qk } from '@/api/keys'
import { ComposerProvider } from '@/contexts/ComposerContext'
import BlockedScreen from '@/screens/BlockedScreen'
import ChangePasswordScreen from '@/screens/ChangePasswordScreen'
import DiscoverScreen from '@/screens/DiscoverScreen'
import EditProfileScreen from '@/screens/EditProfileScreen'
import ProfileScreen from '@/screens/ProfileScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import UserProfileScreen from '@/screens/UserProfileScreen'
import { colors, text } from '@/theme'

export type AppStackParams = {
  /** 탭 둘 — 이 앱의 뿌리 */
  Tabs: undefined
  /** 설정 — 내용이 아닌 것들. `나` 머리글의 톱니로 들어간다 */
  Settings: undefined
  /** 프로필 편집 — 사진과 닉네임을 고치는 유일한 자리 */
  EditProfile: undefined
  /** 로그인한 채로 비밀번호 바꾸기. 잊은 사람은 로그인 화면의 `비밀번호 찾기` 로 */
  ChangePassword: undefined
  /** 남의 프로필 */
  User: { userId: number }
  /** 차단한 사람 — 차단을 푸는 유일한 자리 */
  Blocked: undefined
}

const Stack = createNativeStackNavigator<AppStackParams>()
const Tab = createBottomTabNavigator()

/**
 * 탭 둘 — **나 · 친구.**
 *
 * 한 화면에 다 넣어봤는데 답답했다. 내 기록을 남기고 되돌아보는 일과
 * 친구를 보는 일은 다른 일인데 세로로 쌓으니 **친구가 달력 여섯 줄 밑**으로 밀려
 * 스크롤해야 나왔다 — 이 앱의 절반이 화면 밖에 있던 셈이다.
 *
 * 셋째 탭은 안 만든다. 설정은 내용이 아니라 `나` 의 톱니로 들어가고,
 * 남의 프로필·차단 목록은 어딘가에서 눌러 들어가는 곳이지 탭이 아니다.
 */
function Tabs() {
  // 답할 요청이 있다는 건 그 탭을 안 열어도 보여야 한다
  const statsQ = useQuery({ queryKey: qk.stats, queryFn: getStats })
  const requestCount = statsQ.data?.requestCount ?? 0

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: text.micro, fontWeight: '700' },
        tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Me"
        component={ProfileScreen}
        options={{
          title: '나',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Friends"
        component={DiscoverScreen}
        options={{
          title: '친구',
          tabBarBadge: requestCount > 0 ? requestCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

/**
 * 탭 둘이 뿌리고, 나머지는 그 위로 밀려 올라온다.
 *
 * 홈이 따로 있었는데 없앴다 — 빈 칸과 친구 목록 미리보기뿐이라 껍데기였고,
 * 오늘 쓰기는 달력의 오늘 칸으로 **이미 되고 있었다.**
 *
 * 컴포저는 최상위에서 감싼다. 어느 화면에서든 열려야 한다.
 */
export default function AppNavigator() {
  return (
    <ComposerProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="User" component={UserProfileScreen} />
        <Stack.Screen name="Blocked" component={BlockedScreen} />
      </Stack.Navigator>
    </ComposerProvider>
  )
}
