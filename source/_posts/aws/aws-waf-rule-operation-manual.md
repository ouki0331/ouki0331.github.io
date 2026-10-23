---
title: AWS WAF ルール設計・変更 操作手順書
date: 2026-10-24 12:00:00
updated: 2026-10-24 12:00:00
categories:
  - AWS
  - セキュリティ
tags:
  - AWS WAF
  - Web ACL
  - 運用手順
  - セキュリティ
description: AWS WAF コンソールで、IP、パス、SQLi、XSS、レート制限などのルールを安全に追加・変更するための実務手順書。
---

# はじめに

本書は、AWS WAF のログ調査後に判明した「遮断すべき通信」「許可すべき正常通信」「追加すべき例外」を、Web ACL のルールへ安全に反映するための操作手順書です。

対象範囲は、AWS マネジメントコンソールでのルール作成・編集、入力データの形式、優先順位、Count による事前確認、反映後の確認です。ログから対象データを抽出・整形する方法は扱いません。

AWS WAF の新しいコンソールでは Web ACL が「保護パック」と表示されることがあります。本書では **Web ACL（保護パック）** と表記します。画面更新によりラベル名が少し変わっても、`Web ACL → Rules → Add rules / Edit` という流れは同じです。

> **重要:** 本番環境では、原則として新規ルールや条件変更を最初から `Block` にしません。まず `Count` で一致状況を確認し、正常通信への影響がないと判断してから `Block` へ変更します。

## 1. 作業前に必ず確認する項目

| 項目 | 確認内容 |
| --- | --- |
| 対象アカウント | 本番・検証・開発のどれか |
| Scope | CloudFront は `Global (CloudFront)`、ALB・API Gateway などは対象リージョン |
| Web ACL | 対象リソースに関連付けられている Web ACL 名 |
| 変更対象 | カスタムルール、AWS Managed Rules、IP set、Regex pattern set のどれか |
| 現在のアクション | `Allow`、`Block`、`Count`、`CAPTCHA`、`Challenge` |
| 優先順位 | 例外ルールや明示的な遮断ルールが、対象ルールより前に評価されるか |
| メトリクス | CloudWatch metrics と Sampled requests が有効か |
| ロールバック | 元のルールJSON、優先順位、アクションを記録したか |

CloudFront 用の IP set や Regex pattern set は Global で作成します。リージョンが異なるセットを Web ACL から参照することはできません。

## 2. 共通のコンソール操作

### 2.1 既存ルールを編集する

1. AWS マネジメントコンソールで **WAF & Shield** を開く。
2. 対象が CloudFront の場合は **Global (CloudFront)**、それ以外は対象リージョンを選ぶ。
3. **Web ACLs** または **Protection packs (Web ACLs)** を開く。
4. 対象 Web ACL を選ぶ。
5. **Rules** の横にある **Edit**、または標準コンソールの **Rules** タブから対象ルールを選択して **Edit** を押す。
6. 条件、アクション、メトリクス名を確認して変更する。
7. **Save rule** を押す。
8. **Set rule priority** で評価順を確認し、必要なら **Move up / Move down** で移動する。
9. Web ACL 全体の保存ボタンが表示される場合は、最後に保存する。

### 2.2 カスタムルールを追加する

1. 対象 Web ACL のルール管理画面で **Add rules** を押す。
2. **Add my own rules and rule groups** を選ぶ。
3. **Rule builder** を選ぶ。
4. 通常は **Rule visual editor** を使用する。複雑なネストや既存JSONの投入時のみ **Rule JSON editor** を使う。
5. Rule name、Type、Statement、Action を設定する。
6. **CloudWatch metrics** と **Sampled requests** を有効にする。
7. 初回アクションを **Count** にして **Add rule** を押す。
8. 優先順位を確認して保存する。

### 2.3 JSON エディターを使う場合

- JSON エディターへ貼り付けるのは、基本的にルールオブジェクト1件です。
- `Name` と `VisibilityConfig.MetricName` は、同じ Web ACL 内で識別できる名前にします。
- ARN、IP set 名、Regex pattern set 名、リージョン、Scope を取り違えないようにします。
- コンソールの検証に通っても、ルールの意味や優先順位が正しいとは限りません。
- 保存前に `Action` が意図せず `Block` になっていないか確認します。

