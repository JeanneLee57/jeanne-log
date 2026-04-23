# Jeanne Log DB Migration Architecture

## 목적

`jeanne-log`를 정적 파일 기반 블로그에서 DB 기반 콘텐츠 플랫폼으로 전환한다.

이번 전환의 목표는 단순한 저장소 변경이 아니다. 다음 워크플로를 자연스럽게 지원할 수 있어야 한다.

- AI 파이프라인이 초안을 자동 생성
- 초안이 비공개 리뷰 화면에 저장
- 라인 단위 인라인 코멘트로 피드백 수집
- 코멘트를 반영해 AI 재생성 반복
- 최종 승인 후 발행
- 발행 후 공개 블로그에 즉시 반영

핵심 결론은 다음과 같다.

- 콘텐츠의 source of truth는 파일이 아니라 DB 하나로 통합한다.
- `jeanne-log`는 콘텐츠 시스템 오브 레코드가 된다.
- `blog-pipeline-agent`는 생성 전용 워커 역할만 담당한다.
- 초안 생성, 리뷰, 재생성, 발행 상태 전이는 모두 DB 기반으로 처리한다.

## 현재 상태 요약

### jeanne-log

- `contents/article/*.mdx`를 직접 읽어 공개 글을 렌더링한다.
- 초안, 버전, 코멘트, 잡 상태를 저장할 DB가 없다.
- 관리자 화면, 인증, 내부 API가 없다.
- 현재 구조는 "파일이 곧 발행 후보"라는 전제를 갖고 있다.

### blog-pipeline-agent

- LLM으로 생성한 초안을 `jeanne-log/contents/article`에 직접 파일로 쓴다.
- 그 뒤 git branch 생성, commit, push, PR 생성까지 한 번에 수행한다.
- 프로젝트 기반 글 생성 로직과 재작성 로직은 이미 자산으로 활용 가능하다.

현재 구조의 문제는 초안 생성과 발행 후보 생성과 검토 채널이 모두 PR에 묶여 있다는 점이다. 앞으로 원하는 리뷰 워크플로는 PR이 아니라 애플리케이션 내부의 비공개 리뷰 공간에서 돌아가야 한다.

## 목표 아키텍처

### 시스템 역할 분리

#### 1. jeanne-log

역할:

- 공개 블로그 렌더링
- 관리자 인증
- 비공개 초안 목록/리뷰 UI 제공
- 코멘트 CRUD
- 재생성 요청 생성
- 발행 상태 전환
- 내부 API 제공
- DB schema와 migration 관리
- 캐시 무효화 및 라우팅 관리

즉, 콘텐츠 규칙과 상태 전이의 소유권은 `jeanne-log`가 가진다.

#### 2. blog-pipeline-agent

역할:

- 세션 수집
- 프로젝트/주간 초안 생성
- LLM 호출
- 재생성 job 소비
- 결과물 제출
- 실패/재시도 로그 관리

즉, `blog-pipeline-agent`는 글을 "직접 발행"하지 않고 초안이나 새 버전을 생성해 제출하는 워커가 된다.

#### 3. Postgres

역할:

- 초안, 공개 글, 버전, 코멘트, 잡 상태의 단일 저장소
- 리뷰 워크플로와 발행 상태의 source of truth

## 핵심 원칙

### 1. DB를 단일 진실 원천으로 둔다

- 공개 글도 DB에서 읽는다.
- 초안도 DB에 저장한다.
- 발행 상태도 DB에 저장한다.
- 리뷰 코멘트도 DB에 저장한다.

파일 시스템은 더 이상 운영 저장소가 아니다. 필요하면 마이그레이션용 입력 소스나 백업 용도로만 사용한다.

### 2. DB 소유권은 jeanne-log가 가진다

`blog-pipeline-agent`가 DB에 직접 접근하게 두지 않는다.

이유:

- schema coupling이 강해진다
- 콘텐츠 규칙이 두 시스템으로 분산된다
- 상태 전이 검증이 중복된다
- 이후 schema 변경 비용이 커진다

따라서 `blog-pipeline-agent`는 `jeanne-log`의 내부 API만 호출한다.

