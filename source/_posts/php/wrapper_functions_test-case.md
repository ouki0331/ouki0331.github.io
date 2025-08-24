---
title: ラッパー関数テストケース
date: 2025-08-24 14:54:02
tags:"php"
--
# ラッパー関数の使用方法
ラッパー関数のクラスは既に`V2`環境に導入しました。今の`V２`環境に稼働している全てシステムは何も導入せずにそのまま使えます。
## ロカール事前準備:
 - `zentaku-env-v2`をプールして、
 - `docker-compose.yml`の`zentaku-php-v2p`の`volumes`に`- ./php/conf/ZentakuV2Functions.php:/usr/share/php/ZentakuV2Functions.php`と追加します
 - `docker compose down` と`docker compose up -d`　実行します。
```bash
cd C:/workspace/zentaku2/zentaku-env-v2
git pull
docker compose down
docker compose up -d
```
## 実装した関数の切り替え,例
`strlen(` -> `\App\Library\ZentakuV2Functions::strlen_v2(`
`substr(` -> `\App\Library\ZentakuV2Functions::substr_v2(`
`strpos(` -> `\App\Library\ZentakuV2Functions::strpos_v2(`
`str_replace(` -> `\App\Library\ZentakuV2Functions::str_replace_v2(`
`implode(` -> `\App\Library\ZentakuV2Functions::implode_v2(`

`array_merge(` -> `\App\Library\ZentakuV2Functions::array_merge_v2(`
`array_keys(` -> `\App\Library\ZentakuV2Functions::array_keys_v2(`
`array_values(` -> `\App\Library\ZentakuV2Functions::array_values_v2(`
`in_array(` -> `\App\Library\ZentakuV2Functions::in_array_v2(`
`array_key_exists(` -> `\App\Library\ZentakuV2Functions::array_key_exists_v2(`

`json_decode(` -> `\App\Library\ZentakuV2Functions::json_decode_v2(`

`mb_substr(` -> `\App\Library\ZentakuV2Functions::mb_substr_v2(`
`mb_strpos(` -> `\App\Library\ZentakuV2Functions::mb_strpos_v2(`
`explode(` -> `\App\Library\ZentakuV2Functions::explode_v2(`


## 注意
-  <font style="color:red">count()関数は汎用過ぎるので,grepでそのまま切り替えは危険です。例えば、postgresqlとphalconの固有関数にcountがあり、直接切り替えるとsqlが正しく動けない可能性があります。その故、一つ一つチェックしてください。</font>
- 実装していない挙動が変わった標準関数はあるはず、追加したい場合は`/workspace/zentaku2/zentaku-env-v2/php/conf/ZentakuV2Functions.php`に追加してください。実装したら、みんなにお知らせください。
## 事前調査
- ラッパー関数のクラスのロードタイミング:
以下のコードをindex.phpに書いて、実行とします。
    ```
    <?php
    declare(strict_types=1);
    var_dump(\App\Library\ZentakuV2Functions::strlen_v2("99"));exit;
    use Phalcon\Di\FactoryDefault;

    ```
    画面は`int(2)`が出力されました。つまり、`index.php`実行する最初に`\App\Library\ZentakuV2Functions`がロードされたことを示しています。
- vscodeに赤い波線が表示しない設定
`\.vscode\setting.json`に以下のコードを追加します。(自分のパスに切り替えてください)
    ```
        "intelephense.environment.includePaths": [
        "/home/ouki/workspace/zentaku2/zentaku-env-v2/php/conf"
    ],
    ```

