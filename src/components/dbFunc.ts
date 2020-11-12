import firebase from 'firebase/app';
import { db } from './firebase';

export async function createPost(
  uid: string | null,
  text: string | null
): Promise<firebase.firestore.DocumentReference | null> {
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
