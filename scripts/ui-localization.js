/*
 * ParticleX contains two user-facing Simplified Chinese strings in its layouts.
 * Keep the upstream theme as a submodule and localize the generated HTML here.
 */
hexo.extend.filter.register('after_render:html', (html) => html
  .replaceAll('阅读全文', '続きを読む / Read more')
  .replaceAll('加载过慢请开启缓存 浏览器默认开启', '読み込みに時間がかかる場合は、ブラウザーのキャッシュ設定を確認してください。')
  .replaceAll('placeholder="搜索"', 'placeholder="検索 / Search"')
  .replaceAll('&ensp;Home<', '&ensp;ホーム / Home<')
  .replaceAll('&ensp;About<', '&ensp;このブログについて / About<')
  .replaceAll('&ensp;Archives<', '&ensp;アーカイブ / Archives<')
  .replaceAll('&ensp;Categories<', '&ensp;カテゴリー / Categories<')
  .replaceAll('&ensp;Tags<', '&ensp;タグ / Tags<')
  .replaceAll('>Home</div>', '>ホーム / Home</div>')
  .replaceAll('>About</div>', '>このブログについて / About</div>')
  .replaceAll('>Archives</div>', '>アーカイブ / Archives</div>')
  .replaceAll('>Categories</div>', '>カテゴリー / Categories</div>')
  .replaceAll('>Tags</div>', '>タグ / Tags</div>'));