## 3. 調査結果をルール入力へ変換する

| 調査で得た値 | WAF に入力する形 | 例 |
| --- | --- | --- |
| 単一 IPv4 | CIDR `/32` | `192.0.2.44/32` |
| 単一 IPv6 | CIDR `/128` | `2001:db8::10/128` |
| IPv4 範囲 | CIDR | `192.0.2.0/24` |
| 完全一致パス | URI path + Exactly matches string | `/api/v1/login` |
| 配下すべて | URI path + Starts with string | `/admin/` |
| 複数パスのパターン | Regex pattern set | `^/(admin|internal)(/|$)` |
| クエリ値 | Single query parameter | Name: `redirect`, Value: `https://...` |
| ヘッダー値 | Single header | Name: `user-agent` |
| HTTP メソッド | HTTP method | `POST` |
| 国 | Geo match | `JP`、`US` などの国コード |
| JSON キー・値 | JSON body + JSON match scope | Key / Value / All |

以下の例に含まれるIPアドレスとドメインは説明用です。実データへ置き換えてください。

# 4. 分類別の操作手順

## 4.1 悪性IP・許可IP（IP set）

### 重点観察項目

- ログの `httpRequest.clientIp`
- CloudFront やプロキシを経由している場合、本当に参照すべきIPが送信元IPか `X-Forwarded-For` か
- 単一IPか、同一ネットワーク帯か
- IPv4 と IPv6 の別
- 一時遮断か恒久遮断か

### 入力データ

IP set は CIDR 形式を1行に1件入力します。

```text
192.0.2.44/32
198.51.100.0/24
2001:db8::10/128
```

`/0` は使用できません。単一IPv4には `/32`、単一IPv6には `/128` が必要です。IPv4 と IPv6 は別々の IP set にします。

### IP set を作る

1. AWS WAF 左メニューの **IP sets** を開く。
2. **Create IP set** を押す。
3. Name、Description、Region、IP version を設定する。
4. **IP addresses** に CIDR を1行ずつ入力する。
5. **Create IP set** を押す。

### Web ACL から参照する

1. Web ACL → **Rules** → **Add rules** → **Add my own rules and rule groups**。
2. **IP set**、または Rule builder で **Originates from an IP address in** を選ぶ。
3. 作成した IP set を選ぶ。
4. 悪性IPならアクションを最初は `Count`、確認後に `Block` とする。
5. 明示的な許可IPなら `Allow` を選び、遮断ルールより前へ置く。ただし、Allow は以降の評価を終了するため、許可範囲を必要最小限にする。

### 特殊注意点

`X-Forwarded-For` を使う場合は、どのプロキシがヘッダーを設定するかを確認します。クライアントが任意に偽装できる構成で `FIRST` や `ANY` を使うと、ルールを回避される可能性があります。信頼できるプロキシで上書きされることを確認してから、Forwarded IP configuration を設定します。

既存 IP set にIPを追加すると、そのセットを参照するすべてのルールへ自動的に影響します。編集前に参照先を確認してください。

## 4.2 URI パスの完全一致・前方一致

### 重点観察項目

- `httpRequest.uri` のパス部分
- 大文字・小文字、末尾 `/`、URLエンコードの差
- 完全一致にするか、ディレクトリ配下をまとめて対象にするか
- クエリ文字列を条件へ含める必要があるか

### 操作

1. Web ACL → **Rules** → **Add rules** → **Add my own rules and rule groups** → **Rule builder**。
2. Type を **Regular rule** にする。
3. Statement の **Inspect** で **URI path** を選ぶ。
4. **Match type** を選ぶ。
   - 1パスだけ: **Exactly matches string**
   - 配下すべて: **Starts with string**
   - 部分一致: **Contains string**
5. **String to match** に `/api/v1/login` のように先頭 `/` を付けて入力する。
6. 必要なら Text transformation に `URL_DECODE`、`LOWERCASE` などを追加する。
7. Action を `Count` にして保存する。

### 特殊注意点

