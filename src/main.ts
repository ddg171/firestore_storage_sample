import firebase from 'firebase'; // 型の情報が必要
import { auth, storage, db } from './components/firebase';
import { HTMLElementEvent } from './components/types';

// アップロード処理
// 非同期処理をラップする
async function upload(
  file: File | null,
  text: string | null,
  uid: string | null,
  targetForm: HTMLFormElement | null
) {
  // ガード節
  if (!file) return;
  if (!text) return;
  if (!uid) return;
  // ファイル入力部
  const ref: firebase.storage.Reference | null = await uploadFile(
    file,
    uid,
    new Date().getTime().toString()
  );
  // 次にデータ
  const newDataRef: firebase.firestore.DocumentReference | null = await uploadData(
    uid,
    text,
    ref
  );
  // うまくいったら自分の参照を更新
  if (!newDataRef) return;
  const result: boolean = await addDataRef(newDataRef);
  if (result) {
    targetForm ? targetForm.reset() : null;
    console.log('成功');
    return;
  }
  console.log('失敗');
}

async function uploadFile(file: File, uid: string, prefix: string) {
  if (!file) return null;
  if (!uid) return null;
  const newName: string = uid + file.name;
  const type: string = file.type;
  const newRef = storage.ref().child(`annonymous/${prefix}${uid}_${newName}`);
  return await newRef
    .put(file, { contentType: type })
    .then((snapshot: firebase.storage.UploadTaskSnapshot) => {
      return snapshot.ref;
    })
    .catch((e: unknown) => {
      console.log(e);
      return null;
    });
}

async function uploadData(
  uid: string | null,
  text: string | null,
  fileRef: firebase.storage.Reference | null
) {
  if (!uid) return null;
  if (!text) return null;
  if (!fileRef) return null;
  return await db
    .collection(uid)
    .add({
      uid,
      text,
      fileRef: fileRef.fullPath,
      dataRef: null,
      createdDate: firebase.firestore.FieldValue.serverTimestamp(),
      updateDate: firebase.firestore.FieldValue.serverTimestamp(),
    })
    .then((ref: firebase.firestore.DocumentReference) => {
      return ref;
    })
    .catch((e: unknown) => {
      console.log(e);
      return null;
    });
}

async function addDataRef(ref: firebase.firestore.DocumentReference) {
  return await ref
    .update({
      dataRef: ref,
    })
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
}

type Data = {
  uid?: string | null;
  text?: string | null;
  fileRef?: string | null;
  dataRef?: firebase.firestore.DocumentReference | null;
  createdDate?: Date;
  updateDate?: Date;
} | null;

async function get(uid: string) {
  const data: Data = await getData(uid);
  updateTemplate(
    document.querySelector('#text-target'),
    data?.text,
    document.querySelector('#img-target'),
    await getImageURL(data?.fileRef)
  );
}

async function getData(uid: string, limit = 1) {
  if (!uid) return null;
  if (limit < 1) return null;
  return await db
    .collection(uid)
    .limit(limit)
    .orderBy('updateDate', 'desc')
    .get()
    .then((snapshot: firebase.firestore.QuerySnapshot) => {
      if (snapshot.empty) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = snapshot.docs[0].data();
      return {
        uid: data?.uid ? data.uid : null,
        text: data?.text ? data.text : null,
        fileRef: data?.fileRef ? data.fileRef : null,
        dataRef: data?.dataRef ? data.dataRef : null,
        createdDate: data?.createdDate ? data?.createdDate.toDate() : null,
        updatedDate: data?.updatedDate ? data?.updatedDate.toDate() : null,
      };
    })
    .catch((e: unknown) => {
      console.log(e);
      return null;
    });
}

async function getImageURL(fileRef: string | null | undefined) {
  if (!fileRef) return '';
  return await storage.ref(fileRef).getDownloadURL();
}

async function updateTemplate(
  textTarget: HTMLLIElement | null,
  text: string | null | undefined,
  imgTarget: HTMLLIElement | null,
  url: string | null | undefined
) {
  if (!textTarget) return;
  if (!text) return;
  if (!imgTarget) return;
  if (!url) return;
  textTarget.textContent = text;
  imgTarget.setAttribute('src', url);
}

function setUp(): void {
  // フォーム
  const testform: HTMLFormElement | null = document.querySelector('#form_file');
  if (testform) {
    testform.addEventListener('submit', (e: HTMLElementEvent) => {
      // submit中断
      e.preventDefault();
      // text
      const inputText: HTMLInputElement | null = document.querySelector(
        '#my-text'
      );
      const text: string = inputText ? inputText.value : '';
      // file
      const inputFile: HTMLInputElement | null = document.querySelector(
        '#my-file'
      );
      const file: File | null = inputFile?.files ? inputFile.files[0] : null;
      const uid: string | null = auth.currentUser ? auth.currentUser.uid : null;
      upload(file, text, uid, testform);
    });
  }
  const testButton: HTMLLIElement | null = document.querySelector('#get-btn');
  if (testButton) {
    testButton.addEventListener('click', () => {
      const uid: string | undefined = auth.currentUser?.uid;
      if (!uid) return;
      get(uid);
      // console.log(data)
    });
  }
}

if (!auth.currentUser) {
  auth
    .signInAnonymously()
    .then(() => {
      console.log(auth.currentUser);
    })
    .catch((e: firebase.auth.Error) => {
      console.log(e);
    });
}

window.addEventListener('load', () => {
  setUp();
});