### 3. 코멘트는 article이 아니라 version에 붙인다

라인 단위 피드백은 특정 버전의 텍스트에 대해 유효하다. 재생성 후 줄이 이동하면 동일 코멘트를 자동 재사용하기 어렵다.

따라서:

- 코멘트는 `article_versions`에 연결
- 재생성 시 새 버전 생성
- 이전 코멘트는 이전 버전에 남김
- 필요하면 UI에서 "이전 버전 코멘트"를 참조만 가능하게 제공

### 4. 재생성은 동기 호출이 아니라 job 기반으로 처리한다

관리자 화면에서 버튼을 눌렀을 때 바로 LLM 호출을 시작하지 않는다.

흐름:

- UI가 regeneration job 생성
- 워커가 job을 polling
- LLM 처리 후 새 버전 제출
- UI가 상태를 polling 또는 revalidation으로 갱신

이 구조가 UI 지연과 워커 실패를 분리한다.

## 권장 기술 선택

### jeanne-log

- Next.js App Router 유지
- Postgres 사용
- Drizzle ORM 사용
- Auth.js + GitHub OAuth 사용
- 관리자 영역은 같은 앱 내 `/studio` 또는 `/drafts` 하위에 구성
- 공개 렌더는 DB 기반 MDX source를 서버에서 렌더

### blog-pipeline-agent

- Python 유지
- 기존 생성 로직 재사용
- 내부 API client 추가
- cron/launchd 기반 실행 유지 가능
- 별도 메시지 브로커는 초기 단계에서 도입하지 않음

### 왜 Postgres인가

SQLite도 작은 단일 인스턴스 환경에서는 동작 가능하지만, 다음 이유로 Postgres가 더 적합하다.

- 초안/버전/코멘트/잡 테이블이 늘어날 가능성이 높다
- 향후 배포 환경이 고정 로컬 머신이 아닐 수 있다
- row locking과 job polling 제어가 더 안정적이다
- 운영 관점에서 확장과 백업이 쉽다

## 데이터 모델

최소 기준으로 아래 엔티티가 필요하다.

### articles

초안과 공개 글의 최상위 엔티티.

권장 필드:

- `id`
- `slug`
- `status` (`draft`, `in_review`, `regenerating`, `published`, `archived`)
- `title`
- `summary`
- `current_version_id`
- `published_version_id`
- `created_by`
- `created_at`
- `updated_at`
- `published_at`

설명:

- `current_version_id`: 리뷰 중인 최신 버전
- `published_version_id`: 공개 중인 버전
- 초안 상태에서도 slug를 미리 둘 수 있지만, 발행 시 최종 조정 가능하게 설계한다

### article_versions

본문 스냅샷과 생성 메타데이터를 보관한다.

권장 필드:

- `id`
- `article_id`
- `version_number`
- `source_type` (`weekly`, `project`, `manual`, `regenerated`)
- `mdx_source`
- `plain_text_snapshot`
- `line_index_json`
- `generation_prompt_snapshot`
- `generation_context_json`
- `model_name`
- `created_at`

설명:

- `mdx_source`: 실제 렌더와 발행에 쓰이는 canonical source
- `plain_text_snapshot`: 라인 선택과 비교 UI용 파생 데이터
- `line_index_json`: 줄 번호와 source range 매핑

### review_comments

인라인 코멘트 저장소.

권장 필드:

- `id`
- `article_version_id`
- `start_line`
- `end_line`
- `selected_text`
- `body`
- `status` (`open`, `resolved`, `dismissed`)
- `created_by`
- `created_at`
- `updated_at`

설명:

- 선택 범위를 line number 기준으로 저장
- `selected_text`는 라인 drift가 발생했을 때 사람이 맥락을 이해하는 데 유용

### regeneration_jobs

비동기 생성 요청 큐.

권장 필드:

- `id`
- `article_id`
- `base_version_id`
- `status` (`queued`, `running`, `failed`, `completed`)
- `job_type` (`initial_draft`, `regenerate`)
- `input_payload_json`
- `result_version_id`
- `error_message`
- `attempt_count`
- `locked_at`
- `worker_id`
- `created_at`
- `updated_at`