`/admin` の前方一致は `/administrator` にも一致します。ディレクトリを対象にするなら `/admin/` を使用し、必要に応じて `/admin` の完全一致ルールも別に作ります。URI path には通常クエリ文字列は含まれないため、`?id=...` は Query string または Single query parameter で検査します。

## 4.3 複数パス・可変パス（Regex pattern set）

### 重点観察項目

- 数字IDやUUIDなど、リクエストごとに変化する部分
- 先頭・末尾の境界
- 正常パスまで広く一致しないか
- URLデコード前後のどちらで評価するか

### データ例

```regex
^/api/v1/users/[0-9]+/export$
^/(admin|internal)(/|$)
^/download/[^/]+\.zip$
```

### 操作

1. AWS WAF 左メニューの **Regex pattern sets** を開く。
2. **Create regex pattern set** を押す。
3. Name、Description、Region を指定する。
4. 正規表現を1件ずつ追加して保存する。
5. 対象 Web ACL → **Add rules** → **Rule builder**。
6. Inspect で **URI path**、Match type で **Matches pattern from regular expression set** を選ぶ。
7. 作成したセットを指定し、Text transformation と Action を設定する。

### 特殊注意点

AWS WAF は PCRE 系の構文をサポートしますが、一部制限があります。極端に広い `.*`、複雑な後方参照、境界のない式は避けます。変更時は Regex pattern set の参照先すべてへ影響する点に注意します。

## 4.4 HTTP メソッド・ヘッダー・クエリ・Cookie

### 重点観察項目

- メソッド: `GET`、`POST`、`PUT`、`DELETE` など
- Header: ヘッダー名と値。ヘッダー名は大文字・小文字を区別しない
- Query: パラメーター名と値、同名パラメーターの複数指定
- Cookie: Cookie 名と値
- 値のエンコードと空値

### 操作

1. Rule builder の Statement で検査対象を選ぶ。
   - **HTTP method**
   - **Single header** または **All headers**
   - **Single query parameter** または **All query parameters**
   - **Cookies**
2. Single を選んだ場合は対象名を入力する。
3. Match type と String to match を設定する。
4. 必要な Text transformation を追加する。
5. Action を `Count` にして保存する。

### 組み合わせ例

「`POST /admin/import` だけを社内IPに許可」の場合は次の論理構造にします。

```text
AND
├─ HTTP method = POST
├─ URI path = /admin/import
└─ NOT (Origin IP is in corporate-allow-ipset)
```

このルールの Action を `Block` にすると、社内IP以外からの対象操作を遮断できます。最初は `Count` で確認します。

### 特殊注意点

Header、Cookie は個数とサイズに検査上限があります。上限超過時の **Oversize handling** を `Continue`、`Match`、`No match` のどれにするか、アプリケーション仕様と合わせて決めます。

## 4.5 SQL インジェクション（SQLi）

### 重点観察項目

- 一致したリクエストコンポーネント: Query、Body、JSON body、URI path、Header など
- `terminatingRuleId` や managed rule のサブルール名
- 正常業務でSQLに似た文字列を扱う項目の有無
- LOW / HIGH の感度
- URL decode、HTML entity decode などの変換順

### 操作

1. Rule builder → Type **Regular rule**。
2. Inspect で Query string、All query parameters、Body、JSON body などを選ぶ。
3. Match type で **Attack match condition** → **Contains SQL injection attacks** を選ぶ。
4. Sensitivity は原則 `HIGH` を検討する。誤検知許容度が低い場合や別の防御がある場合は `LOW` を検討する。
5. Text transformation を設定する。
6. Action を `Count` にして保存し、一致内容を確認後に `Block` へ変更する。

### 特殊注意点

複数コンポーネントを検査する場合、1つの広いルールへ詰め込まず、Query、Body、Cookie などを分けると、どこで一致したかを追いやすくなります。HIGH は検出力が上がる一方、通常とは異なる文字列を多用するAPIでは誤検知が増える可能性があります。

## 4.6 クロスサイトスクリプティング（XSS）

### 重点観察項目

- 入力欄がHTMLを許可する仕様か
- Query、Body、JSON、Header のどこに文字列があるか
- HTML entity、URL encoding、Base64 などの変換
- リッチテキスト、Markdown、テンプレート入力など正常なスクリプト風文字列

