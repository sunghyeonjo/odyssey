/**
 * 목업 데이터 — 백엔드 준비 전 FE 를 실제로 굴리기 위한 인메모리 저장소.
 * config.ts 의 USE_MOCK 를 false 로 두면 실제 API 로 붙음. 새로고침 시 시드로 초기화.
 *
 * 하나하나 손으로 적는 대신 **사람마다 말투와 부지런함을 주고 날짜를 굴린다.**
 * 손으로 적으면 스무 명 × 석 달을 채울 수 없고, 채워도 다 비슷해진다.
 *  - `voice` : 그 사람이 쓰는 소재. 사람마다 사는 게 다르니 쓰는 것도 달라야 한다
 *  - `every` : 며칠에 한 번쯤 남기는지. 매일 쓰는 사람과 띄엄띄엄 쓰는 사람이 섞여야 진짜 같다
 *  - 흔들림은 `seeded` 로 만든다 — 같은 사람·같은 날은 늘 같은 결과라 새로고침해도 안 흔들린다
 *
 * 시드가 덮는 경우들:
 *  - 친구 관계 네 상태 · 사진 없는 글만 기록 · 아주 긴 글 · 나만 보기(잠긴 칸)
 *  - 반응 0개 · 여러 개 · 댓글이 길게 달린 것
 *  - 오늘 남긴 사람과 안 남긴 사람이 섞임
 */
import { addDays, parseKey, todayKey, type DateKey } from '@/lib/date'
import { TAKEN_NICKNAMES } from './authMock'
import type {
  Comment,
  CreateEntryInput,
  Entry,
  FeedItem,
  FriendState,
  Me,
  Paper,
  Profile,
  ReportReason,
  UpdateMePatch,
  UserCard,
  Visibility,
} from './types'

/** 사진은 큼직하게 받는다 — 3배 화면에서 칸 너비가 이미 1000px 을 넘는다 */
const photo = (seed: string, w = 1200, h = 1500) => `https://picsum.photos/seed/${seed}/${w}/${h}`
const delay = <T>(value: T, ms = 200) => new Promise<T>((res) => setTimeout(() => res(value), ms))

/**
 * 씨앗에서 뽑는 0~1 — 같은 씨앗이면 늘 같은 값.
 * `Math.random` 을 쓰면 새로고침마다 데이터가 달라져서 "어제 이거 있었는데" 를 못 본다.
 */
const seeded = (a: number, b: number) => {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return x - Math.floor(x)
}

const me: Me = {
  id: 1,
  name: '성현',
  handle: 'sunghyeon',
  color: '#3f4550',
  avatar: photo('me-face', 400, 400),
}

// ── 사람 ──
interface Person {
  id: number
  name: string
  handle: string
  color: string
  /** 나와의 관계. 시드에서 네 상태가 모두 나오게 깔아둔다 */
  state: FriendState
  /** 그 사람이 쓰는 말. 사는 게 다르면 쓰는 것도 달라야 한다 */
  voice: string[]
  /** 며칠에 한 번쯤 남기는지. 1이면 거의 매일, 6이면 띄엄띄엄 */
  every: number
}

