# jeanne-log

Next.js로 구축한 개인 기술 블로그입니다.

외부 AI 파이프라인(`blog-pipeline-agent`)이 초안을 자동 생성하고, 스튜디오에서 검토·코멘트·재생성을 반복한 뒤 발행하는 워크플로를 내장하고 있습니다.

## 발행 흐름

```
blog-pipeline-agent
  → POST /api/internal/drafts        # 초안 적재
  → 스튜디오에서 검토 및 라인 코멘트 작성
  → 재생성 요청 → worker가 job 소비 → 새 버전 생성
  → 발행 → 공개 블로그에 즉시 반영
```

## 기능

### 공개 블로그
- 발행된 글 목록 및 상세 읽기
- MDX 기반 본문 렌더링
- 다크 모드, 반응형 디자인

### 스튜디오 (관리 영역)
- **초안 목록**: AI가 적재한 초안을 상태(Draft / In Review / Regenerating / Published / Archived)별로 확인. 버전 번호, 열린 코멘트 수, 마지막 수정 시각 표시
- **초안 상세 리뷰**:
  - 라인 번호가 있는 MDX source 뷰어. 코멘트가 달린 라인은 하이라이트
  - 제목·요약·본문을 직접 수정해 새 manual 버전 생성 가능 (Editor 패널)
  - 버전 목록에서 각 버전의 source type, 모델명, 생성 시각 확인
- **라인 코멘트**: 라인 범위(start/end)를 지정해 코멘트 작성. open → resolved / dismissed 상태 전환, 삭제 가능
- **재생성 요청**: 열린 코멘트를 포함한 payload로 regeneration job 생성. 워커가 job을 소비해 새 버전 제출 후 `current_version_id` 갱신. 재생성 중 상태는 UI에 표시
- **발행**: 현재 버전을 `published_version_id`로 설정하고 공개 블로그에 즉시 반영

### 파이프라인 연동
- `blog-pipeline-agent`는 내부 API(`/api/internal`)를 통해서만 접근
- 초안 생성, regeneration job 소비(claim → complete / fail) 지원
- job lock 및 stale job 재시도 처리 내장 (15분 초과 시 재할당)

### DB 기반 콘텐츠 관리
- 공개 글, 초안, 버전, 코멘트, 재생성 job 모두 Postgres에 저장
- 발행은 git push나 파일 생성이 아니라 DB 상태 전이 + Next.js 캐시 무효화
- 기존 MDX 파일을 DB로 일괄 import하는 스크립트 포함

## 기술 스택

- [Next.js](https://nextjs.org/) App Router
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Postgres](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/)
- [next-mdx-remote](https://github.com/hashicorp/next-mdx-remote) — MDX 렌더링
- [jose](https://github.com/panva/jose) — JWT 기반 스튜디오 세션
- [Zod](https://zod.dev/) — API 요청 검증

## 프로젝트 구조

```
app/
  page.tsx                      # 공개 블로그 홈
  posts/[slug]/                 # 공개 글 상세
  studio/                       # 관리 영역 (인증 필요)
    login/
    drafts/
    drafts/[id]/
  api/
    admin/                      # 스튜디오용 API
      comments/[id]/
      drafts/[id]/
      drafts/[id]/regenerate/
    internal/                   # blog-pipeline-agent 전용 API
      drafts/
      jobs/next/
      jobs/[id]/complete/
      jobs/[id]/fail/
    auth/admin/
components/
  studio/                       # 스튜디오 UI 컴포넌트
    DraftEditor.tsx
    CommentManager.tsx
    RegenerateDraftButton.tsx
    StudioLoginForm.tsx
    StudioLogoutButton.tsx
db/
  schema.ts                     # Drizzle 스키마 (articles, article_versions, review_comments, regeneration_jobs, publication_events)
  client.ts
lib/
  auth/admin-session.ts         # JWT 세션 발급/검증
  content/                      # MDX 파싱, 라인 인덱싱, read time 계산
  validators/                   # Zod 스키마 (comments, drafts, internal API)
  api/internal.ts
services/
  articleRepository.ts          # 공개 글 조회
  draftRepository.ts            # 초안 목록/상세 조회
  commentRepository.ts          # 코멘트 CRUD
  regenerationJobRepository.ts  # job 생성/claim/complete/fail
  postService.ts
scripts/
```

## 로컬 개발 설정

```bash
cp .env.example .env.local
# .env.local 항목 채우기

npm install
npm run db:generate   # 마이그레이션 파일 생성
npm run db:migrate    # 마이그레이션 실행
npm run dev
```

