---
title: AlmaLinux 9 WSL から Ubuntu WSL へ Home ディレクトリを安全に移行する手順
date: 2026-11-03 10:00:00
updated: 2026-11-03 10:00:00
categories:
  - Linux
  - WSL
tags:
  - WSL
  - AlmaLinux
  - Ubuntu
  - rsync
  - SSH
description: AlmaLinux 9 WSL のユーザーファイルを、既存ファイルを上書き・削除せず Ubuntu WSL の Home ディレクトリへ直接統合する手順。
---

# はじめに

本書では、AlmaLinux 9 WSL インスタンスの Home ディレクトリにあるユーザーファイルを、Ubuntu WSL インスタンスの対応する Home ディレクトリへ直接統合します。

今回の対象は次のユーザーデータです。

- 個人文書とプロジェクトファイル
- Shell の設定
- Git、SSH などのユーザー単位の設定
- 自作スクリプト
- Home ディレクトリ内のその他のデータ

パッケージ、システムサービス、データベース、システム全体の設定は対象外です。これらは必要性を確認したうえで、後続作業として個別に移行します。

## 1. 移行方針

作業では次の条件を守ります。

1. 移行元の AlmaLinux 9 は、今後4～6か月保管し、すぐには削除しない。
2. 現段階ではディストリビューション全体のバックアップを作成しない。
3. AlmaLinux 側は読み取り専用の移行元として扱い、ファイルを変更・削除しない。
4. 中継用ディレクトリや一時圧縮ファイルを作らず、Ubuntu の Home へ直接書き込む。
5. Ubuntu に同名ファイルが存在する場合は、既存ファイルを上書きしない。
6. Ubuntu にしか存在しないファイルを削除しない。
7. 転送が中断しても再実行でき、未完了部分から再開できるようにする。
8. 削除の意味を持つ同期オプションは使用しない。

> **重要:** `--ignore-existing` と通常の `--partial` だけを組み合わせると、中断時に残った不完全な宛先ファイルが次回実行で「既存ファイル」と判断され、スキップされる可能性があります。本手順では部分データを専用ディレクトリに保持する `--partial-dir=.rsync-partial` を使用します。

## 2. 接続構成

WSL は Mirrored networking mode を使用している前提です。AlmaLinux の独立した NAT IP は取得せず、AlmaLinux 上の一時 SSH サーバーを次のアドレスで公開します。

```text
127.0.0.1:2222
```

Ubuntu はこのアドレスへ接続し、`rsync` で AlmaLinux からファイルを取得します。

## 3. AlmaLinux 9 側の準備

### 3.1 必要なパッケージをインストールする

```bash
sudo dnf install -y rsync openssh-server
sudo ssh-keygen -A
```

### 3.2 一時 SSH サーバーを起動する

```bash
sudo /usr/sbin/sshd \
  -p 2222 \
  -o ListenAddress=127.0.0.1
```

### 3.3 待受状態を確認する

```bash
sudo ss -lntp | grep 2222
```

`127.0.0.1:2222` で `sshd` が LISTEN していることを確認します。

## 4. Ubuntu 側の準備

### 4.1 クライアントツールをインストールする

```bash
sudo apt update
sudo apt install -y rsync openssh-client
```

### 4.2 SSH 接続を確認する

```bash
ssh -p 2222 Almaユーザー名@127.0.0.1
```

初回接続時は、表示されたホスト鍵のフィンガープリントを AlmaLinux 側で確認してから承認します。ログインできたら `exit` で Ubuntu に戻ります。

## 5. 転送前のドライラン

実ファイルを書き込む前に、`--dry-run` と `--itemize-changes` を付けて転送予定を確認します。

```bash
rsync -aHn \
  --itemize-changes \
  --ignore-existing \
  --partial-dir=.rsync-partial \
  --no-owner \
  --no-group \
  --exclude='.cache/' \
  --exclude='node_modules/' \
  --exclude='target/' \
  --exclude='.venv/' \
  -e "ssh -p 2222" \
  Almaユーザー名@127.0.0.1:/home/Almaユーザー名/ \
  /home/Ubuntuユーザー名/
```

`-n` がドライランです。表示内容に問題がなければ、次の正式移行へ進みます。

## 6. 正式な移行

Ubuntu で次のコマンドを実行します。

