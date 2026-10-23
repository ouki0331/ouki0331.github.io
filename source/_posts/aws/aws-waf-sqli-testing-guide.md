---
title: AWS WAF SQLインジェクション検証ガイド：攻撃分類・入力経路・安全なテスト
date: 2026-10-24 13:00:00
updated: 2026-10-24 13:00:00
categories:
  - AWS
  - セキュリティ
tags:
  - AWS WAF
  - SQL Injection
  - WAFテスト
  - CloudWatch Logs Insights
description: SQLインジェクションを構文・観測方法・難読化・入力経路に分け、AWS WAFでQuery、URI、フォーム、JSON、Header、Cookieを安全に検証する実務ガイド。
---

# はじめに

SQLインジェクション（SQLi）は、単純なシングルクォートだけで分類できる攻撃ではありません。文字列、数値、検索条件、並び順など、入力がSQL文のどこへ入るかによって構文が変わり、結果の受け取り方にも複数の方式があります。さらに、同じ内容でもURL、フォーム、JSON、HTTPヘッダー、Cookieなど、異なる経路から届きます。

AWS WAFで重要なのは、既知の攻撃文字列を自分で巨大な正規表現へ書き写すことではなく、次の3点です。

1. AWS Managed RulesまたはSQL injection match statementを使用する。
2. アプリケーションが受け取る**すべての入力経路**を検査する。
3. `Count`で検出と誤検知を確認してから`Block`へ移行する。

本記事は、許可されたシステムの防御検証専用です。実データの抽出、認証回避、データ更新・削除、外部サーバーへの通信を目的とする手順は扱いません。テスト値も、SQLらしい構文をWAFへ認識させるための非破壊的なものに限定します。

> **先に結論:** URLのQueryだけでは不十分です。少なくとも **URI path、Query、フォームBody、JSON Body、Header、Cookie** をテストします。ファイルアップロードやGraphQLを使用するサービスでは、multipart/form-dataやGraphQL variablesも確認します。

# 1. 「すべてのSQLi」をどう整理するか

個々のPayloadには無数の表記ゆれがあるため、「全文字列の一覧」を作ることはできません。実務では、次の4軸で分類すると抜けを発見しやすくなります。

| 分類軸 | 確認すること |
| --- | --- |
| SQLへ入る文脈 | 文字列、数値、識別子、並び順、検索句など、入力がSQL文のどこへ入るか |
| 結果の観測方法 | 画面表示、真偽の差、エラー、応答時間、外部通信など、攻撃者が結果をどう推測するか |
| 難読化・解析差 | コメント、大小文字、エンコード、空白、重複パラメーターなどで検査を回避しようとしているか |
| HTTPの入力経路 | Query、Body、JSON、Header、Cookieなど、WAFがどのRequest componentを検査すべきか |

同じリクエストが複数分類へ同時に該当することがあります。例えば「JSON BodyにURLエンコードされた数値型のBoolean-based SQLi」は、文脈・観測方法・難読化・入力経路の4軸を持ちます。

# 2. SQLへ入る文脈による分類

## 2.1 文字列型

アプリケーションが名前や検索語をSQLの文字列リテラルへ連結している場合です。クォートを閉じ、後続へ条件やコメントを追加しようとします。

**見るべき特徴:**

- `'`、`"`、バッククォートなどの引用符
- 引用符の直後に現れる`OR`、`AND`、コメント記号
- URLエンコードやHTMLエンティティへ変換された引用符

シングルクォートを禁止するだけでは、数値型や別の引用構文を防げません。また、入力文字の削除よりも、アプリケーションでのプレースホルダー付きパラメーター化クエリが本来の対策です。

## 2.2 数値型（引用符なし）

ID、ページ番号、金額などをSQLへ直接連結している場合、引用符を使わずに条件式を追加できます。

**見るべき特徴:**

- 数字の後ろに`OR`、`AND`、算術演算子、比較式が続く
- `id=1 OR 1=1`のように引用符がない
- 整数を想定した項目へSQLキーワードが入っている

アプリケーション側では、パラメーター化に加えて整数への型変換と範囲検証を行います。

## 2.3 識別子・並び順・構文要素

テーブル名、列名、`ORDER BY`の列、昇順・降順、`LIMIT`などは、通常の値プレースホルダーで置き換えられないことがあります。そのため、開発者が文字列連結しやすい箇所です。