### 操作

1. Rule builder の Inspect で対象コンポーネントを選ぶ。
2. Match type で **Attack match condition** → **Contains cross-site scripting attacks** を選ぶ。
3. 必要な Text transformation を追加する。
4. Action を `Count` にして保存する。
5. 正常なHTML入力が一致する場合は、URI path やHTTP methodを使った Scope-down 相当の条件、または先行する例外ルールで範囲を限定する。

### 特殊注意点

管理画面のHTML編集機能など、仕様上タグを受け付けるパスに全Body対象のXSSルールを適用すると誤検知しやすくなります。「XSSルール自体を無効化」するのではなく、対象パス・パラメーターを限定します。

## 4.7 Body・JSON Body

### 重点観察項目

- `Content-Type` が実際に `application/json` か
- JSON のどの key / value を検査するか
- JSON parsing failure 時の動作
- Body の検査サイズ上限
- Oversize handling

### 操作

1. Rule builder の **Inspect** で **Body** を選ぶ。
2. **Content type** で **JSON** を選ぶ。単なる本文文字列なら **Plain text** を選ぶ。
3. JSON match scope を Keys、Values、All のいずれかにする。
4. 必要に応じて JSON pointer などで対象要素を限定する。
5. Invalid JSON fallback behavior と Oversize handling を選ぶ。
6. Match type と比較値を設定する。
7. Action を `Count` にして保存する。

### JSON データ例

次のリクエストで `role` の値だけを対象にしたい場合、All values ではなく該当要素に限定します。

```json
{
  "user": {
    "name": "example",
    "role": "admin"
  }
}
```

JSONエディターの検証は構文や必須項目を確認しますが、実トラフィックのJSON構造と一致するかまでは保証しません。ログで実際の構造を確認してから対象を決めます。

### 特殊注意点

Application Load Balancer と AppSync の Body 検査は最初の 8 KB が上限です。CloudFront、API Gateway、Cognito、App Runner、Verified Access、Bedrock AgentCore Gateway は既定で最初の 16 KBで、Web ACL 設定により最大 64 KBへ増やせるサービスがあります。上限を超えた末尾は検査されません。

## 4.8 サイズ制約・オーバーサイズ

### 重点観察項目

- Body、Header、Cookie、Query string の実際のバイト数
- 保護対象サービスごとの検査上限
- 大きなファイルアップロードなど正常な大容量通信
- 同じコンポーネントを検査する他ルールより先に置くべきか

### 操作

1. Rule builder の Inspect で Body、Headers、Cookies などを選ぶ。
2. Match type で **Size greater than** などを選ぶ。
3. Size にバイト数を入力する。
4. Oversize handling を設定する。
5. Action を `Count` で確認し、その後 `Block` を検討する。
6. 同じコンポーネントを検査するルールより前へ配置する。

AWS公式のオーバーサイズ遮断例では、Header / Cookie は `8192`、ALB / AppSync のBodyは `8192`、既定設定の CloudFront 等のBodyは `16384` を基準にします。アプリケーション側で許容するサイズと必ず照合してください。

## 4.9 国・地域（Geo match）

### 重点観察項目

- 発信元IPと Forwarded IP のどちらを使用するか
- 国コード
- 国単位か地域単位か
- VPN、モバイル回線、海外出張者など正常利用者への影響

### 操作

1. Rule builder で **Originates from a country in** を選ぶ。
2. 対象国を追加する。
3. Forwarded IP を使う場合はヘッダー、位置、fallback behavior を設定する。
4. Action を `Count` にして保存する。
5. 影響確認後に `Block`、または用途に応じて別のアクションへ変更する。

### 地域単位の特殊手順

Geo match は検査したリクエストへ国・地域ラベルを追加します。地域単位で制御する場合は、先行する Geo match ルールを `Count` で実行し、その後の別ルールで次のようなラベルに一致させます。

```text
awswaf:clientip:geo:region:US-OR
awswaf:forwardedip:geo:region:US-OR
```