const people: Record<string, Person> = {
  chulsoo: {
    id: 11, name: '박철수', handle: 'chulsoo', color: '#5b6b80', state: 'friends', every: 2,
    voice: [
      '배포 성공. 손이 떨렸다',
      '점심은 회사 앞 국수집. 여기 육수가 진짜다',
      '리팩터링 이틀째. 끝이 안 보인다',
      '테스트 커버리지 80% 넘김',
      '퇴근길에 서점 들렀다가 결국 세 권 샀다',
      '새벽 두시 코드 리뷰. 내일의 나에게 미안',
      '오픈소스에 낸 PR 이 머지됐다',
      '회의 세 개. 아무것도 못 했다',
      '사이드 프로젝트 첫 커밋',
      '기술 블로그 하나 발행',
      'CI 파이프라인 정리 완료. 4분 → 90초',
      '키보드 축을 바꿨더니 손목이 편하다',
      '연말 회고 쓰는 중',
      '집 앞 공원 한 바퀴. 생각 정리가 됐다',
      '버그 원인이 오타 한 글자였다',
    ],
  },
  younghee: {
    id: 12, name: '김영희', handle: 'yh_draws', color: '#86636e', state: 'friends', every: 2,
    voice: [
      '수채화 연습 세 장째',
      '색연필 새로 샀다. 36색',
      '전시 다녀옴. 도록만 두 권',
      '스케치북 첫 장 넘기는 날',
      '오늘은 손이 안 풀린다',
      '유화는 아직 어렵다',
      '작업실 정리했더니 그림이 잘 그려진다',
      '창밖 풍경만 한 시간 봤다',
      '물감이 생각보다 빨리 마른다',
      '드로잉 모임 첫 참석',
      '겨울 색을 어떻게 칠할지 모르겠다',
      '연습장 한 권을 다 썼다',
      '오늘 그린 게 마음에 든다',
      '미술관 도슨트 따라다녔다',
    ],
  },
  minsu: {
    id: 13, name: '이민수', handle: 'minsu_lp', color: '#6f6285', state: 'friends', every: 3,
    voice: [
      'LP 새로 샀다. 상태가 좋다',
      '동네 레코드샵 발견. 위험하다',
      '중고 앰프 수리 맡김',
      '스피커 자리를 바꿨더니 소리가 달라졌다',
      '오래된 카세트 정리하다 하루가 갔다',
      '이 앨범 B면이 훨씬 좋다',
      '턴테이블 바늘 교체',
      '레코드 정리 끝. 알파벳 순',
      '비 오는 날엔 재즈',
      '새 앨범 무한반복 중',
      '음반 가게 아저씨랑 한 시간 떠들었다',
    ],
  },
  jisoo: {
    id: 14, name: '한지수', handle: 'jisoo', color: '#5c7a67', state: 'friends', every: 2,
    voice: [
      '오늘의 문장 필사',
      '도서관에서 종일',
      '독서 모임 첫 참석. 말을 너무 많이 했다',
      '새 만년필. 잉크가 잘 나온다',
      '필사 30일차',
      '노트 두 권째 끝',
      '읽다 만 책이 다섯 권',
      '오늘은 글로만. 종일 정신없었는데 그래도 하나는 끝냈다',
      '카페 창가 자리를 겨우 잡았다',
      '문장 하나를 하루 종일 붙잡고 있었다',
      '책장을 다시 정리했다',
      '빌린 책을 드디어 반납',
    ],
  },
  taeho: {
    id: 15, name: '정태호', handle: 'run_taeho', color: '#8a7355', state: 'friends', every: 1,
    voice: [
      '아침 러닝 5km',
      '10km 완주. 페이스 5:20',
      '퇴근길 노을이 미쳤다',
      '비 와서 실내 러닝',
      '한강 자전거 한 바퀴',
      '트레일 러닝 첫 도전. 무릎이 아프다',
      '하프 마라톤 신청했다',
      '오늘은 쉬는 날. 스트레칭만',
      '새 러닝화 길들이는 중',
      '새벽 다섯시의 공기',
      '등산 다녀옴. 정상에서 라면',
      '페이스가 좋아지고 있다',
      '무릎 보호대를 샀다',
      '달리기 앱 기록이 300km 를 넘었다',
    ],
  },
  eunji: {
    id: 21, name: '최은지', handle: 'eunji_k', color: '#7a6a8c', state: 'friends', every: 2,
    voice: [
      '점심 산책에서 만난 고양이',
      '동네 빵집 오픈런 성공',
      '서점에서 두 시간',
      '퇴근하고 바로 누웠다',
      '새로 생긴 카페 다녀옴',
      '장 보러 갔다가 꽃도 샀다',
      '오늘 하늘이 유난히 맑았다',
      '집 앞에 은행나무가 노랗다',
      '점심에 먹은 김밥이 맛있었다',
      '버스에서 창밖만 봤다',
      '주말 계획을 세웠다',
    ],
  },
  junho: {
    id: 22, name: '오준호', handle: 'junho.dev', color: '#4f6b74', state: 'friends', every: 3,
    voice: [
      '드디어 빌드가 통과했다',
      '키보드 새로 샀다',
      '사이드 프로젝트 첫 커밋',
      '모니터 하나 더 달았다',
      '문서를 먼저 쓰기로 했다',
      '오늘은 코드 한 줄도 안 썼다',
      '책상 케이블 정리',
      '새벽에 아이디어가 떠올라서 못 잤다',
    ],
  },
  nari: {
    id: 18, name: '윤나리', handle: 'nari', color: '#6e6e73', state: 'friends', every: 4,
    voice: [
      '오늘은 일찍 잤다',
      '집 앞 산책',
      '아무것도 안 한 하루',
      '드라마 몰아봤다',
      '방 청소를 했다',
      '오랜만에 요리했다',
    ],
  },
  haneul: {
    id: 23, name: '서하늘', handle: 'haneul', color: '#5f7d8a', state: 'friends', every: 2,
    voice: [
      '퇴근길 지하철 창밖',
      '오늘은 글만. 아무 일도 없었지만 그게 좋았다',
      '비 오는 날의 커피',
      '우산을 또 잃어버렸다',
      '야근. 회사에서 본 밤하늘',
      '집에 오는 길에 편의점 아이스크림',
      '주말이 하루 남았다',
      '새 플레이리스트를 만들었다',
    ],
  },
  seyoung: {
    id: 24, name: '문세영', handle: 'sey0ung', color: '#8c6b62', state: 'friends', every: 3,
    voice: [
      '새로 심은 화분',
      '베란다 정리',
      '화분이 살아났다',
      '흙을 갈아줬다',
      '잎이 하나 더 났다',
      '물 주는 날을 자꾸 잊는다',
      '햇빛 드는 자리를 찾는 중',
    ],
  },
  dohyun: {
    id: 25, name: '강도현', handle: 'dohyun_p', color: '#66795c', state: 'friends', every: 3,
    voice: [
      '주말 농구',
      '한강 러닝',
      '농구 리그 등록했다',
      '무릎이 시큰하다',
      '운동 끝나고 먹는 밥이 제일 맛있다',
      '새 농구화',
    ],
  },
  mirae: {
    id: 26, name: '임미래', handle: 'mirae', color: '#7b6f55', state: 'friends', every: 4,
    voice: [
      '첫 도자기 수업',
      '도자기 두 번째. 조금 나아졌다',
      '전시 도록 정리',
      '가마에 넣고 기다리는 중',
      '컵 하나를 완성했다',
      '손에 흙이 안 지워진다',
    ],
  },
  jeongwoo: {
    id: 27, name: '정우현', handle: 'jeongwoohyun', color: '#5d6785', state: 'friends', every: 5,
    voice: [
      '오래된 필름 카메라 수리',
      '주말 등산',
      '필름 한 롤 다 썼다',
      '현상소에서 사진 찾아왔다',
      '초점이 다 나갔다',
    ],
  },
  sujin: {
    id: 28, name: '배수진', handle: 'sujin_cook', color: '#8a6470', state: 'friends', every: 2,
    voice: [
      '오늘 저녁은 파스타',
      '김치를 담갔다',
      '빵을 구웠는데 속이 안 익었다',
      '반찬 세 가지 만들어 두기',
      '시장에서 산 나물',
      '국물이 잘 우러났다',
      '설거지가 산더미',
      '도시락을 쌌다',
      '새 프라이팬을 샀다',
    ],
  },
  gunwoo: {
    id: 29, name: '신건우', handle: 'gunwoo', color: '#4f6f80', state: 'friends', every: 4,
    voice: [
      '기타 줄을 갈았다',
      '코드 하나를 겨우 잡았다',
      '합주 연습',
      '노래를 하나 만들고 있다',
      '손끝이 아프다',
    ],
  },
  yerin: {
    id: 30, name: '조예린', handle: 'yerin_travel', color: '#7a7562', state: 'friends', every: 3,
    voice: [
      '주말에 바다 보러 갔다',
      '기차에서 본 풍경',
      '숙소 창문이 좋았다',
      '지도를 안 보고 걸었다',
      '여행 계획을 세우는 게 절반은 여행이다',
      '짐을 다시 쌌다',
      '공항 가는 길',
    ],
  },
  taemin: {
    id: 31, name: '유태민', handle: 'taemin', color: '#66607a', state: 'friends', every: 5,
    voice: [
      '영화관 다녀옴',
      '오랜만에 극장에서 혼자',
      '엔딩 크레딧까지 다 봤다',
      '이번 주에 본 영화 세 편',
    ],
  },
  soyeon: {
    id: 32, name: '남소연', handle: 'soyeon.k', color: '#856a7d', state: 'friends', every: 2,
    voice: [
      '요가 수업 첫날',
      '몸이 굳어 있었다',
      '오늘은 스트레칭만',
      '아침에 일어나는 게 조금 쉬워졌다',
      '명상 10분',
      '어깨가 많이 풀렸다',
      '수업 끝나고 마시는 물',
    ],
  },
  hyunjin: {
    id: 33, name: '고현진', handle: 'hyunjin_pet', color: '#6d7a5f', state: 'friends', every: 2,
    voice: [
      '산책 나갔다가 비를 맞았다',
      '오늘도 발 닦이기 실패',
      '간식 앞에서만 말을 듣는다',
      '병원 다녀옴. 건강하대요',
      '새 방석을 사줬는데 안 쓴다',
      '자는 얼굴',
      '털이 너무 빠진다',
    ],
  },
  jaeho: {
    id: 34, name: '권재호', handle: 'jaeho', color: '#59708a', state: 'friends', every: 6,
    voice: [
      '이사 준비 시작',
      '박스가 스무 개',
      '버릴 게 이렇게 많았나',
      '새 집 열쇠를 받았다',
    ],
  },
  // 나에게 요청을 보낸 사람들 — 받은 요청함을 보기 위해
  hyunwoo: {
    id: 16, name: '김현우', handle: 'hyunwoo10k', color: '#567680', state: 'incoming', every: 2,
    voice: ['아침 10km', '오늘은 쉬어간다', '새 코스를 찾았다'],
  },
  bora: {
    id: 35, name: '이보라', handle: 'bora_b', color: '#7d6b8a', state: 'incoming', every: 3,
    voice: ['오늘의 커피', '카페 투어 3일차', '원두를 새로 샀다'],
  },
  // 내가 요청을 보낸 사람들 — '요청함' 상태를 보기 위해
  sora: {
    id: 17, name: '한소라', handle: 'sora.film', color: '#85617d', state: 'requested', every: 3,
    voice: ['필름 한 롤 다 씀', '골목 고양이', '흑백으로 찍어봤다'],
  },
  jiwon: {
    id: 36, name: '백지원', handle: 'jiwon', color: '#5f6f6a', state: 'requested', every: 4,
    voice: ['오늘의 하늘', '퇴근길', '주말 준비'],
  },
  // 남 — 검색으로만 나온다
  doyun: {
    id: 19, name: '송도윤', handle: 'doyun', color: '#62688a', state: 'none', every: 3,
    voice: ['새 자전거', '한강 라이딩', '체인을 갈았다'],
  },
  seoyeon: {
    id: 20, name: '홍서연', handle: 'seoyeon_b', color: '#5a7b7b', state: 'none', every: 3,
    voice: ['베이킹 연습', '스콘이 잘 부풀었다', '버터를 다 썼다'],
  },
  minjae: {
    id: 37, name: '전민재', handle: 'minjae', color: '#7a6558', state: 'none', every: 4,
    voice: ['목공 수업', '사포질만 두 시간', '작은 선반을 만들었다'],
  },
  chaewon: {
    id: 38, name: '노채원', handle: 'chaewon', color: '#6a7580', state: 'none', every: 4,
    voice: ['수영 강습', '25m 를 쉬지 않고', '물이 무섭지 않아졌다'],
  },
}

