# 아키텍처

## 목차

- [DB 스키마](#db-스키마)
- [상태 전이](#상태-전이)
- [API 경계](#api-경계)
- [인증](#인증)
- [공개 블로그 읽기 경로](#공개-블로그-읽기-경로)
- [재생성 흐름 (상세)](#재생성-흐름-상세)
- [프론트엔드 아키텍처](#프론트엔드-아키텍처)
- [라인 인덱스](#라인-인덱스)

---

## DB 스키마

### articles
초안과 공개 글의 최상위 엔티티.

| 컬럼 | 설명 |
|------|------|
| `id` | UUID PK |
| `slug` | unique. 발행 전 provisional 허용, 발행 시 최종 확정 |
| `status` | `draft` → `in_review` → `regenerating` → `published` → `archived` |
| `title`, `summary` | 최신 버전 기준으로 갱신 |
| `current_version_id` | 리뷰 중인 최신 버전 (FK → article_versions) |
| `published_version_id` | 공개 중인 버전 (FK → article_versions) |
| `published_at` | 발행 시 기록 |

### article_versions
본문 스냅샷과 생성 메타데이터.

| 컬럼 | 설명 |
|------|------|
| `article_id` | FK → articles |
| `version_number` | article 내에서 단조 증가 |
| `source_type` | `weekly` / `project` / `manual` / `regenerated` |
| `mdx_source` | 실제 렌더와 발행에 쓰이는 canonical source |
| `plain_text_snapshot` | read time 계산, 라인 UI용 파생 데이터 |
| `line_index` | `{ lineNumber, startOffset, endOffset, content }[]` JSONB — 라인 번호 ↔ offset 매핑 |
| `generation_context` | 모델명, tags, author, regenerationJobId 등 생성 메타 JSONB |

### review_comments
라인 단위 인라인 코멘트.

| 컬럼 | 설명 |
|------|------|
| `article_version_id` | FK → article_versions. 코멘트는 article이 아니라 특정 버전에 귀속 |
| `start_line`, `end_line` | 라인 번호 기준 범위 |
| `selected_text` | 해당 라인의 텍스트 스냅샷. 재생성 후 라인이 이동해도 맥락 파악 용도로 보존 |
| `status` | `open` / `resolved` / `dismissed` |

재생성 후 기존 코멘트는 이전 버전에 그대로 남는다. 새 버전에 자동 승계하지 않는다.

### regeneration_jobs
비동기 재생성 요청 큐.

| 컬럼 | 설명 |
|------|------|
| `article_id`, `base_version_id` | 재생성 대상 |
| `status` | `queued` → `running` → `completed` / `failed` |
| `job_type` | `initial_draft` / `regenerate` |
| `input_payload` | article 메타, base version, open comments 스냅샷 JSONB |
| `locked_at`, `worker_id` | job lock용. 15분 초과 시 stale로 간주하고 재할당 가능 |
| `attempt_count` | stale 재시도 횟수 추적 |

### publication_events
발행/아카이브 이력.

| 컬럼 | 설명 |
|------|------|
| `event_type` | `published` / `unpublished` / `archived` |
| `from_version_id`, `to_version_id` | 버전 전이 기록 |
| `actor` | 발행 주체 |

### admin_users
스튜디오 인증 주체. 현재 패스워드 기반 인증이라 실질적으로 미사용 중이지만 스키마는 정의됨.

---

## 상태 전이

```
draft
  ↓  재생성 요청
regenerating
  ↓  worker 완료 (completeRegenerationJob)
draft           ← 재생성 완료 후 다시 draft로 복귀
  ↓  수동 검토 완료 후
in_review       ← 현재 UI에서는 명시적 전환 없음, 향후 확장 포인트
  ↓  발행
published
  ↓  아카이브
archived
```

재생성 실패 시 `failRegenerationJob`에서 status를 `failed`로 기록하고 article은 `draft`로 복귀.

---

## API 경계

### 내부 API (`/api/internal`) — blog-pipeline-agent 전용

`Authorization: Bearer <INTERNAL_API_TOKEN>` 헤더로 인증.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/internal/drafts` | 초안 생성. articles + article_versions(v1) 동시 생성 |
| `GET` | `/api/internal/jobs/next?type=regenerate` | 다음 queued job claim (lock 포함). stale running job도 재할당 가능 |
| `POST` | `/api/internal/jobs/:id/complete` | job 완료. 새 버전 생성 + `current_version_id` 갱신 트랜잭션 |
| `POST` | `/api/internal/jobs/:id/fail` | job 실패 기록. article을 draft로 복귀 |

### 관리자 API (`/api/admin`) — 스튜디오 UI 전용

JWT 세션 쿠키로 인증. `proxy.ts` 미들웨어가 `/api/admin/**` 전체를 보호.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/api/admin/drafts` | 초안 목록 (open comment count 집계 포함) |
| `GET` | `/api/admin/drafts/:id` | 초안 상세 (current version + 버전 목록 + 코멘트 목록) |
| `PATCH` | `/api/admin/drafts/:id` | 제목·요약·본문 수정 → 새 manual 버전 생성 |
| `POST` | `/api/admin/drafts/:id/regenerate` | regeneration job 생성. 동일 draft에 queued/running job 있으면 에러 |
| `POST` | `/api/admin/comments` | 코멘트 작성. 라인 범위가 version의 line_index 범위를 초과하면 에러 |
| `PATCH` | `/api/admin/comments/:id` | body 또는 status(open/resolved/dismissed) 수정 |
| `DELETE` | `/api/admin/comments/:id` | 코멘트 삭제 |

미구현: `publish`, `archive` 엔드포인트.

---

## 인증

스튜디오 인증은 **패스워드 기반 JWT**다.

- 로그인: `ADMIN_PASSWORD` 환경변수와 대조 → 일치하면 HS256 JWT 발급, httpOnly 쿠키(`jeanne_log_admin_session`)로 저장
- 세션 유효기간: 7일
- 미들웨어(`proxy.ts`): `/studio/**`, `/api/admin/**` 경로를 보호. 미인증 요청은 페이지 → 로그인 리다이렉트, API → 401 반환
- 구현 위치: `lib/auth/admin-session.ts`

---

## 공개 블로그 읽기 경로

- 목록: `articles WHERE status = 'published'` + `INNER JOIN article_versions ON published_version_id` → `publishedAt` 내림차순
- 상세: `slug` + `published_version_id` 기준 join 조회
- `hasDatabaseUrl()`이 false면 빈 배열 반환 → DB 없이도 앱 기동 가능
- 구현 위치: `services/articleRepository.ts`

---

## 재생성 흐름 (상세)

```
1. POST /api/admin/drafts/:id/regenerate
   - 동일 draft의 queued/running job 존재 여부 확인 (중복 방지)
   - current version의 open comments 스냅샷을 input_payload에 포함
   - regeneration_jobs INSERT (status: queued)
   - articles.status = 'regenerating'으로 갱신

2. GET /api/internal/jobs/next (blog-pipeline-agent polling)
   - queued job 조회 (FIFO)
   - 없으면 15분 초과 stale running job 재할당
   - status: running, locked_at, worker_id 갱신

3. blog-pipeline-agent: LLM 호출 후 결과 제출

4. POST /api/internal/jobs/:id/complete
   - worker_id 검증 (다른 worker가 가져간 job 덮어쓰기 방지)
   - article_versions INSERT (version_number = max + 1, source_type: regenerated)
   - articles.current_version_id 갱신, status = 'draft'로 복귀
   - regeneration_jobs.status = 'completed'

5. (실패 시) POST /api/internal/jobs/:id/fail
   - regeneration_jobs.status = 'failed', error_message 기록
   - articles.status = 'draft'로 복귀
```

---

## 프론트엔드 아키텍처

### 레이아웃 구조

공개 블로그와 스튜디오는 레이아웃을 완전히 분리한다.

- **공개 블로그**: `app/layout.tsx` → `components/Layout.tsx` 래핑. 헤더(네비, 다크 모드 토글), 최대 너비 `max-w-3xl` 중앙 정렬, 푸터 포함
- **스튜디오**: 별도 레이아웃 없이 각 페이지가 직접 렌더링. 공개 헤더/푸터 없음

### 렌더링 전략

모든 페이지는 `export const dynamic = 'force-dynamic'`으로 설정되어 있다. 캐싱 없이 매 요청마다 DB에서 최신 데이터를 읽는다.

- 공개 블로그 페이지(`/`, `/posts/[slug]`): Server Component. 데이터 페칭 → 클라이언트 컴포넌트에 props 전달
- 스튜디오 페이지: Server Component. 초안/버전/코멘트를 서버에서 조회 후 Client Component에 `initialData`로 전달
- 스튜디오 UI 컴포넌트(`DraftEditor`, `CommentManager`, `RegenerateDraftButton`): `"use client"`. 사용자 인터랙션 처리 후 `router.refresh()`로 서버 데이터 재조회

### 데이터 흐름 (스튜디오)

```
Server Component (page.tsx)
  → DB 조회 (services/)
  → Client Component에 initialData props 전달
      → fetch() API 호출 (/api/admin/*)
      → router.refresh() → Server Component 재실행 → 최신 데이터 반영
```

뮤테이션(코멘트 작성/수정/삭제, 초안 저장, 재생성 요청)은 항상 fetch → router.refresh() 패턴을 따른다. 별도 클라이언트 상태 동기화 없음.

### 공개 블로그 데이터 계층

`postService.ts`는 `articleRepository`를 직접 호출한다. DB가 없거나 연결 실패 시 빈 배열을 반환한다.

### 컴포넌트 역할

| 컴포넌트 | 역할 |
|----------|------|
| `Layout` | 공개 블로그 전체 래퍼. 헤더, 다크 모드, 푸터 |
| `PostList` | 글 목록 카드. date, tags[0], readTime 표시 |
| `PostDetail` | 글 상세. MDXRemote로 본문 렌더링. `@tailwindcss/typography` prose 스타일 |
| `DraftEditor` | 제목·요약·MDX 본문 직접 편집. 저장 시 새 `manual` 버전 생성 |
| `CommentManager` | 라인 범위 지정 코멘트 작성/상태 전환/삭제 |
| `RegenerateDraftButton` | 재생성 요청. 이미 queued/running job이 있으면 비활성화 |
| `StudioLoginForm` | 패스워드 입력 → `/api/auth/admin/login` 호출 |
| `StudioLogoutButton` | `/api/auth/admin/logout` 호출 후 로그인 페이지로 이동 |

### 타입 시스템

`types.ts`에 프론트엔드 전용 타입이 정의되어 있다. DB 타입(`db/schema.ts`의 `Select*` 타입)을 직접 노출하지 않고 repository 계층에서 변환해 서비스 타입으로 내려준다.

| 타입 | 설명 |
|------|------|
| `BlogPost` | 공개 블로그 글 |
| `DraftSummary` | 목록용 경량 초안 데이터 |
| `DraftDetail` | 상세 화면용. 버전 목록, 코멘트 목록, lineIndex 포함 |
| `DraftComment` | 코멘트 |
| `DraftVersionSummary` | 버전 목록 아이템 |

### 폰트 및 스타일

- 본문: Inter (`--font-inter`)
- 코드/모노: JetBrains Mono (`--font-mono`)
- MDX 본문: `@tailwindcss/typography` prose 클래스 (`prose-slate`, `dark:prose-invert`)
- 스튜디오 source 뷰어: `font-mono`, 라인 번호 컬럼 72px 고정

---

## 라인 인덱스

`article_versions.line_index`는 MDX source를 라인 단위로 분해한 JSONB 배열이다.

```typescript
type LineIndexEntry = {
  lineNumber: number;   // 1-based
  startOffset: number;  // source 내 문자 offset
  endOffset: number;
  content: string;      // 해당 줄의 텍스트
};
```

- 코멘트 작성 시 `start_line`, `end_line`이 이 배열의 길이를 초과하면 에러
- 스튜디오 source 뷰어에서 코멘트가 있는 라인을 하이라이트하는 데 사용
- 구축 함수: `lib/content/posts.ts > buildLineIndex()`