**見るべき特徴:**

- `sort`、`order`、`column`、`fields`、`group`、`limit`などのパラメーター
- 許可された列名や`ASC` / `DESC`以外の入力
- カンマ、括弧、関数名、コメントを含む値

この文脈はWAFだけに依存せず、アプリケーションで許可リストを使います。例えば`sort=name`を受け取り、サーバー側の固定マップから実際の列名へ変換します。

## 2.4 LIKE・全文検索・配列展開

検索画面の`LIKE`、複数IDの`IN (...)`、全文検索式などへ入力を展開する場合です。ワイルドカードや区切り文字をアプリケーションが独自処理するため、実装不備が生まれやすくなります。

**見るべき特徴:**

- 検索・絞り込みAPIへSQL構文に似た文字列が入る
- カンマ区切りのIDリストへ括弧や演算子が混ざる
- エスケープ処理後に文字列を再結合している

## 2.5 Second-order（保存後に発火）

入力時にはSQLとして使われず、データベースへ保存された値が、後日のバッチ処理や管理画面でSQLへ再連結されたときに問題になる方式です。

入口のWAFログと発生時刻が離れるため、WAFだけで完全に判断できません。保存先、再利用箇所、アプリケーションログを追跡し、**読み出した値も安全とはみなさずパラメーター化する**必要があります。

# 3. 結果の観測方法による分類

## 3.1 Boolean-based（真偽差分）

条件を真・偽へ変え、ステータスコード、本文サイズ、表示内容などの差からSQLの評価結果を推測する方式です。典型的な永真条件だけでなく、比較式や関数の結果が使われます。

## 3.2 UNION-based（結果の結合）

元の検索結果へ別の`SELECT`結果を結合しようとする方式です。`UNION`、`SELECT`、`NULL`、列数調整などの組み合わせが特徴になります。

WAFテストでは、実在するテーブル名や機密列名を使用しません。本記事では非破壊カナリアとして`0 UNION SELECT NULL`までに限定します。

## 3.3 Error-based（エラー差分）

型変換、XML、数値演算などのエラーを意図的に発生させ、DBエラーや応答差から情報を推測する方式です。DB製品ごとに関数やエラー形式が異なります。

本番アプリケーションでは、詳細なDBエラーをクライアントへ返さず、内部ログにも認証情報やSQL全文を不用意に残さないようにします。

## 3.4 Time-based blind（時間差）

DB側の待機関数や高負荷処理を利用し、応答時間の差から真偽を推測する方式です。MySQL、PostgreSQL、SQL Serverなどで構文が異なります。

待機や高負荷を発生させるPayloadは、WAFを`Count`にしているとバックエンドへ到達します。したがって、本記事の自動テストには含めません。必要な場合は、バックエンドへ到達しない隔離環境で、負荷上限と停止条件を決めて実施します。

## 3.5 Stacked query（複文実行）

文の区切り後に別のSQL文を追加しようとする方式です。DBドライバーが複文実行を許可している場合に危険になります。

検証には`1;SELECT 1`のような読み取りも伴わない定数式だけを使い、`INSERT`、`UPDATE`、`DELETE`、`DROP`などの変更系命令は使いません。

## 3.6 Out-of-band（外部経路）

DNSやHTTPなど、Webレスポンスとは別の経路へDBから通信させ、結果や到達性を確認しようとする方式です。外部通信を伴い、組織外システムへ影響する可能性があるため、本記事ではテストしません。DBサーバーの送信通信制限と監視で防御します。

# 4. DB製品ごとの差

AWS WAFは複数のSQL方言を考慮しますが、アプリケーションが使用するDB製品を把握しておくと誤検知調査が容易です。

| DB系統 | 調査時に意識する差 |
| --- | --- |
| MySQL / MariaDB | コメント形式、バージョン付きコメント、文字コード、関数名 |
| PostgreSQL | 型キャスト、配列・JSON演算子、Dollar-quoted string、関数名 |
| SQL Server | バッチ区切り、型変換、待機構文、角括弧の識別子 |
| Oracle Database | 文字列連結、`DUAL`、関数、パッケージ、コメント |
| SQLite | 型の柔軟性、関数、`PRAGMA`、コメント |

製品固有の構文を網羅するPayload集を本番へ一括送信するのではなく、利用DBと実装に関係する分類だけを隔離環境で追加検証します。

