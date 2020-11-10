import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/storage';
import { firebaseConfig } from './config/firebase';

// 初期化済みのfirebaseインスタンスを確認する
export const app: firebase.app.App = firebase.apps.length
  ? firebase.apps[0]
  : firebase.initializeApp(firebaseConfig);
export const auth: firebase.auth.Auth = firebase.auth();
export const storage: firebase.storage.Storage = firebase.storage();
export const db: firebase.firestore.Firestore = firebase.firestore();