설명:

- 초기 초안 생성도 동일한 job abstraction으로 맞출 수 있다
- 직접 DB queue만으로도 초기 단계는 충분하다

### publication_events

발행/보관 이력.

권장 필드:

- `id`
- `article_id`
- `from_version_id`
- `to_version_id`
- `event_type` (`published`, `unpublished`, `archived`)
- `actor`
- `created_at`

### admin_users

관리자 인증 주체.

GitHub OAuth를 쓸 경우 최소 매핑만 두면 된다.

권장 필드:

- `id`
- `github_user_id`
- `email`
- `role`
- `created_at`

## 콘텐츠 표현 전략

본문 포맷은 DB로 옮기더라도 MDX source를 유지한다.

이유:

- 기존 콘텐츠가 이미 MDX 기반이다
- 현재 렌더링 구조를 크게 바꾸지 않아도 된다
- 발행 결과와 초안 결과를 같은 포맷으로 유지할 수 있다

정리하면:

- canonical content: `mdx_source`
- review-friendly derivative: `plain_text_snapshot`, `line_index_json`

리뷰 화면은 source-oriented editor/viewer로 구현하는 것이 맞다. WYSIWYG보다 라인 단위 범위 선택과 diff 비교에 유리하다.

## 인증과 권한

### 관리자 인증

권장 방식:

- Auth.js
- GitHub OAuth
- 허용된 GitHub 계정만 접근 허용

이유:

- 1인 운영 환경에 적합
- 비밀번호 직접 관리보다 안전
- 추후 관리자 추가도 단순

### 머신 인증

`blog-pipeline-agent`는 내부 API 호출 시 별도 service token을 사용한다.

권장 방식:

- `Authorization: Bearer <INTERNAL_API_TOKEN>`
- `jeanne-log` 서버에서 토큰 검증

이렇게 권한을 분리한다.

- 사람: GitHub OAuth 세션
- 파이프라인: internal service token

## API 경계 설계

DB는 `jeanne-log`가 소유하고, `blog-pipeline-agent`는 내부 API로만 접근한다.

### 내부 API

파이프라인 전용.

권장 엔드포인트:

- `POST /api/internal/drafts`
- `GET /api/internal/jobs/next?type=regenerate`
- `POST /api/internal/jobs/:id/complete`
- `POST /api/internal/jobs/:id/fail`

필요시 추가:

- `POST /api/internal/articles/:id/versions`
- `POST /api/internal/articles/:id/regenerations`

### 관리자 API

스튜디오 UI 전용.

권장 엔드포인트:

- `GET /api/admin/drafts`
- `GET /api/admin/drafts/:id`
- `POST /api/admin/comments`
- `PATCH /api/admin/comments/:id`
- `DELETE /api/admin/comments/:id`
- `POST /api/admin/drafts/:id/regenerate`
- `POST /api/admin/drafts/:id/publish`
- `POST /api/admin/drafts/:id/archive`

## 관리자 UI 구조

권장 라우트:

- `/studio`
- `/studio/drafts`
- `/studio/drafts/[id]`

### 1. 초안 목록 화면

표시 항목:

- 제목
- 상태
- 생성 시각
- 마지막 버전 번호
- 열린 코멘트 수
- 마지막 재생성 시각

### 2. 리뷰 화면

구성:

- 상단: 제목, 상태, 버전 선택, 재생성 버튼, 발행 버튼
- 메인 패널: 라인 번호가 있는 source view
- 보조 패널: 코멘트 목록
- 비교 모드: 이전 버전과 현재 버전 diff

### 3. 리뷰 인터랙션

동작:

- 라인 드래그로 범위 선택
- 선택 범위 끝에 코멘트 버튼 노출
- 선택 범위 아래 인라인 입력창 표시
- 저장 시 하이라이트와 코멘트 앵커 표시
- 하이라이트 클릭 시 코멘트 확인
- 코멘트 수정/삭제 가능

### 4. 재생성 흐름