# 5. 難読化・WAF回避で見るべき分類

次は別々の攻撃目的ではなく、上記のSQLiを検査から隠すための表記変形です。

| 分類 | 例・観察点 | AWS WAFで検討すること |
| --- | --- | --- |
| 大小文字混在 | `uNiOn SeLeCt` | SQLi検査と必要に応じた`LOWERCASE` |
| コメント分割 | `1/**/OR/**/1=1` | `REPLACE_COMMENTS`、`COMPRESS_WHITE_SPACE` |
| 空白の置換 | タブ、改行、複数空白 | `COMPRESS_WHITE_SPACE` |
| URLエンコード | `%27`、`%20`など | `URL_DECODE`、必要時は`URL_DECODE_UNI` |
| 二重エンコード | `%2527`など | アプリ側のデコード回数との一致、変換順 |
| HTMLエンティティ | `&#39;`など | `HTML_ENTITY_DECODE` |
| Unicode・全角 | Unicode表記、互換文字 | `NORMALIZE_PATH`系との混同を避け、アプリの正規化を確認 |
| 16進・エスケープ | 16進表記、バックスラッシュ | `SQL_HEX_DECODE`、`ESCAPE_SEQ_DECODE` |
| 重複Query | `id=正常&id=テスト値` | アプリが先頭・末尾・全件のどれを使うか確認 |
| 区切り差 | `;`をQuery区切りとして解釈 | Raw queryの事前解析変換を確認 |
| Parameter fragmentation | キーワードが複数項目へ分割 | アプリが値を連結するなら結合後の検証も必要 |
| Content-Type差 | JSON宣言で非JSON、または逆 | WAFとアプリのパーサー差を確認 |
| Oversize | 検査上限より後ろへ配置 | Body/Header/Cookieの上限超過処理を明示 |

Text transformationは、低いPriorityから高いPriorityの順に実行されます。例えば、URLデコード後にコメントを空白へ置き換える必要がある場合、`URL_DECODE`を先、`REPLACE_COMMENTS`を後にします。変換を増やすほどWCUと誤検知の可能性も増えるため、「全部を無条件に追加」するのではなく、アプリケーションが実際に受け付けるエンコードへ合わせます。

# 6. HTTP入力経路：Bodyとformもテストすべきか

**はい。必ずテストします。** HTMLフォームの値はURLではなく、通常はリクエストBodyに入ります。SPAやモバイルアプリではJSON Bodyが中心です。認証トークンや検索条件をHeader・Cookieへ入れる設計もあります。

| 入力経路 | 典型例 | Content-Type | WAFで確認する対象 |
| --- | --- | --- | --- |
| URI path | `/items/123` | なし | URI path |
| Query | `?id=123` | なし | All query parameters / Single query parameter / Query string |
| HTMLフォーム | `id=123&sort=name` | `application/x-www-form-urlencoded` | Body |
| JSON API | `{"id":"123"}` | `application/json` | BodyまたはJSON body |
| multipart form | テキスト項目とファイル | `multipart/form-data` | Body。境界とサイズ上限に注意 |
| XML / GraphQL | XML本文、GraphQL query・variables | 各Content-Type | BodyまたはJSON body |
| Header | 独自検索ヘッダーなど | なし | Single header / All headers |
| Cookie | セッション以外の設定値 | なし | Cookies |

## 6.1 AWS Managed RulesのSQL databaseルールグループ

最初の防御として、AWS Managed Rulesの`AWSManagedRulesSQLiRuleSet`を使用します。2026年10月24日にAWS公式ドキュメントで確認できる静的バージョンは`2.4`、Capacityは`200 WCU`で、次の8サブルールが掲載されています。バージョンと内部シグネチャは更新されるため、導入時にコンソールと変更履歴を再確認してください。

| サブルール | 主な検査対象 |
| --- | --- |
| `SQLi_QUERYARGUMENTS` | Query parameter values |
| `SQLiExtendedPatterns_QUERYARGUMENTS` | Queryの拡張パターン |
| `SQLi_BODY` | Body |
| `SQLiExtendedPatterns_BODY` | Bodyの拡張パターン |
| `SQLiExtendedPatterns_HEADER` | Headerの拡張パターン |
| `SQLiExtendedPatterns_URIPATH` | URI pathの拡張パターン |
| `SQLi_COOKIE` | Cookie |
| `SQLi_URIPATH` | URI path |