const byId = (id: number) => Object.values(people).find((p) => p.id === id)
const codeOf = (id: number) => Object.keys(people).find((c) => people[c].id === id)

/**
 * 내가 차단한 사람들.
 *
 * **차단은 관계를 끊는 것에서 끝나지 않는다** — 끊긴 사람은 다시 요청할 수 있다.
 * 차단하면 친구 목록·검색·요청 어디에도 안 나오고, 그 사람의 기록도 안 실린다.
 */
const blocked = new Set<number>()

/** 접수된 신고. 목업이라 쌓아만 두지만, 같은 것을 두 번 신고하지는 않게 한다 */
const reports = new Set<string>()

/** 친구가 아닌 사람의 기록은 어디에도 실리면 안 된다. 차단한 사람도 마찬가지 */
const isFriend = (code: string) =>
  people[code]?.state === 'friends' && !blocked.has(people[code].id)
const friendCodes = () => Object.keys(people).filter(isFriend)
const friendIds = () => friendCodes().map((c) => people[c].id)
/** 사진 없는 사람도 섞는다 — 이니셜 아바타도 같이 보여야 한다 */
const faceless = new Set([18, 24, 27, 31, 36])
const faceOf = (p: Person) => (faceless.has(p.id) ? undefined : photo(`face-${p.handle}`, 400, 400))

