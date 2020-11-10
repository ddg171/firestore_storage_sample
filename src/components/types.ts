// 型
export interface ListenerEventTarget extends EventTarget {
  value?: string;
  checked?: boolean;
}

export interface HTMLElementEvent extends Event {
  target: ListenerEventTarget | null;
  ctrlKey?: boolean;
  key?: string;
}

export interface OptionNode extends ChildNode {
  value?: string;
}