## 6.2 コンソールでManaged Rule GroupをCount導入する

1. **AWS WAF & Shield**を開く。
2. CloudFrontなら**Global (CloudFront)**、ALBやAPI Gatewayなら対象リージョンを選ぶ。
3. **Web ACLs / Protection packs (Web ACLs)**から対象Web ACLを開く。
4. **Rules** → **Add rules** → **Add managed rule groups**を選ぶ。
5. **AWS managed rule groups** → **SQL database**を追加する。
6. 検証期間中は各サブルールのAction overrideを`Count`にする。
7. CloudWatch metricsとSampled requestsを有効にする。
8. 保存後、優先順位とWeb ACL全体のCapacityを確認する。

ルールグループ全体の戻り値だけを変更する設定と、各サブルールのAction overrideは意味が異なります。テスト時は、ログへ各サブルールの一致を残せるよう、意図したoverrideになっているか確認します。

## 6.3 カスタムSQLiルールを追加する場合

次の場合は、Managed Rule Groupに加えてカスタムのSQL injection match statementを検討します。

- 特定のJSONキーだけを検査したい
- `HIGH` sensitivityを明示的に使用したい
- 特定パス・メソッドだけへScopeを限定したい
- Oversize handlingを業務要件に合わせたい
- Query、Body、Headerなどを別ルールに分け、検出箇所を明確にしたい

コンソールでは次の順に設定します。

1. Web ACL → **Rules** → **Add rules** → **Add my own rules and rule groups**。
2. **Rule builder** → **Regular rule**を選ぶ。
3. **Inspect**で`All query parameters`、`Body`、`JSON body`、`URI path`、`Single header`、`Cookies`などを選ぶ。
4. **Match type**で**Attack match condition** → **Contains SQL injection attacks**を選ぶ。
5. Sensitivityを`LOW`または`HIGH`にする。`HIGH`は検出力と同時に誤検知も増える可能性がある。
6. アプリのデコード仕様に合わせてText transformationと順序を設定する。
7. Oversize handlingを設定できる対象では、`Continue`、`Match`、`No match`の意味を確認する。
8. Actionを`Count`にして保存する。

SQLi match statementの基本コストは`LOW`で20 WCU、`HIGH`で30 WCUです。All query parametersは10 WCU加算、JSON bodyは基本コストが倍、Text transformationは1件につき10 WCU加算されます。

# 7. Bodyサイズ上限とOversize handling

AWS WAFは無制限の本文を検査しません。ALBとAWS AppSyncは最初の8 KB、CloudFront・API Gateway・Amazon Cognito・App Runner・Verified Access・Bedrock AgentCore Gatewayは既定で最初の16 KBを転送し、対応サービスでは最大64 KBへ変更できます。

検査範囲を超えた本文がある場合、ルールのOversize handlingによって動作が変わります。

| 設定 | 意味 | 向いている考え方 |
| --- | --- | --- |
| `Continue` | 検査可能な部分だけで通常評価 | 互換性優先。ただし後半は未検査 |
| `Match` | 上限超過を一致として扱う | 小さいBodyだけを許可するAPIなど |
| `No match` | 上限超過を不一致として扱う | 別ルールでサイズ制限する場合に慎重に使用 |

Managed Rule GroupのSQLi Bodyルールは、サービスからWAFへ渡された範囲だけを検査し、公式ドキュメント上のOversize handlingは`Continue`です。ファイルアップロードがあるサービスでは、SQLiルールだけに任せず、パス別のBodyサイズ制限、Content-Type制限、ファイル検査を組み合わせます。

# 8. 安全なテスト設計

## 8.1 テスト前提

- 自組織が所有し、テスト許可があるホストだけを対象にする。
- `Count`時はリクエストがアプリへ到達するため、**DBへ接続しない専用エンドポイント**を使用する。
- 専用エンドポイントを用意できない場合は、隔離した検証環境で行う。
- 一意な`X-WAF-Test-ID`を付け、業務通信と区別する。
- 実在するユーザー名、テーブル名、列名、機密情報をテスト値へ入れない。
- 待機関数、外部通信、データ変更・削除の構文は使用しない。
- HTTPステータスだけで合否を決めず、WAFログのRule ID・Label・Match detailsを確認する。

## 8.2 入力経路ごとの非破壊テスト

