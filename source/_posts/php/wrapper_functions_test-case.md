---
title: ラッパー関数テストケース
date: 2025-08-24 14:54:02
tags:
---


strlen 	strlen_v2	出力		Assert(C==D)
		php 7.3.33(strlen )	php 8.4.8(strlen_v2)	
var_dump(strlen(null));	var_dump(strlen_v2(null));	int(0)	int(0)	true
var_dump(strlen(""));	var_dump(strlen_v2(""));	int(0)	int(0)	true
var_dump(strlen("hello"));	var_dump(strlen_v2("hello"));	int(5)	int(5)	true
var_dump(strlen(123));	var_dump(strlen_v2(123));	int(3)	int(3)	true
var_dump(strlen(3.14));	var_dump(strlen_v2(3.14));	int(4)	int(4)	true
var_dump(strlen(true));	var_dump(strlen_v2(true));	int(1)	int(1)	true
var_dump(strlen(false));	var_dump(strlen_v2(false));	int(0)	int(0)	true
var_dump(strlen([]));	var_dump(strlen_v2([]));	"Warning: strlen() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 10
NULL"	NULL	false
var_dump(strlen([1, 2, 3]));	var_dump(strlen_v2([1, 2, 3]));	"Warning: strlen() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 11
NULL"	NULL	false
var_dump(strlen(new stdClass()));	var_dump(strlen_v2(new stdClass()));	"Warning: strlen() expects parameter 1 to be string, object given in /home/user/scripts/code.php on line 12
NULL"	NULL	false
var_dump(strlen(0));	var_dump(strlen_v2(0));	int(1)	int(1)	true
var_dump(strlen(-456));	var_dump(strlen_v2(-456));	int(4)	int(4)	true
				
				
substr 	substr_v2	出力		Assert(C==D)
		php 7.3.33(substr )	php 8.4.8(substr_v2)	
var_dump(substr(null, 0));	var_dump(substr_v2(null, 0));	string(0) ""	string(0) ""	true
var_dump(substr(null, 1));	var_dump(substr_v2(null, 1));	bool(false)	string(0) ""	false
var_dump(substr(null, -1));	var_dump(substr_v2(null, -1));	string(0) ""	string(0) ""	true
var_dump(substr("", 0));	var_dump(substr_v2("", 0));	string(0) ""	string(0) ""	true
var_dump(substr("", 1));	var_dump(substr_v2("", 1));	bool(false)	string(0) ""	false
var_dump(substr("", -1));	var_dump(substr_v2("", -1));	string(0) ""	string(0) ""	true
var_dump(substr("hello", 0));	var_dump(substr_v2("hello", 0));	string(5) "hello"	string(5) "hello"	true
var_dump(substr("hello", 1));	var_dump(substr_v2("hello", 1));	string(4) "ello"	string(4) "ello"	true
var_dump(substr("hello", -1));	var_dump(substr_v2("hello", -1));	string(1) "o"	string(1) "o"	true
var_dump(substr("hello", 0, 3));	var_dump(substr_v2("hello", 0, 3));	string(3) "hel"	string(3) "hel"	true
var_dump(substr("hello", 1, 3));	var_dump(substr_v2("hello", 1, 3));	string(3) "ell"	string(3) "ell"	true
var_dump(substr("hello", -2, 1));	var_dump(substr_v2("hello", -2, 1));	string(1) "l"	string(1) "l"	true
var_dump(substr(123, 0));	var_dump(substr_v2(123, 0));	string(3) "123"	string(3) "123"	true
var_dump(substr(123, 1));	var_dump(substr_v2(123, 1));	string(2) "23"	string(2) "23"	true
var_dump(substr(123, -1));	var_dump(substr_v2(123, -1));	string(1) "3"	string(1) "3"	true
var_dump(substr(3.14, 0));	var_dump(substr_v2(3.14, 0));	string(4) "3.14"	string(4) "3.14"	true
var_dump(substr(3.14, 1));	var_dump(substr_v2(3.14, 1));	string(3) ".14"	string(3) ".14"	true
var_dump(substr(3.14, -1));	var_dump(substr_v2(3.14, -1));	string(1) "4"	string(1) "4"	true
var_dump(substr(true, 0));	var_dump(substr_v2(true, 0));	string(1) "1"	string(1) "1"	true
var_dump(substr(true, 1));	var_dump(substr_v2(true, 1));	string(0) ""	string(0) ""	true
var_dump(substr(false, 0));	var_dump(substr_v2(false, 0));	string(0) ""	string(0) ""	true
var_dump(substr(false, 1));	var_dump(substr_v2(false, 1));	bool(false)	string(0) ""	false
var_dump(substr([], 0));	var_dump(substr_v2([], 0));	"Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 25
NULL"	NULL	false
var_dump(substr([], 1));	var_dump(substr_v2([], 1));	"Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 26
NULL"	NULL	false
var_dump(substr([1, 2, 3], 0));	var_dump(substr_v2([1, 2, 3], 0));	"Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 27
NULL"	NULL	false
var_dump(substr([1, 2, 3], 1));	var_dump(substr_v2([1, 2, 3], 1));	"Warning: substr() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 28
NULL"	NULL	false
var_dump(substr(new stdClass(), 0));	var_dump(substr_v2(new stdClass(), 0));	"Warning: substr() expects parameter 1 to be string, object given in /home/user/scripts/code.php on line 29
NULL"	NULL	false
var_dump(substr(new stdClass(), 1));	var_dump(substr_v2(new stdClass(), 1));	"Warning: substr() expects parameter 1 to be string, object given in /home/user/scripts/code.php on line 30
NULL"	NULL	false
var_dump(substr(0, 0));	var_dump(substr_v2(0, 0));	string(1) "0"	string(1) "0"	true
var_dump(substr(0, 1));	var_dump(substr_v2(0, 1));	string(0) ""	string(0) ""	true
var_dump(substr(-456, 0));	var_dump(substr_v2(-456, 0));	string(4) "-456"	string(4) "-456"	true
var_dump(substr(-456, 1));	var_dump(substr_v2(-456, 1));	string(3) "456"	string(3) "456"	true
var_dump(substr(-456, -1));	var_dump(substr_v2(-456, -1));	string(1) "6"	string(1) "6"	true
				
				
substr 	substr_v2	出力		Assert(C==D)
		php 7.3.33(substr )	php 8.4.8(substr_v2)	
