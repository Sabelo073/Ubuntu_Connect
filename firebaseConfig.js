import {
  initializeApp,
  getApps,
  getApp,
} from "firebase/app";

import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyAvArbY33MtxRHK_Z2l4c-QFqeTCmg_sRk",
  authDomain: "ubuntu-connect-5a26f.firebaseapp.com",
  projectId: "ubuntu-connect-5a26f",
  messagingSenderId: "849692634225",
  appId: "1:849692634225:web:6cf0ed91307cc6f72f3fd0",
  measurementId: "G-9GVWQDKXLG",
};


// Reuse the existing Firebase app if it has already been initialized
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();


let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  /*
    Expo Fast Refresh may run this file again after Firebase Auth
    has already been initialized. Reuse the existing Auth instance.
  */
  auth = getAuth(app);
}


const db = getFirestore(app);


export {
  app,
  auth,
  db,
  
};