以下は、`TARGET_BASE`配下の`/waf-test`が入力をDBへ渡さず、単純に固定レスポンスを返す前提です。`Count`では通常200系、`Block`では多くの構成で403になりますが、Custom responseやCloudFront設定で異なるため、WAFログを正とします。

```bash
TARGET_BASE="https://example.com"
TEST_ID="waf-sqli-$(date +%Y%m%d%H%M%S)"
TEST_PATH="/waf-test"

# 1. Query：数値型Boolean-based
curl -sS -o /dev/null -w "query: %{http_code}\n" \
  -H "X-WAF-Test-ID: ${TEST_ID}-query" \
  --get --data-urlencode "waf_sqli_test=1 OR 1=1" \
  "${TARGET_BASE}${TEST_PATH}"

# 2. URI path：コメントを使った表記変形
curl -sS -o /dev/null -w "path: %{http_code}\n" \
  -H "X-WAF-Test-ID: ${TEST_ID}-path" \
  "${TARGET_BASE}${TEST_PATH}/1%2F%2A%2A%2FOR%2F%2A%2A%2F1%3D1"

# 3. HTML form：application/x-www-form-urlencoded Body
curl -sS -o /dev/null -w "form: %{http_code}\n" \
  -H "X-WAF-Test-ID: ${TEST_ID}-form" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "waf_sqli_test=' OR 'a'='a" \
  "${TARGET_BASE}${TEST_PATH}"

# 4. JSON Body：UNION構文の非破壊カナリア
curl -sS -o /dev/null -w "json: %{http_code}\n" \
  -H "X-WAF-Test-ID: ${TEST_ID}-json" \
  -H "Content-Type: application/json" \
  --data '{"waf_sqli_test":"0 UNION SELECT NULL"}' \
  "${TARGET_BASE}${TEST_PATH}"

# 5. Header
curl -sS -o /dev/null -w "header: %{http_code}\n" \
  -H "X-WAF-Test-ID: ${TEST_ID}-header" \
  -H "X-Test-Search: 1 OR 1=1" \
  "${TARGET_BASE}${TEST_PATH}"

# 6. Cookie
curl -sS -o /dev/null -w "cookie: %{http_code}\n" \
  -H "X-WAF-Test-ID: ${TEST_ID}-cookie" \
  --cookie "waf_sqli_test=1%20OR%201%3D1" \
  "${TARGET_BASE}${TEST_PATH}"

# 7. multipart/form-dataのテキスト項目（ファイルは送らない）
curl -sS -o /dev/null -w "multipart: %{http_code}\n" \
  -H "X-WAF-Test-ID: ${TEST_ID}-multipart" \
  -F "waf_sqli_test=1 OR 1=1" \
  "${TARGET_BASE}${TEST_PATH}"
```

## 8.3 構文分類ごとの追加カナリア

入力経路の検査ができたら、同じ専用パラメーターへ次の非破壊値を1件ずつ送信し、どのサブルールが検出するか確認します。

| 分類 | 非破壊テスト値 | 確認目的 |
| --- | --- | --- |
| 文字列型Boolean | `' OR 'a'='a` | 引用符を含む基本形 |
| 数値型Boolean | `1 OR 1=1` | 引用符なし |
| 偽条件 | `1 AND 1=2` | 真条件との判定差ではなくWAF一致を確認 |
| UNION | `0 UNION SELECT NULL` | 結果結合構文の特徴 |
| コメント分割 | `1/**/OR/**/1=1` | コメント正規化 |
| 大小文字混在 | `1 oR 1=1` | 大小文字の変形 |
| 型変換 | `CAST(1 AS INTEGER)` | 関数・型構文 |
| Stacked | `1;SELECT 1` | 文区切り。ただしDBへ到達させない |
| URLエンコード | curlの`--data-urlencode`を使用 | エンコード後の検査 |

これらは「すべて検出されれば完全」という試験ではありません。目的は、各Request componentが意図したルールへ届き、ログへ検出箇所が残ることを確認することです。AWS Managed Rulesの内部シグネチャは公開されておらず、更新されます。

# 9. CloudWatch Logs Insightsで結果を確認する

## 9.1 テストIDで通信を抽出する

Header配列の順序は固定ではないため、`httpRequest.headers.0.value`をUser-Agentと決め打ちしません。テストIDをログ全体から検索します。

