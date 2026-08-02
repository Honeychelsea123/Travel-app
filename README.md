# Travel-app

여러 명이 함께 쓰는 여행 계획 앱. Supabase + 단일 HTML PWA.

- 라이브: https://honeychelsea123.github.io/Travel-app/ (**저장소명이 `Travel-app`** — 대소문자 그대로)
- 계획과 결정 사항: [PLAN.md](PLAN.md)

개인용 도쿄 여행앱(`Honeychelsea123/PWA`)과는 **별개 저장소**입니다.
도쿄 앱은 2026-09-12 여행 때까지 그대로 두고 여기서 새로 만듭니다.

## 구조

```
index.html      화면 전부 (빌드 없음)
db/             Supabase 스키마. SQL Editor 에 순서대로 붙여넣습니다
  001_schema.sql  테이블 · RLS · 함수 · 트리거
  002_seed.sql    도시 22곳, 도쿄 노선색 40개
```

## 배포

`git push` 하면 GitHub Pages 가 자동으로 올립니다.

**짧은 시간에 여러 번 밀지 마세요.** 새 배포가 진행 중이던 것을 취소시켜
연쇄로 다 죽습니다. 여러 변경은 한 커밋으로 묶습니다.