var_dump(strpos("hello world", "world"));	var_dump(strpos_v2("hello world", "world"));	int(6)	int(6)	
var_dump(strpos("hello world", "hello"));	var_dump(strpos_v2("hello world", "hello"));	int(0)	int(0)	
var_dump(strpos("hello world", "o"));	var_dump(strpos_v2("hello world", "o"));	int(4)	int(4)	
var_dump(strpos("hello world", "xyz"));	var_dump(strpos_v2("hello world", "xyz"));	bool(false)	bool(false)	
var_dump(strpos("hello world", ""));	var_dump(strpos_v2("hello world", ""));	"Warning: strpos(): Empty needle in /home/user/scripts/code.php on line 9
bool(false)"	int(0)	
var_dump(strpos("", "hello"));	var_dump(strpos_v2("", "hello"));	bool(false)	bool(false)	
var_dump(strpos("", ""));	var_dump(strpos_v2("", ""));	"Warning: strpos(): Empty needle in /home/user/scripts/code.php on line 11
bool(false)"	int(0)	
var_dump(strpos("hello world", "o", 5));	var_dump(strpos_v2("hello world", "o", 5));	int(7)	int(7)	
var_dump(strpos(null, "test"));	var_dump(strpos_v2(null, "test"));	bool(false)	bool(false)	
var_dump(strpos("test", null));	var_dump(strpos_v2("test", null));	"Deprecated: strpos(): Non-string needles will be interpreted as strings in the future. Use an explicit chr() call to preserve the current behavior in /home/user/scripts/code.php on line 14
bool(false)"	"Deprecated: strpos(): Passing null to parameter #2 ($needle) of type string is deprecated in /home/user/scripts/code.php on line 11
int(0)"	
var_dump(strpos(12345, "3"));	var_dump(strpos_v2(12345, "3"));	bool(false)	int(2)	
var_dump(strpos(3.14, "."));	var_dump(strpos_v2(3.14, "."));	int(2)	int(1)	
var_dump(strpos(true, "1"));	var_dump(strpos_v2(true, "1"));	int(1)	int(0)	
var_dump(strpos(false, ""));	var_dump(strpos_v2(false, ""));	int(0)	int(0)	
var_dump(strpos([], "test"));	var_dump(strpos_v2([], "test"));	"Warning: strpos(): Empty needle in /home/user/scripts/code.php on line 18
bool(false)"	NULL	
var_dump(strpos(new stdClass(), "test"));	var_dump(strpos_v2(new stdClass(), "test"));	"Warning: strpos() expects parameter 1 to be string, array given in /home/user/scripts/code.php on line 19
NULL"	NULL	
var_dump(strpos(0, "0"));	var_dump(strpos_v2(0, "0"));		int(0)	
var_dump(strpos(-456, "-"));	var_dump(strpos_v2(-456, "-"));		int(0)	
