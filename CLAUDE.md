# jeanne-log

개인 기술 블로그. 외부 AI 파이프라인(`blog-pipeline-agent`)이 초안을 자동 생성하고, 스튜디오에서 검토·코멘트·재생성을 반복한 뒤 발행한다.

## 현재 구조

- **공개 블로그** (`/`, `/posts/[slug]`): DB에서 `status = published`인 글을 읽어 렌더링한다.
- **스튜디오** (`/studio`): 초안 목록·상세 리뷰·라인 코멘트·재생성 요청·발행 UI. JWT 쿠키 인증 필요.
- **관리자 API** (`/api/admin`): 스튜디오 UI 전용. JWT 세션으로 보호.
- **내부 API** (`/api/internal`): `blog-pipeline-agent` 전용. Bearer 토큰으로 보호. 초안 생성, job claim/complete/fail.
- **DB**: Postgres + Drizzle ORM. 공개 글, 초안, 버전, 코멘트, 재생성 job, 발행 이력 모두 DB에 저장.
- **인증**: 패스워드 기반 JWT. `ADMIN_PASSWORD`와 대조 후 HS256 토큰 발급, 세션 7일 유지.


## 작업별 참고 문서

| 작업 | 참고 섹션 |
|------|-----------|
| DB 스키마 변경, 테이블/컬럼 파악 | [아키텍처 > DB 스키마](./docs/architecture.md#db-스키마) |
| article status 흐름 이해, 상태 전이 로직 수정 | [아키텍처 > 상태 전이](./docs/architecture.md#상태-전이) |
| API 엔드포인트 추가/수정, blog-pipeline-agent 연동 | [아키텍처 > API 경계](./docs/architecture.md#api-경계) |
| 스튜디오 인증 관련 작업, 세션/미들웨어 수정 | [아키텍처 > 인증](./docs/architecture.md#인증) |
| 공개 블로그 글 조회 로직 수정 | [아키텍처 > 공개 블로그 읽기 경로](./docs/architecture.md#공개-블로그-읽기-경로) |
| 재생성 job 흐름 수정, worker 연동, job lock 처리 | [아키텍처 > 재생성 흐름](./docs/architecture.md#재생성-흐름-상세) |
| 스튜디오/공개 블로그 UI 수정, 컴포넌트 추가 | [아키텍처 > 프론트엔드 아키텍처](./docs/architecture.md#프론트엔드-아키텍처) |
| 라인 코멘트, line_index 관련 로직 수정 | [아키텍처 > 라인 인덱스](./docs/architecture.md#라인-인덱스) |
