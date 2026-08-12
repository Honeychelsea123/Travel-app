#!/bin/sh
# 판 번호 올리기.  사용법:  sh bump.sh b297
#
# ⚠ **파일 전체에서 옛 번호를 바꾸면 안 됩니다.**
#   전에는 `perl -pi -e 's/b295/b296/g' *.js *.html` 로 올렸습니다. 그러면
#   `?v=b295` 만이 아니라 **주석에 적어둔 과거 기록까지 같이 덮어씁니다.**
#   재보니 여섯 곳이 그렇게 뭉개져 있었습니다 — Dongle 을 셸에 넣은 것은
#   b282 인데 주석은 b296 이라고 말하고 있었고, 죽은 코드를 걷은 것도
#   b278 인데 b296 이라 적혀 있었습니다. 판마다 한 번씩 밀려 올라간 것입니다.
#   주석은 "언제 왜 이렇게 했나"를 남기려고 적는 것인데, 그 번호가 매번
#   지금 판으로 바뀌면 **적어둔 이유가 통째로 거짓말이 됩니다.**
#   그래서 `?v=` 뒤에 붙은 것만 바꿉니다.
#
#   index.html 의 <code id="build">b296</code> 는 지금 판을 보여주는 자리라
#   같이 올려야 맞습니다. 그건 따로 처리합니다.

set -e
NEW="$1"
[ -z "$NEW" ] && { echo "사용법: sh bump.sh b297"; exit 1; }

OLD=$(grep -o 'app\.css?v=b[0-9]*' index.html | head -1 | sed 's/.*?v=//')
[ -z "$OLD" ] && { echo "index.html 에서 지금 판을 못 찾았습니다"; exit 1; }
[ "$OLD" = "$NEW" ] && { echo "이미 $NEW 입니다"; exit 1; }

FILES="admin.js app.js app.css card.js db.js index.html net.js sw.js ui.js
       ai.js calc.js cities.js dom.js rate.js stars.js trip.js rec.js"

for f in $FILES; do
  [ -f "$f" ] || continue
  perl -i -pe "s/\\?v=$OLD\\b/?v=$NEW/g" "$f"
done

# 화면 아래에 찍히는 판 표시. 여기는 지금 판이라 같이 올립니다.
perl -i -pe "s|(<code id=\"build\">)$OLD(</code>)|\${1}$NEW\${2}|" index.html

echo "$OLD → $NEW"
echo "?v= 바뀐 곳: $(grep -roh "?v=$NEW" $FILES 2>/dev/null | wc -l)"
echo "주석 안에 남은 $OLD (그대로 두는 게 맞습니다): $(grep -roh "\bb[0-9]*\b" $FILES 2>/dev/null | grep -c "^$OLD$" || true)"
