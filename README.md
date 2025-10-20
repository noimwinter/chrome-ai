# Personal Summarizer - Chrome Extension

AI 기반 텍스트 요약 및 하이라이트 기능을 제공하는 Chrome 브라우저 확장 프로그램입니다.

## 주요 기능

### ✨ AI 텍스트 요약
- Chrome 내장 Summarizer API를 활용한 텍스트 요약
- 직업(occupation)에 따른 맞춤형 요약
- 요약 길이 선택 (Short, Medium, Long)
- 요약 타입 선택 (Key Points, TL;DR)

### 🖍️ 텍스트 하이라이트
- XPath 기반 정확한 텍스트 위치 저장
- 페이지 새로고침 후에도 하이라이트 유지
- 4가지 색상 선택 (Yellow, Blue, Green, Pink)
- 하이라이트에 코멘트 추가/수정 기능
- URL별 하이라이트 관리

### 💬 코멘트 시스템
- 하이라이트된 텍스트에 메모 추가
- 코멘트 편집 및 삭제
- 코멘트가 있는 하이라이트는 💬 아이콘 표시

### 📊 자동 다이어그램 생성
- LanguageModel API를 사용한 Mermaid 다이어그램 자동 생성
- 텍스트 내용을 시각화

## 설치 방법

1. Chrome 브라우저에서 `chrome://extensions/` 페이지 열기
2. 우측 상단의 "개발자 모드" 토글 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. 이 프로젝트 폴더 선택

## 사용 방법

### 텍스트 하이라이트 하기

1. 웹 페이지에서 텍스트 선택
2. 우클릭하여 "Highlight Text" 메뉴 선택
3. 원하는 색상 선택 (Yellow, Blue, Green, Pink)
4. 하이라이트된 텍스트를 클릭하여 코멘트 추가

### 텍스트 요약하기

1. 확장 프로그램 아이콘 클릭 또는 `Alt+S` 단축키
2. "Summarize Page" 또는 "Summarize Selection" 버튼 클릭
3. AI가 생성한 요약 결과 확인

### 하이라이트 관리

1. 확장 프로그램 오버레이에서 "📝 View My Highlights" 클릭
2. 현재 페이지의 모든 하이라이트 목록 확인
3. 코멘트 추가/수정 또는 하이라이트 삭제
4. "Clear All" 버튼으로 모든 하이라이트 제거

## 기술 스택

### 핵심 기술
- **Chrome Extension API** (Manifest V3)
- **Chrome Summarizer API** - AI 요약
- **Chrome LanguageModel API** - 다이어그램 생성
- **XPath** - 정확한 텍스트 위치 추적

### 라이브러리
- **Mermaid.js** - 다이어그램 렌더링
- **Marked.js** - 마크다운 파싱

## 프로젝트 구조

```
.
├── manifest.json              # 확장 프로그램 설정
├── background.js              # 백그라운드 서비스 워커
├── content.js                 # 콘텐츠 스크립트 (페이지 조작)
├── highlighter.js            # 하이라이트 핵심 로직 ⭐ NEW
├── overlay.html              # 오버레이 UI
├── overlay.js                # 오버레이 컨트롤러
├── global.css                # 전역 스타일
├── views/
│   ├── main.html             # 메인 뷰
│   ├── main.js               # 메인 뷰 컨트롤러
│   ├── settings.html         # 설정 뷰
│   ├── settings.js           # 설정 컨트롤러
│   ├── highlights.html       # 하이라이트 관리 뷰 ⭐ NEW
│   └── highlights.js         # 하이라이트 관리 컨트롤러 ⭐ NEW
├── vendor/
│   ├── marked.min.js         # 마크다운 파서
│   └── mermaid.min.js        # 다이어그램 라이브러리
├── prompts/
│   └── language-model-system.md  # AI 시스템 프롬프트
├── test-highlight.html       # 테스트 페이지 ⭐ NEW
├── server.js                 # 개발 서버 ⭐ NEW
└── package.json              # Node.js 설정 ⭐ NEW
```

## 하이라이트 기능 상세

### 데이터 저장 구조

하이라이트는 URL별로 chrome.storage.local에 저장됩니다:

```javascript
{
  "highlights:https://example.com/page": [
    {
      "id": "highlight-1234567890-abc123",
      "startPath": "/html/body/p[1]/text()[1]",
      "startOffset": 15,
      "endPath": "/html/body/p[1]/text()[1]",
      "endOffset": 45,
      "color": "yellow",
      "text": "highlighted text",
      "comment": "내 코멘트",
      "timestamp": 1698765432000
    }
  ]
}
```

### XPath 기반 위치 저장

- 텍스트 노드의 정확한 DOM 경로를 XPath로 저장
- 문자 단위 offset으로 정확한 위치 지정
- 페이지 구조가 변경되지 않는 한 동일한 위치 복원 가능

## 개발 서버

테스트를 위한 간단한 웹 서버가 포함되어 있습니다:

```bash
npm install
npm start
```

서버 실행 후:
- 메인 페이지: http://localhost:5000/
- 테스트 페이지: http://localhost:5000/test
- 확장 프로그램 정보: http://localhost:5000/extension

## 테스트 방법

1. Chrome에 확장 프로그램 설치
2. 개발 서버 실행: `npm start`
3. http://localhost:5000/test 페이지 접속
4. 텍스트 선택 후 우클릭 → "Highlight Text"
5. 색상 선택 후 하이라이트 생성 확인
6. 하이라이트 클릭하여 코멘트 추가
7. 페이지 새로고침 후 하이라이트 유지 확인
8. 확장 프로그램에서 "View My Highlights" 클릭하여 관리

## 주의사항

### Chrome Summarizer API 요구사항
- Chrome 128 이상 필요
- Summarizer API가 활성화되어야 함
- 일부 기기에서는 사용 불가능할 수 있음

### 하이라이트 제한사항
- 동적으로 변경되는 페이지에서는 하이라이트 위치가 어긋날 수 있음
- JavaScript로 생성된 콘텐츠는 하이라이트가 즉시 적용되지 않을 수 있음
- iframe 내부 콘텐츠는 하이라이트 불가

## 향후 개선 계획

- [ ] 하이라이트 내보내기 (JSON, Markdown)
- [ ] 하이라이트 검색 기능
- [ ] 태그 시스템으로 하이라이트 분류
- [ ] 클라우드 동기화
- [ ] PDF 파일 지원
- [ ] MutationObserver로 동적 페이지 대응

## 라이선스

MIT
