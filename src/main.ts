import firebase from 'firebase'; // 型の情報が必要
import { auth, storage, db } from './components/firebase';
import { HTMLElementEvent } from './components/types';

async function upload(
  uid: string | null,
  text: string | null,
  fileList: File[] = [],
  targetForm: HTMLFormElement | null
) {
  // まず投稿そのもののドキュメントを作成
  // ドキュメントの参照を返す
  const parentRef: firebase.firestore.DocumentReference | null = await uploadData(
    uid,
    text
  );

  // 参照がnullなら作成失敗なので中断
  if (!parentRef) return null;
  // 添付ファイルがないなら終了
  // if (!fileList) return null;
  // 添付ファイルのアップロード処理
  // メタデータに親ドキュメントのパスを入れる。
  fileList.forEach((file: File) => {
    const parentPath: string = parentRef.path;
    const prefix: string = new Date().getTime().toString();
    uploadFile(file, uid, parentPath, prefix);
  });
  if (targetForm) {
    targetForm.reset();
  }
}

function uploadFile(
  file: File,
  uid: string | null,
  parentPath: string,
  prefix = ''
) {
  if (!file) return;
  if (!uid) return;
  if (!parentPath) return;
  const splitName: string[] = file.name.split('.');
  const extention: string =
    splitName.length > 1 && splitName[0] ? `.${splitName[1]}` : '';
  const type: string = file.type;
  const newRef = storage.ref().child(`file/${prefix}${uid}${extention}`);
  newRef
    .put(file, { contentType: type, customMetadata: { uid, parentPath } })
    .catch((e: unknown) => {
      console.log(e);
    });
}

// アップロード処理
// 非同期処理をラップする

async function uploadData(uid: string | null, text: string | null) {
  if (!uid) return null;
  if (!text) return null;
  return await db
    .collection('post')
    .add({
      uid, // 投稿者のuid
      text,
      files: [],
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
      const fileList: File[] = inputFile?.files
        ? Array.from(inputFile.files)
        : [];
      const uid: string | null = auth.currentUser ? auth.currentUser.uid : null;
      upload(uid, text, fileList, testform);
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