const author = (p: Person) => ({ id: p.id, name: p.name, color: p.color, avatar: faceOf(p) })

/** 종이 후보 — 글만 남긴 날에 돌려 쓴다 */
const PAPERS: Paper[] = [
  { bg: '#FFFFFF', ink: '#191D24' },
  { bg: '#EDF0F4', ink: '#191D24' },
  { bg: '#F3E7DA', ink: '#191D24' },
  { bg: '#E4EDE4', ink: '#191D24' },
  { bg: '#E7E9F5', ink: '#191D24' },
  { bg: '#F6E3E3', ink: '#191D24' },
  { bg: '#3B4657', ink: '#FFFFFF' },
  { bg: '#1E2128', ink: '#FFFFFF' },
]

/** 시드가 덮는 날 수 — 석 달 남짓이면 달을 두어 번 넘겨볼 수 있다 */
const SPAN = 95

/** 사진 크기 셋. 세로가 대부분이다 — 손에 든 폰으로 찍으니까 */
const SIZES: [number, number][] = [[1200, 1500], [1200, 1500], [1200, 1500], [1500, 1200], [1200, 1200]]

/** 오늘 글은 "몇 시간 전", 지난 날 글은 그날 저녁으로 둔다 */
const postedAt = (dateKey: DateKey, ago?: number): string => {
  if (ago !== undefined) return new Date(Date.now() - ago * 3600_000).toISOString()
  const d = parseKey(dateKey)
  // 사람마다 남기는 시각이 조금씩 다르다
  d.setHours(19 + Math.floor(seeded(d.getDate(), 7) * 4), Math.floor(seeded(d.getDate(), 9) * 60), 0, 0)
  return d.toISOString()
}

// ── 내 기록 ──
const LONG_TEXT =
  '오늘은 유난히 길었다. 아침엔 회의가 세 개였고 점심은 건너뛰었다. ' +
  '오후 내내 붙잡고 있던 버그가 결국 오타 한 글자였다는 걸 알았을 때는 화가 나기보다 웃겼다. ' +
  '퇴근길에 편의점에서 아이스크림을 사서 걸어오면서, 이런 날도 결국 한 줄로 남는구나 싶었다. ' +
  '내일은 조금 더 일찍 자야지.'

/** 내가 쓰는 말. 친구들보다 촘촘하게 — 내 달력이 제일 자주 열린다 */
const MY_VOICE = [
  '아침 러닝 5km. 날이 좋았다.',
  '밀린 책 두 챕터 읽음',
  '저녁에 파스타 직접 만들어 먹기 성공',
  '프로젝트 리팩터링 마무리',
  '가벼운 산책, 하늘이 예뻤다',
  '오늘은 사진 없이. 하루 종일 비가 왔고 창밖 소리만 들으며 아무것도 안 했다. 이런 날도 있어야지.',
  '',
  LONG_TEXT,
  '주말 장보기',
  '오랜만에 영화관',
  '새벽 다섯시의 공기',
  '이사 준비 시작',
  '아무 일도 없던 하루',
  '카페에서 세 시간',
  '자전거 정비',
  '첫 눈처럼 내린 비',
  '한 달 회고 작성',
  '동네 산책로 새로 발견',
  '책상 정리',
  '오랜 친구와 통화 두 시간',
  '김장 도우러 감',
  '새 키보드 영입',
  '단풍 절정',
  '전시회 다녀옴',
  '오랜만에 등산',
  '아무것도 하지 않은 하루',
  '점심에 국수. 육수가 진했다',
  '퇴근길에 우연히 만난 노을',
  '방 구조를 바꿨다',
  '오래 미뤄둔 병원 다녀옴',
  '새로 산 원두를 갈았다',
  '비 오는 날 창가 자리',
  '오늘은 일찍 잤다',
  '밀린 설거지를 다 했다',
  '친구가 준 화분에 물을 줬다',
  '지하철에서 책을 다 읽었다',
]