- 열린 코멘트를 포함해 재생성 요청 생성
- job 상태가 `running`으로 바뀌면 로딩 표시
- 완료 시 새 버전 생성
- 탭 또는 split view로 버전 비교

## 공개 블로그 렌더링 구조

정적 파일 기반 구조를 제거하고 공개 글도 DB에서 읽는다.

### 읽기 경로

- 목록 페이지: `status = published`
- 상세 페이지: `slug` + `published_version_id` 기준 조회

### 캐시 전략

발행 시:

- posts 목록 캐시 무효화
- 해당 slug 상세 캐시 무효화

Next.js의 `revalidateTag` 또는 `revalidatePath`를 활용할 수 있다.

### 발행 의미

발행은 더 이상 파일 생성이나 git push가 아니다.

발행은 다음 상태 전이로 정의한다.

- `published_version_id` 설정
- `status = published`
- `published_at` 기록
- 캐시 무효화

## blog-pipeline-agent 재구성

현재 스크립트의 마지막 출력 경로를 바꾸는 것이 핵심이다.

### 기존

- 초안 생성
- MDX 파일 생성
- git branch 생성
- commit / push
- PR 생성

### 변경 후

- 초안 생성
- 내부 API로 draft 생성 또는 version 제출
- 필요하면 regeneration job 소비

### 스크립트별 방향

#### weekly_publish.py

현재:

- `refined/*_sonnet.md`를 읽고 파일 생성 후 PR 생성

변경:

- `refined/*_sonnet.md`를 읽고 draft/article_version 생성 API 호출
- `published.json`은 "이미 초안으로 적재됨" 기준으로 관리 가능
- git/PR 로직 제거

#### publish_project.py

현재:

- 프로젝트 소스에서 장문 블로그 글 생성
- article 파일 생성 또는 PR 생성

변경:

- 생성 결과를 draft version으로 제출
- source metadata를 함께 전송

#### nightly_refine.py

현재:

- 세션을 누적해 thread/final 산출물 생성

변경:

- 일단 유지 가능
- 다만 최종 산출물의 downstream 소비자는 파일 생성 스크립트가 아니라 draft submitter가 된다

## 리뷰/재생성 시퀀스

### 초기 초안 생성

1. `blog-pipeline-agent`가 초안 생성
2. `POST /api/internal/drafts` 호출
3. `jeanne-log`가 `articles` + `article_versions(v1)` 저장
4. 관리자 목록에 초안 표시

### 리뷰

1. 사용자가 초안 상세로 진입
2. 특정 버전의 텍스트를 라인 단위로 확인
3. 코멘트 CRUD 수행

### 재생성

1. 사용자가 재생성 버튼 클릭
2. `regeneration_jobs`에 `queued` row 생성
3. `blog-pipeline-agent`가 job polling
4. 워커가 base version + open comments + metadata로 프롬프트 구성
5. LLM 호출 후 새 버전 생성
6. `jobs/:id/complete` 호출
7. `article_versions(v2)` 생성, `current_version_id` 갱신

### 발행

1. 사용자가 특정 버전을 확인
2. 발행 버튼 클릭
3. `published_version_id` 갱신
4. `status = published`
5. 캐시 무효화
6. 초안은 archived 또는 published 상태로 정리

## 마이그레이션 전략

한 번에 전환하지 말고 단계적으로 옮긴다.

### Phase 1. DB 도입과 legacy import

목표:

- Postgres 도입
- Drizzle schema 작성
- 기존 `contents/article/*.mdx`를 DB로 import
- 파일 기반 읽기는 일단 유지 가능

산출물:

- schema
- migration
- import script

### Phase 2. 관리자 스튜디오 구축

목표:

- 관리자 인증
- draft list/detail UI
- comment CRUD
- regenerate job 생성

산출물:

- `/studio` 라우트
- admin API
- review UI

### Phase 3. 파이프라인 쓰기 경로 전환

목표:

- `blog-pipeline-agent`가 파일/PR 대신 내부 API로 초안 제출
- regeneration worker 동작

산출물:

- internal API client
- draft submitter
- job worker

### Phase 4. 공개 읽기 경로 전환

목표:

- 공개 블로그도 DB에서 읽기
- 발행 상태 반영
- 파일 기반 의존 제거

산출물:

- DB reader service
- published list/detail 쿼리
- cache invalidation

### Phase 5. 파일 기반 운영 제거

목표:

- `contents/article`를 운영 source에서 제외
- 파일 기반 publish 로직 완전 삭제

## 현실적인 1차 구현 범위

처음 스프린트는 아래까지를 권장한다.

1. Postgres + Drizzle 도입
2. article/version/comment/job schema 작성
3. legacy MDX import script 작성
4. GitHub OAuth 관리자 인증 추가
5. `/studio/drafts` 목록 화면 추가
6. `/studio/drafts/[id]` 상세/코멘트 CRUD 구현
7. regeneration job 생성 API 구현
8. `blog-pipeline-agent`의 draft submit 연동 추가

이 단계에서는 아직 공개 읽기 전체 전환과 발행 UI까지 욕심내지 않는 것이 좋다. 먼저 초안 생성과 리뷰 루프를 안정화해야 한다.

## 오픈 이슈

아래는 구현 전에 최종 결정이 필요한 항목이다.

### 1. slug 정책

- 초안 생성 시 slug를 고정할지
- 발행 직전 수정 가능하게 할지

권장:

- 초안 시 provisional slug 허용
- 발행 직전 최종 확정

### 2. 코멘트 승계 정책

재생성 후 기존 코멘트를 새 버전에 자동 승계할지 여부.

권장:

- 자동 승계하지 않음
- 이전 버전 코멘트는 기록으로 유지
- 필요하면 새 버전에 수동으로 다시 달게 함

### 3. 공개 글의 SEO 메타

DB 기반 전환 후에도 `generateMetadata`에서 title/description/OpenGraph를 안정적으로 구성해야 한다.

### 4. import 이후 파일 보존 정책

권장:

- 초기에는 백업으로 유지
- 운영 읽기 경로에서 제외
- 최종 안정화 후 archive-only 취급

## 최종 결론

이 프로젝트는 "정적 블로그에 초안 페이지를 붙이는 일"이 아니라, `jeanne-log`를 중심으로 한 콘텐츠 플랫폼 재구성 작업이다.

가장 중요한 아키텍처 결정은 아래 세 가지다.

1. 콘텐츠 저장소는 DB로 통합한다.
2. `jeanne-log`가 콘텐츠와 상태 전이의 소유권을 가진다.
3. `blog-pipeline-agent`는 내부 API를 통해 초안과 재생성 결과를 제출하는 워커가 된다.

이 방향으로 가면 이후 기능 확장이 자연스럽다.

- 버전 비교
- 발행 예약
- 코멘트 해결 상태 추적
- 여러 생성 전략 실험
- 품질 메트릭 축적

반대로 파일 기반을 유지한 채 부분 기능만 붙이면 PR, 파일 쓰기, 리뷰 UI, 발행 상태가 서로 엮여서 계속 구조적 마찰이 생긴다.

## 기능별 체크리스트

아래 체크리스트는 기능 단위로 프론트, DB, API를 나눠서 정리한다. 구현 시에는 세 축을 병렬로 보지 말고, 기능 단위로 묶어서 완료하는 방식으로 진행하는 것이 좋다.

### 1. 인증 및 관리자 접근 제어

#### Frontend

- [ ] 관리자 로그인 진입 화면 구성
- [ ] 로그인 성공 후 `/studio` 또는 `/studio/drafts`로 이동 처리
- [ ] 비로그인 상태에서 관리자 경로 접근 시 로그인 페이지 또는 403 화면 연결
- [ ] 관리자 레이아웃과 공개 블로그 레이아웃 분리
- [ ] 관리자 전용 네비게이션 구성

#### DB

- [ ] `admin_users` 테이블 생성
- [ ] GitHub OAuth 사용자 식별 필드 정의 (`github_user_id`, `email`, `role`)
- [ ] 허용 사용자 시드 데이터 입력 방식 정의

#### API

- [ ] Auth.js 세션 검증 로직 구성
- [ ] 관리자 전용 API 보호 미들웨어 구현
- [ ] 내부 API와 관리자 API의 인증 방식을 분리
- [ ] 관리자 권한 검증 유틸 작성