ラベルはルール評価の終了後に追加されるため、同じルール内の `AND` で直後に参照できません。必ず後続の別ルールで参照します。

## 4.10 レートベースルール

### 重点観察項目

- 集計キー: Source IP、Forwarded IP、Header、Cookie、Label namespace など
- Evaluation window
- Limit
- ログイン、検索、APIなど対象パス
- NAT配下の多数ユーザーを1IPとして数える影響

### 操作

1. Web ACL → **Add rules** → **Add my own rules and rule groups** → **Rule builder**。
2. Type で **Rate-based rule** を選ぶ。
3. Evaluation window と Request limit を設定する。
4. Aggregate key を選ぶ。
5. 特定パスだけに適用する場合は Scope-down statement を追加する。
6. Action を `Count` にして保存する。
7. 一致数と正常ユーザーへの影響を確認後、`Block`、`CAPTCHA`、`Challenge` を検討する。

### 特殊注意点

レートは厳密なリクエスト保証値ではなく、一定期間の集計に基づく制御です。送信元IPだけで集計すると、会社や通信キャリアのNAT配下にいる正常ユーザーをまとめて制限する可能性があります。ログインIDに対応する信頼できるHeaderやCookieを使える場合は、カスタムキーも検討します。

## 4.11 AWS Managed Rules の追加・誤検知例外

### 重点観察項目

- Managed rule group 名と Version
- 一致したサブルール名
- ルールが付与した label
- グループ全体のoverrideか、単一サブルールのoverrideか
- Scope-down statement で適用範囲を限定できるか

### 追加操作

1. Web ACL → **Add rules** → **Add managed rule groups**。
2. AWS managed rule groups を展開する。
3. 対象グループの **Add to web ACL** を有効にする。
4. **Edit** を開き、初回は **Override all rule actions → Count** を選ぶ。
5. **Save rule** → **Add rules**。
6. 優先順位とメトリクスを確認して保存する。

### 誤検知した単一サブルールを Count にする

1. Web ACL のルール管理で対象 Managed rule group を選び **Edit**。
2. **Managed rules** または **Rules** を開く。
3. 誤検知したサブルールの override action を `Count` にする。
4. **Save rule** を押す。

グループ全体の `Override rule group action → Count` は、グループの戻り値だけをCountへ変える設定であり、個々のルールをテストする方法としては不十分です。テスト時は **個々のルールアクションを Count に上書き**します。

### より限定的な例外

サブルールを全面的に Count にすると、本来遮断すべき通信も通過します。可能なら次の順で限定します。

1. 正常通信のパス・メソッド・パラメーターを特定する。
2. 例外条件を先行ルール、Scope-down statement、またはラベル一致で表現する。
3. 例外に一致しない通信だけをManaged ruleで評価する。
4. 変更後も対象サブルールのメトリクスを監視する。

## 4.12 AND・OR・NOT、ラベル、優先順位

### 使い分け

- `AND`: すべて満たす場合だけ一致。例: `POST` かつ `/login` かつ特定国。
- `OR`: いずれかを満たせば一致。例: `/admin` または `/internal`。
- `NOT`: 条件を反転。例: 許可IP set に含まれない通信。
- Label match: 前のルールやManaged ruleが付与したラベルを条件にする。

### 優先順位の原則

AWS WAF はリスト上部から評価します。数値が小さいほど先です。`Allow` と `Block` は通常そこで評価を終了し、`Count` は後続ルールへ進みます。

推奨される一般的な並びは、環境要件に応じて次のようになります。

```text
1. 必要最小限の明示的な許可・例外
2. 既知の悪性IP遮断
3. 管理画面など高リスクパスの制限
4. サイズ・レート制限
5. SQLi / XSS / Managed Rules
6. ラベルを利用する後続ルール
7. Web ACL の Default action
```

例外を前へ置きすぎると、その後の重要な検査をすべて飛ばす可能性があります。単純な `Allow` より、`NOT` や Scope-down statement で検査対象だけを外す方が安全な場合があります。

# 5. Count から Block へ切り替える標準手順