// 오늘은 비워둔다 — 빈 칸과 작성 흐름을 보기 위해
const entries: Record<DateKey, Entry> = {}
{
  let vi = 0
  for (let off = 1; off <= SPAN; off++) {
    // 이틀에 하루 남짓. 빠진 날이 있어야 달력이 진짜처럼 보인다
    if (seeded(1, off) > 0.62) continue
    const k = addDays(todayKey(), -off)
    const body = MY_VOICE[vi % MY_VOICE.length]
    vi += 1
    const noPhoto = seeded(2, off) < 0.18
    const [w, h] = SIZES[off % SIZES.length]
    entries[k] = {
      dateKey: k,
      text: body,
      photos: noPhoto ? [] : [photo(`me-${off}`, w, h)],
      // 달력 칸용 작은 것 — 같은 씨앗이라 같은 사진이다
      thumb: noPhoto ? undefined : photo(`me-${off}`, 240, 300),
      // 종이는 사진이 없을 때만 쓰인다
      paper: noPhoto ? PAPERS[off % PAPERS.length] : undefined,
      visibility: seeded(3, off) < 0.14 ? 'private' : 'friends',
      createdAt: postedAt(k),
    }
    // 글도 사진도 없는 날은 만들지 않는다 — 저장할 수 없는 상태다
    if (noPhoto && body === '') entries[k].text = '오늘은 사진 없이 한 줄만'
  }
}

// ── 남의 기록 ──
// posts[dateKey][사람 코드]
type Post = {
  text: string
  photos: string[]
  createdAt: string
  /** 달력 칸용 작은 사진 */
  thumb?: string
  /** 사진 없는 날의 종이 */
  paper?: Paper
  /** 남의 '나만 보기' 는 나에게 날짜만 온다 — 달력의 자물쇠 칸을 보기 위해 */
  visibility: Visibility
}
const posts: Record<DateKey, Record<string, Post>> = {}

Object.entries(people).forEach(([code, p]) => {
  let vi = 0
  for (let off = 0; off <= SPAN; off++) {
    // `every` 가 작을수록 자주 남긴다. 같은 사람·같은 날은 늘 같은 결과다
    if (seeded(p.id, off) > 1 / p.every) continue
    const k = addDays(todayKey(), -off)
    const body = p.voice[vi % p.voice.length]
    vi += 1
    const noPhoto = seeded(p.id + 500, off) < 0.16
    const [w, h] = SIZES[(p.id + off) % SIZES.length]
    ;(posts[k] ??= {})[code] = {
      text: body,
      photos: noPhoto ? [] : [photo(`${p.handle}-${off}`, w, h)],
      thumb: noPhoto ? undefined : photo(`${p.handle}-${off}`, 240, 300),
      paper: noPhoto ? PAPERS[(p.id + off) % PAPERS.length] : undefined,
      // 오늘 글은 시각을 벌려둔다 — "몇 시간 전" 이 골고루 보이게
      createdAt: postedAt(k, off === 0 ? Math.floor(seeded(p.id, 77) * 13) : undefined),
      visibility: seeded(p.id + 900, off) < 0.09 ? 'private' : 'friends',
    }
  }
})

// ── 좋아요 · 댓글 (피드 항목 id 기준 인메모리) ──
const likes: Record<string, Set<number>> = {}
const comments: Record<string, Comment[]> = {}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

/** 아무 데나 붙어도 어색하지 않은 짧은 말들 — 실제로 친구들이 다는 댓글이 대개 이렇다 */
const REPLIES = [
  '좋다',
  '이거 어디야?',
  '나도 가고 싶다',
  '사진 잘 나왔네',
  '오늘 고생했어',
  '부럽다 진짜',
  '와 색감',
  '다음엔 같이 가자',
  '이런 날씨 좋아',
  '멋있다',
  '나도 해봐야지',
  '잘 자',
  '푹 쉬어',
  '오 축하해',
  '어떻게 한 거야?',
]

/**
 * 반응을 뿌린다 — **나만 보기인 날은 건너뛴다.**
 * 아무도 못 본 기록에 남의 좋아요가 달려 있으면 앞뒤가 안 맞는다.
 */
const seedReactions = (itemId: string, salt: number, off: number) => {
  const ids = friendIds()
  const n = Math.floor(seeded(salt, off + 11) * 5)
  if (n > 0) {
    const set = new Set<number>()
    for (let i = 0; i < n; i++) set.add(ids[Math.floor(seeded(salt, off + 20 + i) * ids.length)])
    likes[itemId] = set
  }
  const cn = Math.floor(seeded(salt, off + 40) * 3.4)
  const codes = friendCodes()
  for (let i = 0; i < cn; i++) {
    const who = codes[Math.floor(seeded(salt, off + 60 + i) * codes.length)]
    ;(comments[itemId] ??= []).push({
      id: `${itemId}-c${i + 1}`,
      author: author(people[who]),
      text: REPLIES[Math.floor(seeded(salt, off + 80 + i) * REPLIES.length)],
      createdAt: hoursAgo(off * 24 + 3 + i * 2),
    })
  }
}