```sql
fields @timestamp, action, terminatingRuleId, terminatingRuleType,
       httpRequest.clientIp, httpRequest.httpMethod,
       httpRequest.uri, httpRequest.args,
       nonTerminatingMatchingRules, ruleGroupList, labels
| filter @message like /waf-sqli-/
| sort @timestamp desc
| limit 100
```

## 9.2 SQLi一致を抽出する

```sql
fields @timestamp, action, terminatingRuleId,
       httpRequest.clientIp, httpRequest.httpMethod,
       httpRequest.uri, httpRequest.args,
       terminatingRuleMatchDetails,
       nonTerminatingMatchingRules, ruleGroupList, labels
| filter @message like /SQL_INJECTION/
    or @message like /sql-database:SQLi/
    or @message like /SQLi_/
| sort @timestamp desc
| limit 200
```

`Block`などの終端ルールは`terminatingRuleId`と`terminatingRuleMatchDetails`へ記録されます。`Count`は非終端なので、Web ACL直下のカスタムルールなら`nonTerminatingMatchingRules`、ルールグループ内なら`ruleGroupList[].nonTerminatingMatchingRules`も確認します。`Count`中に`terminatingRuleId = Default_Action`となっていても、「不一致」とは限りません。

# 10. 誤検知と見逃しを判断するチェック表

| 結果 | まず確認すること | 次の対応 |
| --- | --- | --- |
| テストを検出した | Rule ID、Label、location、Action | 他の入力経路も同様に確認 |
| Queryは検出、JSONは未検出 | JSONのContent-Type、JSON body設定、Body上限 | 専用JSON SQLiルールを検討 |
| Countなのにログに見えない | `nonTerminatingMatchingRules`と`ruleGroupList` | Logging filter、Rule overrideを確認 |
| 正常通信を検出した | 一致箇所、実値、対象URI、業務上の必要性 | URI・キー・メソッドでScope-down、例外は最小化 |
| 攻撃風入力を通過した | 検査対象、Priority、変換、上限超過 | Request componentを追加、変換順・Oversizeを修正 |
| 403だがSQLiログなし | 他の終端ルールが先に一致していないか | Priorityと全ルールのログを確認 |

# 11. 本番移行の推奨順序

1. AWS Managed Rules SQL databaseを各サブルール`Count`で追加する。
2. 専用エンドポイントで7入力経路をテストする。
3. 少なくとも通常業務の1サイクル分、正常通信の一致を観察する。
4. 誤検知は広いAllowではなく、URI・HTTP method・JSON keyなどで最小限に除外する。
5. 問題のないサブルールから個別に`Block`へ移す。
6. `Block`後もLabel、Rule ID、URI、ステータス、件数を監視する。
7. Managed Rule Groupの新バージョンは、いきなり切り替えず検証環境またはCountで再評価する。

# 12. WAFだけでは防げない

WAFは重要な多層防御ですが、SQLiの根本対策はアプリケーションとDBにも必要です。

- プレースホルダー付きパラメーター化クエリを使用する。
- 列名や並び順は許可リストから選ぶ。
- 数値・UUID・日付などを型と形式で検証する。
- DBアカウントへ必要最小限の権限だけを与える。
- 複文実行や不要なDB機能を無効化する。
- 詳細なSQLエラーを利用者へ返さない。
- DBサーバーからインターネットへの不要な送信通信を止める。
- 依存ライブラリ、ORM、DBドライバーを更新する。
- SAST、DAST、コードレビュー、監査ログを組み合わせる。

# 参考資料

- [AWS WAF SQL injection match rule statement](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-rule-statement-type-sqli-match.html)
- [Request components in AWS WAF](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-rule-statement-fields-list.html)
- [Text transformations](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-rule-statement-transformation.html)
- [AWS Managed Rules rule groups list](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-list.html)
- [SQL database managed rule group](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html)
- [AWS Managed Rules changelog](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-changelog.html)
- [Oversize web request components](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-oversize-request-components.html)
- [AWS WAF log fields](https://docs.aws.amazon.com/waf/latest/developerguide/logging-fields.html)
- [AWS WAF log examples](https://docs.aws.amazon.com/waf/latest/developerguide/logging-examples.html)

---

このガイドのテスト値は、WAFの検出経路を確認するための非破壊カナリアです。検出されなかった値を実DBで試すのではなく、Rule設定、Request component、変換順、本文上限、アプリケーションのパラメーター化を見直してください。
