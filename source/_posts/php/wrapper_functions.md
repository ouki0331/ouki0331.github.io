---
title: ラッパー関数
date: 2025-08-23 21:39:31
tags:
--


```php
/**
     * バージョン7.3.33のPHPでも互換性を持つstrlen関数の代替
     * @param mixed $string
     * @return int|null
     */
    public static function strlen_v2($string=""):int|null
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
            self::writeErrorLog($th);
            return null;
        }
    }

    /**
     *  バージョン7.3.33のPHPでも互換性を持つsubstr関数の代替
     * 二番目と三番目パラメータは整数以外のタイプで渡す場合は確認できなかった、もしあれば、調整必要があるでしょう
     * @param mixed $string
     * @param int $offset
     * @param mixed $length
     * @return string|null
     */
    public static function substr_v2($string, int $offset, ?int $length = null): string|null
    {
        try{
            //PHP 7.3.33　と同じ
            if(is_array($string)||is_object($string)){
                return null;
            }
            if(is_null($string)){
                return "";
            }
            return substr($string,$offset,$length);
        }catch(\Throwable $th){
            self::writeErrorLog($th);
            return null;
        }
    }


    /**
     * バージョン7.3.33 のPHPでも互換性を持つstrpos関数の代替
     * @param mixed $haystack
     * @param mixed $needle
     * @param int $offset
     * @return bool|int|null
     */
    public static function strpos_v2($haystack,$needle, int $offset = 0):int|bool|null{
        try{
            if(is_null($haystack)){
                return false;
            }
            if(is_array($haystack)||is_object($haystack)){
                return null;
            }
            return strpos($haystack,$needle,$offset);
        }catch(\Throwable $th){
            self::writeErrorLog($th);
            return false;
        }
    }

    /**
     * バージョン7.3.33 のPHPでも互換性を持つstr_replace関数の代替
     * @param mixed $search
     * @param mixed $replace
     * @param mixed $subject
     * @param int $count
     * @return array|string
     */
    public static function str_replace_v2(
        $search,
        $replace,
        $subject,
        ?int &$count = null
    ): string|array{
        $search=$search??"";
        $replace=$replace??"";
        $subject=$subject??"";
        return str_replace($search,$replace,$subject,$count);
    }

    /**
     * バージョン7.3.33 のPHPでも互換性を持つimplode関数の代替
     */
    public static function implode_v2($separator_or_array, $array = null): ?string
    {
        try {
            if ($array === null) {
                return is_array($separator_or_array) ? implode('', $separator_or_array) : null;
            }
            if (is_array($separator_or_array) && !is_array($array)) {
                [$separator_or_array, $array] = [$array, $separator_or_array];
            }
            if (!is_array($array)) return null;
            $separator = $separator_or_array ?? '';
            if (is_array($separator) || is_object($separator)) return null;
            return implode((string)$separator, $array);
        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return null;
        }
    }

    /**
     * PHP 7.1の挙動をエミュレートするcount関数の代替（非推奨）
     * // --- 挙動の確認 ---
     * // echo count_v2(['a', 'b']); // 2
     * // echo count_v2([]);         // 0
     * // echo count_v2(null);       // 0 (正しく0になる)
     * // echo count_v2("string");   // 1 (古い挙動)
     * // echo count_v2(123);        // 1 (古い挙動)
     * @param mixed $value
     * @return int|null
     */
    public static  function count_v2($value)
    {
        try {
            // 1. is_countableならcount()
            if (is_countable($value)) {
                return count($value);
            }
            // 2. nullなら0を返す（最重要）
            if (is_null($value)) {
                return 0;
            }
            // 3. それ以外の数えられない型（スカラー値など）は1を返す
            return 1;

        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return 0;
        }
    }


    /**
     * バージョン7.3.33のPHPでも互換性を持つarray_merge関数の代替
     * PHP 7.3.33の挙動に合わせ、引数に配列以外の値（nullを含む）が含まれていた場合にnullを返します。
     * @param mixed ...$arrays マージする配列。
     * @return array|null マージされた配列、またはエラー時にnull。
     */
    public static  function array_merge_v2(...$arrays): ?array
    {
        try {
            // PHP 7.3では、引数なしで呼び出すとWarningを出してNULLを返す。PHP 8では空配列を返す。
            // 7.3の挙動に合わせるため、引数がなければnullを返す。
            if (empty($arrays)) {
                return null;
            }

            // 全ての引数をチェックし、一つでも配列でなければnullを返す。
            // これにより、PHP 7.3の「Warningを出してNULLを返す」挙動をエミュレートし、
            // PHP 8以降で発生するTypeErrorを未然に防ぐ。
            foreach ($arrays as $array) {
                if (!is_array($array)) {
                    return null;
                }
            }
            // 全ての引数が配列であることが確認できたので、安全にネイティブ関数を呼び出す。
            return array_merge(...$arrays);

        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return null;
        }
    }

    /**
     * バージョン7.3.33のPHPでも互換性を持つarray_keys関数の代替
     * @param mixed $array
     * @param mixed $search_value
     * @param bool $strict
     * @return array|null
     */
    public static  function array_keys_v2($array, $search_value = null, bool $strict = false): ?array
    {
        try {
            // PHP 7.3.33: nullや非配列はWarning → PHP 8+: TypeError
            if (is_null($array) || !is_array($array)) {
                return null;
            }
            // 第二引数がnullでない場合は検索値として使用
            if (func_num_args() > 1) {
                return array_keys($array, $search_value, $strict);
            }
            return array_keys($array);
        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return null;
        }
    }

    /**
     * バージョン7.3.33のPHPでも互換性を持つarray_values関数の代替
     * @param mixed $array
     * @return array|null
     */
    public static function array_values_v2($array): ?array
    {
        try {
            // PHP 7.3.33: nullや非配列はWarning → PHP 8+: TypeError
            if (is_null($array) || !is_array($array)) {
                return null;
            }
            return array_values($array);
        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return null;
        }
    }

    /**
     * バージョン7.3.33のPHPでも互換性を持つin_array関数の代替
     * @param mixed $needle
     * @param mixed $haystack
     * @param bool $strict
     * @return bool|null
     */
    public static function in_array_v2($needle, $haystack, bool $strict = false): ?bool
    {
        try {
            // PHP 7.3.33: nullや非配列はWarning → PHP 8+: TypeError
            if (is_null($haystack) || !is_array($haystack)) {
                return null;
            }
            return in_array($needle, $haystack, $strict);
        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return null;
        }
    }

    /**
     * バージョン7.3.33のPHPでも互換性を持つarray_key_exists関数の代替
     * @param mixed $key
     * @param mixed $array
     * @return bool|null
     */
    public static function array_key_exists_v2($key, $array): ?bool
    {
        try {
            // PHP 7.3.33: nullや非配列はWarning → PHP 8+: TypeError
            if (!is_array($array) && !is_object($array)) {
                return null;
            }

            // キーが配列やオブジェクトの場合
            if (is_array($key) || is_object($key)) {
                return false;
            }
            return array_key_exists($key, $array);
        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return null;
        }
    }


    /**
     * バージョン7.3.33のPHPでも互換性を持つjson_decode関数の代替
     * PHP 8+で非文字列を渡した際に発生するTypeErrorを抑制し、PHP 7.3の挙動をエミュレートします。
     * @param mixed $json デコード対象のJSON文字列。
     * @param bool|null $assoc trueの場合、返されるオブジェクトは連想配列に変換されます。
     * @param int $depth 再帰の深さ。
     * @param int $flags JSONデコード時のオプションを指定するビットマスク。
     * @return mixed デコードされた値を返します。エラー時や互換性のない型の場合はnullを返すことがあります。
     */
    public static function json_decode_v2($json, ?bool $assoc = null, int $depth = 512, int $flags = 0)
    {
        try {
            // PHP 8+ではTypeErrorが発生する非文字列型を、PHP 7.3の挙動に基づき事前処理する
            if (!is_string($json)) {
                if(is_bool($json)){
                    return json_decode($json, $assoc, $depth, $flags);
                }
                // PHP 7.3では、数値や真偽値はそのまま返される
                if (is_int($json) || is_float($json)) {
                    return $json;
                }
                // PHP 7.3では、null、配列、オブジェクトは警告を出しつつnullを返す
                if (is_null($json) || is_array($json) || is_object($json)) {
                    return null;
                }
            }
            // 入力が文字列の場合、または上記以外の型の場合は、ネイティブ関数を呼び出す
            // PHP 7.3では第二引数 $assoc にnullを渡すとfalseとして扱われるため、シグネチャの互換性は保たれる
            return json_decode($json, $assoc, $depth, $flags);
        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return null; // 例外発生時はnullを返す
        }
    }

        /**
     * バージョン7.3.33のPHPでも互換性を持つ mb_strlen 関数の代替
     * @param mixed $string
     * @param string|null $encoding
     * @return int|null
     */
    public static function mb_strlen_v2($string = "", ?string $encoding = null): ?int
    {
        try {
            if (is_object($string) || is_array($string)) {
                return null; // PHP 7.3.33 の動作を模倣
            }
            if (is_null($string)) {
                return 0; // PHP 7.3.33 の動作を模倣
            }
            $encoding = $encoding ?? mb_internal_encoding();
            return mb_strlen($string, $encoding);
        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return null;
        }
    }

    /**
     * バージョン7.3.33のPHPでも互換性を持つ mb_substr 関数の代替
     * @param mixed $string
     * @param int $offset
     * @param int|null $length
     * @param string|null $encoding
     * @return string|null
     */
    public static function mb_substr_v2($string, int $offset, ?int $length = null, ?string $encoding = null): ?string
    {
        try {
            if (is_array($string) || is_object($string)) {
                return null; // PHP 7.3.33 と同じ
            }
            if(is_null($string)){
                return "";
            }
            $encoding = $encoding ?? mb_internal_encoding();
            // boolやnullは文字列にキャストして処理する
            return mb_substr($string, $offset, $length, $encoding);
        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return null;
        }
    }

    /**
     * バージョン7.3.33 のPHPでも互換性を持つ mb_strpos 関数の代替
     * @param mixed $haystack
     * @param mixed $needle
     * @param int $offset
     * @param string|null $encoding
     * @return bool|int|null
     */
    public static function mb_strpos_v2($haystack, $needle, int $offset = 0, ?string $encoding = null): int|bool|null
    {
        try {
            if (is_array($haystack) || is_object($haystack)) {
                return null;
            }
            if (is_null($haystack)) {
                return false;
            }
            $encoding = $encoding ?? mb_internal_encoding();
            return mb_strpos($haystack, $needle, $offset, $encoding);
        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return false;
        }
    }


        /**
     * バージョン7.3.33のPHPでも互換性を持つ explode 関数の代替
     * PHP 8+で発生するTypeErrorやValueErrorを抑制し、PHP 7.3の挙動（Warningを出してnullやfalseを返す）をエミュレートします。
     * @param mixed $separator 区切り文字。空文字列や配列などの互換性のない型を渡した場合、エラーを抑制してnullを返します。
     * @param mixed $string 分割する文字列。null、配列、オブジェクトなどの互換性のない型を渡した場合、エラーを抑制してnullを返します。
     * @param int $limit 分割の最大数を指定します。デフォルトはPHP_INT_MAX。
     * @return array|null 分割された文字列の配列。エラー時や互換性のない型の場合はnullを返します。
     */
    public static function explode_v2(mixed $separator, mixed $string, int $limit = PHP_INT_MAX): ?array
    {
        try {
            // PHP 8+ではTypeErrorやValueErrorが発生するケースを事前チェック

            // 1. 区切り文字($separator)のチェック
            // PHP 7.3では空文字列でWarning + false。PHP 8+ではValueError。
            // また、配列やオブジェクトはPHP 8+でTypeErrorの原因となる。
            if (is_array($separator) || is_object($separator)) {
                return null;
            }
            // bool, null, 数値などを安全に文字列化する
            $separator_str = (string)$separator;
            if ($separator_str === '') {
                // v2の設計思想に沿ってnullを返す
                return null;
            }

            // 2. 分割対象文字列($string)のチェック
            // PHP 7.3ではnull, 配列, オブジェクトでWarning + nullを返す。PHP 8+ではTypeError。
            if (is_null($string) || is_array($string) || is_object($string)) {
                return null;
            }

            // ネイティブ関数を呼び出す。boolや数値は(string)でキャストされる。
            return explode($separator_str, (string)$string, $limit);

        } catch (\Throwable $th) {
            self::writeErrorLog($th);
            return null; // 例外発生時はnullを返す
        }
    }
```
