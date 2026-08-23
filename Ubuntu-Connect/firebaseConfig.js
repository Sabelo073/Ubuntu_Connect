import { initializeApp } from "firebase/app";

import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAvArbY33MtxRHK_Z2l4c-QFqeTCmg_sRk",
  authDomain: "ubuntu-connect-5a26f.firebaseapp.com",
  projectId: "ubuntu-connect-5a26f",
  storageBucket: "ubuntu-connect-5a26f.firebasestorage.app",
  messagingSenderId: "849692634225",
  appId: "1:849692634225:web:6cf0ed91307cc6f72f3fd0",
  measurementId: "G-9GVWQDKXLG",
};

const app = initializeApp(firebaseConfig);

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  /*
    Expo Fast Refresh may run this file again after Auth has
    already been initialized. In that case, reuse the existing
    Firebase Auth instance.
  */
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage,
};