## 標準関数とラッパー関数の出力比較、例
>以下のコードをコーヒーして[PHPSandBox](https://onlinephp.io/) で確認ができます
###  strlen vs strlen_v2
| PHP7.3.33 コード | PHP8.4.8 コード | PHP7.3.33 結果 | PHP8.4.8 結果 |
| --- | --- | --- | --- |
| var_dump(strlen(null)); | var_dump(strlen_v2(null)); | int(0) | int(0) |
| var_dump(strlen("")); | var_dump(strlen_v2("")); | int(0) | int(0) |
| var_dump(strlen("hello")); | var_dump(strlen_v2("hello")); | int(5) | int(5) |
| var_dump(strlen(123)); | var_dump(strlen_v2(123)); | int(3) | int(3) |
| var_dump(strlen(3.14)); | var_dump(strlen_v2(3.14)); | int(4) | int(4) |
| var_dump(strlen(true)); | var_dump(strlen_v2(true)); | int(1) | int(1) |
| var_dump(strlen(false)); | var_dump(strlen_v2(false)); | int(0) | int(0) |
| var_dump(strlen([])); | var_dump(strlen_v2([])); | Warning: strlen() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 10<br>NULL | NULL |
| var_dump(strlen([1, 2, 3])); | var_dump(strlen_v2([1, 2, 3])); | Warning: strlen() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 11<br>NULL | NULL |
| var_dump(strlen(new stdClass())); | var_dump(strlen_v2(new stdClass())); | Warning: strlen() expects parameter 1 to be string, object given in /home/user/scripts/code.php on line 12<br>NULL | NULL |
| var_dump(strlen(0)); | var_dump(strlen_v2(0)); | int(1) | int(1) |
| var_dump(strlen(-456)); | var_dump(strlen_v2(-456)); | int(4) | int(4) |


###  substr vs substr_v2
| PHP7.3.33 コード | PHP8.4.8 コード | PHP7.3.33 結果 | PHP8.4.8 結果 |
| --- | --- | --- | --- |
| var_dump(substr(null, 0)); | var_dump(substr_v2(null, 0)); | string(0) "" |  string(0) "" |
| var_dump(substr(null, 1)); | var_dump(substr_v2(null, 1)); | bool(false) | string(0) "" |
| var_dump(substr(null, -1)); | var_dump(substr_v2(null, -1)); | string(0) "" | string(0) "" |
| var_dump(substr("", 0)); | var_dump(substr_v2("", 0)); | string(0) "" | string(0) "" |
| var_dump(substr("", 1)); | var_dump(substr_v2("", 1)); | bool(false) | string(0) "" |
| var_dump(substr("", -1)); | var_dump(substr_v2("", -1)); | string(0) "" | string(0) "" |
| var_dump(substr("hello", 0)); | var_dump(substr_v2("hello", 0)); | string(5) "hello" | string(5) "hello" |
| var_dump(substr("hello", 1)); | var_dump(substr_v2("hello", 1)); | string(4) "ello" | string(4) "ello" |
| var_dump(substr("hello", -1)); | var_dump(substr_v2("hello", -1)); | string(1) "o" | string(1) "o" |
| var_dump(substr("hello", 0, 3)); | var_dump(substr_v2("hello", 0, 3)); | string(3) "hel" | string(3) "hel" |
| var_dump(substr("hello", 1, 3)); | var_dump(substr_v2("hello", 1, 3)); | string(3) "ell" | string(3) "ell" |
| var_dump(substr("hello", -2, 1)); | var_dump(substr_v2("hello", -2, 1)); | string(1) "l" | string(1) "l" |
| var_dump(substr(123, 0)); | var_dump(substr_v2(123, 0)); | string(3) "123" | string(3) "123" |
| var_dump(substr(123, 1)); | var_dump(substr_v2(123, 1)); | string(2) "23" | string(2) "23" |
| var_dump(substr(123, -1)); | var_dump(substr_v2(123, -1)); | string(1) "3" | string(1) "3" |
| var_dump(substr(3.14, 0)); | var_dump(substr_v2(3.14, 0)); | string(4) "3.14" | string(4) "3.14" |
| var_dump(substr(3.14, 1)); | var_dump(substr_v2(3.14, 1)); | string(3) ".14" | string(3) ".14" |
| var_dump(substr(3.14, -1)); | var_dump(substr_v2(3.14, -1)); | string(1) "4" | string(1) "4" |
| var_dump(substr(true, 0)); | var_dump(substr_v2(true, 0)); | string(1) "1" | string(1) "1" |
| var_dump(substr(true, 1)); | var_dump(substr_v2(true, 1)); | string(0) "" | string(0) "" |
| var_dump(substr(false, 0)); | var_dump(substr_v2(false, 0)); | string(0) "" | string(0) "" |
| var_dump(substr(false, 1)); | var_dump(substr_v2(false, 1)); | bool(false) | string(0) "" |
| var_dump(substr([], 0)); | var_dump(substr_v2([], 0)); | Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 25<br>NULL | NULL |
| var_dump(substr([], 1)); | var_dump(substr_v2([], 1)); | Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 26<br>NULL | NULL |
| var_dump(substr([1, 2, 3], 0)); | var_dump(substr_v2([1, 2, 3], 0)); | Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 27<br>NULL | NULL |
| var_dump(substr([1, 2, 3], 1)); | var_dump(substr_v2([1, 2, 3], 1)); | Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 28<br>NULL | NULL |
| var_dump(substr(new stdClass(), 0)); | var_dump(substr_v2(new stdClass(), 0)); | Warning: substr() expects parameter 1 to be string, object given in /home/user/scripts/code.php on line 29<br>NULL | NULL |
| var_dump(substr(new stdClass(), 1)); | var_dump(substr_v2(new stdClass(), 1)); | Warning: substr() expects parameter 1 to be string, object given in /home/user/scripts/code.php on line 30<br>NULL | NULL |
| var_dump(substr(0, 0)); | var_dump(substr_v2(0, 0)); | string(1) "0" | string(1) "0" |
| var_dump(substr(0, 1)); | var_dump(substr_v2(0, 1)); | string(0) "" | string(0) "" |
| var_dump(substr(-456, 0)); | var_dump(substr_v2(-456, 0)); | string(4) "-456" | string(4) "-456" |
| var_dump(substr(-456, 1)); | var_dump(substr_v2(-456, 1)); | string(3) "456" | string(3) "456" |
| var_dump(substr(-456, -1)); | var_dump(substr_v2(-456, -1)); | string(1) "6" | string(1) "6" |


### strpos vs strpos_v2
| PHP7.3.33 コード | PHP8.4.8 コード | PHP7.3.33 結果 | PHP8.4.8 結果 |
| --- | --- | --- | --- |
| var_dump(strpos("hello world", "world")); | var_dump(strpos_v2("hello world", "world")); | int(6) | int(6) |
| var_dump(strpos("hello world", "hello")); | var_dump(strpos_v2("hello world", "hello")); | int(0) | int(0) |
| var_dump(strpos("hello world", "o")); | var_dump(strpos_v2("hello world", "o")); | int(4) | int(4) |
| var_dump(strpos("hello world", "xyz")); | var_dump(strpos_v2("hello world", "xyz")); | bool(false) | bool(false) |
| var_dump(strpos("hello world", "")); | var_dump(strpos_v2("hello world", "")); | Warning: strpos(): Empty needle in /home/user/scripts/code.php on line 9<br>bool(false) | int(0) |
| var_dump(strpos("", "hello")); | var_dump(strpos_v2("", "hello")); | bool(false) | bool(false) |
| var_dump(strpos("", "")); | var_dump(strpos_v2("", "")); | Warning: strpos(): Empty needle in /home/user/scripts/code.php on line 11<br>bool(false) | int(0) |
| var_dump(strpos("hello world", "o", 5)); | var_dump(strpos_v2("hello world", "o", 5)); | int(7) | int(7) |
| var_dump(strpos(null, "test")); | var_dump(strpos_v2(null, "test")); | bool(false) | bool(false) |
| var_dump(strpos("test", null)); | var_dump(strpos_v2("test", null)); | Deprecated: strpos(): Non-string needles will be interpreted as strings in the future. Use an explicit chr() call to preserve the current behavior in /home/user/scripts/code.php on line 14<br>bool(false) | Deprecated: strpos(): Passing null to parameter #2 ($needle) of type string is deprecated in /home/user/scripts/code.php on line 11<br>int(0) |
| var_dump(strpos(12345, "3")); | var_dump(strpos_v2(12345, "3")); | int(2) | int(2) |
| var_dump(strpos(3.14, ".")); | var_dump(strpos_v2(3.14, ".")); | int(1) | int(1) |
| var_dump(strpos(true, "1")); | var_dump(strpos_v2(true, "1")); | int(0) | int(0) |
| var_dump(strpos(false, "")); | var_dump(strpos_v2(false, "")); | Warning: strpos(): Empty needle in /home/user/scripts/code.php on line 18<br>bool(false) | int(0) |
| var_dump(strpos([], "test")); | var_dump(strpos_v2([], "test")); | Warning: strpos() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 19<br>NULL | NULL |
| var_dump(strpos(new stdClass(), "test")); | var_dump(strpos_v2(new stdClass(), "test")); | Warning: strpos() expects parameter 1 to be string, object given in /home/user/scripts/code.php on line 20<br>NULL | NULL |
| var_dump(strpos(0, "0")); | var_dump(strpos_v2(0, "0")); | int(0) | int(0) |
| var_dump(strpos(-456, "-")); | var_dump(strpos_v2(-456, "-")); | int(0) | int(0) |












```php
php 7.3.33
var_dump(strlen(null));
var_dump(strlen(""));
var_dump(strlen("hello"));
var_dump(strlen(123));
var_dump(strlen(3.14));
var_dump(strlen(true));
var_dump(strlen(false));
var_dump(strlen([]));
var_dump(strlen([1, 2, 3]));
var_dump(strlen(new stdClass()));
var_dump(strlen(0));
var_dump(strlen(-456));
/* 出力
int(0)
int(0)
int(5)
int(3)
int(4)
int(1)
int(0)

Warning: strlen() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 10
NULL

Warning: strlen() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 11
NULL

Warning: strlen() expects parameter 1 to be string, object given in /home/user/scripts/code.php on line 12
NULL
int(1)
int(4)
*/
php 8.4.8

    /**
     * バージョン7.3.33のPHPでも互換性を持つstrlen関数の代替
     * @param mixed $string
     * @return int|null
     */
    function strlen_v2($string="")
    {
        try{
            //php 7.3.33はnullを返す
            if(is_object($string)||is_array($string)){
                return null;
            }
            //php 7.3.33は0を返す
            if(is_null($string)){
                return 0;
            } 
            //他には文字列として処理する、整数か少数はphp 7.3.33とphp8.4.8は全く同じだ。
            return strlen($string);
        }catch(\Throwable $th){
            // self::writeErrorLog($th);
            return null;
        }
    }


var_dump(strlen_v2(null));
var_dump(strlen_v2(""));
var_dump(strlen_v2("hello"));
var_dump(strlen_v2(123));
var_dump(strlen_v2(3.14));
var_dump(strlen_v2(true));
var_dump(strlen_v2(false));
var_dump(strlen_v2([]));
var_dump(strlen_v2([1, 2, 3]));
var_dump(strlen_v2(new stdClass()));
var_dump(strlen_v2(0));
var_dump(strlen_v2(-456));

/*
 * 出力
int(0)
int(0)
int(5)
int(3)
int(4)
int(1)
int(0)
NULL
NULL
NULL
int(1)
int(4)
 * */

```
###  substr vs substr_v2

```php
php 7.3.3
var_dump(substr(null, 0));
var_dump(substr(null, 1));
var_dump(substr(null, -1));
var_dump(substr("", 0));
var_dump(substr("", 1));
var_dump(substr("", -1));
var_dump(substr("hello", 0));
var_dump(substr("hello", 1));
var_dump(substr("hello", -1));
var_dump(substr("hello", 0, 3));
var_dump(substr("hello", 1, 3));
var_dump(substr("hello", -2, 1));
var_dump(substr(123, 0));
var_dump(substr(123, 1));
var_dump(substr(123, -1));
var_dump(substr(3.14, 0));
var_dump(substr(3.14, 1));
var_dump(substr(3.14, -1));
var_dump(substr(true, 0));
var_dump(substr(true, 1));
var_dump(substr(false, 0));
var_dump(substr(false, 1));
var_dump(substr([], 0));
var_dump(substr([], 1));
var_dump(substr([1, 2, 3], 0));
var_dump(substr([1, 2, 3], 1));
var_dump(substr(new stdClass(), 0));
var_dump(substr(new stdClass(), 1));
var_dump(substr(0, 0));
var_dump(substr(0, 1));
var_dump(substr(-456, 0));
var_dump(substr(-456, 1));
var_dump(substr(-456, -1));
/*
 * 出力
 string(0) ""
bool(false)
string(0) ""
string(0) ""
bool(false)
string(0) ""
string(5) "hello"
string(4) "ello"
string(1) "o"
string(3) "hel"
string(3) "ell"
string(1) "l"
string(3) "123"
string(2) "23"
string(1) "3"
string(4) "3.14"
string(3) ".14"
string(1) "4"
string(1) "1"
string(0) ""
string(0) ""
bool(false)

Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 25
NULL

Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 26
NULL

Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 27
NULL

Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 28
NULL

Warning: substr() expects parameter 1 to be string, object given in /home/user/scripts/code.php on line 29
NULL

Warning: substr() expects parameter 1 to be string, object given in /home/user/scripts/code.php on line 30
NULL
string(1) "0"
string(0) ""
string(4) "-456"
string(3) "456"
string(1) "6"
 */


php 8.4.8
var_dump(substr_v2(null, 0));
var_dump(substr_v2(null, 1));
var_dump(substr_v2(null, -1));
var_dump(substr_v2("", 0));
var_dump(substr_v2("", 1));
var_dump(substr_v2("", -1));
var_dump(substr_v2("hello", 0));
var_dump(substr_v2("hello", 1));
var_dump(substr_v2("hello", -1));
var_dump(substr_v2("hello", 0, 3));
var_dump(substr_v2("hello", 1, 3));
var_dump(substr_v2("hello", -2, 1));
var_dump(substr_v2(123, 0));
var_dump(substr_v2(123, 1));
var_dump(substr_v2(123, -1));
var_dump(substr_v2(3.14, 0));
var_dump(substr_v2(3.14, 1));
var_dump(substr_v2(3.14, -1));
var_dump(substr_v2(true, 0));
var_dump(substr_v2(true, 1));
var_dump(substr_v2(false, 0));
var_dump(substr_v2(false, 1));
var_dump(substr_v2([], 0));
var_dump(substr_v2([], 1));
var_dump(substr_v2([1, 2, 3], 0));
var_dump(substr_v2([1, 2, 3], 1));
var_dump(substr_v2(new stdClass(), 0));
var_dump(substr_v2(new stdClass(), 1));
var_dump(substr_v2(0, 0));
var_dump(substr_v2(0, 1));
var_dump(substr_v2(-456, 0));
var_dump(substr_v2(-456, 1));
var_dump(substr_v2(-456, -1));
/*
 string(0) ""
string(0) ""
string(0) ""
string(0) ""
string(0) ""
string(0) ""
string(5) "hello"
string(4) "ello"
string(1) "o"
string(3) "hel"
string(3) "ell"
string(1) "l"
string(3) "123"
string(2) "23"
string(1) "3"
string(4) "3.14"
string(3) ".14"
string(1) "4"
string(1) "1"
string(0) ""
string(0) ""
string(0) ""
NULL
NULL
NULL
NULL
NULL
NULL
string(1) "0"
string(0) ""
string(4) "-456"
string(3) "456"
string(1) "6"
 * /
```

| Line | PHP7.3.33 コード | PHP8.4.8 コード | PHP7.3.33 結果 | PHP8.4.8 結果 |
| --- | --- | --- | --- | --- |
| 1 | echo 'line-1 :'; var_dump(str_replace(null, "x", "hello")); | echo 'line-1 :'; var_dump(str_replace_v2(null, "x", "hello")); | string(5) "line-1 :string(5) "hello" | <<DIFF>> string(5) "hello" |
| 2 | echo 'line-2 :'; var_dump(str_replace("", "x", "hello")); | echo 'line-2 :'; var_dump(str_replace_v2("", "x", "hello")); | string(5) "hello" | string(5) "hello" |
| 3 | echo 'line-3 :'; var_dump(str_replace("l", null, "hello")); | echo 'line-3 :'; var_dump(str_replace_v2("l", null, "hello")); | string(3) "heo" | string(3) "heo" |
| 4 | echo 'line-4 :'; var_dump(str_replace("l", "", "hello")); | echo 'line-4 :'; var_dump(str_replace_v2("l", "", "hello")); | string(3) "heo" | string(3) "heo" |
| 5 | echo 'line-5 :'; var_dump(str_replace("l", "x", null)); | echo 'line-5 :'; var_dump(str_replace_v2("l", "x", null)); | string(0) "" | string(0) "" |
| 6 | echo 'line-6 :'; var_dump(str_replace("l", "x", "")); | echo 'line-6 :'; var_dump(str_replace_v2("l", "x", "")); | string(0) "" | string(0) "" |
| 7 | echo 'line-7 :'; var_dump(str_replace("l", "x", "hello")); | echo 'line-7 :'; var_dump(str_replace_v2("l", "x", "hello")); | string(5) "hexxo" | string(5) "hexxo" |
| 8 | echo 'line-8 :'; var_dump(str_replace("ll", "x", "hello")); | echo 'line-8 :'; var_dump(str_replace_v2("ll", "x", "hello")); | string(4) "hexo" | string(4) "hexo" |
| 9 | echo 'line-9 :'; var_dump(str_replace("o", "x", "hello")); | echo 'line-9 :'; var_dump(str_replace_v2("o", "x", "hello")); | string(5) "hellx" | string(5) "hellx" |
| 10 | echo 'line-10 :'; var_dump(str_replace("hello", "x", "hello")); | echo 'line-10 :'; var_dump(str_replace_v2("hello", "x", "hello")); | string(1) "x" | string(1) "x" |
| 11 | echo 'line-11 :'; var_dump(str_replace("z", "x", "hello")); | echo 'line-11 :'; var_dump(str_replace_v2("z", "x", "hello")); | string(5) "hello" | string(5) "hello" |
| 12 | echo 'line-12 :'; var_dump(str_replace("", "x", "hello")); | echo 'line-12 :'; var_dump(str_replace_v2("", "x", "hello")); | string(5) "hello" | string(5) "hello" |
| 13 | echo 'line-13 :'; var_dump(str_replace("l", "", "hello")); | echo 'line-13 :'; var_dump(str_replace_v2("l", "", "hello")); | string(3) "heo" | string(3) "heo" |
| 14 | echo 'line-14 :'; var_dump(str_replace(["l", "o"], "x", "hello")); | echo 'line-14 :'; var_dump(str_replace_v2(["l", "o"], "x", "hello")); | string(5) "hexxx" | string(5) "hexxx" |
| 15 | echo 'line-15 :'; var_dump(str_replace(["l", "o"], ["x", "y"], "hello")); | echo 'line-15 :'; var_dump(str_replace_v2(["l", "o"], ["x", "y"], "hello")); | string(5) "hexxy" | string(5) "hexxy" |
| 16 | echo 'line-16 :'; var_dump(str_replace(["l", "o"], ["x"], "hello")); | echo 'line-16 :'; var_dump(str_replace_v2(["l", "o"], ["x"], "hello")); | string(4) "hexx" | string(4) "hexx" |
| 17 | echo 'line-17 :'; var_dump(str_replace("l", ["x", "y"], "hello")); | echo 'line-17 :'; var_dump(str_replace_v2("l", ["x", "y"], "hello")); | Notice: Array to string conversion in /home/user/scripts/code.php on line 21<br>string(13) "heArrayArrayo" | <<DIFF>> Fatal error: Uncaught TypeError: str_replace(): Argument #2 ($replace) must be of type string when argument #1 ($search) is a string in /home/user/scripts/code.php:12<br>Stack trace:<br>#0 /home/user/scripts/code.php(12): str_replace('l', Array, 'hello', NULL)<br>#1 /home/user/scripts/code.php(31): str_replace_v2('l', Array, 'hello')<br>#2 {main}<br>  thrown in /home/user/scripts/code.php on line 12 |
| 18 | echo 'line-18 :'; var_dump(str_replace("l", "x", ["hello", "world"])); | echo 'line-18 :'; var_dump(str_replace_v2("l", "x", ["hello", "world"])); | array(2) {<br>  [0]=><br>  string(5) "hexxo"<br>  [1]=><br>  string(5) "worxd"<br>} | array(2) {<br>  [0]=><br>  string(5) "hexxo"<br>  [1]=><br>  string(5) "worxd"<br>} |
| 19 | echo 'line-19 :'; var_dump(str_replace(["l", "o"], "x", ["hello", "world"])); | echo 'line-19 :'; var_dump(str_replace_v2(["l", "o"], "x", ["hello", "world"])); | array(2) {<br>  [0]=><br>  string(5) "hexxx"<br>  [1]=><br>  string(5) "wxrxd"<br>} | array(2) {<br>  [0]=><br>  string(5) "hexxx"<br>  [1]=><br>  string(5) "wxrxd"<br>} |
| 20 | echo 'line-20 :'; var_dump(str_replace(123, "x", "hello123")); | echo 'line-20 :'; var_dump(str_replace_v2(123, "x", "hello123")); | string(6) "hellox" | string(6) "hellox" |
| 21 | echo 'line-21 :'; var_dump(str_replace("2", 9, "hello123")); | echo 'line-21 :'; var_dump(str_replace_v2("2", 9, "hello123")); | string(8) "hello193" | string(8) "hello193" |
| 22 | echo 'line-22 :'; var_dump(str_replace("2", "x", 123)); | echo 'line-22 :'; var_dump(str_replace_v2("2", "x", 123)); | string(3) "1x3" | string(3) "1x3" |
| 23 | echo 'line-23 :'; var_dump(str_replace(3.14, "x", "test3.14")); | echo 'line-23 :'; var_dump(str_replace_v2(3.14, "x", "test3.14")); | string(5) "testx" | string(5) "testx" |
| 24 | echo 'line-24 :'; var_dump(str_replace(".", "x", 3.14)); | echo 'line-24 :'; var_dump(str_replace_v2(".", "x", 3.14)); | string(4) "3x14" | string(4) "3x14" |
| 25 | echo 'line-25 :'; var_dump(str_replace("1", "x", 3.14)); | echo 'line-25 :'; var_dump(str_replace_v2("1", "x", 3.14)); | string(4) "3.x4" | string(4) "3.x4" |
| 26 | echo 'line-26 :'; var_dump(str_replace(true, "x", "true1")); | echo 'line-26 :'; var_dump(str_replace_v2(true, "x", "true1")); | string(5) "truex" | string(5) "truex" |
| 27 | echo 'line-27 :'; var_dump(str_replace("1", "x", true)); | echo 'line-27 :'; var_dump(str_replace_v2("1", "x", true)); | string(1) "x" | string(1) "x" |
| 28 | echo 'line-28 :'; var_dump(str_replace(false, "x", "false")); | echo 'line-28 :'; var_dump(str_replace_v2(false, "x", "false")); | string(5) "false" | string(5) "false" |
| 29 | echo 'line-29 :'; var_dump(str_replace("", "x", false)); | echo 'line-29 :'; var_dump(str_replace_v2("", "x", false)); | string(0) "" | string(0) "" |
| 30 | echo 'line-30 :'; var_dump(str_replace([], "x", "hello")); | echo 'line-30 :'; var_dump(str_replace_v2([], "x", "hello")); | string(5) "hello" | string(5) "hello" |
| 31 | echo 'line-31 :'; var_dump(str_replace("l", "x", [])); | echo 'line-31 :'; var_dump(str_replace_v2("l", "x", [])); | array(0) {<br>} | array(0) {<br>} |
| 32 | echo 'line-32 :'; var_dump(str_replace([1, 2], "x", "hello")); | echo 'line-32 :'; var_dump(str_replace_v2([1, 2], "x", "hello")); | string(5) "hello" | string(5) "hello" |
| 33 | echo 'line-33 :'; var_dump(str_replace("l", "x", [1, 2, 3])); | echo 'line-33 :'; var_dump(str_replace_v2("l", "x", [1, 2, 3])); | array(3) {<br>  [0]=><br>  string(1) "1"<br>  [1]=><br>  string(1) "2"<br>  [2]=><br>  string(1) "3"<br>} | array(3) {<br>  [0]=><br>  string(1) "1"<br>  [1]=><br>  string(1) "2"<br>  [2]=><br>  string(1) "3"<br>} |
| 34 | echo 'line-34 :'; var_dump(str_replace(new stdClass(), "x", "hello")); | echo 'line-34 :'; var_dump(str_replace_v2(new stdClass(), "x", "hello")); | Recoverable fatal error: Object of class stdClass could not be converted to string in /home/user/scripts/code.php on line 38 | <<DIFF>> Fatal error: Uncaught TypeError: str_replace(): Argument #1 ($search) must be of type array\|string, stdClass given in /home/user/scripts/code.php:12<br>Stack trace:<br>#0 /home/user/scripts/code.php(12): str_replace(Object(stdClass), 'x', 'hello', NULL)<br>#1 /home/user/scripts/code.php(48): str_replace_v2(Object(stdClass), 'x', 'hello')<br>#2 {main}<br>  thrown in /home/user/scripts/code.php on line 12 |

