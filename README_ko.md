# til-studio

[English](README.md) | [한국어](README_ko.md)

til-studio는 개인 TIL 저장소를 기반으로 동작하는 GitHub 연동 학습 기록 워크스페이스입니다.

이 프로젝트는 다음 흐름을 중심으로 만들어지고 있습니다.

1. TIL 저장소 안에서 기록할 위치를 선택합니다.
2. 강의, 책, 프로젝트를 공부하면서 날것에 가까운 학습 노트를 작성합니다.
3. AI가 작성자의 의도를 유지한 채 노트 구조를 정리합니다.
4. 새 theory 문서를 만들기 전에 기존 theory 문서를 키워드로 조회합니다.
5. 변경 내용을 GitHub에 직접 저장하거나 리뷰용 pull request로 저장합니다.
6. 같은 저장소를 공개 학습 사이트로 렌더링합니다.

첫 대상 저장소는 [`DawnteaStudio/TIL`](https://github.com/DawnteaStudio/TIL)입니다. 장기적으로는 다른 GitHub 기반 TIL 저장소에서도 사용할 수 있는 앱을 목표로 합니다.

## 핵심 개념

### notes

`notes/`는 날것에 가까운 학습 기록을 넣는 공간입니다.

- 강의나 책을 보며 작성한 기록
- 아직 완전히 정제되지 않은 내용
- 헷갈린 점, 실험하고 싶은 점, 현재 이해한 결론
- 출처가 중요한 글

### theory

`theory/`는 정제된 개념 문서를 넣는 공간입니다.

- 결론 중심의 개념 정리
- 나중에 다시 보기 좋은 참고 문서
- 하나 이상의 note를 종합해 만든 문서
- 복습, 면접 준비, 개념 조회에 유용한 글

### 저장소 구조

til-studio는 단순한 주제 기반 구조를 가정합니다.

```text
TIL/
├── cs/
│   └── <topic>/
│       ├── README.md
│       ├── theory/
│       └── notes/
├── languages/
│   └── <language>/
│       ├── README.md
│       ├── theory/
│       └── notes/
├── coding-test/
├── projects/
└── README.md
```

`coding-test/`는 학습 노트 작성 흐름과 의도적으로 분리합니다.

### Markdown 이미지 자산

글에서 사용하는 이미지는 그 Markdown 문서 옆에 둡니다. 이렇게 하면 GitHub 렌더링, til-studio 렌더링, 로컬 편집 기준이 모두 같아집니다.

규칙:

- Markdown 파일명은 `kmp.md`, `union-find.md`처럼 소문자 kebab-case를 사용합니다.
- `.md`를 제외한 파일명을 글 slug로 봅니다.
- 글 전용 이미지는 Markdown 파일 옆의 `<article-slug>_images/` 폴더에 둡니다.
- 이미지 파일명은 문서에 등장하는 순서대로 `<article-slug>-NN.<ext>` 형식을 사용합니다.
- 번호는 `01`, `02`, `03`처럼 두 자리로 씁니다.
- Markdown 링크는 글 기준 상대 경로를 사용합니다. 예: `./kmp_images/kmp-01.png`
- 모든 경로의 대소문자를 정확히 맞춥니다. GitHub와 배포 환경은 대소문자를 구분할 수 있습니다.
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

## 현재 MVP

- GitHub App 기반 TIL 저장소 접근
- 저장소 트리 불러오기
- TIL 위치를 선택하는 Studio 화면
- 선택한 주제, 학습 자료 폴더, 제목을 기반으로 note 경로 생성
- 선택한 주제와 제목을 기반으로 theory 경로 생성
- note와 theory 마크다운 템플릿
- AI 기반 note 정리 및 빠진 섹션 확인
- 직접 커밋하는 Quick Save
- pull request로 저장하는 Review Save
- 향후 양방향 동기화를 위한 webhook 엔드포인트
- 공개 지도와 문서 라우트

## 로컬 개발

의존성을 설치합니다.

```bash
npm install
```

로컬 환경 변수 파일을 만듭니다.

```bash
cp .env.example .env.local
```

`.env.local` 값을 채웁니다.

```env
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=
GITHUB_INSTALLATION_ID=
TIL_REPOSITORY_OWNER=DawnteaStudio
TIL_REPOSITORY_NAME=TIL
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini-2024-07-18
```

개발 서버를 실행합니다.

```bash
npm run dev
```

접속 경로:

- 공개 사이트: `http://localhost:3000`
- Studio: `http://localhost:3000/studio`
- 학습 지도: `http://localhost:3000/map`

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

Webhook secret은 충분히 강한 임의의 값을 사용하면 됩니다. GitHub App 설정과 `.env.local`에 같은 값을 넣어야 합니다.

## 검증

단위 테스트를 실행합니다.

```bash
npm run test
```

프로덕션 빌드를 실행합니다.

```bash
npm run build
```

브라우저 테스트를 실행합니다.

```bash
npm run test:e2e
```

## 로드맵

- 강의와 책 단위의 작성 세션 흐름 개선
- Studio UI에서 새 폴더 생성 지원
- 저장 결과와 pull request 링크를 더 명확하게 표시
- 중복을 피하는 theory 키워드 조회
- 더 풍부한 공개 학습 지도 UI
- 원래 TIL 저장소 외의 사용자도 쉽게 설정할 수 있는 저장소 구성

## 라이선스

아직 오픈소스 라이선스를 선택하지 않았습니다.

라이선스가 추가되기 전까지는 기본 저작권 규칙이 적용됩니다. 다른 사람이 이 프로젝트를 사용, 수정, 배포할 수 있게 열 계획이라면 라이선스를 명시적으로 추가해야 합니다. 재사용과 확장을 가볍게 허용하려는 앱이라면 MIT License가 좋은 기본 선택일 가능성이 높지만, 최종 선택은 원하는 기여 방식과 배포 모델에 맞춰 결정해야 합니다.
