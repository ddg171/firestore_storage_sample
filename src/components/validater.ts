import { parse } from 'date-fns'

// 各項目のバリデーション関数

// 戻り値
export interface CheckResult {
  valid: boolean
  msg: string
}

export function checkUid(uid: string, max: number = 128): CheckResult {
  if (!uid) {
    return {
      valid: false,
      msg: ''
    }
  }
  if (uid.length > max) {
    return {
      valid: false,
      msg: '文字数が上限を超えています。'
    }
  }
  return {
    valid: true,
    msg: 'correct'
  }
}

export function checkEmail(email: string): CheckResult {
  // eslint-disable-next-line no-useless-escape
  const regex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
  if (!email) {
    return {
      valid: false,
      msg: ''
    }
  }
  if (!email.match(regex)) {
    return {
      valid: false,
      msg: email + 'は正しい形式のメールアドレスではありません。'
    }
  }
  return {
    valid: true,
    msg: 'correct'
  }
}
// 古いパスワードのバリデーションに対応したバリデーター
// どこかのタイミングで削除する。
export function checkOldPasswordLowSecurty(
  oldPassword: string,
  min: number = 8
) {
  const regex = /^[\u0020-\u007E]{6,}$/

  if (!oldPassword) {
    return {
      valid: false,
      msg: ''
    }
  }
  if (oldPassword.length < min) {
    return {
      valid: false,
      msg: min + '字以上のパスワードを入力してください。'
    }
  }
  if (!oldPassword.match(regex)) {
    return {
      valid: false,
      msg: `半角アルファベットと数字を含む${min}字以上のパスワードを入力してください。`
    }
  }
  return {
    valid: true,
    msg: 'correct'
  }
}

export function checkPassword(
  password: string | null,
  min: number = 8
): CheckResult {
  const regex = /^(?=.*?[a-z])(?=.*?\d)[a-z\d]{8,}$/
  if (!password) {
    return {
      valid: false,
      msg: ''
    }
  }
  if (password.length < min) {
    return {
      valid: false,
      msg: min + '字以上のパスワードを入力してください。'
    }
  }
  if (!password.match(regex)) {
    return {
      valid: false,
      msg: `半角アルファベットと数字を含む${min}字以上のパスワードを入力してください。`
    }
  }
  return {
    valid: true,
    msg: 'correct'
  }
}

export function checkName(name: string, max: number = 30): CheckResult {
  if (!name) {
    return {
      valid: false,
      msg: ''
    }
  }
  if (name.length > max) {
    return {
      valid: false,
      msg: max + '字以内の名前を入力してください。'
    }
  }
  return {
    valid: true,
    msg: 'correct'
  }
}

export function checkDateOfInput(
  strDate: string,
  format: string = 'yyyy-MM-dd'
) {
  const d = parse(strDate, format, new Date())
  if (d.toString() === 'Invalid Date') {
    return {
      valid: false,
      msg: '不正な日付です。'
    }
  }
  return {
    valid: true,
    msg: 'correct'
  }
}

export function checkTitle(title: string, max: number = 20) {
  if (!title) {
    return {
      valid: false,
      msg: ''
    }
  }
  if (title.length > max) {
    return {
      valid: false,
      msg: max + '字以内で入力してください'
    }
  }

  return {
    valid: true,
    msg: 'correct'
  }
}

export function checkBody(title: string, max: number = 300) {
  if (!title) {
    return {
      valid: false,
      msg: ''
    }
  }
  if (title.length > max) {
    return {
      valid: false,
      msg: max + '字以内で入力してください'
    }
  }
  return {
    valid: true,
    msg: 'correct'
  }
}