### 2. 레거시 글 DB 마이그레이션

#### Frontend

- [ ] 운영 UI 영향 없이 DB import 이후 공개 목록/상세 fallback 전략 정의
- [ ] 관리자 화면에서 import된 글을 조회할 필요가 있는지 결정

#### DB

- [ ] `articles` 테이블 생성
- [ ] `article_versions` 테이블 생성
- [ ] 기존 MDX에서 `slug`, `title`, `summary`, `date`, `tags`, `author` 추출 규칙 정의
- [ ] import 시 `published_version_id`와 `current_version_id` 초기값 설정
- [ ] import 대상 파일과 DB row의 매핑 로그 저장 방식 정의

#### API

- [ ] legacy import script 작성
- [ ] 중복 import 방지 로직 추가
- [ ] import dry-run 모드 지원
- [ ] import 후 검증용 조회 API 또는 검증 스크립트 작성

### 3. 초안 생성 유입

#### Frontend

- [ ] 초안 목록에서 AI 생성 초안이 바로 보이도록 상태 뱃지 구성
- [ ] 초안 생성 직후 상세 화면으로 이동 가능한 UX 여부 결정

#### DB

- [ ] `articles.status = draft` 기본 흐름 정의
- [ ] 초안 생성 시 `article_versions(v1)` 생성 규칙 정의
- [ ] `source_type`과 생성 출처 메타데이터 저장 컬럼 정의
- [ ] `plain_text_snapshot`, `line_index_json` 생성 규칙 정의

#### API

- [ ] `POST /api/internal/drafts` 구현
- [ ] 파이프라인 토큰 인증 구현
- [ ] payload schema 검증 추가
- [ ] idempotency 키 또는 중복 생성 방지 규칙 정의
- [ ] draft 생성 후 반환 데이터 포맷 정의

### 4. 초안 목록 화면

#### Frontend

- [ ] `/studio/drafts` 라우트 생성
- [ ] 목록 테이블 또는 카드 UI 구성
- [ ] 상태, 생성일, 마지막 수정일, 버전 수, 열린 코멘트 수 표시
- [ ] draft / regenerating / published / archived 필터 제공
- [ ] 정렬 기준 정의 (최근 수정 우선 권장)
- [ ] 빈 상태 UI 구성
- [ ] 로딩/에러 상태 UI 구성

#### DB

- [ ] 목록 조회에 필요한 집계 쿼리 설계
- [ ] 열린 코멘트 수 계산 방식 정의
- [ ] 최신 버전 조인 전략 정의
- [ ] status + updated_at 인덱스 추가

#### API

- [ ] `GET /api/admin/drafts` 구현
- [ ] status/filter/query params 설계
- [ ] pagination 또는 cursor 방식 결정
- [ ] 목록 응답 DTO 정의

### 5. 초안 상세 및 리뷰 화면

#### Frontend

- [ ] `/studio/drafts/[id]` 라우트 생성
- [ ] 버전 선택 UI 구성
- [ ] 라인 번호가 포함된 본문 뷰어 구현
- [ ] 긴 문서 스크롤 성능 검토
- [ ] 코멘트 패널 위치 결정 (우측 또는 하단)
- [ ] 상태 헤더 구성 (draft/in_review/regenerating/published)
- [ ] 새로고침 후 선택 버전/스크롤 위치 유지 여부 결정

#### DB

- [ ] 버전별 본문 스냅샷 조회 쿼리 설계
- [ ] line index 저장 포맷 검증
- [ ] 특정 버전에 달린 코멘트 조회 쿼리 설계

#### API

- [ ] `GET /api/admin/drafts/:id` 구현
- [ ] article + current version + version list + comment summary 응답 구조 정의
- [ ] 특정 version 지정 조회 지원 여부 결정

### 6. 인라인 코멘트 작성/수정/삭제

#### Frontend