Object.entries(people).forEach(([code, p]) => {
  if (p.state !== 'friends') return
  for (let off = 0; off <= SPAN; off++) {
    const post = posts[addDays(todayKey(), -off)]?.[code]
    if (!post || post.visibility === 'private') continue
    seedReactions(`${code}-${addDays(todayKey(), -off)}`, p.id, off)
  }
})

// 내 기록에 달린 반응 — 친구 공개인 날에만 붙는다
Object.values(entries).forEach((e) => {
  if (e.visibility === 'private') return
  const off = Math.round((parseKey(todayKey()).getTime() - parseKey(e.dateKey).getTime()) / 86_400_000)
  seedReactions(`me-${e.dateKey}`, 4, off)
})

// 댓글이 길게 달린 항목 하나 — 상세 스크롤과 키보드 겹침을 보기 위해
{
  const talky = Object.keys(entries).sort().reverse()[1]
  if (talky) {
    const id = `me-${talky}`
    comments[id] = []
    const chat: [string, string, number][] = [
      ['younghee', '이 책 나도 읽었어', 22],
      ['chulsoo', '다음엔 같이 읽자', 20],
      ['jisoo', '어느 출판사야?', 18],
      ['taeho', '나도 빌려줘', 16],
      ['minsu', '표지가 예쁘다', 14],
      ['eunji', '나도 사야지', 12],
    ]
    chat.forEach(([who, t, h], i) => {
      comments[id].push({ id: `${id}-c${i + 1}`, author: author(people[who]), text: t, createdAt: hoursAgo(h) })
    })
  }
}


const likeInfo = (itemId: string) => ({
  likeCount: likes[itemId]?.size ?? 0,
  likedByMe: likes[itemId]?.has(me.id) ?? false,
  commentCount: comments[itemId]?.length ?? 0,
})

/** 내 기록에 달린 반응 */
const withCounts = (e: Entry): Entry => {
  const id = `me-${e.dateKey}`
  return {
    ...e,
    likeCount: likes[id]?.size ?? 0,
    likedByMe: likes[id]?.has(me.id) ?? false,
    commentCount: comments[id]?.length ?? 0,
  }
}

/** 내가 열어본 남의 기록 — 카드의 안 읽음 점을 지우는 데만 쓴다 */
const opened = new Set<string>()

/**
 * 반응은 **나에게 열린** 기록에만 붙는다 — id 를 지어내서 좋아요·댓글을 남길 수 없어야 한다.
 * 잠긴 날은 날짜만 알려줬으므로, 그 날짜로 id 를 만들어 반응을 다는 것도 막아야 한다
 */
const itemExists = (itemId: string): boolean => {
  const cut = itemId.indexOf('-')
  if (cut < 0) return false
  const code = itemId.slice(0, cut)
  const dateKey = itemId.slice(cut + 1)
  return code === 'me' ? !!entries[dateKey] : isFriend(code) && isOpenToMe(code, dateKey)
}

/** 나에게 열리는 남의 기록인지 — '나만 보기' 는 본인 말고 아무에게도 안 열린다 */
const isOpenToMe = (code: string, dateKey: DateKey) => posts[dateKey]?.[code]?.visibility === 'friends'

const feedItem = (code: string, dateKey: DateKey): FeedItem | null => {
  const p = posts[dateKey]?.[code]
  if (!p) return null
  const id = `${code}-${dateKey}`
  return {
    id,
    author: author(people[code]),
    text: p.text,
    photos: p.photos,
    thumb: p.thumb,
    paper: p.paper,
    mine: false,
    openedByMe: dateKey !== todayKey() || opened.has(id),
    createdAt: p.createdAt,
    ...likeInfo(id),
  }
}

/** 오늘 내가 콕 찌른 사람들. nudged[dateKey] = Set<userId> — 하루가 지나면 다시 찌를 수 있다 */
const nudged: Record<DateKey, Set<number>> = {
  // 미래는 이미 찔러둔 상태로 시작한다 — 안 찌른 사람과 나란히 놓고 봐야 두 상태가 구분되는지 안다
  [todayKey()]: new Set([26]),
}

const userCard = (p: Person): UserCard => {
  const today = posts[todayKey()]?.[codeOf(p.id)!]
  const open = !blocked.has(p.id) && p.state === 'friends'
  return {
    ...author(p),
    handle: p.handle,
    // 차단한 사람은 관계를 무엇으로 두었든 '남' 으로 보인다
    friendState: blocked.has(p.id) ? 'none' : p.state,
    blocked: blocked.has(p.id),
    // 남의 활동 여부도 친구일 때만 알려준다
    postedToday: open && !!today,
    // '나만 보기' 인 날은 **내용을 아예 안 싣는다** — 목록만 받아도 새어나가면 안 된다
    today: open && today?.visibility === 'friends'
      ? { thumb: today.thumb, note: today.photos.length === 0 ? today.text : undefined, paper: today.paper }
      : undefined,
    // 콕 찌르기는 친구 목록 줄에서 한다 — 하루가 지나면 다시 찌를 수 있다
    nudgedByMe: nudged[todayKey()]?.has(p.id) ?? false,
  }
}