```bash
rsync -aH \
  --ignore-existing \
  --partial-dir=.rsync-partial \
  --info=progress2 \
  --no-owner \
  --no-group \
  --exclude='.cache/' \
  --exclude='node_modules/' \
  --exclude='target/' \
  --exclude='.venv/' \
  -e "ssh -p 2222" \
  Almaユーザー名@127.0.0.1:/home/Almaユーザー名/ \
  /home/Ubuntuユーザー名/
```

両方のユーザー名が `ouki` の場合は、次のようになります。

```bash
rsync -aH \
  --ignore-existing \
  --partial-dir=.rsync-partial \
  --info=progress2 \
  --no-owner \
  --no-group \
  --exclude='.cache/' \
  --exclude='node_modules/' \
  --exclude='target/' \
  --exclude='.venv/' \
  -e "ssh -p 2222" \
  ouki@127.0.0.1:/home/ouki/ \
  /home/ouki/
```

移行元パスの末尾にある `/` は、Home ディレクトリそのものではなく、その中身をコピーする指定です。これにより Ubuntu 側へ余分な `ouki` ディレクトリを作りません。

## 7. 各オプションの役割

| オプション | 役割 |
| --- | --- |
| `-a` | ディレクトリを再帰的に転送し、可能な範囲で属性を維持する |
| `-H` | ハードリンク関係を維持する |
| `--ignore-existing` | Ubuntu に同名の宛先ファイルがある場合は更新しない |
| `--partial-dir=.rsync-partial` | 中断した転送データを専用ディレクトリに保持し、再開に利用する |
| `--info=progress2` | 転送全体の進捗を表示する |
| `--no-owner` | AlmaLinux 側の所有者情報を適用しない |
| `--no-group` | AlmaLinux 側のグループ情報を適用しない |
| `-e "ssh -p 2222"` | ポート2222の SSH 経由で転送する |

実行後の動作は次のとおりです。

- AlmaLinux のファイルは削除・変更されない。
- Ubuntu に存在しないファイルはコピーされる。
- Ubuntu に同名ファイルがある場合はスキップされる。
- Ubuntu にしか存在しないファイルは維持される。
- 中断後は同じコマンドを再実行できる。
- 完了済みファイルは再転送されず、部分転送は専用ディレクトリから再利用される。
- 中継ディレクトリや一時圧縮ファイルは不要。

> **注意:** 「同名ファイル」はパスが同じファイルを意味します。Ubuntu 側のファイルが古い、空、または内容が異なっていても、`--ignore-existing` により上書きされません。競合ファイルは移行後に個別比較してください。

## 8. 使用禁止オプション

この移行では、次のオプションを使用してはいけません。

```text
--delete
--delete-before
--delete-after
--delete-during
--delete-delay
--remove-source-files
```

- `--delete*` は、AlmaLinux に存在しない Ubuntu 側のファイルを削除する可能性があります。
- `--remove-source-files` は、転送に成功した AlmaLinux 側のファイルを削除します。

コマンドを再実行するときも、これらのオプションを追加しないでください。

## 9. 移行後の確認

転送完了後、まず同じコマンドへ `--dry-run --itemize-changes` を追加して再確認します。そのうえで、次の項目を確認します。

- 必要な文書とプロジェクトが Ubuntu に存在するか
- `.bashrc`、`.zshrc` などの Shell 設定が意図どおりか
- `.gitconfig` のユーザー情報や設定が正しいか
- `.ssh` の権限が適切か。必要に応じて `chmod 700 ~/.ssh` と秘密鍵の `chmod 600` を確認する
- 秘密情報や認証情報を、現在も Ubuntu で利用してよいか
- 除外した依存ディレクトリを Ubuntu 側で再生成できるか

移行後も AlmaLinux 9 は4～6か月保管し、次の用途に使用します。

- ファイルの移行漏れを確認する
- 旧環境の設定と比較する
- パッケージやサービスを追加移行する
- Ubuntu 環境の安定性を検証する
- 必要に応じて同じコマンドで追加同期する

Ubuntu が必要なファイル、ツール、サービスを完全に引き継いだと確認するまでは、AlmaLinux WSL インスタンスを登録解除・削除しません。

## 10. 作業終了

移行作業を終えたら、AlmaLinux で起動した一時 SSH サーバーを停止します。

```bash
sudo pkill -f '/usr/sbin/sshd.*2222'
```

実行前に `sudo ss -lntp | grep 2222` で対象プロセスを確認してください。AlmaLinux 自体は、検証期間が終わるまで残します。