- [ ] 드래그로 라인 범위 선택 구현
- [ ] 선택 범위 끝에 코멘트 버튼 표시
- [ ] 선택 범위 아래 인라인 입력창 표시
- [ ] 코멘트 저장 후 하이라이트 렌더링
- [ ] 하이라이트 클릭 시 코멘트 상세 노출
- [ ] 코멘트 수정 UI 구현
- [ ] 코멘트 삭제 UI 구현
- [ ] 코멘트 없는 상태와 다수 코멘트 상태 UX 정리

#### DB

- [ ] `review_comments` 테이블 생성
- [ ] `article_version_id + start_line + end_line` 조회 인덱스 추가
- [ ] comment status (`open`, `resolved`, `dismissed`) 컬럼 정의
- [ ] selected text snapshot 저장 규칙 정의

#### API

- [ ] `POST /api/admin/comments` 구현
- [ ] `PATCH /api/admin/comments/:id` 구현
- [ ] `DELETE /api/admin/comments/:id` 구현
- [ ] 코멘트 payload validation 추가
- [ ] 코멘트 작성 시 version 범위 검증 추가

### 7. 코멘트 목록 패널

#### Frontend

- [ ] 현재 버전의 코멘트 리스트 표시
- [ ] 클릭 시 본문 해당 라인으로 스크롤 이동
- [ ] open / resolved 필터 지원
- [ ] 생성순 / 라인순 정렬 지원
- [ ] 코멘트 개수 요약 UI 제공

#### DB

- [ ] 코멘트 정렬 기준 인덱스 검토
- [ ] 버전별 코멘트 집계 쿼리 설계

#### API

- [ ] 상세 API에 코멘트 리스트를 포함할지 별도 API로 분리할지 결정
- [ ] 필요 시 `GET /api/admin/drafts/:id/comments` 추가

### 8. 버전 비교

#### Frontend

- [ ] 버전 선택 드롭다운 또는 탭 UI 구현
- [ ] 두 버전 비교 모드 진입 UX 구성
- [ ] split view 또는 unified diff 방식 결정
- [ ] added / removed / changed 라인 시각 표현 정의
- [ ] 이전 버전 코멘트 참고 보기 지원 여부 결정

#### DB

- [ ] 버전 메타데이터 조회 최적화
- [ ] diff 계산을 DB에 저장할지 요청 시 계산할지 결정

#### API

- [ ] `GET /api/admin/drafts/:id/versions` 구현 여부 결정
- [ ] 필요 시 `GET /api/admin/drafts/:id/diff?base=x&target=y` 구현
- [ ] diff 응답 포맷 정의

### 9. 재생성 요청

#### Frontend

- [ ] 재생성 버튼 배치
- [ ] 열린 코멘트가 없을 때 버튼 정책 정의
- [ ] 재생성 확인 모달 또는 요약 패널 제공
- [ ] 재생성 시작 후 버튼 비활성화
- [ ] 진행 중 로딩 상태 표시

#### DB

- [ ] `regeneration_jobs` 테이블 생성
- [ ] job 상태 전이 정의 (`queued`, `running`, `failed`, `completed`)
- [ ] `base_version_id` 저장 규칙 정의
- [ ] 재시도 횟수와 실패 사유 저장 컬럼 정의
- [ ] job polling용 인덱스 추가

#### API

- [ ] `POST /api/admin/drafts/:id/regenerate` 구현
- [ ] 열린 코멘트 스냅샷을 job payload에 포함할지 결정
- [ ] 동일 draft에 대해 중복 queued job 방지
- [ ] regenerate 요청 응답 포맷 정의

### 10. 재생성 워커 처리

#### Frontend

- [ ] job 상태 polling 또는 서버 재검증 전략 결정
- [ ] 실패 시 사용자에게 에러 메시지 표시
- [ ] 완료 시 새 버전 자동 선택 여부 결정

#### DB

- [ ] job lock 처리 방식 정의
- [ ] `worker_id`, `locked_at` 사용 규칙 정의
- [ ] job 완료 시 `article_versions`와 `articles.current_version_id` 갱신 트랜잭션 설계

#### API