1. 新規ルールまたは変更ルールを `Count` にする。
2. CloudWatch metric、Sampled requests、WAFログで一致状況を確認する。
3. 正常通信が一致していないか確認する。
4. 意図した悪性通信が一致しているか確認する。
5. ルールの範囲が広すぎる場合は、URI path、method、parameter、IP set、Scope-down statement で限定する。
6. 変更後も `Count` で再確認する。
7. 影響が許容できる場合に `Block` へ変更する。
8. BlockedRequests、エラー率、対象アプリケーションの主要指標を確認する。

# 6. よくある変更パターン

## 正常通信が誤って Block された

1. 終了ルールまたはManaged ruleのサブルールを特定する。
2. 緊急時は対象サブルールだけを一時的に `Count` へ変更する。
3. 正常通信を識別できるパス、メソッド、パラメーター、IPなどを確認する。
4. ルール条件または例外を必要最小限に絞る。
5. `Count` で再検証してから元の `Block` に戻す。

## 悪性通信が通過した

1. 既存ルールより前に別の終了ルールで `Allow` されていないか確認する。
2. 検査対象コンポーネント、Text transformation、Bodyサイズ上限を確認する。
3. 単一IPなら IP set、特徴的なパスなら Byte match / Regex pattern set、頻度ならRate-based ruleへ追加する。
4. `Count` で一致を確認し、影響評価後に `Block` へ変更する。

## 悪性IPを緊急遮断する

1. 対象IPが正しいことを再確認する。
2. IPv4は `/32`、IPv6は `/128` にする。
3. 既存の悪性IP用 IP set へ追加する。
4. その IP set を参照するルールのActionと優先順位を確認する。
5. BlockedRequests とアプリケーション影響を確認する。

# 7. 反映後チェックリスト

- [ ] 対象アカウント、Scope、リージョン、Web ACL が正しい
- [ ] 入力値に余分な空白、全角文字、CIDR漏れがない
- [ ] IPv4 / IPv6 の IP set を取り違えていない
- [ ] URI path の先頭 `/`、末尾 `/`、大小文字を確認した
- [ ] Query と URI path を混同していない
- [ ] Forwarded IP を信頼できる構成である
- [ ] Oversize handling と invalid JSON fallback を意図的に選んだ
- [ ] Text transformation の種類と順番が正しい
- [ ] 初回アクションを原則 `Count` にした
- [ ] CloudWatch metrics と Sampled requests を有効にした
- [ ] ルール優先順位を確認した
- [ ] WCU が Web ACL の許容量内である
- [ ] 保存後に対象ルールの状態を再表示して確認した
- [ ] Block切替後にアプリケーションのエラー率を確認した

# 8. ロールバック

問題が発生した場合は、影響を最小化する順で対応します。

1. 変更したルールの Action を `Count` に戻す。
2. 新規ルールなら Web ACL から一時的に削除する。IP set や Regex pattern set 自体は他ルールから参照される可能性があるため、すぐ削除しない。
3. 記録しておいた元のJSON、条件、優先順位へ戻す。
4. 保存後、AllowedRequests / BlockedRequests とアプリケーション状態を確認する。
5. 原因と変更内容を作業記録へ残す。

# 9. 参考資料

- [AWS WAF の標準コンソールでの開始手順](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/setup-existing-console.html)
- [Web ACL の作成とルール追加](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/web-acl-creating.html)
- [IP set の作成と管理](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-ip-set-managing.html)
- [リクエストコンポーネント](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-rule-statement-fields-list.html)
- [SQL インジェクション一致ルール](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-rule-statement-type-sqli-match.html)
- [正規表現パターンセット一致ルール](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-rule-statement-type-regex-pattern-set-match.html)
- [サイズ制約ルール](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-rule-statement-type-size-constraint-match.html)
- [オーバーサイズのリクエストコンポーネント](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-oversize-request-components.html)
- [地理的一致ルール](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-rule-statement-type-geo-match.html)
- [レートベースルール](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/waf-rule-statement-type-rate-based.html)
- [ルールグループのアクション上書き](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/web-acl-rule-group-override-options.html)
- [AWS WAF 保護のテスト準備](https://docs.aws.amazon.com/ja_jp/waf/latest/developerguide/web-acl-testing-prep.html)

---

最終確認日: 2026-10-24