export const mock = {
  getMe: () => delay(me),

  updateMe: (patch: UpdateMePatch): Promise<Me> => {
    if (patch.nickname !== undefined) {
      const next = patch.nickname.trim()
      // 지금 내 이름은 겹친 게 아니다 — 목록에 내가 들어 있어도 그대로 두는 건 막지 않는다
      if (next !== me.name && TAKEN_NICKNAMES.includes(next)) {
        return Promise.reject(new Error('이미 쓰는 닉네임입니다'))
      }
      me.name = next
    }
    if ('avatar' in patch) me.avatar = patch.avatar ?? undefined
    return delay({ ...me }, 120)
  },

  getStats: () =>
    delay({
      totalEntries: Object.keys(entries).length,
      friendCount: friendCodes().length,
      requestCount: Object.values(people).filter((p) => p.state === 'incoming').length,
    }),

  getMonthEntries: (year: number, month: number) =>
    delay(
      Object.values(entries)
        .filter((e) => {
          // new Date('2026-08-01') 은 UTC 자정으로 읽혀 음수 시간대에서 전달로 밀린다 → parseKey 로 로컬 파싱
          const d = parseKey(e.dateKey)
          return d.getFullYear() === year && d.getMonth() === month
        })
        .map(withCounts),
    ),

  getEntry: (dateKey: DateKey) => delay(entries[dateKey] ? withCounts(entries[dateKey]) : null),

  // 내 모든 기록 (최신순)
  getAllEntries: (): Promise<Entry[]> =>
    delay(Object.values(entries).sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1)).map(withCounts)),

  createEntry: ({ dateKey, text, photos, visibility, paper }: CreateEntryInput): Promise<Entry> => {
    /*
      **고치는 것은 아무 날이나, 새로 쓰는 것은 오늘만.**
      이미 있는 하루의 오타를 고치는 건 그냥 고치는 것이지만,
      없던 하루를 뒤늦게 지어내면 기록이 아니라 창작이 된다
    */
    const prev = entries[dateKey]
    // 지나간 빈 날은 뒤늦게 채울 수 있다. 막는 건 **아직 오지 않은 날**뿐
    if (dateKey > todayKey()) return Promise.reject(new Error('아직 오지 않은 날입니다'))
    /*
      **사진은 처음 남길 때 한 번뿐.** 이미 올린 기록의 사진을 갈아끼우면
      친구들이 남긴 좋아요·댓글이 딴 사진에 붙는다 (인스타그램도 이래서 막는다).
      바꾸고 싶으면 지우고 다시 남긴다 — 그러면 반응도 같이 사라져서 앞뒤가 맞는다
    */
    if (prev && (photos[0] ?? null) !== (prev.photos[0] ?? null))
      return Promise.reject(new Error('사진은 바꿀 수 없습니다'))
    // 고쳐 쓴 것이지 다시 올린 것이 아니다 — 남긴 시각은 처음 것을 지킨다
    const createdAt = prev?.createdAt ?? new Date().toISOString()
    // 작은 사진은 고쳐도 그대로 물려받는다 — 안 넘기면 달력 칸이 원본을 로드하게 된다
    const entry: Entry = { dateKey, text, photos, visibility, paper, createdAt, thumb: prev?.thumb }
    entries[dateKey] = entry
    return delay(entry)
  },

  /** 기록을 지운다. 그 기록에 달렸던 좋아요·댓글도 함께 사라진다 */
  deleteEntry: (dateKey: DateKey): Promise<void> => {
    if (!entries[dateKey]) return Promise.reject(new Error('그날 기록이 없습니다'))
    delete entries[dateKey]
    const itemId = `me-${dateKey}`
    delete likes[itemId]
    delete comments[itemId]
    return delay(undefined, 160)
  },

  updateVisibility: (dateKey: DateKey, visibility: Visibility): Promise<Entry> => {
    const e = entries[dateKey]
    if (!e) return Promise.reject(new Error('그날 기록이 없습니다'))
    e.visibility = visibility
    return delay(withCounts(e), 120)
  },

  /** 친구 목록 — 오늘 남긴 사람이 앞으로 */
  getFriends: (): Promise<UserCard[]> =>
    delay(
      friendCodes()
        .map((c) => userCard(people[c]))
        .sort((a, b) => Number(b.postedToday) - Number(a.postedToday) || a.name.localeCompare(b.name)),
    ),

  /** 나에게 온 친구 요청 */
  getRequests: (): Promise<UserCard[]> =>
    delay(
      Object.values(people)
        .filter((p) => p.state === 'incoming' && !blocked.has(p.id))
        .map(userCard),
    ),

  /** 이름 · 핸들로 찾기. 나 자신은 결과에서 뺀다 */
  searchUsers: (q: string): Promise<UserCard[]> => {
    const term = q.trim().toLowerCase()
    if (term === '') return delay([], 60)
    return delay(
      Object.values(people)
        .filter((p) => !blocked.has(p.id))
        .filter((p) => p.name.toLowerCase().includes(term) || p.handle.toLowerCase().includes(term))
        .map(userCard),
      260,
    )
  },

  getProfile: (userId: number): Promise<Profile> => {
    const p = byId(userId)
    if (!p) return Promise.reject(new Error('없는 사용자입니다'))
    const code = codeOf(userId)!
    // 친구가 아니면 기록을 한 장도 내려주지 않는다. 가리는 게 아니라 안 보내는 것
    const mineToShow = p.state === 'friends' && !blocked.has(userId)
    const all = Object.keys(posts).filter((k) => posts[k][code])
    const dates = mineToShow
      ? all.filter((k) => isOpenToMe(code, k)).sort((a, b) => (a < b ? 1 : -1))
      : []
    return delay({
      ...userCard(p),
      entryCount: all.length,
      entries: dates.map((k) => feedItem(code, k)!),
      // 잠긴 날은 날짜만 — 글·사진·반응은 한 조각도 실리지 않는다
      lockedDates: mineToShow ? all.filter((k) => !isOpenToMe(code, k)).sort() : [],
    })
  },

  requestFriend: (userId: number): Promise<void> => {
    const p = byId(userId)
    if (!p) return Promise.reject(new Error('없는 사용자입니다'))
    if (blocked.has(userId)) return Promise.reject(new Error('차단한 사람입니다. 차단을 풀어야 요청할 수 있어요'))
    if (p.state === 'friends') return Promise.reject(new Error('이미 친구입니다'))
    // 상대가 먼저 보냈으면 요청이 아니라 수락이다
    p.state = p.state === 'incoming' ? 'friends' : 'requested'
    return delay(undefined, 150)
  },

  acceptFriend: (userId: number): Promise<void> => {
    const p = byId(userId)
    if (!p) return Promise.reject(new Error('없는 사용자입니다'))
    if (p.state !== 'incoming') return Promise.reject(new Error('받은 요청이 없습니다'))
    p.state = 'friends'
    return delay(undefined, 150)
  },

  /** 거절 · 요청 취소 · 친구 끊기 — 결과는 모두 '남' 이라 한 곳에서 받는다 */
  unfriend: (userId: number): Promise<void> => {
    const p = byId(userId)
    if (!p) return Promise.reject(new Error('없는 사용자입니다'))
    p.state = 'none'
    return delay(undefined, 150)
  },

  /**
   * 차단 — **관계를 끊고 서로 못 찾게 한다.**
   * 친구 끊기와 갈라 두는 이유: 끊긴 사람은 다시 요청할 수 있지만 차단된 사람은 그러지 못한다.
   */
  blockUser: (userId: number): Promise<void> => {
    const p = byId(userId)
    if (!p) return Promise.reject(new Error('없는 사용자입니다'))
    blocked.add(userId)
    p.state = 'none'
    return delay(undefined, 150)
  },

  unblockUser: (userId: number): Promise<void> => {
    if (!byId(userId)) return Promise.reject(new Error('없는 사용자입니다'))
    // 풀어도 친구로는 안 돌아간다 — 다시 요청해야 한다
    blocked.delete(userId)
    return delay(undefined, 150)
  },

  /** 차단한 사람들. 풀 수 있는 자리가 없으면 차단은 되돌릴 수 없는 것이 된다 */
  getBlocked: (): Promise<UserCard[]> =>
    delay(
      Object.values(people)
        .filter((p) => blocked.has(p.id))
        .map(userCard)
        .sort((a, b) => a.name.localeCompare(b.name)),
    ),

  /**
   * 신고 접수. 같은 대상을 두 번 신고하면 접수는 되지만 쌓이지는 않는다.
   * 실서버에서는 여기서 심사 대기열로 넘어간다.
   */
  report: (target: string, reason: ReportReason, detail?: string): Promise<void> => {
    reports.add(`${target}:${reason}:${detail ?? ''}`)
    return delay(undefined, 200)
  },

  /** 계정 삭제 — 내 기록·반응·댓글이 함께 사라진다 */
  deleteAccount: (): Promise<void> => {
    for (const k of Object.keys(entries)) delete entries[k]
    for (const k of Object.keys(likes)) delete likes[k]
    for (const k of Object.keys(comments)) delete comments[k]
    return delay(undefined, 300)
  },

  markOpened: (itemId: string): Promise<void> => {
    if (!itemExists(itemId)) return Promise.reject(new Error('없는 기록입니다'))
    opened.add(itemId)
    return delay(undefined, 60)
  },

  // 찌른 기록은 사람에 붙는다 — 하루에 한 사람당 한 번
  nudge: (userId: number): Promise<void> => {
    const p = byId(userId)
    if (p?.state !== 'friends') return Promise.reject(new Error('친구에게만 보낼 수 있습니다'))
    ;(nudged[todayKey()] ??= new Set()).add(userId)
    return delay(undefined, 120)
  },

  toggleLike: (itemId: string) => {
    if (!itemExists(itemId)) return Promise.reject(new Error('없는 기록입니다'))
    const set = (likes[itemId] ??= new Set())
    if (set.has(me.id)) set.delete(me.id)
    else set.add(me.id)
    return delay({ liked: set.has(me.id), likeCount: set.size }, 80)
  },

  getComments: (itemId: string): Promise<Comment[]> =>
    itemExists(itemId) ? delay([...(comments[itemId] ?? [])]) : Promise.reject(new Error('없는 기록입니다')),

  addComment: (itemId: string, text: string): Promise<Comment> => {
    if (!itemExists(itemId)) return Promise.reject(new Error('없는 기록입니다'))
    const list = (comments[itemId] ??= [])
    const c: Comment = {
      id: `${itemId}-c${list.length + 1}`,
      author: { id: me.id, name: me.name, color: me.color },
      text,
      createdAt: new Date().toISOString(),
    }
    list.push(c)
    return delay(c, 120)
  },
}
