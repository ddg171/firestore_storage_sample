// swift側にメッセージングするための関数
// TODO ダウンキャストを直す
// ダウンキャストで正解らしい。あとはwindowインタフェースを拡張する方法があるらしい。
export function postMessageForiOS(message: string): void {
  if (typeof message !== 'string') return;
  // console.log(`[debug/webkit]${message}/${new Date()}`)
  if ((window as any).webkit) {
    (window as any).webkit.messageHandlers.callbackHandler.postMessage(message);
  }
}