- [ ] `GET /api/internal/jobs/next?type=regenerate` 구현
- [ ] `POST /api/internal/jobs/:id/complete` 구현
- [ ] `POST /api/internal/jobs/:id/fail` 구현
- [ ] worker 중복 수신 방지 로직 추가
- [ ] job completion payload validation 추가

### 11. 발행

#### Frontend

- [ ] 발행 버튼 배치
- [ ] 발행 대상 버전 명시
- [ ] slug/title/summary 최종 수정 UI 필요 여부 결정
- [ ] 발행 확인 모달 구성
- [ ] 발행 완료 후 공개 링크 제공

#### DB

- [ ] `published_version_id` 갱신 규칙 정의
- [ ] `published_at` 기록
- [ ] `publication_events` 테이블 생성
- [ ] 기존 published 글 재발행 시 이벤트 기록 정책 정의

#### API

- [ ] `POST /api/admin/drafts/:id/publish` 구현
- [ ] slug uniqueness 검증
- [ ] publish 트랜잭션 처리
- [ ] 발행 후 캐시 무효화 호출

### 12. 아카이브

#### Frontend

- [ ] 아카이브 버튼 또는 메뉴 제공
- [ ] archived 초안 목록 필터 제공
- [ ] archived 초안 읽기 전용 정책 여부 결정

#### DB

- [ ] `status = archived` 정책 정의
- [ ] archived_at 컬럼 필요 여부 결정

#### API

- [ ] `POST /api/admin/drafts/:id/archive` 구현
- [ ] published 글의 archive 허용 정책 정의

### 13. 공개 글 조회 전환

#### Frontend

- [ ] 홈 목록을 DB 기반으로 전환
- [ ] 상세 페이지를 DB 기반으로 전환
- [ ] 기존 파일 기반 렌더와 시각 차이 없는지 점검
- [ ] 공개 페이지 SEO 메타 동작 검증

#### DB

- [ ] published 글 조회 인덱스 추가
- [ ] slug unique index 추가
- [ ] 목록 조회용 정렬 인덱스 검토

#### API

- [ ] 서버 서비스 계층에서 published article 조회 함수 구현
- [ ] slug 기반 detail 조회 함수 구현
- [ ] 캐시/revalidate 전략 구현

### 14. 파이프라인 연동 전환

#### Frontend

- [ ] 관리자 화면에서 파이프라인 생성 초안과 수동 초안을 구분 표시할지 결정

#### DB

- [ ] source metadata 저장 컬럼 확정
- [ ] 외부 파이프라인 식별자 저장 방식 정의

#### API

- [ ] `blog-pipeline-agent`에서 사용할 draft submit payload 확정
- [ ] 기존 `weekly_publish.py`의 PR 생성 제거
- [ ] 기존 `publish_project.py`의 파일 출력 제거
- [ ] 내부 API 호출 실패 시 재시도 정책 정의

### 15. 운영 및 관측성

#### Frontend

- [ ] 관리자 화면에 최근 실패 job 노출 여부 결정
- [ ] 사용자 액션 토스트/에러 피드백 일관화

#### DB

- [ ] audit log 테이블 필요 여부 결정
- [ ] 오래된 job/archive 정리 정책 정의
- [ ] 백업 정책 정의

#### API

- [ ] 내부 API 요청 로그 추가
- [ ] job 실패 사유 구조화
- [ ] 관리자 액션 로그 기록
- [ ] health check 또는 최소 운영 점검 포인트 정의

## 권장 구현 순서 체크리스트

아래 순서로 진행하는 것이 가장 안전하다.

- [ ] Postgres + Drizzle 도입
- [ ] `articles`, `article_versions`, `review_comments`, `regeneration_jobs` schema 작성
- [ ] legacy import script 작성 및 검증
- [ ] 관리자 인증 도입
- [ ] 초안 목록 화면 구현
- [ ] 초안 상세/리뷰 화면 구현
- [ ] 인라인 코멘트 CRUD 구현
- [ ] regeneration job 생성 API 구현
- [ ] `blog-pipeline-agent` 초안 제출 연동
- [ ] regeneration worker 연동
- [ ] 발행 기능 구현
- [ ] 공개 글 DB 조회 전환
- [ ] 파일 기반 publish 경로 제거
