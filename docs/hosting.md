# 공개 블로그 운영

방문자는 홈, 글 목록, 학습 지도와 실습 코드를 읽습니다. 관리자는 `/login`에서 GitHub로 로그인한 뒤 Studio에서 글을 작성하고, 코드 링크를 추가하고, 글을 삭제합니다. 관리자 계정은 GitHub의 숫자 계정 ID로 지정합니다.

## GitHub 자동 배포

`DawnteaStudio/til-studio`의 `main` 브랜치에 푸시하면 Vercel 프로젝트 `tmp12/til-studio`의 Production 배포가 시작됩니다. 배포가 완료되면 [공개 블로그](https://til-studio-rust.vercel.app)에 반영됩니다. 이 연결은 사이트 코드용이며, 글과 실습 코드를 저장하는 `DawnteaStudio/TIL` 콘텐츠 저장소와 별개입니다.

푸시 후 Vercel 프로젝트의 **Deployments**에서 해당 커밋 SHA와 `main` 브랜치, Production 환경을 확인합니다. 상태가 **Ready**가 되면 공개 블로그에서 변경 내용을 확인하세요.

## 배포 설정

Vercel 프로젝트에서 Production 환경변수를 설정하고 배포합니다. Preview 환경은 별도로 값을 지정합니다. Vercel에서는 `VERCEL=1`로 배포 모드가 자동 활성화됩니다. 다른 서버는 `TIL_STUDIO_MODE=hosted`를 지정해야 합니다. 배포 모드는 로컬 `.til-studio/settings.local.json`을 읽지 않습니다. Studio 설정 창은 현재 설정 여부를 보여주며, 변경은 Vercel 환경변수 저장 후 재배포로 적용합니다.

| 변수 | 용도 |
| --- | --- |
| `AUTH_URL` | 블로그의 HTTPS 기준 주소 |
| `AUTH_SECRET` | 최소 32자 이상의 무작위 세션 암호화 비밀값 |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | 관리자 로그인용 GitHub OAuth App의 client ID와 secret |
| `TIL_ADMIN_GITHUB_ID` | 허용할 관리자의 숫자 GitHub 계정 ID |
| `TIL_PUBLIC_ROOTS` | 공개할 최상위 폴더 이름의 JSON 배열 |
| `BLOB_STORE_ID` | OIDC로 프로젝트에 연결한 초안 전용 private Vercel Blob 저장소 ID |
| `BLOB_READ_WRITE_TOKEN` | legacy 연결이나 외부 호스트에서 사용하는 선택적 읽기·쓰기 토큰 |
| `TIL_REPOSITORY_OWNER`, `TIL_REPOSITORY_NAME` | 학습 기록을 저장한 GitHub 저장소 |
| `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY` | 글 읽기·발행에 사용할 GitHub App 인증 |
| `GITHUB_APP_WEBHOOK_SECRET` | GitHub webhook 서명 검증 비밀값 |
| `AI_PROVIDER`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL` | 사용하는 AI 제공자와 모델 |

GitHub OAuth App의 Homepage URL을 `AUTH_URL`과 일치시키고 Authorization callback URL을 `https://블로그주소/api/auth/callback/github`로 설정합니다. 로그인용 OAuth App과 저장소 접근용 GitHub App을 각각 구성합니다. 저장소 앱은 기존 발행 흐름에 맞는 Contents 및 Pull requests 권한이 필요합니다. 시크릿은 Vercel 대시보드의 환경변수에서 입력하고 재배포해 적용합니다. Secret 값은 다시 pull할 수 없으므로, 값을 교체할 때도 대시보드에서 새 값을 설정합니다.

Vercel Storage에서 private Blob 저장소를 프로젝트에 OIDC 방식으로 연결하고 `BLOB_STORE_ID`와 해당 프로젝트의 OIDC 접근 권한을 확인합니다. 현재 배포는 이 방식을 사용합니다. `BLOB_READ_WRITE_TOKEN`은 legacy 연결이나 외부 호스트에서 사용할 수 있는 인증 대안입니다. 초안은 private 저장소에 보관됩니다.

## 공개할 폴더

예를 들어 `TIL_PUBLIC_ROOTS=["cs","languages","projects","coding-test"]`를 설정합니다. 공백이나 오타를 포함한 잘못된 JSON, 누락된 값, 빈 배열은 공개 폴더를 모두 차단합니다. 실제 저장소에 존재하는 폴더 이름을 사용하세요.

서버는 홈, 목록, 지도 및 `/docs/...`의 직접 접근에 이 범위를 적용합니다. 브라우저에 남아 있는 폴더 선택은 해당 범위를 좁힐 수 있습니다. 공개 설정을 바꾼 뒤에는 새 배포를 확인하세요. GitHub 저장소 자체가 공개되어 있다면 GitHub에서의 파일 공개 범위는 그 저장소 설정을 따릅니다.

## 로컬 초안 이관

1. 기존 localhost Studio에서 초안 내보내기로 JSON 파일을 저장합니다.
2. 배포된 블로그에 관리자 계정으로 로그인하고 Studio를 엽니다.
3. 초안 가져오기로 JSON을 불러온 뒤 본문과 저장 위치를 확인합니다.
4. 클라우드 저장 완료 표시를 확인하고 다른 브라우저에서도 같은 초안이 나타나는지 확인합니다.

초안 JSON에는 작성 중인 본문이 들어 있습니다. 이관 중에는 원본 파일을 보관하세요. 로컬 브라우저의 이전 v1 초안도 계속 읽을 수 있습니다. 여러 기기에서 동시에 수정해 충돌이 표시되면 각 버전을 확인한 뒤 저장할 버전을 선택합니다.

## 배포 확인과 복구

로그아웃한 창에서 글 목록, 검색, 지도, 허용한 문서와 코드 링크를 확인합니다. 비공개 폴더의 직접 문서 주소는 404여야 하며 관리 API는 로그인을 요구해야 합니다. 허용된 관리자 계정으로 로그인해 Studio 진입, 초안 저장과 다른 기기에서 불러오기, 로그아웃을 확인합니다.

로그인이 열리지 않으면 OAuth callback 주소, `AUTH_URL`, 관리자의 숫자 ID와 비밀값 설정 여부를 확인합니다. 글을 읽지 못하면 저장소 GitHub App의 설치 대상과 권한을 확인합니다. 초안 저장이 실패하면 private Blob 연결, `BLOB_STORE_ID`, 프로젝트의 OIDC 접근 권한을 확인하고, 현재 초안을 JSON으로 내보내 보관합니다. 운영 문제의 로그를 공유할 때 API 키, 세션 쿠키, private key와 초안 본문을 제거하세요.

코드 롤백은 Vercel 배포 이력에서 수행합니다. GitHub에 발행된 글과 Blob 초안은 배포 코드와 별도로 보관되므로 각각의 저장 상태도 확인하세요.
