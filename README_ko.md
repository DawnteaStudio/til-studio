# til-studio

[English](README.md) | [한국어](README_ko.md)

til-studio는 개인 TIL 저장소를 GitHub와 연결해 글을 작성하고, 같은 저장소를 공개 학습 사이트처럼 보여주는 워크스페이스입니다. Studio에서 학습 기록을 작성하고 GitHub에 저장한 뒤, 홈, 블로그, 학습 지도, 문서 화면에서 읽을 수 있습니다.

첫 대상 저장소는 [`DawnteaStudio/TIL`](https://github.com/DawnteaStudio/TIL)입니다. 다만 저장소 owner/name을 환경변수로 바꿀 수 있도록 구성되어 있어, 다른 GitHub 기반 TIL 저장소에도 맞춰갈 수 있습니다.

## 목차

- [할 수 있는 일](#할-수-있는-일)
- [화면 안내](#화면-안내)
- [추천 사용 흐름](#추천-사용-흐름)
- [폴더 공개 규칙](#폴더-공개-규칙)
- [저장소 구조](#저장소-구조)
- [Markdown 이미지 자산](#markdown-이미지-자산)
- [로컬 개발](#로컬-개발)
- [GitHub App 설정](#github-app-설정)
- [환경 변수](#환경-변수)
- [검증](#검증)
- [문제 해결](#문제-해결)
- [로드맵](#로드맵)
- [라이선스](#라이선스)

## 할 수 있는 일

- GitHub App으로 TIL 저장소에 접근합니다.
- 저장소를 홈, 블로그, 학습 지도, 문서 화면으로 탐색합니다.
- Studio에서 공개할 최상위 폴더를 선택합니다.
- README 파일은 최근 글 목록과 글 목록에서 기본적으로 숨깁니다.
- Markdown 구조를 직접 만들지 않고도 note 초안을 작성합니다.
- 선택한 area, topic, 학습 자료, title로 note 저장 경로를 자동 생성합니다.
- 학습 자료 README를 만들고 note와 실습 코드에 맞춰 학습 기록을 동기화합니다.
- 학습 자료부터 저장소 루트까지 영향받는 README를 모두 갱신합니다.
- 문서 화면에서 Quick 또는 Review 방식으로 note를 삭제합니다.
- theory 키워드를 조사하고 리뷰용 theory 초안을 만듭니다.
- Quick Save로 직접 커밋하거나 Review Save로 pull request를 만듭니다.

## 화면 안내

### 홈: `/`

연결된 저장소의 요약과 최근 공개 문서를 보여줍니다. Studio에서 저장한 공개 폴더 설정을 따르며, README 파일은 최근 목록에 표시하지 않습니다.

빠르게 전체 상태를 보거나 포트폴리오형 첫 화면으로 사용할 수 있습니다.

### 블로그: `/blog`

note와 theory 문서를 블로그 글 목록처럼 보여줍니다. README 안내 문서는 제외하고 실제 학습 기록만 보여줍니다. 왼쪽 폴더 트리에서 area, topic, 하위 폴더 단위로 목록을 좁힐 수 있습니다.

저장소를 글 목록처럼 읽고 싶을 때 사용합니다.

### 학습 지도: `/map`

문서를 최상위 영역별로 묶어 보여줍니다.

- `cs`
- `languages`
- `projects`
- `coding-test`

notes/theory 개수, topic 카드, repository index를 제공합니다. README 안내 파일은 article map에서 제외됩니다.

저장소 전체 구조와 공부 범위를 한눈에 보고 싶을 때 사용합니다.

### 문서 읽기: `/docs/<path>`

GitHub 저장소의 Markdown 파일을 렌더링합니다. 왼쪽에는 홈, 글 목록, 학습 지도 링크와 문서 heading 목차가 표시됩니다.

개별 note나 theory 문서를 읽을 때 사용합니다.

### Studio: `/studio`

Studio는 작성 작업 공간입니다.

- 왼쪽 패널: 공개 폴더 선택, 작성 위치 선택, Notes/Theory 전환
- 가운데 패널: note 초안 작성, Markdown 미리보기, 원문 수정
- 오른쪽 패널: Quick/Review 저장 선택, theory concept 조사

새 학습 기록을 만들거나 GitHub에 저장할 때 사용합니다.

## 추천 사용 흐름

1. `/studio`를 엽니다.
2. "공개 표시 폴더"에서 공개할 최상위 폴더만 체크합니다.
3. 왼쪽 폴더 트리에서 area와 topic을 선택합니다.
4. note를 쓸 때는 기존 학습 자료를 고르거나 자료 유형과 선택 메타데이터를 입력해 새 학습 자료를 만듭니다.
5. 제목, 학습 출처, 오늘 배운 것, 헷갈린 점, 결론, 실험 메모를 채웁니다.
6. "Markdown 만들기"를 눌러 note 초안을 Markdown으로 정리합니다.
7. 생성된 저장 경로와 Markdown 미리보기를 확인합니다.
8. 직접 커밋하려면 Quick, pull request로 검토하려면 Review를 선택합니다.
9. GitHub에 저장합니다.
10. `/blog`, `/map`, `/docs/<path>`에서 공개 화면을 확인합니다.

theory를 작성할 때는 다음 흐름을 사용합니다.

1. Studio에서 Theory로 전환합니다.
2. 저장할 topic을 선택합니다.
3. 오른쪽 패널에서 concept 키워드를 검색합니다.
4. 조사 결과로 초안을 만듭니다.
5. Markdown을 확인합니다.
6. Review 모드로 저장합니다.

## 폴더 공개 규칙

폴더 공개 설정은 Studio에서 관리하며 local storage와 cookie에 저장됩니다.

- 체크 해제한 최상위 폴더의 문서는 공개 화면에서 숨겨집니다.
- 모든 폴더가 체크되어 있으면 README가 아닌 공개 문서가 표시될 수 있습니다.
- README 파일은 안내/index 파일로 보고 최근 글 목록과 article 목록에서 기본적으로 숨깁니다.
- `README.md`, `README_ko.md`, `README.en.md`, 중첩된 `.../README.md` 같은 README 변형도 README로 처리합니다.
- 최소 하나의 최상위 폴더는 공개 상태로 남아 있어야 합니다.

즉 문서가 보이려면 두 조건을 모두 만족해야 합니다.

1. 문서의 최상위 폴더가 체크되어 있어야 합니다.
2. 문서가 README 안내 파일이 아니어야 합니다.

## 저장소 구조

til-studio는 주제 기반 TIL 구조를 가정합니다.

```text
TIL/
├── cs/
│   └── <topic>/
│       ├── README.md
│       ├── theory/
│       └── notes/
│           └── <source>/
│               ├── README.md
│               ├── note/
│               │   └── <slug>.md
│               └── src/
│                   └── <slug>/
├── languages/
│   └── <language>/
│       ├── README.md
│       ├── theory/
│       └── notes/
├── coding-test/
├── projects/
└── README.md
```

### notes

`notes/`는 학습 자료와 연결된 기록을 넣는 공간입니다.

- 강의나 책을 보며 작성한 기록
- 아직 완전히 정리되지 않은 이해
- 헷갈린 점과 질문
- 실험 메모와 현재 결론
- 책, 강의, 코스, 멘토링 등 학습 자료와 연결된 글

책, 강의, 코스, 멘토링, 기타 학습 source는 모두 같은 구조를 사용합니다.

```text
notes/<source>/
├── README.md
├── note/
│   └── <slug>.md
└── src/
    └── <slug>/
```

- Studio는 학습 기록을 `note/<slug>.md`에 저장합니다.
- 실습 코드는 `src/<slug>/`에 둡니다. Studio는 코드를 업로드하거나 편집하지 않습니다.
- note와 src는 대소문자를 포함해 slug가 정확히 같을 때만 한 쌍으로 봅니다.
- note frontmatter에는 `created: YYYY-MM-DD`를 기록합니다.
- 학습 자료 README에는 자료 메타데이터, 디렉토리 안내, 자동 관리되는 학습 기록이 들어갑니다.
- 학습 기록은 note와 src slug의 합집합으로 구성하며, 어느 한쪽이 없으면 같은 행에서 `-`로 표시합니다.
- 학습 기록 링크는 `[ch2](./src/ch2/)`, `[ch2.md](./note/ch2.md)`처럼 실제 폴더명과 파일명을 표시합니다.
- `til-studio:learning-log` marker 사이 내용은 직접 수정하지 않습니다.
- Git은 빈 폴더를 추적하지 않으므로 `note/`와 `src/`는 첫 파일이 커밋될 때 생깁니다.

Studio에서 note를 저장하거나 삭제하면 note와 학습 자료 README, topic README, 모든 상위 README, 루트 README를 하나의 Git 커밋으로 반영합니다. 중간 상태가 공개되지 않으며 새 topic이나 새 최상위 area도 상위 목록에 자동으로 반영됩니다.

새 학습 자료 화면에서는 기술을 하나씩 추가합니다. 알려진 기술은 Shields/Simple Icons 기반 배지를 추천하며 label, 색상, logo, logo 색상을 수정할 수 있습니다. 알 수 없는 기술은 일반 텍스트로 저장됩니다.

### note 삭제

문서 화면에서 note 삭제를 선택할 수 있습니다. 기본값인 Review는 draft pull request를 만들고, Quick은 기본 브랜치에 바로 커밋합니다. note와 영향받는 모든 README 인덱스는 함께 갱신됩니다. theory 삭제와 관리자 전용 권한은 후속 범위입니다.

### theory

`theory/`는 정제된 개념 문서를 넣는 공간입니다.

- 결론 중심의 개념 정리
- 나중에 다시 보기 좋은 참고 문서
- 하나 이상의 note를 종합한 문서
- 복습, 면접 준비, 개념 조회에 유용한 글

`coding-test/`는 note/theory 작성 흐름과 분리되어 있지만, 최상위 폴더 공개 설정으로 보이거나 숨겨질 수 있습니다.

## Markdown 이미지 자산

글에서 사용하는 이미지는 그 Markdown 문서 옆에 둡니다. 이렇게 하면 GitHub 렌더링, til-studio 렌더링, 로컬 편집 기준이 모두 같아집니다.

규칙:

- Markdown 파일명은 `kmp.md`, `union-find.md`처럼 소문자 kebab-case를 사용합니다.
- `.md`를 제외한 파일명을 글 slug로 봅니다.
- 글 전용 이미지는 Markdown 파일 옆의 `<article-slug>_images/` 폴더에 둡니다.
- 이미지 파일명은 문서에 등장하는 순서대로 `<article-slug>-NN.<ext>` 형식을 사용합니다.
- 번호는 `01`, `02`, `03`처럼 두 자리로 씁니다.
- Markdown 링크는 글 기준 상대 경로를 사용합니다. 예: `./kmp_images/kmp-01.png`
- 모든 경로의 대소문자를 정확히 맞춥니다.
- 의미가 꼭 필요할 때만 짧은 소문자 suffix를 붙입니다. 예: `kmp-05-failure.png`
- 여러 문서가 함께 쓰는 이미지는 의도적으로 공유할 때만 `../shared_images/` 같은 공유 폴더에 둡니다.

예시:

```text
cs/algorithms/theory/
├── kmp.md
└── kmp_images/
    ├── kmp-01.png
    ├── kmp-02.png
    └── kmp-03.png
```

```md
![KMP 비교](./kmp_images/kmp-01.png)
```

## 로컬 개발

Node.js `22.12.0` 이상을 사용합니다. 저장소에는 `.nvmrc`와 `.node-version`이 포함되어 있습니다.

```bash
nvm install
nvm use
npm ci
```

로컬 환경 변수 파일을 만듭니다.

```bash
cp .env.example .env.local
```

`.env.local` 값을 채운 뒤 개발 서버를 실행합니다.

```bash
npm run dev
```

접속 경로:

- 홈: `http://localhost:3000`
- 블로그: `http://localhost:3000/blog`
- 학습 지도: `http://localhost:3000/map`
- Studio: `http://localhost:3000/studio`

### macOS 메뉴바 앱

로컬 `TIL Studio.app` 런처를 만들면 macOS 메뉴바에서 production 서버를 켜고 끌 수 있습니다.

```bash
npm run desktop:app
```

이후 `TIL Studio.app`을 열면 `http://localhost:3100`에서 서버를 시작하고 Studio를 엽니다. Dock이 아니라 메뉴바에 머무릅니다. 평소 시작은 기존 `.next` production build를 재사용하므로 빠르게 열립니다.

메뉴 동작:

- `Open Studio`: `http://localhost:3100/studio`를 엽니다.
- `Start Server`: production Next.js 서버를 시작합니다. 아직 `.next` build가 없으면 처음 한 번만 빌드합니다.
- `Stop Server`: 서버 프로세스를 종료합니다.
- `Restart Server`: 빌드 없이 서버만 종료했다가 다시 시작합니다.
- `Rebuild & Restart`: 앱을 다시 빌드한 뒤 서버를 시작합니다. 애플리케이션 코드를 바꾸거나 업데이트를 받은 뒤 사용하세요.
- `Quit`: 서버를 종료하고 메뉴바 앱을 닫습니다.

프로젝트 폴더를 옮기거나 Node.js 버전을 바꾼 뒤에는 `npm run desktop:app`을 다시 실행해 런처 스크립트 경로를 갱신하세요.

## GitHub App 설정

GitHub App을 만들고 TIL 저장소에 설치합니다.

권장 저장소 권한:

- Contents: Read and write
- Pull requests: Read and write
- Metadata: Read

권장 webhook 이벤트:

- Push
- Pull request

로컬 개발 중에는 터널링 URL을 사용해 webhook URL이 다음 주소로 전달되게 할 수 있습니다.

```text
http://localhost:3000/api/github/webhook
```

Webhook secret은 GitHub App 설정과 `.env.local`에 같은 값을 넣어야 합니다.

## 환경 변수

```env
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=
GITHUB_INSTALLATION_ID=
TIL_REPOSITORY_OWNER=DawnteaStudio
TIL_REPOSITORY_NAME=TIL
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini-2024-07-18
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

참고:

- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`는 GitHub 저장소를 읽는 화면에 필요합니다.
- `GITHUB_APP_PRIVATE_KEY`는 줄바꿈을 `\n`으로 저장해도 됩니다. 앱이 GitHub client를 만들 때 실제 줄바꿈으로 변환합니다.
- `AI_PROVIDER`는 `openai` 또는 `gemini`를 사용할 수 있으며 기본값은 `openai`입니다.
- `OPENAI_API_KEY`는 `AI_PROVIDER=openai`일 때 필요합니다.
- `GEMINI_API_KEY`는 `AI_PROVIDER=gemini`일 때 필요합니다.
- `TIL_REPOSITORY_OWNER`, `TIL_REPOSITORY_NAME`을 생략하면 기본값은 `DawnteaStudio`, `TIL`입니다.

Studio의 톱니바퀴 버튼에서도 이 로컬 런타임 설정을 바꿀 수 있습니다. 여기서 저장한 값은 gitignore된 `.til-studio/settings.local.json`에 저장되며, 서버에서 `.env.local`보다 먼저 읽습니다. 저장된 API key와 GitHub secret은 브라우저로 다시 내려주지 않고, 설정 화면에는 각 secret의 설정 여부만 표시합니다.

## 검증

단위/컴포넌트 테스트를 실행합니다.

```bash
npm run test
```

린트를 실행합니다.

```bash
npm run lint
```

브라우저 e2e 테스트를 실행합니다.

```bash
npx playwright install chromium
npm run test:e2e
```

현재 e2e는 다음 화면을 탐색합니다.

- Studio 작업 화면 컨트롤
- Learning Map 저장소 구조
- Blog 글 목록

프로덕션 빌드를 실행합니다.

```bash
npm run build
```

## 문제 해결

### "GitHub App environment variables are missing"

앱이 GitHub App 인증 정보 없이 저장소를 읽으려고 한 상황입니다. `.env.local`을 만들고 다음 값을 채웁니다.

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_INSTALLATION_ID`

`.env.local`을 바꾼 뒤에는 개발 서버를 다시 시작합니다.

### 한 Mac에서는 npm install이 되고 다른 Mac에서는 실패할 때

두 Mac 모두 프로젝트 Node 버전을 사용합니다.

```bash
nvm install
nvm use
npm ci
```

앱에서 직접 import하지 않는 x64 전용 native binding 같은 플랫폼 전용 패키지를 직접 의존성으로 추가하지 않습니다.

### Playwright 브라우저 실행 파일이 없다고 나올 때

브라우저를 한 번 설치합니다.

```bash
npx playwright install chromium
```

### Next.js가 `allowedDevOrigins` 경고를 보여줄 때

e2e 테스트가 `127.0.0.1`을 사용할 때 개발 리소스 origin 경고가 나올 수 있습니다. 테스트를 반드시 실패시키는 경고는 아닙니다. 경고를 없애고 싶다면 `next.config.ts`의 `allowedDevOrigins`에 `127.0.0.1`을 추가합니다.

## 로드맵

- 강의와 책 단위의 작성 세션 흐름 개선
- Studio UI에서 새 폴더 생성 지원
- 저장 결과와 pull request 링크를 더 명확하게 표시
- 중복을 피하는 theory 키워드 조회
- 더 풍부한 공개 학습 지도 UI
- 원래 TIL 저장소 외의 사용자도 쉽게 설정할 수 있는 저장소 구성

## 라이선스

아직 오픈소스 라이선스를 선택하지 않았습니다.

라이선스가 추가되기 전까지는 기본 저작권 규칙이 적용됩니다. 다른 사람이 이 프로젝트를 사용, 수정, 배포할 수 있게 열 계획이라면 라이선스를 명시적으로 추가해야 합니다.
