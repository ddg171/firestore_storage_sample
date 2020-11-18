// 文字列への変換に使う関数と変数をまとめる場所

// 一括管理したほうが分かりやすい

// 画像一覧
export const photoIndexDateFormat: { readonly [T in 'row' | 'col']: string } = {
  row: 'yyyy.M.d',
  col: 'HH:mm'
}
// 画像詳細
export const photoIdDateFormat: {
  readonly [T in 'title' | 'createdDate']: string
} = {
  title: 'yyyy年M月d日 H.mmの食事',
  createdDate: 'yyyy.M.d. H:mm'
}

// 動画一覧
export const movieDateFormat: { readonly [T in 'createdDate']: string } = {
  createdDate: 'yyyy年M月d日H時mm分'
}
// 動画詳細
export const movieIdDateFormat: { readonly [T in 'title']: string } = {
  title: 'yyyy.M.d投稿'
}

// 目標一覧
export const goalDateFormat: { readonly [T in 'end']: string } = {
  end: 'yyyy年M月d日'
}

// 改行コードを全て削除する関数
// 第2引数で改行から置換する単語を設定できる。デフォルトは半角空白
export function formatSingleLineString(
  str: string,
  replaceStr: string = ' '
): string {
  const regex = /(\r\n|\n|\r)/gm
  return str.replace(regex, replaceStr)
}

type UniqueArrayElement = string | number
// 重複排除メソッド
// 文字列のみか数値のみの配列に対応
export function createUnipueArrey<U extends UniqueArrayElement>(ary: U[]): U[] {
  return Array.from(new Set(ary))
}

export function makeStringShorten(str: string): string {
  const max = 10
  if (!str) return 'n/a'
  return str.length <= max ? str : str.slice(0, max - 1) + '...'
}
